//+------------------------------------------------------------------+
//|                                               SmartFX_EA.mq5     |
//|                        SmartFX AI Trading System v2.0            |
//|          Polls smart-fx-tool.replit.app and auto-trades MT5      |
//+------------------------------------------------------------------+
#property copyright "SmartFX AI"
#property version   "2.00"
#property strict

#include <Trade\Trade.mqh>

//--- Input parameters
input string InpApiUrl          = "https://smart-fx-tool.replit.app"; // SmartFX API Base URL
input double InpLotSize         = 0.01;     // Lot Size
input int    InpMagicNumber     = 20260725; // Magic Number (unique per EA instance)
input int    InpMinConfidence   = 80;       // Min Signal Confidence (%)
input int    InpMaxSpreadPts    = 30;       // Max Allowed Spread (points)
input int    InpPollSeconds     = 10;       // Poll Interval (seconds)
input bool   InpTradeForex      = true;     // Trade Forex & Metals
input bool   InpTradeSynthetics = false;    // Trade Synthetic Indices

//--- Globals
CTrade   g_trade;
string   g_lastId    = "0";
datetime g_lastPoll  = 0;
int      g_trades    = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   g_trade.SetExpertMagicNumber(InpMagicNumber);
   g_trade.SetDeviationInPoints(10);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   EventSetTimer(InpPollSeconds);

   Comment("SmartFX v2.0 | Magic: ", InpMagicNumber,
           " | Conf: >=", InpMinConfidence, "%",
           " | Lots: ", InpLotSize);

   Print("SmartFX EA v2.0 started. Server: ", InpApiUrl,
         " | Poll: every ", InpPollSeconds, "s");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
   Print("SmartFX EA stopped. Reason: ", reason);
}

void OnTimer() { PollAndTrade(); }

//+------------------------------------------------------------------+
//| Main poll + trade loop                                            |
//+------------------------------------------------------------------+
void PollAndTrade()
{
   string url = InpApiUrl + "/api/ea/signal"
              + "?min_confidence=" + IntegerToString(InpMinConfidence)
              + "&last_id="        + g_lastId;

   char   postData[], response[];
   string respHeaders;
   ArrayResize(postData, 0);

   int httpCode = WebRequest("GET", url, "Content-Type: application/json\r\n",
                             8000, postData, response, respHeaders);

   if (httpCode == -1)
   {
      int err = GetLastError();
      if (err == 4060)
         Print("SmartFX: WebRequest blocked. Go to Tools > Options > Expert Advisors"
               " and add  ", InpApiUrl, "  to the Allowed URLs list.");
      else
         Print("SmartFX: WebRequest error ", err, " — retrying next poll.");
      return;
   }

   if (httpCode != 200)
   {
      Print("SmartFX: Server returned HTTP ", httpCode);
      return;
   }

   string json = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
   StringTrimLeft(json);
   StringTrimRight(json);

   // No new signal
   if (json == "" || json == "null" || StringFind(json, "\"id\"") < 0)
   {
      g_lastPoll = TimeCurrent();
      Comment("SmartFX v2.0 | Last poll: ", TimeToString(g_lastPoll, TIME_MINUTES),
              " | Trades: ", g_trades, " | No new signal");
      return;
   }

   // Parse fields
   string sigId   = JsStr(json, "id");
   string pair    = JsStr(json, "pair");
   string dir     = JsStr(json, "direction");
   double entry   = StringToDouble(JsNum(json, "entry"));
   double sl      = StringToDouble(JsNum(json, "sl"));
   double tp      = StringToDouble(JsNum(json, "tp"));
   int    conf    = (int)StringToInteger(JsNum(json, "confidence"));
   string tf      = JsStr(json, "timeframe");

   // Already processed this signal
   if (sigId == g_lastId || sigId == "") return;

   Print("SmartFX signal #", sigId, ": ", dir, " ", pair,
         " | Entry:", entry, " SL:", sl, " TP:", tp,
         " | Conf:", conf, "% | TF:", tf);

   // Resolve MT5 symbol
   string symbol = ResolveSymbol(pair);
   if (symbol == "")
   {
      Print("SmartFX: Symbol not found for pair [", pair, "] — skipping");
      g_lastId = sigId;
      return;
   }

   // Spread check
   long spreadPts = SymbolInfoInteger(symbol, SYMBOL_SPREAD);
   if (spreadPts > InpMaxSpreadPts)
   {
      Print("SmartFX: Spread ", spreadPts, " pts > max ", InpMaxSpreadPts, " — skipping");
      g_lastId = sigId;
      return;
   }

   // Avoid duplicate position on same symbol
   if (HasPosition(symbol))
   {
      Print("SmartFX: Already in position on ", symbol, " — skipping");
      g_lastId = sigId;
      return;
   }

   // Execute
   bool ok = false;
   if (dir == "BUY")
      ok = g_trade.Buy(InpLotSize, symbol, 0, sl, tp, "SmartFX #" + sigId);
   else if (dir == "SELL")
      ok = g_trade.Sell(InpLotSize, symbol, 0, sl, tp, "SmartFX #" + sigId);
   else
   {
      Print("SmartFX: Unknown direction [", dir, "]");
      g_lastId = sigId;
      return;
   }

   g_lastId = sigId;

   if (ok)
   {
      g_trades++;
      Print("SmartFX: Trade opened ✓ — ", dir, " ", symbol,
            " | Ticket:", g_trade.ResultOrder());
   }
   else
   {
      Print("SmartFX: Trade FAILED — ", g_trade.ResultRetcodeDescription(),
            " (", g_trade.ResultRetcode(), ")");
   }

   g_lastPoll = TimeCurrent();
   Comment("SmartFX v2.0 | Last poll: ", TimeToString(g_lastPoll, TIME_MINUTES),
           " | Trades: ", g_trades);
}

//+------------------------------------------------------------------+
//| JSON helpers — extract string or numeric field from flat JSON     |
//+------------------------------------------------------------------+
string JsStr(const string &json, const string &key)
{
   string search = "\"" + key + "\":\"";
   int pos = StringFind(json, search);
   if (pos < 0) return "";
   pos += StringLen(search);
   int end = StringFind(json, "\"", pos);
   if (end <= pos) return "";
   return StringSubstr(json, pos, end - pos);
}

string JsNum(const string &json, const string &key)
{
   string search = "\"" + key + "\":";
   int pos = StringFind(json, search);
   if (pos < 0) return "0";
   pos += StringLen(search);
   // Skip any whitespace
   while (pos < StringLen(json) && StringGetCharacter(json, pos) == ' ') pos++;
   int end = pos;
   int len = StringLen(json);
   while (end < len)
   {
      ushort c = StringGetCharacter(json, end);
      if (c == ',' || c == '}' || c == ']' || c == ' ' || c == '\n' || c == '\r') break;
      end++;
   }
   string v = StringSubstr(json, pos, end - pos);
   return (v == "" || v == "null") ? "0" : v;
}

//+------------------------------------------------------------------+
//| Try to find the symbol on the broker (handles suffixes)           |
//+------------------------------------------------------------------+
string ResolveSymbol(const string &pair)
{
   string upper = pair;
   StringToUpper(upper);

   // Exact match
   if (SymbolSelect(upper, true) && SymbolInfoDouble(upper, SYMBOL_BID) > 0)
      return upper;

   // Common Deriv MT5 suffixes
   string sfx[] = {".", "+", "m", "_", "pro"};
   for (int i = 0; i < ArraySize(sfx); i++)
   {
      string s = upper + sfx[i];
      if (SymbolSelect(s, true) && SymbolInfoDouble(s, SYMBOL_BID) > 0)
         return s;
   }

   // Synthetics without prefix (Volatility 10 Index etc.)
   string synthMap[][2] = {
      {"R_10",     "Volatility 10 Index"},
      {"R_25",     "Volatility 25 Index"},
      {"R_50",     "Volatility 50 Index"},
      {"R_75",     "Volatility 75 Index"},
      {"R_100",    "Volatility 100 Index"},
      {"BOOM500",  "Boom 500 Index"},
      {"BOOM1000", "Boom 1000 Index"},
      {"CRASH500", "Crash 500 Index"},
      {"CRASH1000","Crash 1000 Index"},
   };
   for (int i = 0; i < ArraySize(synthMap) / 2; i++)
   {
      if (upper == synthMap[i][0])
      {
         string s = synthMap[i][1];
         if (SymbolSelect(s, true) && SymbolInfoDouble(s, SYMBOL_BID) > 0)
            return s;
      }
   }

   return "";
}

//+------------------------------------------------------------------+
//| Check if we already hold a position for this symbol + magic       |
//+------------------------------------------------------------------+
bool HasPosition(const string &symbol)
{
   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if (PositionSelectByTicket(ticket))
         if (PositionGetString(POSITION_SYMBOL)  == symbol &&
             PositionGetInteger(POSITION_MAGIC)   == InpMagicNumber)
            return true;
   }
   return false;
}

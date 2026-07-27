//+------------------------------------------------------------------+
//|                                               SmartFX_EA.mq5     |
//|                        SmartFX AI Trading System v2.6            |
//|          Polls smart-fx-tool.site and auto-trades MT5             |
//+------------------------------------------------------------------+
#property copyright "SmartFX AI"
#property version   "2.60"
#property strict

#include <Trade\Trade.mqh>

//--- Static inputs (fallback defaults — overridden by dashboard settings)
input string InpApiUrl            = "https://smart-fx-tool.site"; // SmartFX API Base URL
input double InpLotSize           = 0.01;    // Default Lot Size (fallback)
input int    InpMagicNumber       = 20260725; // Magic Number
input int    InpMinConfidence     = 80;      // Min Signal Confidence % (fallback)
input int    InpPollSeconds       = 10;      // Poll Interval (seconds)
input bool   InpUseLimitOrders    = true;    // Wait for entry price (limit orders)
input int    InpOrderExpireMins   = 60;      // Pending order expiry (minutes)

//--- Globals
CTrade   g_trade;
string   g_lastId         = "0";
int      g_trades         = 0;
datetime g_lastBalance    = 0;
datetime g_lastPositions  = 0;
datetime g_lastSettings   = 0;
double   g_startBalance   = 0;
bool     g_stopped        = false;
string   g_lastClosedPair = "";

//--- Dynamic settings pulled from dashboard (updated every 60s)
double g_dynProfitTarget  = 0;
double g_dynLossLimit     = 0;
double g_dynLotSize       = 0;
int    g_dynMinConf       = 0;
double g_dynMinProfitClose = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   g_trade.SetExpertMagicNumber(InpMagicNumber);
   g_trade.SetDeviationInPoints(10);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   g_startBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   g_stopped      = false;

   EventSetTimer(InpPollSeconds);
   Print("SmartFX EA v2.6 started | Balance:", g_startBalance,
         " | API:", InpApiUrl);
   UpdateComment();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
   Print("SmartFX EA stopped. Reason:", reason);
}

void OnTimer()
{
   PollSettings();           // Pull latest settings from dashboard (every 60s)
   if (CheckDailyTarget()) return;
   CheckFloatingProfit();    // Close position early if min profit reached
   PollForceQueue();         // Manual execute from dashboard
   PollAndTrade();           // Auto-signal: one trade at a time
   ReportPositions();        // Send open positions to dashboard (every 10s)
   ReportBalance();          // Send balance (every 15s)
}

//+------------------------------------------------------------------+
//| Pull settings from dashboard every 60s                           |
//+------------------------------------------------------------------+
void PollSettings()
{
   if (TimeCurrent() - g_lastSettings < 60) return;
   g_lastSettings = TimeCurrent();

   string url = InpApiUrl + "/api/ea/settings";
   char   postData[], response[];
   string respHeaders;
   ArrayResize(postData, 0);

   int httpCode = WebRequest("GET", url, "Content-Type: application/json\r\n",
                             5000, postData, response, respHeaders);
   if (httpCode != 200) return;

   string json = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);

   double profitTarget = StringToDouble(JsNum(json, "dailyProfitTarget"));
   double lossLimit    = StringToDouble(JsNum(json, "dailyLossLimit"));
   double lotSize      = StringToDouble(JsNum(json, "lotSize"));
   int    minConf      = (int)StringToInteger(JsNum(json, "minConfidence"));

   bool changed = (profitTarget != g_dynProfitTarget || lossLimit != g_dynLossLimit ||
                   lotSize != g_dynLotSize || minConf != g_dynMinConf);

   double minProfitClose = StringToDouble(JsNum(json, "minProfitClose"));

   g_dynProfitTarget   = profitTarget;
   g_dynLossLimit      = lossLimit;
   g_dynLotSize        = (lotSize  >= 0.01) ? lotSize  : 0;
   g_dynMinConf        = (minConf  >= 1)    ? minConf  : 0;
   g_dynMinProfitClose = (minProfitClose > 0) ? minProfitClose : 0;

   if (changed)
      Print("SmartFX: Settings from dashboard — ProfitTarget:$", g_dynProfitTarget,
            " LossLimit:-$", g_dynLossLimit,
            " Lots:", EffectiveLotSize(), " MinConf:", EffectiveMinConf(), "%");

   UpdateComment();
}

//--- Effective values: dashboard setting takes priority over EA input
double EffectiveLotSize()      { return (g_dynLotSize  >= 0.01) ? g_dynLotSize  : InpLotSize; }
int    EffectiveMinConf()       { return (g_dynMinConf  >= 1)    ? g_dynMinConf  : InpMinConfidence; }
double EffectiveProfitTarget()  { return g_dynProfitTarget; }
double EffectiveLossLimit()     { return g_dynLossLimit; }
double EffectiveMinProfitClose(){ return g_dynMinProfitClose; }

//+------------------------------------------------------------------+
//| Close position early when floating profit >= minProfitClose       |
//+------------------------------------------------------------------+
void CheckFloatingProfit()
{
   double threshold = EffectiveMinProfitClose();
   if (threshold <= 0) return;  // disabled

   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if (!PositionSelectByTicket(ticket)) continue;
      if ((int)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;

      double profit = PositionGetDouble(POSITION_PROFIT);
      if (profit >= threshold)
      {
         string sym = PositionGetString(POSITION_SYMBOL);
         Print("SmartFX: Min profit $", DoubleToString(threshold, 2),
               " reached ($", DoubleToString(profit, 2), ") — closing ", sym, " early");
         g_trade.PositionClose(ticket);
      }
   }
}

//+------------------------------------------------------------------+
//| Detect trade close -> ready for next signal immediately           |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &request,
                        const MqlTradeResult      &result)
{
   if (trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
   if (!HistoryDealSelect(trans.deal)) return;

   long magic = HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
   long entry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   if (magic != InpMagicNumber || entry != DEAL_ENTRY_OUT) return;

   string sym    = HistoryDealGetString(trans.deal, DEAL_SYMBOL);
   double profit = HistoryDealGetDouble(trans.deal, DEAL_PROFIT);
   g_lastClosedPair = sym;

   Print("SmartFX: Closed [", (profit >= 0 ? "TP" : "SL"), "] -- ", sym,
         " | P&L: $", DoubleToString(profit, 2), " | Ready for next signal");
   UpdateComment();
}

//+------------------------------------------------------------------+
//| Daily profit target / loss limit                                  |
//+------------------------------------------------------------------+
bool CheckDailyTarget()
{
   if (g_stopped) return true;

   double pt = EffectiveProfitTarget();
   double ll = EffectiveLossLimit();
   if (pt <= 0 && ll <= 0) return false;

   double netPnL  = AccountInfoDouble(ACCOUNT_EQUITY) - g_startBalance;
   bool hitTarget = (pt > 0 && netPnL >= pt);
   bool hitLimit  = (ll > 0 && netPnL <= -ll);
   if (!hitTarget && !hitLimit) return false;

   string reason = hitTarget ? "PROFIT TARGET HIT" : "LOSS LIMIT HIT";
   Print("SmartFX: *** ", reason, " *** P&L:$", DoubleToString(netPnL, 2),
         " | Closing all & stopping");

   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if (PositionSelectByTicket(t) && (int)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         g_trade.PositionClose(t);
   }
   for (int i = OrdersTotal() - 1; i >= 0; i--)
   {
      ulong t = OrderGetTicket(i);
      if (OrderSelect(t) && (int)OrderGetInteger(ORDER_MAGIC) == InpMagicNumber)
         g_trade.OrderDelete(t);
   }

   g_stopped = true;
   Comment("SmartFX v2.6 | *** STOPPED -- ", reason, " ***");
   return true;
}

//+------------------------------------------------------------------+
//| Auto-signal polling -- one trade at a time, chains after close    |
//+------------------------------------------------------------------+
void PollAndTrade()
{
   if (HasAnyPosition())
   {
      double netPnL = AccountInfoDouble(ACCOUNT_EQUITY) - g_startBalance;
      Comment("SmartFX v2.6 | TRADE OPEN -- P&L:$", DoubleToString(netPnL, 2),
              " | Lots:", EffectiveLotSize(), " | Waiting for TP/SL...");
      return;
   }
   if (HasAnyPendingOrder())
   {
      Comment("SmartFX v2.6 | Limit order pending -- waiting for fill...");
      return;
   }

   string url = InpApiUrl + "/api/ea/signal"
              + "?min_confidence=" + IntegerToString(EffectiveMinConf())
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
         Print("SmartFX: WebRequest blocked -- add ", InpApiUrl, " to allowed URLs.");
      return;
   }
   if (httpCode != 200) return;

   string json = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
   StringTrimLeft(json); StringTrimRight(json);

   if (json == "" || json == "null" || StringFind(json, "\"id\"") < 0)
   { UpdateComment(); return; }

   string sigId = JsStr(json, "id");
   string pair  = JsStr(json, "pair");
   string dir   = JsStr(json, "direction");
   double entry = StringToDouble(JsNum(json, "entry"));
   double sl    = StringToDouble(JsNum(json, "sl"));
   double tp    = StringToDouble(JsNum(json, "tp"));
   int    conf  = (int)StringToInteger(JsNum(json, "confidence"));
   string tf    = JsStr(json, "timeframe");

   if (sigId == g_lastId || sigId == "") return;

   string symbol = ResolveSymbol(pair);

   if (symbol == g_lastClosedPair && g_lastClosedPair != "")
   {
      Print("SmartFX: Skipping ", pair, " -- same as last closed, waiting for different pair");
      g_lastId = sigId;
      return;
   }
   if (symbol == "") { Print("SmartFX: Symbol not found [", pair, "]"); g_lastId = sigId; return; }

   Print("SmartFX AUTO signal #", sigId, ": ", dir, " ", pair,
         " | Entry:", entry, " SL:", sl, " TP:", tp,
         " | Conf:", conf, "% | TF:", tf, " | Lots:", EffectiveLotSize());

   double autoLots = NormalizeLots(symbol, EffectiveLotSize());
   if (autoLots <= 0) { g_lastId = sigId; return; }

   // ── Entry price validation ────────────────────────────────────────────────
   // Server sends a pullback entry (not current price). Validate it is still
   // on the correct side of market before placing. If market has already moved
   // past the entry level, skip — NEVER fall back to a blind market order.
   double askPrice = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bidPrice = SymbolInfoDouble(symbol, SYMBOL_BID);

   bool entryValid = false;
   if (dir == "BUY"  && entry > 0 && entry < askPrice) entryValid = true;
   if (dir == "SELL" && entry > 0 && entry > bidPrice) entryValid = true;

   if (!entryValid)
   {
      Print("SmartFX: Signal #", sigId, " skipped -- entry ", DoubleToString(entry, 5),
            " is not a valid limit price (Ask=", DoubleToString(askPrice, 5),
            " Bid=", DoubleToString(bidPrice, 5), ") | No market fallback");
      g_lastId = sigId;
      return;
   }

   // ── Place limit order — no market order fallback ──────────────────────────
   bool ok = false;
   datetime expiry = TimeCurrent() + InpOrderExpireMins * 60;

   if (dir == "BUY")
      ok = g_trade.BuyLimit(autoLots, entry, symbol, sl, tp,
                            ORDER_TIME_SPECIFIED, expiry, "SmartFX #" + sigId);
   else if (dir == "SELL")
      ok = g_trade.SellLimit(autoLots, entry, symbol, sl, tp,
                             ORDER_TIME_SPECIFIED, expiry, "SmartFX #" + sigId);

   g_lastId = sigId;

   if (ok)
   {
      g_trades++;
      Print("SmartFX AUTO: Limit order placed -- ", dir, " ", symbol, " @ ", entry,
            " | SL:", sl, " TP:", tp,
            " | Expires ", InpOrderExpireMins, "min | Ticket:", g_trade.ResultOrder());
      ReportTrade(g_trade.ResultOrder(), symbol, dir, autoLots, sl, tp, sigId, conf, tf);
   }
   else
      Print("SmartFX AUTO: Limit FAILED (", g_trade.ResultRetcode(), " ",
            g_trade.ResultRetcodeDescription(), ") -- signal skipped, no market fallback");

   UpdateComment();
}

//+------------------------------------------------------------------+
//| Manual execute from dashboard -- always market order              |
//+------------------------------------------------------------------+
void PollForceQueue()
{
   string url = InpApiUrl + "/api/ea/force-queue";
   char   postData[], response[];
   string respHeaders;
   ArrayResize(postData, 0);

   int httpCode = WebRequest("GET", url, "Content-Type: application/json\r\n",
                             8000, postData, response, respHeaders);
   if (httpCode != 200) return;

   string json = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
   StringTrimLeft(json); StringTrimRight(json);
   if (json == "" || json == "[]" || StringFind(json, "\"id\"") < 0) return;

   int objStart = StringFind(json, "{");
   int objEnd   = StringFind(json, "}", objStart);
   if (objStart < 0 || objEnd < 0) return;

   string item  = StringSubstr(json, objStart, objEnd - objStart + 1);
   string fqId  = JsStr(item, "id");
   string pair  = JsStr(item, "pair");
   string dir   = JsStr(item, "direction");
   double lots  = StringToDouble(JsNum(item, "lotSize"));
   double sl    = StringToDouble(JsNum(item, "sl"));
   double tp    = StringToDouble(JsNum(item, "tp"));
   string sigId = JsStr(item, "signalId");
   int    conf  = (int)StringToInteger(JsNum(item, "confidence"));
   string tf    = JsStr(item, "timeframe");

   if (fqId == "" || pair == "") return;
   if (lots <= 0) lots = EffectiveLotSize();

   MarkForceDone(fqId);

   string symbol = ResolveSymbol(pair);
   if (symbol == "") { Print("SmartFX MANUAL: Symbol not found [", pair, "]"); return; }

   lots = NormalizeLots(symbol, lots);
   if (lots <= 0) return;

   bool ok = false;
   if (dir == "BUY")  ok = g_trade.Buy (lots, symbol, 0, sl, tp, "SmartFX-Manual #" + sigId);
   if (dir == "SELL") ok = g_trade.Sell(lots, symbol, 0, sl, tp, "SmartFX-Manual #" + sigId);

   if (ok)
   {
      g_trades++;
      Print("SmartFX MANUAL: Trade opened -- ", dir, " ", symbol,
            " | Ticket:", g_trade.ResultOrder(), " | Lots:", lots);
      ReportTrade(g_trade.ResultOrder(), symbol, dir, lots, sl, tp, sigId, conf, tf);
   }
   else
      Print("SmartFX MANUAL: Trade FAILED -- ", g_trade.ResultRetcodeDescription(),
            " (", g_trade.ResultRetcode(), ")");

   UpdateComment();
}

void MarkForceDone(const string &fqId)
{
   string url = InpApiUrl + "/api/ea/force-queue/" + fqId + "/done";
   string bodyStr = "{}";
   char   postData[], response[];
   string respHeaders;
   StringToCharArray(bodyStr, postData, 0, StringLen(bodyStr));
   WebRequest("POST", url, "Content-Type: application/json\r\n",
              5000, postData, response, respHeaders);
}

//+------------------------------------------------------------------+
//| Report all open positions to dashboard every 10s                  |
//+------------------------------------------------------------------+
void ReportPositions()
{
   if (TimeCurrent() - g_lastPositions < 10) return;
   g_lastPositions = TimeCurrent();

   long login = AccountInfoInteger(ACCOUNT_LOGIN);
   string json = "[";
   bool first = true;

   for (int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if (!PositionSelectByTicket(ticket)) continue;
      if ((int)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;

      string sym      = PositionGetString(POSITION_SYMBOL);
      string dir      = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
      double lots     = PositionGetDouble(POSITION_VOLUME);
      double openPx   = PositionGetDouble(POSITION_PRICE_OPEN);
      double curPx    = PositionGetDouble(POSITION_PRICE_CURRENT);
      double sl       = PositionGetDouble(POSITION_SL);
      double tp_val   = PositionGetDouble(POSITION_TP);
      double profit   = PositionGetDouble(POSITION_PROFIT);
      string comment  = PositionGetString(POSITION_COMMENT);

      string sigId = "";
      int hashPos = StringFind(comment, "#");
      if (hashPos >= 0) sigId = StringSubstr(comment, hashPos + 1);

      if (!first) json += ",";
      first = false;

      json += StringFormat(
         "{\"ticket\":\"%d\",\"login\":\"%d\",\"symbol\":\"%s\","
         "\"direction\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,"
         "\"currentPrice\":%.5f,\"sl\":%.5f,\"tp\":%.5f,"
         "\"profit\":%.2f,\"signalId\":\"%s\"}",
         ticket, login, sym, dir, lots, openPx, curPx, sl, tp_val, profit, sigId
      );
   }
   json += "]";

   string url = InpApiUrl + "/api/ea/positions";
   char   postData[], response[];
   string respHeaders;
   StringToCharArray(json, postData, 0, StringLen(json));
   WebRequest("POST", url, "Content-Type: application/json\r\n",
              5000, postData, response, respHeaders);
}

//+------------------------------------------------------------------+
//| Report balance                                                    |
//+------------------------------------------------------------------+
void ReportBalance()
{
   if (TimeCurrent() - g_lastBalance < 15) return;
   g_lastBalance = TimeCurrent();

   long   login  = AccountInfoInteger(ACCOUNT_LOGIN);
   double bal    = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq     = AccountInfoDouble(ACCOUNT_EQUITY);
   string cur    = AccountInfoString(ACCOUNT_CURRENCY);
   string srv    = AccountInfoString(ACCOUNT_SERVER);
   bool   isDemo = (AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO);

   string json = StringFormat(
      "{\"login\":\"%d\",\"balance\":%.2f,\"equity\":%.2f,"
      "\"currency\":\"%s\",\"server\":\"%s\",\"accountType\":\"%s\"}",
      login, bal, eq, cur, srv, isDemo ? "demo" : "real"
   );
   string urls[2];
   urls[0] = InpApiUrl + "/api/ea/balance";
   urls[1] = InpApiUrl + "/api/mt5/balance-report";
   for (int i = 0; i < 2; i++)
   {
      char postData[], response[]; string respHeaders;
      StringToCharArray(json, postData, 0, StringLen(json));
      WebRequest("POST", urls[i], "Content-Type: application/json\r\n",
                 5000, postData, response, respHeaders);
   }
}

void ReportTrade(ulong ticket, string symbol, string direction,
                 double lots, double sl, double tp,
                 string sigId, int confidence, string timeframe)
{
   long   login  = AccountInfoInteger(ACCOUNT_LOGIN);
   double openPx = PositionGetDouble(POSITION_PRICE_OPEN);
   if (openPx == 0) openPx = g_trade.ResultPrice();

   string json = StringFormat(
      "{\"ticket\":\"%d\",\"login\":\"%d\",\"symbol\":\"%s\","
      "\"direction\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,"
      "\"sl\":%.5f,\"tp\":%.5f,\"signalId\":\"%s\","
      "\"confidence\":%d,\"timeframe\":\"%s\",\"status\":\"OPEN\"}",
      ticket, login, symbol, direction, lots, openPx,
      sl, tp, sigId, confidence, timeframe
   );
   string url = InpApiUrl + "/api/ea/trade";
   char postData[], response[]; string respHeaders;
   StringToCharArray(json, postData, 0, StringLen(json));
   WebRequest("POST", url, "Content-Type: application/json\r\n",
              5000, postData, response, respHeaders);
}

void UpdateComment()
{
   double netPnL = AccountInfoDouble(ACCOUNT_EQUITY) - g_startBalance;
   int    open   = 0;
   for (int i = 0; i < PositionsTotal(); i++)
   {
      ulong t = PositionGetTicket(i);
      if (PositionSelectByTicket(t) && (int)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         open++;
   }
   string status  = (open > 0) ? "TRADE OPEN -- waiting for TP/SL" : "Waiting for next signal";
   double pt      = EffectiveProfitTarget();
   double ll      = EffectiveLossLimit();
   string targets = "";
   if (pt > 0) targets += StringFormat(" | Target:$%.0f", pt);
   if (ll > 0) targets += StringFormat(" | Limit:-$%.0f", ll);

   Comment("SmartFX v2.6 | ", status,
           " | Trades:", g_trades,
           " | P&L:$", DoubleToString(netPnL, 2),
           " | Lots:", EffectiveLotSize(), targets);
}

//+------------------------------------------------------------------+
//| Helpers                                                           |
//+------------------------------------------------------------------+
bool HasAnyPosition()
{
   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if (PositionSelectByTicket(t) && (int)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         return true;
   }
   return false;
}

bool HasAnyPendingOrder()
{
   for (int i = OrdersTotal() - 1; i >= 0; i--)
   {
      ulong t = OrderGetTicket(i);
      if (OrderSelect(t) && (int)OrderGetInteger(ORDER_MAGIC) == InpMagicNumber)
         return true;
   }
   return false;
}

double NormalizeLots(const string &symbol, double lots)
{
   double minVol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxVol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double step   = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   if (step <= 0) step = 0.01;
   lots = MathRound(lots / step) * step;
   if (lots < minVol) lots = minVol;
   if (lots > maxVol) lots = maxVol;
   return NormalizeDouble(lots, 2);
}

string ResolveSymbol(const string &pair)
{
   string upper = pair;
   StringToUpper(upper);
   if (SymbolSelect(upper, true) && SymbolInfoDouble(upper, SYMBOL_BID) > 0) return upper;

   string sfx[] = {".", "+", "m", "_", "pro"};
   for (int i = 0; i < ArraySize(sfx); i++)
   {
      string s = upper + sfx[i];
      if (SymbolSelect(s, true) && SymbolInfoDouble(s, SYMBOL_BID) > 0) return s;
   }

   string synthMap[][2] = {
      // Standard Volatility indices
      {"R_10",      "Volatility 10 Index"},
      {"R_25",      "Volatility 25 Index"},
      {"R_50",      "Volatility 50 Index"},
      {"R_75",      "Volatility 75 Index"},
      {"R_100",     "Volatility 100 Index"},
      // 1-second Volatility indices
      {"1HZ10V",    "Volatility 10 (1s) Index"},
      {"1HZ25V",    "Volatility 25 (1s) Index"},
      {"1HZ50V",    "Volatility 50 (1s) Index"},
      {"1HZ75V",    "Volatility 75 (1s) Index"},
      {"1HZ100V",   "Volatility 100 (1s) Index"},
      // Boom indices
      {"BOOM500",   "Boom 500 Index"},
      {"BOOM1000",  "Boom 1000 Index"},
      // Crash indices
      {"CRASH500",  "Crash 500 Index"},
      {"CRASH1000", "Crash 1000 Index"},
      // Jump indices
      {"JD10",      "Jump 10 Index"},
      {"JD25",      "Jump 25 Index"},
      {"JD50",      "Jump 50 Index"},
      {"JD75",      "Jump 75 Index"},
      {"JD100",     "Jump 100 Index"},
   };
   for (int i = 0; i < ArraySize(synthMap) / 2; i++)
   {
      if (upper == synthMap[i][0])
      {
         string s = synthMap[i][1];
         if (SymbolSelect(s, true) && SymbolInfoDouble(s, SYMBOL_BID) > 0) return s;
      }
   }
   return "";
}

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

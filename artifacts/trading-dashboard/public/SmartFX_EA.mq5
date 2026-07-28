//+------------------------------------------------------------------+
//|                                            SmartFX_EA.mq5        |
//|                       SmartFX AI Trading System v4.0             |
//|                       https://smart-fx-tool.site                 |
//+------------------------------------------------------------------+
//
//  HOW TO INSTALL
//  ──────────────
//  1. Copy this file to:
//       <MT5 Data Folder>\MQL5\Experts\SmartFX_EA.mq5
//  2. Open MetaEditor, compile (F7) — must show 0 errors, 0 warnings.
//  3. In MT5: Tools → Options → Expert Advisors
//       ✔  Allow algorithmic trading
//       ✔  Allow WebRequests for listed URLs
//       Add URL:  https://smart-fx-tool.site
//  4. Drag EA onto any chart. Configure inputs then click OK.
//  5. Experts log tab should show "SmartFX EA v4.0 started".
//
//  WHAT IT DOES (v4.0 — Real-Money Production Flow)
//  ─────────────────────────────────────────────────
//  • Signals are PENDING until price touches the entry (server-side).
//    EA only ever sees ACTIVE signals — price has already arrived.
//    All entries are MARKET ORDERS (no more limit order delays).
//
//  • Sequential multi-trade execution:
//    EA reports open_count on every poll.  Server controls the cap.
//    After one trade opens, EA keeps polling and opens the next
//    signal immediately — until maxOpenTrades is reached.
//
//  • Kill switch: server returns {"halted":true} → EA pauses entirely.
//    Resume from dashboard or MT5 Setup → EA Settings → Kill Switch.
//
//  • Risk-based lot sizing: server calculates lots from
//    (account balance × risk%) / (SL distance × pip value) and
//    returns "lots" in the signal.  EA normalises to broker limits.
//
//  • Spread filter: EA reports current symbol spread; server rejects
//    signals when spread exceeds maxSpreadPips setting.
//
//  • Daily loss circuit breaker enforced server-side.
//    EA also enforces locally as a second safety layer.
//
//  CHANGELOG v4.0
//  ──────────────
//  • Market orders instead of limit orders (entry already hit)
//  • Sequential execution: open_count sent on every poll
//  • Risk-based lots from signal response ("lots" field)
//  • Kill switch: halted=true from server stops all activity
//  • Spread reported on every signal poll
//  • Balance sent on every signal poll for server lot calc
//  • Trades persisted to DB on server (survive restarts)
//  • maxOpenTrades read from settings
//  • Version bump to 4.0
//
//+------------------------------------------------------------------+
#property copyright "SmartFX AI"
#property version   "4.00"
#property strict

#include <Trade\Trade.mqh>

//── Inputs ─────────────────────────────────────────────────────────
input string  InpApiUrl          = "https://smart-fx-tool.site"; // API base URL
input double  InpLotSize         = 0.01;     // Fallback lot size (overridden by server risk calc)
input int     InpMagicNumber     = 20260725; // Magic number (unique per EA instance)
input int     InpMinConfidence   = 30;       // Min signal confidence % (overridden by dashboard)
input int     InpPollSeconds     = 10;       // Poll interval in seconds

//── Globals ─────────────────────────────────────────────────────────
CTrade   g_trade;

string   g_lastSignalId    = "0";
string   g_lastClosedSym   = "";
int      g_totalTrades     = 0;
bool     g_dailyStopped    = false;
bool     g_serverHalted    = false;   // kill switch from dashboard
double   g_sessionStart    = 0;

datetime g_tsBalance       = 0;
datetime g_tsPositions     = 0;
datetime g_tsSettings      = 0;

double   g_setProfitTarget   = 0;
double   g_setLossLimit      = 0;
double   g_setLotSize        = 0;
int      g_setMinConf        = 0;
double   g_setMinProfitClose = 0;
int      g_setMaxOpenTrades  = 3;    // server-controlled cap

//── Broker symbol resolution table ──────────────────────────────────
string SYN_KEY[] = {
   "R_10","R_25","R_50","R_75","R_100",
   "1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V",
   "BOOM500","BOOM1000","CRASH500","CRASH1000",
   "JD10","JD25","JD50","JD75","JD100"
};
string SYN_NAME[] = {
   "Volatility 10 Index","Volatility 25 Index","Volatility 50 Index",
   "Volatility 75 Index","Volatility 100 Index",
   "Volatility 10 (1s) Index","Volatility 25 (1s) Index","Volatility 50 (1s) Index",
   "Volatility 75 (1s) Index","Volatility 100 (1s) Index",
   "Boom 500 Index","Boom 1000 Index","Crash 500 Index","Crash 1000 Index",
   "Jump 10 Index","Jump 25 Index","Jump 50 Index","Jump 75 Index","Jump 100 Index"
};

//+------------------------------------------------------------------+
//| Effective-value helpers — dashboard setting wins over EA input    |
//+------------------------------------------------------------------+
double LotSize()        { return (g_setLotSize  >= 0.01) ? g_setLotSize  : InpLotSize;      }
int    MinConf()        { return (g_setMinConf  >= 1)    ? g_setMinConf  : InpMinConfidence; }
double ProfitTarget()   { return g_setProfitTarget;   }
double LossLimit()      { return g_setLossLimit;      }
double MinProfitClose() { return g_setMinProfitClose; }
int    MaxOpenTrades()  { return (g_setMaxOpenTrades >= 1) ? g_setMaxOpenTrades : 3; }

//+------------------------------------------------------------------+
//| Count positions belonging to this EA                             |
//+------------------------------------------------------------------+
int CountMyPositions()
{
   int count = 0;
   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if (PositionSelectByTicket(t) &&
          (int)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         count++;
   }
   return count;
}

//+------------------------------------------------------------------+
//| Init                                                              |
//+------------------------------------------------------------------+
int OnInit()
{
   g_trade.SetExpertMagicNumber(InpMagicNumber);
   g_trade.SetDeviationInPoints(10);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   g_sessionStart = AccountInfoDouble(ACCOUNT_EQUITY);
   g_dailyStopped = false;
   g_serverHalted = false;

   EventSetTimer(InpPollSeconds);
   Print("SmartFX EA v4.0 started | Balance: ",
         DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2),
         " | API: ", InpApiUrl);
   RefreshComment();
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Deinit                                                            |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Comment("");
   Print("SmartFX EA stopped. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Main timer tick                                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   SyncSettings();
   if (g_serverHalted)   { RefreshComment(); return; }   // kill switch
   if (CheckDailyLimits()) return;
   CheckFloatingProfit();
   ProcessForceQueue();
   FetchAndTrade();
   PushPositions();
   PushBalance();
}

//+------------------------------------------------------------------+
//| Sync settings from dashboard every 60 s                           |
//+------------------------------------------------------------------+
void SyncSettings()
{
   if (TimeCurrent() - g_tsSettings < 60) return;
   g_tsSettings = TimeCurrent();

   string json = HttpGet(InpApiUrl + "/api/ea/settings");
   if (json == "") return;

   double pt  = JsNum(json, "dailyProfitTarget");
   double ll  = JsNum(json, "dailyLossLimit");
   double lot = JsNum(json, "lotSize");
   int    mc  = (int)JsNum(json, "minConfidence");
   double mp  = JsNum(json, "minProfitClose");
   int    mot = (int)JsNum(json, "maxOpenTrades");

   // Read halted flag — "true" is returned as 1 by JsNum via bool coercion
   // Parse it directly from the raw JSON
   bool halted = (StringFind(json, "\"halted\":true") >= 0);

   bool changed = (pt  != g_setProfitTarget   || ll  != g_setLossLimit  ||
                   lot != g_setLotSize         || mc  != g_setMinConf    ||
                   mp  != g_setMinProfitClose  || mot != g_setMaxOpenTrades ||
                   halted != g_serverHalted);

   g_setProfitTarget   = (pt  >= 0)    ? pt  : 0;
   g_setLossLimit      = (ll  >= 0)    ? ll  : 0;
   g_setLotSize        = (lot >= 0.01) ? lot : 0;
   g_setMinConf        = (mc  >= 1)    ? mc  : 0;
   g_setMinProfitClose = (mp  >= 0)    ? mp  : 0;
   g_setMaxOpenTrades  = (mot >= 1)    ? mot : 3;
   g_serverHalted      = halted;

   if (changed)
      Print("SmartFX: Settings — Lots:", LotSize(),
            " MinConf:", MinConf(), "%",
            " MaxTrades:", MaxOpenTrades(),
            " Target:$", ProfitTarget(),
            " Limit:-$", LossLimit(),
            " MinClose:$", MinProfitClose(),
            " Halted:", (g_serverHalted ? "YES" : "NO"));
   RefreshComment();
}

//+------------------------------------------------------------------+
//| Daily profit / loss guard — returns true → stop trading           |
//+------------------------------------------------------------------+
bool CheckDailyLimits()
{
   if (g_dailyStopped) return true;

   double pt = ProfitTarget();
   double ll = LossLimit();
   if (pt <= 0 && ll <= 0) return false;

   double pnl       = AccountInfoDouble(ACCOUNT_EQUITY) - g_sessionStart;
   bool   hitProfit = (pt > 0 && pnl >=  pt);
   bool   hitLoss   = (ll > 0 && pnl <= -ll);
   if (!hitProfit && !hitLoss) return false;

   string reason = hitProfit ? "PROFIT TARGET HIT" : "LOSS LIMIT HIT";
   Print("SmartFX: *** ", reason, " *** P&L:$", DoubleToString(pnl, 2));

   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if (PositionSelectByTicket(t) &&
          (int)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         g_trade.PositionClose(t);
   }

   g_dailyStopped = true;
   Comment("SmartFX v4.0 | *** STOPPED — ", reason, " ***");
   return true;
}

//+------------------------------------------------------------------+
//| Close early when floating profit >= minProfitClose                |
//+------------------------------------------------------------------+
void CheckFloatingProfit()
{
   double thr = MinProfitClose();
   if (thr <= 0) return;

   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if (!PositionSelectByTicket(t)) continue;
      if ((int)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;

      double profit = PositionGetDouble(POSITION_PROFIT);
      if (profit >= thr)
      {
         string sym = PositionGetString(POSITION_SYMBOL);
         Print("SmartFX: MinProfitClose $", DoubleToString(thr, 2),
               " reached ($", DoubleToString(profit, 2), ") — closing ", sym);
         g_trade.PositionClose(t);
      }
   }
}

//+------------------------------------------------------------------+
//| Auto-signal: fetch next signal, execute at MARKET                 |
//|                                                                    |
//| v4.0 changes:                                                      |
//|  • Sends open_count — server controls max concurrent trades cap.   |
//|  • Sends balance — server calculates risk-based lot size.          |
//|  • Sends spread — server rejects if too wide.                      |
//|  • Uses server-calculated "lots" from signal response.             |
//|  • Handles {"halted":true} response — kill switch.                 |
//|  • Market order (not limit) — signals already at entry.            |
//+------------------------------------------------------------------+
void FetchAndTrade()
{
   int openCount = CountMyPositions();

   // ── HARD RULE: one position at a time ───────────────────────────
   // Do not even poll the server if any position belonging to this EA
   // is still open. Wait for it to close (SL, TP, or MinProfitClose),
   // then the next timer tick will pick up the next signal.
   if (openCount > 0)
   {
      RefreshComment();
      return;
   }

   // Build signal URL with production parameters
   double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
   double ask      = 0, bid = 0;
   // Get spread on the chart symbol as an approximation (in points → pips)
   double spreadPts = (double)SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   double pointVal  = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double pipSize   = (StringFind(_Symbol, "JPY") >= 0 || StringFind(_Symbol, "XAU") >= 0)
                      ? pointVal * 100 : pointVal * 10;
   double spreadPips = (pipSize > 0) ? (spreadPts * pointVal) / pipSize : 0;

   string url = InpApiUrl + "/api/ea/signal"
              + "?min_confidence=" + IntegerToString(MinConf())
              + "&last_id="        + g_lastSignalId
              + "&open_count="     + IntegerToString(openCount)
              + "&balance="        + DoubleToString(balance, 2)
              + "&spread="         + DoubleToString(spreadPips, 2);

   string json = HttpGet(url);
   if (json == "" || json == "null") { RefreshComment(); return; }

   // Kill switch from server
   if (StringFind(json, "\"halted\":true") >= 0)
   {
      if (!g_serverHalted)
      {
         g_serverHalted = true;
         Print("SmartFX: *** KILL SWITCH ACTIVE — EA halted by dashboard ***");
      }
      RefreshComment();
      return;
   }

   if (StringFind(json, "\"id\"") < 0) { RefreshComment(); return; }

   string sigId = JsStr(json, "id");
   string pair  = JsStr(json, "pair");
   string dir   = JsStr(json, "direction");
   double entry = JsNum(json, "entry");
   double sl    = JsNum(json, "sl");
   double tp    = JsNum(json, "tp");
   int    conf  = (int)JsNum(json, "confidence");
   string tf    = JsStr(json, "timeframe");
   double srvLots = JsNum(json, "lots");    // risk-calculated lots from server

   if (sigId == "" || sigId == g_lastSignalId) { RefreshComment(); return; }

   string symbol = ResolveSymbol(pair);

   if (symbol == g_lastClosedSym && g_lastClosedSym != "")
   {
      Print("SmartFX: Cooldown on ", pair, " — same as last closed pair");
      g_lastSignalId = sigId;
      return;
   }
   if (symbol == "")
   {
      Print("SmartFX: Symbol not found [", pair, "] — skipped");
      g_lastSignalId = sigId;
      return;
   }

   // Use server-calculated lots if available, else fall back to settings lot size
   double rawLots = (srvLots >= 0.01) ? srvLots : LotSize();
   double lots    = NormalizeLots(symbol, rawLots);
   if (lots <= 0) { g_lastSignalId = sigId; return; }

   // ── SL/TP sanity check — reject collapsed/invalid stops ─────────
   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double minStop = SymbolInfoDouble(symbol, SYMBOL_POINT)
                    * (double)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL)
                    * 2;   // 2× broker minimum stop distance
   if (dir == "BUY")
   {
      if (sl <= 0 || sl >= bid || tp <= 0 || tp <= bid)
      { Print("SmartFX: SKIP signal #", sigId, " — invalid BUY stops SL:", sl, " TP:", tp, " bid:", bid);
        g_lastSignalId = sigId; return; }
   }
   else
   {
      if (sl <= 0 || sl <= bid || tp <= 0 || tp >= bid)
      { Print("SmartFX: SKIP signal #", sigId, " — invalid SELL stops SL:", sl, " TP:", tp, " bid:", bid);
        g_lastSignalId = sigId; return; }
   }
   if (MathAbs(sl - tp) < minStop)
   { Print("SmartFX: SKIP signal #", sigId, " — SL/TP too close or identical SL:", sl, " TP:", tp);
     g_lastSignalId = sigId; return; }

   Print("SmartFX: Signal #", sigId, " | ", dir, " ", pair,
         " Entry:", DoubleToString(entry, 5),
         " SL:", DoubleToString(sl, 5), " TP:", DoubleToString(tp, 5),
         " Conf:", conf, "% TF:", tf,
         " Lots:", DoubleToString(lots, 2),
         " (", openCount, "/", MaxOpenTrades(), " open)");

   // ── Execute at MARKET — entry is already hit (signal was PENDING→ACTIVE) ──
   bool placed = false;
   if (dir == "BUY")
      placed = g_trade.Buy (lots, symbol, 0, sl, tp, "SmartFX #" + sigId);
   else
      placed = g_trade.Sell(lots, symbol, 0, sl, tp, "SmartFX #" + sigId);

   g_lastSignalId = sigId;

   if (placed)
   {
      g_totalTrades++;
      Print("SmartFX: Market order placed — ticket ", g_trade.ResultOrder(),
            " | ", dir, " ", symbol, " @ market",
            " Lots:", DoubleToString(lots, 2));
      ReportTrade(g_trade.ResultOrder(), symbol, dir, lots,
                  g_trade.ResultPrice(), sl, tp, sigId, conf, tf);
   }
   else
      Print("SmartFX: Order FAILED (", g_trade.ResultRetcode(), " — ",
            g_trade.ResultRetcodeDescription(), ")");

   RefreshComment();
}

//+------------------------------------------------------------------+
//| Manual-execute: process force-queue from dashboard                |
//+------------------------------------------------------------------+
void ProcessForceQueue()
{
   // ── HARD RULE: one position at a time (manual trades too) ───────
   if (CountMyPositions() > 0)
   {
      // Mark the queued item done so it doesn't pile up, then bail
      // Actually we just bail — item stays pending until position closes
      return;
   }

   string json = HttpGet(InpApiUrl + "/api/ea/force-queue");
   if (json == "" || json == "[]")      return;
   if (StringFind(json, "\"id\"") < 0) return;

   int objStart = StringFind(json, "{");
   int objEnd   = StringFind(json, "}", objStart);
   if (objStart < 0 || objEnd < 0) return;

   string item  = StringSubstr(json, objStart, objEnd - objStart + 1);
   string fqId  = JsStr(item, "id");
   string pair  = JsStr(item, "pair");
   string dir   = JsStr(item, "direction");
   double lots  = JsNum(item, "lotSize");
   double sl    = JsNum(item, "sl");
   double tp    = JsNum(item, "tp");
   string sigId = JsStr(item, "signalId");
   int    conf  = (int)JsNum(item, "confidence");
   string tf    = JsStr(item, "timeframe");

   if (fqId == "" || pair == "" || dir == "") return;

   MarkForceDone(fqId);

   string symbol = ResolveSymbol(pair);
   if (symbol == "") { Print("SmartFX MANUAL: Symbol not found [", pair, "]"); return; }

   if (lots <= 0) lots = LotSize();
   double requestedLots = lots;
   lots = NormalizeLots(symbol, lots);
   if (lots <= 0) return;

   // ── Broker minimum sanity check ─────────────────────────────────
   if (lots > requestedLots * 50)
   {
      Print("SmartFX MANUAL: SKIPPED — broker minimum (", DoubleToString(lots, 2),
            ") far exceeds requested (", DoubleToString(requestedLots, 2), "). Use a forex pair.");
      return;
   }

   // ── SL/TP sanity check — reject collapsed/invalid stops ─────────
   double mbid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double mMinStop = SymbolInfoDouble(symbol, SYMBOL_POINT)
                     * (double)SymbolInfoInteger(symbol, SYMBOL_TRADE_STOPS_LEVEL)
                     * 2;
   bool slTpValid = true;
   if (dir == "BUY"  && (sl <= 0 || sl >= mbid || tp <= 0 || tp <= mbid)) slTpValid = false;
   if (dir == "SELL" && (sl <= 0 || sl <= mbid || tp <= 0 || tp >= mbid)) slTpValid = false;
   if (MathAbs(sl - tp) < mMinStop) slTpValid = false;
   if (!slTpValid)
   {
      Print("SmartFX MANUAL: SKIPPED — invalid stops SL:", DoubleToString(sl,5),
            " TP:", DoubleToString(tp,5), " bid:", DoubleToString(mbid,5));
      return;
   }

   bool placed = false;
   if (dir == "BUY")  placed = g_trade.Buy (lots, symbol, 0, sl, tp, "SmartFX-Manual #" + sigId);
   if (dir == "SELL") placed = g_trade.Sell(lots, symbol, 0, sl, tp, "SmartFX-Manual #" + sigId);

   if (placed)
   {
      g_totalTrades++;
      Print("SmartFX MANUAL: ticket ", g_trade.ResultOrder(),
            " | ", dir, " ", symbol, " Lots:", DoubleToString(lots, 2));
      ReportTrade(g_trade.ResultOrder(), symbol, dir, lots,
                  g_trade.ResultPrice(), sl, tp, sigId, conf, tf);
   }
   else
      Print("SmartFX MANUAL: FAILED (", g_trade.ResultRetcode(), " — ",
            g_trade.ResultRetcodeDescription(), ")");

   RefreshComment();
}

void MarkForceDone(string fqId)
{
   string url = InpApiUrl + "/api/ea/force-queue/" + fqId + "/done";
   char   body[], resp[];
   string hdrs;
   StringToCharArray("{}", body);
   WebRequest("POST", url, "Content-Type: application/json\r\n",
              5000, body, resp, hdrs);
}

//+------------------------------------------------------------------+
//| Push open positions to dashboard every 10 s                       |
//+------------------------------------------------------------------+
void PushPositions()
{
   if (TimeCurrent() - g_tsPositions < 10) return;
   g_tsPositions = TimeCurrent();

   long   login = AccountInfoInteger(ACCOUNT_LOGIN);
   string json  = "[";
   bool   first = true;

   for (int i = 0; i < PositionsTotal(); i++)
   {
      ulong t = PositionGetTicket(i);
      if (!PositionSelectByTicket(t)) continue;
      if ((int)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;

      string sym    = PositionGetString(POSITION_SYMBOL);
      long   ptype  = PositionGetInteger(POSITION_TYPE);
      string posDir = (ptype == POSITION_TYPE_BUY) ? "BUY" : "SELL";
      string cmt    = PositionGetString(POSITION_COMMENT);
      string sigId  = "";
      int    hp     = StringFind(cmt, "#");
      if (hp >= 0) sigId = StringSubstr(cmt, hp + 1);

      if (!first) json += ",";
      first = false;
      json += StringFormat(
         "{\"ticket\":\"%I64u\",\"login\":\"%I64d\",\"symbol\":\"%s\","
         "\"direction\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,"
         "\"currentPrice\":%.5f,\"sl\":%.5f,\"tp\":%.5f,"
         "\"profit\":%.2f,\"signalId\":\"%s\"}",
         t, login, sym, posDir,
         PositionGetDouble(POSITION_VOLUME),
         PositionGetDouble(POSITION_PRICE_OPEN),
         PositionGetDouble(POSITION_PRICE_CURRENT),
         PositionGetDouble(POSITION_SL),
         PositionGetDouble(POSITION_TP),
         PositionGetDouble(POSITION_PROFIT),
         sigId
      );
   }
   json += "]";

   HttpPost(InpApiUrl + "/api/ea/positions", json);
}

//+------------------------------------------------------------------+
//| Push account balance to dashboard every 15 s                      |
//+------------------------------------------------------------------+
void PushBalance()
{
   if (TimeCurrent() - g_tsBalance < 15) return;
   g_tsBalance = TimeCurrent();

   long   login  = AccountInfoInteger(ACCOUNT_LOGIN);
   double bal    = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq     = AccountInfoDouble(ACCOUNT_EQUITY);
   string cur    = AccountInfoString(ACCOUNT_CURRENCY);
   string srv    = AccountInfoString(ACCOUNT_SERVER);
   long   mode   = AccountInfoInteger(ACCOUNT_TRADE_MODE);
   string atype  = (mode == ACCOUNT_TRADE_MODE_DEMO) ? "demo" : "real";

   string json = StringFormat(
      "{\"login\":\"%I64d\",\"balance\":%.2f,\"equity\":%.2f,"
      "\"currency\":\"%s\",\"server\":\"%s\",\"accountType\":\"%s\"}",
      login, bal, eq, cur, srv, atype
   );
   HttpPost(InpApiUrl + "/api/ea/balance", json);
}

//+------------------------------------------------------------------+
//| Report a trade open or close to the dashboard                     |
//+------------------------------------------------------------------+
void ReportTrade(ulong ticket, string symbol, string direction,
                 double lots, double openPx, double sl, double tp,
                 string sigId, int confidence, string timeframe,
                 string status = "OPEN", double closePrice = 0, double profit = 0)
{
   long   login = AccountInfoInteger(ACCOUNT_LOGIN);
   string json;

   if (status == "CLOSED")
      json = StringFormat(
         "{\"ticket\":\"%I64u\",\"login\":\"%I64d\",\"symbol\":\"%s\","
         "\"direction\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,"
         "\"sl\":%.5f,\"tp\":%.5f,\"signalId\":\"%s\","
         "\"confidence\":%d,\"timeframe\":\"%s\",\"status\":\"CLOSED\","
         "\"closePrice\":%.5f,\"profit\":%.2f}",
         ticket, login, symbol, direction, lots, openPx,
         sl, tp, sigId, confidence, timeframe, closePrice, profit
      );
   else
      json = StringFormat(
         "{\"ticket\":\"%I64u\",\"login\":\"%I64d\",\"symbol\":\"%s\","
         "\"direction\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,"
         "\"sl\":%.5f,\"tp\":%.5f,\"signalId\":\"%s\","
         "\"confidence\":%d,\"timeframe\":\"%s\",\"status\":\"OPEN\"}",
         ticket, login, symbol, direction, lots, openPx,
         sl, tp, sigId, confidence, timeframe
      );

   HttpPost(InpApiUrl + "/api/ea/trade", json);
}

//+------------------------------------------------------------------+
//| Detect trade close — report to dashboard immediately              |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &request,
                        const MqlTradeResult      &result)
{
   if (trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
   if (!HistoryDealSelect(trans.deal))           return;

   long magic     = HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
   long dealEntry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   if (magic != (long)InpMagicNumber)         return;
   if (dealEntry != (long)DEAL_ENTRY_OUT)     return;

   string sym        = HistoryDealGetString(trans.deal, DEAL_SYMBOL);
   double closePrice = HistoryDealGetDouble(trans.deal, DEAL_PRICE);
   double profit     = HistoryDealGetDouble(trans.deal, DEAL_PROFIT);
   long   dealType   = HistoryDealGetInteger(trans.deal, DEAL_TYPE);
   string dir        = (dealType == (long)DEAL_TYPE_BUY) ? "BUY" : "SELL";
   ulong  ticket     = (ulong)HistoryDealGetInteger(trans.deal, DEAL_ORDER);

   g_lastClosedSym = sym;

   Print("SmartFX: Closed [", (profit >= 0 ? "PROFIT" : "LOSS"), "] ",
         sym, " P&L:$", DoubleToString(profit, 2));

   ReportTrade(ticket, sym, dir, 0, 0, 0, 0, "", 0, "",
               "CLOSED", closePrice, profit);
   RefreshComment();
}

//+------------------------------------------------------------------+
//| Chart comment                                                      |
//+------------------------------------------------------------------+
void RefreshComment()
{
   double pnl  = AccountInfoDouble(ACCOUNT_EQUITY) - g_sessionStart;
   int    open = CountMyPositions();

   string st;
   if (g_serverHalted)    st = "HALTED — kill switch ON";
   else if (g_dailyStopped) st = "STOPPED — daily limit";
   else if (open > 0)       st = StringFormat("%d trade(s) open", open);
   else                     st = "Waiting for signal";

   string ex = "";
   if (ProfitTarget()    > 0) ex += StringFormat(" Target:$%.0f", ProfitTarget());
   if (LossLimit()       > 0) ex += StringFormat(" Limit:-$%.0f", LossLimit());
   if (MaxOpenTrades()   > 0) ex += StringFormat(" MaxTrades:%d", MaxOpenTrades());

   Comment("SmartFX v4.0 | ", st,
           " | Trades:", g_totalTrades,
           " | P&L:$", DoubleToString(pnl, 2),
           " | Lots:", DoubleToString(LotSize(), 2), ex);
}

//+------------------------------------------------------------------+
//| Lot normalisation                                                 |
//+------------------------------------------------------------------+
double NormalizeLots(const string &symbol, double lots)
{
   double minVol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxVol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);
   double step   = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   if (step   <= 0) step   = 0.01;
   if (minVol <= 0) minVol = 0.01;
   lots = MathRound(lots / step) * step;
   lots = MathMax(lots, minVol);
   lots = MathMin(lots, maxVol);
   return NormalizeDouble(lots, 2);
}

//+------------------------------------------------------------------+
//| Symbol resolver                                                   |
//+------------------------------------------------------------------+
string ResolveSymbol(const string &pair)
{
   string s = pair;
   StringToUpper(s);

   if (SymbolSelect(s, true) && SymbolInfoDouble(s, SYMBOL_BID) > 0) return s;

   string sfx[] = {".", "+", "m", "_", "pro", "n", "ECN", "c"};
   for (int i = 0; i < ArraySize(sfx); i++)
   {
      string c = s + sfx[i];
      if (SymbolSelect(c, true) && SymbolInfoDouble(c, SYMBOL_BID) > 0) return c;
   }

   int sz = ArraySize(SYN_KEY);
   for (int i = 0; i < sz; i++)
   {
      if (s == SYN_KEY[i])
      {
         string c = SYN_NAME[i];
         if (SymbolSelect(c, true) && SymbolInfoDouble(c, SYMBOL_BID) > 0) return c;
      }
   }
   return "";
}

//+------------------------------------------------------------------+
//| HTTP GET helper                                                    |
//+------------------------------------------------------------------+
string HttpGet(string url)
{
   char   postData[], response[];
   string headers;
   ArrayResize(postData, 0);
   int code = WebRequest("GET", url,
                         "Content-Type: application/json\r\n",
                         8000, postData, response, headers);
   if (code == -1)
   {
      int err = GetLastError();
      if (err == 4060)
         Print("SmartFX: WebRequest blocked — add '", InpApiUrl,
               "' in MT5 Tools → Options → Expert Advisors → Allowed URLs");
      return "";
   }
   if (code != 200) return "";
   string body = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
   StringTrimLeft(body);
   StringTrimRight(body);
   return body;
}

//+------------------------------------------------------------------+
//| HTTP POST helper                                                   |
//+------------------------------------------------------------------+
void HttpPost(string url, string jsonBody)
{
   char   postData[], response[];
   string headers;
   StringToCharArray(jsonBody, postData);
   int sz = ArraySize(postData);
   if (sz > 0 && postData[sz - 1] == 0) ArrayResize(postData, sz - 1);
   WebRequest("POST", url,
              "Content-Type: application/json\r\n",
              5000, postData, response, headers);
}

//+------------------------------------------------------------------+
//| Minimal JSON parsers                                              |
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

double JsNum(const string &json, const string &key)
{
   string search = "\"" + key + "\":";
   int pos = StringFind(json, search);
   if (pos < 0) return 0;
   pos += StringLen(search);
   int len = StringLen(json);
   while (pos < len && StringGetCharacter(json, pos) == ' ') pos++;
   int end = pos;
   while (end < len)
   {
      ushort c = StringGetCharacter(json, end);
      if (c == ',' || c == '}' || c == ']' || c == ' ' ||
          c == '\n' || c == '\r') break;
      end++;
   }
   string v = StringSubstr(json, pos, end - pos);
   if (v == "" || v == "null" || v == "true" || v == "false") return 0;
   return StringToDouble(v);
}

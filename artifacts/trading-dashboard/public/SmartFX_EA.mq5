//+------------------------------------------------------------------+
//|                                            SmartFX_EA.mq5        |
//|                       SmartFX AI Trading System v3.0             |
//|                       https://smart-fx-tool.site                 |
//+------------------------------------------------------------------+
//
//  HOW TO INSTALL
//  ──────────────
//  1. Copy this file to:
//       <MT5 Data Folder>\MQL5\Experts\SmartFX_EA.mq5
//  2. Open MetaEditor, compile (F7) — must show 0 errors.
//  3. In MT5: Tools → Options → Expert Advisors
//       ✔  Allow algorithmic trading
//       ✔  Allow WebRequests for listed URLs
//       Add URL:  https://smart-fx-tool.site
//  4. Drag EA onto any chart. Set inputs (lot size, magic number).
//  5. Check the Experts log tab — you should see "SmartFX EA v3.0 started".
//
//  WHAT IT DOES
//  ────────────
//  • Every 10 s: fetches the latest high-confidence signal from the dashboard
//  • Places a LIMIT order at the signal's entry price (no blind market entries)
//  • Skips if an order or position already exists (one trade at a time)
//  • Every 10 s: reports open positions back to the dashboard
//  • Every 15 s: reports account balance to the dashboard
//  • Every 60 s: syncs lot size / confidence / daily target from dashboard settings
//  • Stops trading for the day when daily profit target OR loss limit is hit
//  • Reports every trade open AND close to the dashboard
//
//+------------------------------------------------------------------+
#property copyright "SmartFX AI"
#property version   "3.00"
#property strict

#include <Trade\Trade.mqh>

//── Inputs ─────────────────────────────────────────────────────────
input string  InpApiUrl          = "https://smart-fx-tool.site"; // API base URL
input double  InpLotSize         = 0.01;   // Default lot size (overridden by dashboard)
input int     InpMagicNumber     = 20260725; // Magic number (must be unique per EA instance)
input int     InpMinConfidence   = 80;     // Minimum signal confidence % (overridden by dashboard)
input int     InpPollSeconds     = 10;     // Poll interval in seconds
input int     InpOrderExpireMins = 60;     // Pending limit-order expiry in minutes

//── Globals ─────────────────────────────────────────────────────────
CTrade   g_trade;

// State tracking
string   g_lastSignalId   = "0";   // last signal ID fetched (prevent re-entry)
string   g_lastClosedSym  = "";    // symbol of last closed trade (brief cooldown)
int      g_totalTrades    = 0;     // session trade counter
bool     g_dailyStopped   = false; // true after daily target/limit hit
double   g_sessionStart   = 0;     // equity at EA start (baseline for daily P&L)

// Rate-limit timestamps
datetime g_tsBalance      = 0;
datetime g_tsPositions    = 0;
datetime g_tsSettings     = 0;

// Dashboard-synced settings (override inputs when > 0)
double   g_setProfitTarget  = 0;
double   g_setLossLimit     = 0;
double   g_setLotSize       = 0;
int      g_setMinConf       = 0;
double   g_setMinProfitClose= 0;

//+------------------------------------------------------------------+
//| Effective helpers — dashboard setting wins over EA input          |
//+------------------------------------------------------------------+
double LotSize()       { return (g_setLotSize  >= 0.01) ? g_setLotSize  : InpLotSize;         }
int    MinConf()       { return (g_setMinConf  >= 1)    ? g_setMinConf  : InpMinConfidence;    }
double ProfitTarget()  { return g_setProfitTarget;  }
double LossLimit()     { return g_setLossLimit;     }
double MinProfitClose(){ return g_setMinProfitClose; }

//+------------------------------------------------------------------+
//| Init                                                              |
//+------------------------------------------------------------------+
int OnInit()
{
   g_trade.SetExpertMagicNumber(InpMagicNumber);
   g_trade.SetDeviationInPoints(10);
   g_trade.SetTypeFilling(ORDER_FILLING_IOC);

   g_sessionStart  = AccountInfoDouble(ACCOUNT_EQUITY);
   g_dailyStopped  = false;

   EventSetTimer(InpPollSeconds);

   Print("SmartFX EA v3.0 started | Balance: ",
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
   Print("SmartFX EA stopped. Reason code: ", reason);
}

//+------------------------------------------------------------------+
//| Main timer tick                                                   |
//+------------------------------------------------------------------+
void OnTimer()
{
   SyncSettings();            // pull dashboard settings every 60s
   if (CheckDailyLimits()) return;
   CheckFloatingProfit();     // close early if min-profit-close threshold hit
   ProcessForceQueue();       // manual-execute orders pushed from dashboard
   FetchAndTrade();           // auto-signal: one trade at a time
   PushPositions();           // push open positions to dashboard every 10s
   PushBalance();             // push account balance to dashboard every 15s
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

   double pt  = (double)JsNum(json, "dailyProfitTarget");
   double ll  = (double)JsNum(json, "dailyLossLimit");
   double lot = (double)JsNum(json, "lotSize");
   int    mc  = (int)JsNum(json, "minConfidence");
   double mp  = (double)JsNum(json, "minProfitClose");

   bool changed = (pt != g_setProfitTarget || ll != g_setLossLimit ||
                   lot != g_setLotSize      || mc != g_setMinConf   ||
                   mp  != g_setMinProfitClose);

   g_setProfitTarget   = (pt  >= 0)    ? pt  : 0;
   g_setLossLimit      = (ll  >= 0)    ? ll  : 0;
   g_setLotSize        = (lot >= 0.01) ? lot : 0;
   g_setMinConf        = (mc  >= 1)    ? mc  : 0;
   g_setMinProfitClose = (mp  >= 0)    ? mp  : 0;

   if (changed)
      Print("SmartFX: Settings synced — Lots:", LotSize(),
            " | MinConf:", MinConf(), "%",
            " | ProfitTarget:$", ProfitTarget(),
            " | LossLimit:-$", LossLimit(),
            " | MinProfitClose:$", MinProfitClose());
   RefreshComment();
}

//+------------------------------------------------------------------+
//| Daily profit target / loss limit guard                            |
//| Returns true when EA should stop trading for the day              |
//+------------------------------------------------------------------+
bool CheckDailyLimits()
{
   if (g_dailyStopped) return true;

   double pt = ProfitTarget();
   double ll = LossLimit();
   if (pt <= 0 && ll <= 0) return false;

   double pnl      = AccountInfoDouble(ACCOUNT_EQUITY) - g_sessionStart;
   bool   hitProfit = (pt > 0 && pnl >=  pt);
   bool   hitLoss   = (ll > 0 && pnl <= -ll);
   if (!hitProfit && !hitLoss) return false;

   string reason = hitProfit ? "PROFIT TARGET HIT" : "LOSS LIMIT HIT";
   Print("SmartFX: *** ", reason, " *** Session P&L: $",
         DoubleToString(pnl, 2), " — closing all & stopping");

   // Close every open position owned by this EA
   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if (PositionSelectByTicket(t) &&
          (int)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         g_trade.PositionClose(t);
   }
   // Cancel every pending order
   for (int i = OrdersTotal() - 1; i >= 0; i--)
   {
      ulong t = OrderGetTicket(i);
      if (OrderSelect(t) &&
          (int)OrderGetInteger(ORDER_MAGIC) == InpMagicNumber)
         g_trade.OrderDelete(t);
   }

   g_dailyStopped = true;
   Comment("SmartFX v3.0 | *** STOPPED — ", reason, " ***");
   return true;
}

//+------------------------------------------------------------------+
//| Close position early when floating profit >= minProfitClose       |
//+------------------------------------------------------------------+
void CheckFloatingProfit()
{
   double threshold = MinProfitClose();
   if (threshold <= 0) return;

   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if (!PositionSelectByTicket(t)) continue;
      if ((int)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;

      double profit = PositionGetDouble(POSITION_PROFIT);
      if (profit >= threshold)
      {
         string sym = PositionGetString(POSITION_SYMBOL);
         Print("SmartFX: Min-profit-close $", DoubleToString(threshold, 2),
               " reached ($", DoubleToString(profit, 2), ") — closing ", sym);
         g_trade.PositionClose(t);
      }
   }
}

//+------------------------------------------------------------------+
//| Auto-signal: fetch next signal, place limit order                 |
//+------------------------------------------------------------------+
void FetchAndTrade()
{
   // One trade at a time — skip if we already have an open position or pending order
   if (HasPosition())     { RefreshComment(); return; }
   if (HasPendingOrder()) { RefreshComment(); return; }

   string url = InpApiUrl + "/api/ea/signal"
              + "?min_confidence=" + IntegerToString(MinConf())
              + "&last_id="        + g_lastSignalId;

   string json = HttpGet(url);
   if (json == "" || json == "null") { RefreshComment(); return; }
   if (StringFind(json, "\"id\"") < 0)  { RefreshComment(); return; }

   // Parse signal fields
   string sigId  = JsStr(json, "id");
   string pair   = JsStr(json, "pair");
   string dir    = JsStr(json, "direction");
   double entry  = (double)JsNum(json, "entry");
   double sl     = (double)JsNum(json, "sl");
   double tp     = (double)JsNum(json, "tp");
   int    conf   = (int)JsNum(json, "confidence");
   string tf     = JsStr(json, "timeframe");

   // Already processed this signal
   if (sigId == "" || sigId == g_lastSignalId) { RefreshComment(); return; }

   string symbol = ResolveSymbol(pair);

   // Brief cooldown: skip the same pair that was just closed
   if (symbol == g_lastClosedSym && g_lastClosedSym != "")
   {
      Print("SmartFX: Skipping ", pair,
            " — same as last closed pair (cooldown until next signal)");
      g_lastSignalId = sigId;
      return;
   }

   if (symbol == "")
   {
      Print("SmartFX: Symbol not found for pair [", pair, "] — signal skipped");
      g_lastSignalId = sigId;
      return;
   }

   // ── Validate entry price is a meaningful limit level ───────────────────────
   // We ONLY place limit orders — never a market order fallback.
   // A BUY limit must be BELOW current ask; a SELL limit must be ABOVE current bid.
   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   bool   entryOk = false;
   if (dir == "BUY"  && entry > 0 && entry < ask) entryOk = true;
   if (dir == "SELL" && entry > 0 && entry > bid) entryOk = true;

   if (!entryOk)
   {
      Print("SmartFX: Signal #", sigId, " skipped — entry ",
            DoubleToString(entry, 5), " is not a valid limit price",
            " (Ask=", DoubleToString(ask, 5),
            " Bid=", DoubleToString(bid, 5), ")");
      g_lastSignalId = sigId;
      return;
   }

   // ── Normalise lot size ──────────────────────────────────────────────────────
   double lots = NormalizeLots(symbol, LotSize());
   if (lots <= 0) { g_lastSignalId = sigId; return; }

   Print("SmartFX: New signal #", sigId,
         " | ", dir, " ", pair,
         " | Entry:", DoubleToString(entry, 5),
         " SL:", DoubleToString(sl, 5),
         " TP:", DoubleToString(tp, 5),
         " | Conf:", conf, "% TF:", tf,
         " Lots:", DoubleToString(lots, 2));

   // ── Place limit order ───────────────────────────────────────────────────────
   datetime expiry = TimeCurrent() + (datetime)(InpOrderExpireMins * 60);
   bool     ok     = false;
   string   label  = "SmartFX #" + sigId;

   if (dir == "BUY")
      ok = g_trade.BuyLimit (lots, entry, symbol, sl, tp,
                             ORDER_TIME_SPECIFIED, expiry, label);
   else
      ok = g_trade.SellLimit(lots, entry, symbol, sl, tp,
                             ORDER_TIME_SPECIFIED, expiry, label);

   g_lastSignalId = sigId;

   if (ok)
   {
      g_totalTrades++;
      ulong ticket = g_trade.ResultOrder();
      Print("SmartFX: Limit order placed — ticket ", ticket,
            " | ", dir, " ", symbol,
            " @ ", DoubleToString(entry, 5),
            " | expires in ", InpOrderExpireMins, " min");
      ReportTrade(ticket, symbol, dir, lots, entry, sl, tp, sigId, conf, tf);
   }
   else
   {
      Print("SmartFX: Order FAILED (", g_trade.ResultRetcode(), " — ",
            g_trade.ResultRetcodeDescription(), ") signal #", sigId, " skipped");
   }

   RefreshComment();
}

//+------------------------------------------------------------------+
//| Manual-execute: process force-queue entries from dashboard        |
//+------------------------------------------------------------------+
void ProcessForceQueue()
{
   string json = HttpGet(InpApiUrl + "/api/ea/force-queue");
   if (json == "" || json == "[]") return;
   if (StringFind(json, "\"id\"") < 0)  return;

   // Process only the first pending item per tick
   int objStart = StringFind(json, "{");
   int objEnd   = StringFind(json, "}", objStart);
   if (objStart < 0 || objEnd < 0) return;

   string item  = StringSubstr(json, objStart, objEnd - objStart + 1);
   string fqId  = JsStr(item, "id");
   string pair  = JsStr(item, "pair");
   string dir   = JsStr(item, "direction");
   double lots  = (double)JsNum(item, "lotSize");
   double sl    = (double)JsNum(item, "sl");
   double tp    = (double)JsNum(item, "tp");
   string sigId = JsStr(item, "signalId");
   int    conf  = (int)JsNum(item, "confidence");
   string tf    = JsStr(item, "timeframe");

   if (fqId == "" || pair == "" || dir == "") return;

   // Mark as taken BEFORE executing (prevents double-execution on retry)
   MarkForceDone(fqId);

   string symbol = ResolveSymbol(pair);
   if (symbol == "")
   { Print("SmartFX MANUAL: Symbol not found for [", pair, "]"); return; }

   if (lots <= 0) lots = LotSize();
   lots = NormalizeLots(symbol, lots);
   if (lots <= 0) return;

   // Manual trades always execute at market price
   bool ok = false;
   if (dir == "BUY")  ok = g_trade.Buy (lots, symbol, 0, sl, tp, "SmartFX-Manual #" + sigId);
   if (dir == "SELL") ok = g_trade.Sell(lots, symbol, 0, sl, tp, "SmartFX-Manual #" + sigId);

   if (ok)
   {
      g_totalTrades++;
      ulong ticket = g_trade.ResultOrder();
      Print("SmartFX MANUAL: Executed — ticket ", ticket,
            " | ", dir, " ", symbol,
            " Lots:", DoubleToString(lots, 2));
      ReportTrade(ticket, symbol, dir, lots,
                  g_trade.ResultPrice(), sl, tp, sigId, conf, tf);
   }
   else
   {
      Print("SmartFX MANUAL: FAILED (", g_trade.ResultRetcode(), " — ",
            g_trade.ResultRetcodeDescription(), ")");
   }

   RefreshComment();
}

void MarkForceDone(const string &fqId)
{
   string url  = InpApiUrl + "/api/ea/force-queue/" + fqId + "/done";
   char   body[], resp[]; string hdrs;
   StringToCharArray("{}", body, 0, 2);
   WebRequest("POST", url, "Content-Type: application/json\r\n",
              5000, body, resp, hdrs);
}

//+------------------------------------------------------------------+
//| Push all open positions to dashboard every 10 s                   |
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
      string posDir = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
      string cmt    = PositionGetString(POSITION_COMMENT);

      // Extract signal ID from comment (format: "SmartFX #<id>")
      string sigId = "";
      int    hp    = StringFind(cmt, "#");
      if (hp >= 0) sigId = StringSubstr(cmt, hp + 1);

      if (!first) json += ",";
      first = false;
      json += StringFormat(
         "{\"ticket\":\"%d\",\"login\":\"%d\",\"symbol\":\"%s\","
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

   bool   isDemo = (AccountInfoInteger(ACCOUNT_TRADE_MODE) == ACCOUNT_TRADE_MODE_DEMO);
   string json   = StringFormat(
      "{\"login\":\"%d\",\"balance\":%.2f,\"equity\":%.2f,"
      "\"currency\":\"%s\",\"server\":\"%s\",\"accountType\":\"%s\"}",
      AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      AccountInfoString(ACCOUNT_CURRENCY),
      AccountInfoString(ACCOUNT_SERVER),
      isDemo ? "demo" : "real"
   );
   HttpPost(InpApiUrl + "/api/ea/balance", json);
}

//+------------------------------------------------------------------+
//| Report a new or closed trade to the dashboard                     |
//+------------------------------------------------------------------+
void ReportTrade(ulong ticket, string symbol, string direction,
                 double lots,  double openPx, double sl, double tp,
                 string sigId, int confidence, string timeframe,
                 string status = "OPEN", double closePrice = 0, double profit = 0)
{
   string json;
   if (status == "CLOSED")
      json = StringFormat(
         "{\"ticket\":\"%d\",\"login\":\"%d\",\"symbol\":\"%s\","
         "\"direction\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,"
         "\"sl\":%.5f,\"tp\":%.5f,\"signalId\":\"%s\","
         "\"confidence\":%d,\"timeframe\":\"%s\",\"status\":\"CLOSED\","
         "\"closePrice\":%.5f,\"profit\":%.2f}",
         ticket, AccountInfoInteger(ACCOUNT_LOGIN),
         symbol, direction, lots, openPx,
         sl, tp, sigId, confidence, timeframe,
         closePrice, profit
      );
   else
      json = StringFormat(
         "{\"ticket\":\"%d\",\"login\":\"%d\",\"symbol\":\"%s\","
         "\"direction\":\"%s\",\"lots\":%.2f,\"openPrice\":%.5f,"
         "\"sl\":%.5f,\"tp\":%.5f,\"signalId\":\"%s\","
         "\"confidence\":%d,\"timeframe\":\"%s\",\"status\":\"OPEN\"}",
         ticket, AccountInfoInteger(ACCOUNT_LOGIN),
         symbol, direction, lots, openPx,
         sl, tp, sigId, confidence, timeframe
      );
   HttpPost(InpApiUrl + "/api/ea/trade", json);
}

//+------------------------------------------------------------------+
//| Detect trade close — report to dashboard immediately              |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &req,
                        const MqlTradeResult      &res)
{
   if (trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
   if (!HistoryDealSelect(trans.deal))           return;

   long magic = HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
   long entry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   if (magic != InpMagicNumber || entry != DEAL_ENTRY_OUT) return;

   string sym       = HistoryDealGetString(trans.deal, DEAL_SYMBOL);
   double closePrice= HistoryDealGetDouble(trans.deal, DEAL_PRICE);
   double profit    = HistoryDealGetDouble(trans.deal, DEAL_PROFIT);
   string dir       = (HistoryDealGetInteger(trans.deal, DEAL_TYPE) == DEAL_TYPE_BUY) ? "BUY" : "SELL";
   ulong  ticket    = HistoryDealGetInteger(trans.deal, DEAL_ORDER);

   g_lastClosedSym = sym;

   Print("SmartFX: Trade closed — [", (profit >= 0 ? "PROFIT" : "LOSS"), "]",
         " ", sym, " | P&L: $", DoubleToString(profit, 2));

   // Report the close to the dashboard
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
   int    open = 0;
   for (int i = 0; i < PositionsTotal(); i++)
   {
      ulong t = PositionGetTicket(i);
      if (PositionSelectByTicket(t) &&
          (int)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         open++;
   }

   string status = g_dailyStopped ? "STOPPED — daily limit hit" :
                   open > 0       ? "TRADE OPEN — waiting for TP/SL" :
                                    "Waiting for next signal";
   string extra  = "";
   if (ProfitTarget() > 0)
      extra += StringFormat(" | Target:$%.0f", ProfitTarget());
   if (LossLimit() > 0)
      extra += StringFormat(" | Limit:-$%.0f", LossLimit());

   Comment("SmartFX v3.0 | ", status,
           " | Trades:", g_totalTrades,
           " | P&L:$", DoubleToString(pnl, 2),
           " | Lots:", DoubleToString(LotSize(), 2),
           extra);
}

//+------------------------------------------------------------------+
//| Helpers                                                           |
//+------------------------------------------------------------------+
bool HasPosition()
{
   for (int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong t = PositionGetTicket(i);
      if (PositionSelectByTicket(t) &&
          (int)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         return true;
   }
   return false;
}

bool HasPendingOrder()
{
   for (int i = OrdersTotal() - 1; i >= 0; i--)
   {
      ulong t = OrderGetTicket(i);
      if (OrderSelect(t) &&
          (int)OrderGetInteger(ORDER_MAGIC) == InpMagicNumber)
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
   lots = MathMax(lots, minVol);
   lots = MathMin(lots, maxVol);
   return NormalizeDouble(lots, 2);
}

//── Symbol resolver ────────────────────────────────────────────────
// Tries plain symbol, then common broker suffixes, then Deriv synthetic names.
string ResolveSymbol(const string &pair)
{
   string s = pair;
   StringToUpper(s);

   // 1. Plain (e.g. EURUSD, XAUUSD, BTCUSD)
   if (SymbolSelect(s, true) && SymbolInfoDouble(s, SYMBOL_BID) > 0) return s;

   // 2. Common broker suffixes
   string sfx[] = {".", "+", "m", "_", "pro", "n", "ECN", "c"};
   for (int i = 0; i < ArraySize(sfx); i++)
   {
      string candidate = s + sfx[i];
      if (SymbolSelect(candidate, true) &&
          SymbolInfoDouble(candidate, SYMBOL_BID) > 0)
         return candidate;
   }

   // 3. Deriv / Volatility synthetic index names
   string map[][2] = {
      {"BTCUSD",   "BTCUSD"},
      {"ETHUSD",   "ETHUSD"},
      {"XRPUSD",   "XRPUSD"},
      {"XAUUSD",   "XAUUSD"},
      {"XAGUSD",   "XAGUSD"},
      // Volatility indices
      {"R_10",     "Volatility 10 Index"},
      {"R_25",     "Volatility 25 Index"},
      {"R_50",     "Volatility 50 Index"},
      {"R_75",     "Volatility 75 Index"},
      {"R_100",    "Volatility 100 Index"},
      // 1s Volatility indices
      {"1HZ10V",   "Volatility 10 (1s) Index"},
      {"1HZ25V",   "Volatility 25 (1s) Index"},
      {"1HZ50V",   "Volatility 50 (1s) Index"},
      {"1HZ75V",   "Volatility 75 (1s) Index"},
      {"1HZ100V",  "Volatility 100 (1s) Index"},
      // Boom / Crash / Jump
      {"BOOM500",  "Boom 500 Index"},
      {"BOOM1000", "Boom 1000 Index"},
      {"CRASH500", "Crash 500 Index"},
      {"CRASH1000","Crash 1000 Index"},
      {"JD10",     "Jump 10 Index"},
      {"JD25",     "Jump 25 Index"},
      {"JD50",     "Jump 50 Index"},
      {"JD75",     "Jump 75 Index"},
      {"JD100",    "Jump 100 Index"},
   };
   int rows = ArraySize(map) / 2;
   for (int i = 0; i < rows; i++)
   {
      if (s == map[i][0])
      {
         string cand = map[i][1];
         if (SymbolSelect(cand, true) && SymbolInfoDouble(cand, SYMBOL_BID) > 0)
            return cand;
      }
   }
   return "";
}

//── HTTP helpers ───────────────────────────────────────────────────
string HttpGet(const string &url)
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
               "' to MT5 → Tools → Options → Expert Advisors → Allowed URLs");
      return "";
   }
   if (code != 200) return "";
   string body = CharArrayToString(response, 0, WHOLE_ARRAY, CP_UTF8);
   StringTrimLeft(body); StringTrimRight(body);
   return body;
}

void HttpPost(const string &url, const string &jsonBody)
{
   char   postData[], response[];
   string headers;
   int    len = StringLen(jsonBody);
   StringToCharArray(jsonBody, postData, 0, len);
   WebRequest("POST", url,
              "Content-Type: application/json\r\n",
              5000, postData, response, headers);
}

//── Minimal JSON parsers ───────────────────────────────────────────
// JsStr: extract string value for key  → { "key": "value" }
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

// JsNum: extract numeric value for key → { "key": 1.23 } or { "key": 42 }
double JsNum(const string &json, const string &key)
{
   string search = "\"" + key + "\":";
   int pos = StringFind(json, search);
   if (pos < 0) return 0;
   pos += StringLen(search);
   // skip whitespace
   int len = StringLen(json);
   while (pos < len && StringGetCharacter(json, pos) == ' ') pos++;
   int end = pos;
   while (end < len)
   {
      ushort c = StringGetCharacter(json, end);
      if (c == ',' || c == '}' || c == ']' || c == ' ' ||
          c == '\n' || c == '\r')  break;
      end++;
   }
   string v = StringSubstr(json, pos, end - pos);
   if (v == "" || v == "null") return 0;
   return StringToDouble(v);
}

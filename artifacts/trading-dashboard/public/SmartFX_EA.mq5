//+------------------------------------------------------------------+
//|  SmartFX_EA.mq5                                                  |
//|  Polls smart-fx-tool.replit.app for confirmed signals and        |
//|  executes them in MT5 with risk-based lot sizing.                |
//|  Also reports live account balance to the SmartFX dashboard.     |
//|                                                                  |
//|  SETUP (Deriv MT5):                                              |
//|  1. Copy this file to MQL5\Experts\SmartFX_EA.mq5               |
//|  2. Compile in MetaEditor (F7)                                   |
//|  3. Deriv MT5 → Tools → Options → Expert Advisors:              |
//|       ✓ Allow automated trading                                  |
//|       ✓ Allow WebRequest for listed URL                         |
//|       Add: https://smart-fx-tool.replit.app                     |
//|  4. Attach to ANY chart (Volatility, Forex, or Crypto)          |
//|  5. Set EA_KEY to match your dashboard setting                   |
//+------------------------------------------------------------------+
#property copyright "SmartFX"
#property link      "https://smart-fx-tool.replit.app"
#property version   "1.10"
#property strict

#include <Trade\Trade.mqh>

//--- Inputs
input string SERVER_URL        = "https://smart-fx-tool.replit.app"; // API server URL
input string EA_KEY            = "smartfx-ea-2025";                  // EA key (must match dashboard)
input double RISK_PERCENT      = 1.0;                                 // Risk % per trade
input int    POLL_SECONDS      = 5;                                   // Poll interval (seconds)
input int    MAGIC_NUMBER      = 20250001;                            // Magic number for trades
input int    SLIPPAGE          = 20;                                  // Max slippage (points)
input bool   VERBOSE           = true;                                // Print debug info
input int    BALANCE_REPORT_EVERY = 3;                                // Report balance every N polls

//--- Internal
CTrade trade;
bool   initialized  = false;
int    pollCount    = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(MAGIC_NUMBER);
   trade.SetDeviationInPoints(SLIPPAGE);
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   EventSetTimer(POLL_SECONDS);
   initialized = true;

   PrintFormat("[SmartFX EA] v1.10 Started. Polling %s every %ds  |  Risk: %.1f%%  |  Magic: %d",
               SERVER_URL, POLL_SECONDS, RISK_PERCENT, MAGIC_NUMBER);

   // Report balance immediately on attach
   ReportAccountBalance();
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   PrintFormat("[SmartFX EA] Stopped (reason %d)", reason);
}

//+------------------------------------------------------------------+
void OnTimer()
{
   if (!initialized) return;
   pollCount++;

   // Report balance every N polls (default every 3 polls = 15 seconds)
   if (pollCount % BALANCE_REPORT_EVERY == 0)
      ReportAccountBalance();

   PollAndExecute();
}

//+------------------------------------------------------------------+
//| Push live account balance to the SmartFX dashboard              |
//+------------------------------------------------------------------+
void ReportAccountBalance()
{
   ENUM_ACCOUNT_TRADE_MODE mode = (ENUM_ACCOUNT_TRADE_MODE)AccountInfoInteger(ACCOUNT_TRADE_MODE);
   string accType  = (mode == ACCOUNT_TRADE_MODE_REAL) ? "REAL" : "DEMO";
   double bal      = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity   = AccountInfoDouble(ACCOUNT_EQUITY);
   double freeMgn  = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
   string ccy      = AccountInfoString(ACCOUNT_CURRENCY);
   long   login    = AccountInfoInteger(ACCOUNT_LOGIN);
   string company  = AccountInfoString(ACCOUNT_COMPANY);
   string acctName = AccountInfoString(ACCOUNT_NAME);

   // Escape any quotes in strings
   StringReplace(company,  "\"", "\\\"");
   StringReplace(acctName, "\"", "\\\"");

   string json = StringFormat(
      "{\"accountType\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,"
      "\"freeMargin\":%.2f,\"currency\":\"%s\",\"login\":%lld,"
      "\"broker\":\"%s\",\"name\":\"%s\"}",
      accType, bal, equity, freeMgn, ccy, login, company, acctName
   );

   string url     = SERVER_URL + "/api/mt5/balance-report?key=" + EA_KEY;
   string headers = "Content-Type: application/json\r\n";
   char   postData[];
   char   responseBytes[];
   string responseHeaders;

   int len = StringLen(json);
   ArrayResize(postData, len);
   StringToCharArray(json, postData, 0, len);

   int httpStatus = WebRequest("POST", url, headers, 5000, postData, responseBytes, responseHeaders);

   if (VERBOSE)
      PrintFormat("[SmartFX EA] Balance report → HTTP %d  [%s] %.2f %s",
                  httpStatus, accType, bal, ccy);
}

//+------------------------------------------------------------------+
//| Main poll-and-execute loop                                       |
//+------------------------------------------------------------------+
void PollAndExecute()
{
   string url     = SERVER_URL + "/api/mt5/pending?key=" + EA_KEY + "&format=mql5";
   string headers = "Content-Type: application/json\r\n";
   char   postData[];
   char   responseBytes[];
   string responseHeaders;
   int    timeout = 5000;

   int httpStatus = WebRequest("GET", url, headers, timeout, postData, responseBytes, responseHeaders);

   if (httpStatus != 200)
   {
      if (VERBOSE) PrintFormat("[SmartFX EA] Poll HTTP %d (no pending signals or network error)", httpStatus);
      return;
   }

   string body = CharArrayToString(responseBytes, 0, WHOLE_ARRAY, CP_UTF8);
   StringTrimLeft(body);
   StringTrimRight(body);
   if (StringLen(body) == 0) return; // no pending signals

   if (VERBOSE) PrintFormat("[SmartFX EA] Received signal(s):\n%s", body);

   // Each line: id|pair|signal|entry|stopLoss|takeProfit|riskPercent
   string lines[];
   int lineCount = StringSplit(body, '\n', lines);

   for (int i = 0; i < lineCount; i++)
   {
      string line = StringTrimRight(StringTrimLeft(lines[i]));
      if (StringLen(line) == 0) continue;

      string fields[];
      if (StringSplit(line, '|', fields) < 7)
      {
         PrintFormat("[SmartFX EA] Malformed line: %s", line);
         continue;
      }

      int    execId    = (int)StringToInteger(fields[0]);
      string pair      = fields[1];
      string signalDir = fields[2]; // "BUY" or "SELL"
      double entry     = StringToDouble(fields[3]);
      double stopLoss  = StringToDouble(fields[4]);
      double takeProfit = StringToDouble(fields[5]);
      double riskPct   = StringToDouble(fields[6]);
      if (riskPct <= 0) riskPct = RISK_PERCENT;

      ExecuteTrade(execId, pair, signalDir, entry, stopLoss, takeProfit, riskPct);
   }
}

//+------------------------------------------------------------------+
//| Calculate lot size from risk %                                   |
//+------------------------------------------------------------------+
double CalcLots(string symbol, double entry, double stopLoss, double riskPct)
{
   double balance   = AccountInfoDouble(ACCOUNT_BALANCE);
   double riskAmt   = balance * (riskPct / 100.0);
   double tickSize  = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickValue = SymbolInfoDouble(symbol, SYMBOL_TRADE_TICK_VALUE);

   if (tickSize <= 0 || tickValue <= 0)
   {
      PrintFormat("[SmartFX EA] Cannot get tick info for %s", symbol);
      return 0.01;
   }

   double slDist    = MathAbs(entry - stopLoss);
   double slInTicks = slDist / tickSize;
   if (slInTicks <= 0) return 0.01;

   double lots    = riskAmt / (slInTicks * tickValue);
   double lotStep = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
   double minLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MAX);

   lots = MathRound(lots / lotStep) * lotStep;
   lots = MathMax(minLot, MathMin(maxLot, lots));

   return NormalizeDouble(lots, 2);
}

//+------------------------------------------------------------------+
//| Open the trade and report back                                   |
//+------------------------------------------------------------------+
void ExecuteTrade(int execId, string pair, string signalDir, double entry, double stopLoss, double takeProfit, double riskPct)
{
   double lots = CalcLots(pair, entry, stopLoss, riskPct);

   PrintFormat("[SmartFX EA] Executing #%d  %s %s  lots=%.2f  entry=%.5f  SL=%.5f  TP=%.5f",
               execId, signalDir, pair, lots, entry, stopLoss, takeProfit);

   bool ok = false;
   if (signalDir == "BUY")
      ok = trade.Buy(lots, pair, 0, stopLoss, takeProfit, "SmartFX #" + IntegerToString(execId));
   else if (signalDir == "SELL")
      ok = trade.Sell(lots, pair, 0, stopLoss, takeProfit, "SmartFX #" + IntegerToString(execId));
   else
   {
      ReportBack(execId, false, 0, 0, 0, "Unknown signal direction: " + signalDir);
      return;
   }

   if (ok && trade.ResultRetcode() == TRADE_RETCODE_DONE)
   {
      ulong  ticket    = trade.ResultOrder();
      double execLots  = trade.ResultVolume();
      double execPrice = trade.ResultPrice();
      PrintFormat("[SmartFX EA] ✓ Trade opened. Ticket #%llu  lots=%.2f  price=%.5f", ticket, execLots, execPrice);
      ReportBack(execId, true, (long)ticket, execLots, execPrice, "");

      // After any trade, refresh balance immediately
      ReportAccountBalance();
   }
   else
   {
      string errMsg = trade.ResultComment() + " [" + IntegerToString(trade.ResultRetcode()) + "]";
      PrintFormat("[SmartFX EA] ✗ Trade failed: %s", errMsg);
      ReportBack(execId, false, 0, 0, 0, errMsg);
   }
}

//+------------------------------------------------------------------+
//| POST result back to dashboard                                    |
//+------------------------------------------------------------------+
void ReportBack(int execId, bool success, long ticket, double lots, double price, string errMsg)
{
   string status = success ? "executed" : "failed";
   string json   = StringFormat(
      "{\"id\":%d,\"status\":\"%s\",\"ticket\":%lld,\"lots\":%.2f,\"price\":%.5f,\"error\":\"%s\"}",
      execId, status, ticket, lots, price, errMsg
   );

   string url     = SERVER_URL + "/api/mt5/report?key=" + EA_KEY;
   string headers = "Content-Type: application/json\r\n";
   char   postData[];
   char   responseBytes[];
   string responseHeaders;
   StringToCharArray(json, postData, 0, StringLen(json));

   int httpStatus = WebRequest("POST", url, headers, 5000, postData, responseBytes, responseHeaders);
   if (VERBOSE) PrintFormat("[SmartFX EA] Report #%d → HTTP %d", execId, httpStatus);
}

//+------------------------------------------------------------------+
void OnTick() {}
//+------------------------------------------------------------------+

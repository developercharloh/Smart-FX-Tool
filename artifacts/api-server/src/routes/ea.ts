/**
 * EA (Expert Advisor) polling routes
 * The MT5 EA calls GET /api/ea/signal every N seconds.
 * The EA also POSTs its balance so the dashboard can display it.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { signalsTable, eaBalancesTable } from "@workspace/db";
import { eq, and, gte, gt, desc } from "drizzle-orm";

const router = Router();

// ── GET /api/ea/signal ────────────────────────────────────────────────────────
// Returns the newest ACTIVE signal with confidence >= min_confidence,
// optionally only those newer than last_id (prevents re-trading same signal).
// Returns null when nothing new.
router.get("/signal", async (req, res) => {
  try {
    const minConf = Math.max(1, parseInt(String(req.query.min_confidence ?? "80")) || 80);
    const lastId  = parseInt(String(req.query.last_id ?? "0")) || 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [
      eq(signalsTable.status,          "ACTIVE"),
      gte(signalsTable.confidenceScore, minConf),
    ];
    if (lastId > 0) conditions.push(gt(signalsTable.id, lastId));

    const rows = await db
      .select()
      .from(signalsTable)
      .where(and(...conditions))
      .orderBy(desc(signalsTable.id))
      .limit(1);

    const signal = rows[0] ?? null;
    if (!signal) return res.json(null);

    // Flat response — easy to parse with MQL5 string operations
    return res.json({
      id:         String(signal.id),
      pair:       signal.pair,
      direction:  signal.signal,          // "BUY" | "SELL"
      entry:      signal.entry,
      sl:         signal.stopLoss,
      tp:         signal.takeProfit,
      confidence: signal.confidenceScore,
      timeframe:  signal.timeframe,
      rr:         signal.riskRewardRatio ?? 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ea/balance ──────────────────────────────────────────────────────
// EA calls this on every poll to report its account balance — persisted in DB.
router.post("/balance", async (req, res) => {
  const { login, balance, equity, currency, server, accountType } = req.body;
  if (!login) return res.status(400).json({ error: "login required" });

  try {
    await db.insert(eaBalancesTable).values({
      login:       String(login),
      balance:     Number(balance)  || 0,
      equity:      Number(equity)   || 0,
      currency:    String(currency  || "USD"),
      server:      String(server    || ""),
      accountType: String(accountType || "demo") === "real" ? "real" : "demo",
      reportedAt:  new Date(),
    }).onConflictDoUpdate({
      target: eaBalancesTable.login,
      set: {
        balance:     Number(balance)  || 0,
        equity:      Number(equity)   || 0,
        currency:    String(currency  || "USD"),
        server:      String(server    || ""),
        accountType: String(accountType || "demo") === "real" ? "real" : "demo",
        reportedAt:  new Date(),
      },
    });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ea/balance ───────────────────────────────────────────────────────
// Dashboard reads MT5 balance — served from persistent DB.
router.get("/balance", async (_req, res) => {
  try {
    const rows = await db.select().from(eaBalancesTable);
    return res.json(rows.map(r => ({
      login:       r.login,
      balance:     r.balance,
      equity:      r.equity,
      currency:    r.currency,
      server:      r.server,
      accountType: r.accountType,
      reportedAt:  r.reportedAt.getTime(),
    })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── In-memory trade store ─────────────────────────────────────────────────────
interface EATrade {
  id:          string;
  ticket:      string;
  login:       string;
  symbol:      string;
  direction:   "BUY" | "SELL";
  lots:        number;
  openPrice:   number;
  sl:          number;
  tp:          number;
  signalId:    string;
  confidence:  number;
  timeframe:   string;
  status:      "OPEN" | "CLOSED";
  closePrice?: number;
  profit?:     number;
  openedAt:    number;
  closedAt?:   number;
}
const _trades: EATrade[] = [];

// ── POST /api/ea/trade ────────────────────────────────────────────────────────
// EA calls this immediately after opening or closing a position.
router.post("/trade", (req, res) => {
  const {
    ticket, login, symbol, direction, lots,
    openPrice, sl, tp, signalId, confidence,
    timeframe, status, closePrice, profit,
  } = req.body;

  if (!ticket || !symbol || !direction) {
    return res.status(400).json({ error: "ticket, symbol and direction required" });
  }

  const now = Date.now();
  const idx = _trades.findIndex(t => t.ticket === String(ticket));

  if (idx >= 0) {
    // Update existing (close event)
    _trades[idx] = {
      ..._trades[idx],
      status:     status === "CLOSED" ? "CLOSED" : _trades[idx].status,
      closePrice: closePrice != null ? Number(closePrice) : _trades[idx].closePrice,
      profit:     profit     != null ? Number(profit)     : _trades[idx].profit,
      closedAt:   status === "CLOSED" ? now : _trades[idx].closedAt,
    };
  } else {
    // New trade
    _trades.unshift({
      id:         `${ticket}-${now}`,
      ticket:     String(ticket),
      login:      String(login   || ""),
      symbol:     String(symbol),
      direction:  direction === "BUY" ? "BUY" : "SELL",
      lots:       Number(lots      || 0.01),
      openPrice:  Number(openPrice || 0),
      sl:         Number(sl        || 0),
      tp:         Number(tp        || 0),
      signalId:   String(signalId  || ""),
      confidence: Number(confidence || 0),
      timeframe:  String(timeframe || ""),
      status:     "OPEN",
      openedAt:   now,
    });
  }

  // Keep last 200 trades
  if (_trades.length > 200) _trades.splice(200);

  return res.json({ ok: true });
});

// ── GET /api/ea/trades ────────────────────────────────────────────────────────
// Dashboard reads all EA-opened trades.
router.get("/trades", (_req, res) => {
  return res.json(_trades);
});

// ── Force-execute queue (manual "Execute Trade" from dashboard) ───────────────
interface ForceQueueItem {
  id:         string;
  signalId:   string;
  lotSize:    number;
  pair:       string;
  direction:  "BUY" | "SELL";
  entry:      number;
  sl:         number;
  tp:         number;
  confidence: number;
  timeframe:  string;
  createdAt:  number;
  status:     "PENDING" | "TAKEN";
}
export const _forceQueue: ForceQueueItem[] = [];

// POST /api/ea/execute — dashboard pushes a signal for immediate execution
router.post("/execute", async (req, res) => {
  const { signalId, lotSize } = req.body;
  if (!signalId) return res.status(400).json({ error: "signalId required" });

  try {
    const rows = await db
      .select()
      .from(signalsTable)
      .where(eq(signalsTable.id, Number(signalId)))
      .limit(1);

    const s = rows[0];
    if (!s) return res.status(404).json({ error: "Signal not found" });

    const item: ForceQueueItem = {
      id:         `fq-${Date.now()}`,
      signalId:   String(signalId),
      lotSize:    Math.max(0.01, Number(lotSize) || 0.01),
      pair:       s.pair,
      direction:  s.signal === "BUY" ? "BUY" : "SELL",
      entry:      s.entry,
      sl:         s.stopLoss,
      tp:         s.takeProfit,
      confidence: s.confidenceScore,
      timeframe:  s.timeframe,
      createdAt:  Date.now(),
      status:     "PENDING",
    };

    _forceQueue.unshift(item);
    if (_forceQueue.length > 50) _forceQueue.splice(50);

    return res.json({ ok: true, id: item.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/ea/force-queue — EA polls this for manual trades
router.get("/force-queue", (_req, res) => {
  const pending = _forceQueue.filter(i => i.status === "PENDING");
  return res.json(pending);
});

// POST /api/ea/force-queue/:id/done — EA marks item as executed
router.post("/force-queue/:id/done", (req, res) => {
  const item = _forceQueue.find(i => i.id === req.params.id);
  if (item) item.status = "TAKEN";
  return res.json({ ok: true });
});

// ── GET /api/ea/status ────────────────────────────────────────────────────────
// Lightweight ping so the setup page can confirm the server is reachable.
router.get("/status", (_req, res) => {
  res.json({ ok: true, ts: Date.now(), version: "2.0" });
});

export default router;

/**
 * EA (Expert Advisor) polling routes
 * The MT5 EA calls GET /api/ea/signal every N seconds.
 * The EA also POSTs its balance so the dashboard can display it.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import { signalsTable } from "@workspace/db";
import { eq, and, gte, gt, desc } from "drizzle-orm";

// ── In-memory balance store (resets on server restart — fine for display) ─────
interface EABalance {
  login:       string;
  balance:     number;
  equity:      number;
  currency:    string;
  server:      string;
  accountType: "real" | "demo";
  reportedAt:  number;
}
const _balances: EABalance[] = [];

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
// EA calls this on every poll to report its account balance.
router.post("/balance", (req, res) => {
  const { login, balance, equity, currency, server, accountType } = req.body;
  if (!login) return res.status(400).json({ error: "login required" });

  const report: EABalance = {
    login:       String(login),
    balance:     Number(balance)  || 0,
    equity:      Number(equity)   || 0,
    currency:    String(currency  || "USD"),
    server:      String(server    || ""),
    accountType: (String(accountType || "demo") === "real" ? "real" : "demo"),
    reportedAt:  Date.now(),
  };

  const idx = _balances.findIndex(b => b.login === report.login);
  if (idx >= 0) _balances[idx] = report;
  else _balances.push(report);

  return res.json({ ok: true });
});

// ── GET /api/ea/balance ───────────────────────────────────────────────────────
// Dashboard reads MT5 balance reported by the running EA.
router.get("/balance", (_req, res) => {
  return res.json(_balances);
});

// ── GET /api/ea/status ────────────────────────────────────────────────────────
// Lightweight ping so the setup page can confirm the server is reachable.
router.get("/status", (_req, res) => {
  res.json({ ok: true, ts: Date.now(), version: "2.0" });
});

export default router;

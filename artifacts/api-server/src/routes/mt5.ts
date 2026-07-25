/**
 * /api/mt5 routes — compatible with older EA builds that use
 * GET  /api/mt5/pending          (same logic as /api/ea/signal)
 * POST /api/mt5/balance-report   (same logic as /api/ea/balance)
 */

import { Router } from "express";
import { db, signalsTable } from "@workspace/db";
import { eq, and, gte, gt, desc } from "drizzle-orm";

// Shared in-memory balance store (imported from ea.ts re-exported shape)
interface Mt5Balance {
  login:       string;
  balance:     number;
  equity:      number;
  currency:    string;
  server:      string;
  accountType: "real" | "demo";
  reportedAt:  number;
}
export const _mt5Balances: Mt5Balance[] = [];

const router = Router();

// GET /api/mt5/pending — returns newest ACTIVE signal
router.get("/pending", async (req, res) => {
  try {
    const minConf = Math.max(1, parseInt(String(req.query.min_confidence ?? "70")) || 70);
    const lastId  = parseInt(String(req.query.last_id ?? "0")) || 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [
      eq(signalsTable.status,           "ACTIVE"),
      gte(signalsTable.confidenceScore,  minConf),
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

    return res.json({
      id:         String(signal.id),
      pair:       signal.pair,
      direction:  signal.signal,
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

// POST /api/mt5/balance-report — EA reports its account balance
router.post("/balance-report", (req, res) => {
  const { login, balance, equity, currency, server, accountType } = req.body;
  if (!login) return res.status(400).json({ error: "login required" });

  const report: Mt5Balance = {
    login:       String(login),
    balance:     Number(balance)  || 0,
    equity:      Number(equity)   || 0,
    currency:    String(currency  || "USD"),
    server:      String(server    || ""),
    accountType: String(accountType || "demo") === "real" ? "real" : "demo",
    reportedAt:  Date.now(),
  };

  const idx = _mt5Balances.findIndex(b => b.login === report.login);
  if (idx >= 0) _mt5Balances[idx] = report;
  else _mt5Balances.push(report);

  return res.json({ ok: true });
});

// GET /api/mt5/balances — dashboard reads balances
router.get("/balances", (_req, res) => {
  return res.json(_mt5Balances);
});

export default router;

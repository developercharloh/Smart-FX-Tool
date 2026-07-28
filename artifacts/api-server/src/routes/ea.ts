/**
 * EA (Expert Advisor) polling routes — production-ready real-money flow
 *
 * Key behaviours:
 *  • Sequential multi-signal execution: EA polls with last_id + open_count,
 *    receives next valid ACTIVE signal, keeps going until maxOpenTrades cap.
 *  • Kill switch: dashboard can halt all trading instantly (DB-persisted).
 *  • Risk-based lot sizing: lots = (balance × riskPct%) / (SL distance × pip value).
 *  • Max open trades gate: server blocks new signals when cap is reached.
 *  • Daily loss circuit breaker: server auto-halts when daily loss threshold hit.
 *  • Spread filter: EA sends current spread; signal rejected if too wide.
 *  • Persistent trade journal: all trades stored in DB, survive restarts.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import {
  signalsTable,
  eaBalancesTable,
  forceQueueTable,
  eaSettingsTable,
  eaTradesTable,
} from "@workspace/db";
import { eq, and, gte, gt, desc, lt } from "drizzle-orm";
import { recordEAExecution } from "./signals";

const router = Router();

// ── Pairs that are crypto (lower priority on Deriv) ──────────────────────────
const CRYPTO_PAIRS = ["BTCUSD","ETHUSD","XRPUSD","LTCUSD","DOGEUSD","BNBUSD","SOLUSD"];

// ── Settings cache (refresh every 60s to avoid DB hit on every signal poll) ──
interface SettingsCache {
  halted:            boolean;
  dailyProfitTarget: number;
  dailyLossLimit:    number;
  lotSize:           number;
  minConfidence:     number;
  minProfitClose:    number;
  riskPercent:       number;
  maxOpenTrades:     number;
  maxSpreadPips:     number;
  fetchedAt:         number;
}
let _settingsCache: SettingsCache | null = null;
const SETTINGS_TTL = 60_000;

async function getSettings(): Promise<SettingsCache> {
  if (_settingsCache && Date.now() - _settingsCache.fetchedAt < SETTINGS_TTL) {
    return _settingsCache;
  }
  try {
    const rows = await db.select().from(eaSettingsTable).where(eq(eaSettingsTable.id, 1)).limit(1);
    const s = rows[0];
    _settingsCache = {
      halted:            s?.halted            ?? false,
      dailyProfitTarget: s?.dailyProfitTarget ?? 0,
      dailyLossLimit:    s?.dailyLossLimit    ?? 0,
      lotSize:           s?.lotSize           ?? 0.01,
      minConfidence:     s?.minConfidence      ?? 80,
      minProfitClose:    s?.minProfitClose     ?? 0,
      riskPercent:       (s as any)?.riskPercent    ?? 1.0,
      maxOpenTrades:     (s as any)?.maxOpenTrades   ?? 3,
      maxSpreadPips:     (s as any)?.maxSpreadPips   ?? 3.0,
      fetchedAt:         Date.now(),
    };
  } catch {
    // Return safe defaults on DB error
    _settingsCache = {
      halted: false, dailyProfitTarget: 0, dailyLossLimit: 0,
      lotSize: 0.01, minConfidence: 80, minProfitClose: 0,
      riskPercent: 1.0, maxOpenTrades: 3, maxSpreadPips: 3.0,
      fetchedAt: Date.now(),
    };
  }
  return _settingsCache!;
}

/** Invalidate settings cache so next read fetches fresh from DB */
function invalidateSettings() { _settingsCache = null; }

// ── Lot size calculator ───────────────────────────────────────────────────────
// Approximate dollar-risk-per-lot per pair. EA should clamp to broker min/max.
function calcLots(
  balance:    number,
  riskPct:    number,
  entry:      number,
  sl:         number,
  pair:       string,
  fallback:   number,
): number {
  if (!balance || balance <= 0) return fallback;
  const dollarRisk = balance * riskPct / 100;
  const slDist     = Math.abs(entry - sl);
  if (slDist <= 0) return fallback;

  let dollarPerLot: number;
  if (pair === "XAUUSD") {
    // 1 lot = 100 oz; $1 price move = $100/lot
    dollarPerLot = slDist * 100;
  } else if (pair === "XAGUSD") {
    // 1 lot = 5000 oz; $0.01 price move = $50/lot
    dollarPerLot = slDist * 5000;
  } else if (pair.includes("JPY")) {
    // ~$7–10/pip at typical rates; pip = 0.01 → use $9/pip
    dollarPerLot = (slDist / 0.01) * 9;
  } else if (pair === "BTCUSD") {
    // 1 lot = 1 BTC; $1 move = $1/lot (Deriv)
    dollarPerLot = slDist;
  } else if (pair === "ETHUSD") {
    dollarPerLot = slDist;
  } else if (pair === "XRPUSD") {
    // 1 lot = 1000 XRP on most brokers; $0.001 = $1/lot
    dollarPerLot = slDist * 1000;
  } else {
    // Standard forex (USD as quote): $10/pip, pip = 0.0001
    dollarPerLot = (slDist / 0.0001) * 10;
  }

  const lots = dollarRisk / dollarPerLot;
  // Round to nearest 0.01, enforce absolute minimum
  return Math.max(0.01, Math.round(lots * 100) / 100);
}

// ── Daily P&L circuit breaker ─────────────────────────────────────────────────
// Tracks daily start-of-day balance so we can compute intraday drawdown.
let _dayStartBalance: number | null = null;
let _dayStartDate: string | null    = null;

function getTodayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function updateDayBalance(balance: number) {
  const today = getTodayStr();
  if (_dayStartDate !== today) {
    _dayStartDate    = today;
    _dayStartBalance = balance;
  }
}

function getDailyLoss(currentBalance: number): number {
  if (_dayStartBalance === null) return 0;
  return Math.max(0, _dayStartBalance - currentBalance); // positive = loss
}

// ── GET /api/ea/signal ────────────────────────────────────────────────────────
// EA polls this every N seconds with optional params:
//   ?min_confidence=X  — skip signals below this threshold
//   ?last_id=X         — skip signals with id <= X (sequential execution)
//   ?open_count=N      — current number of open positions the EA holds
//   ?spread=X          — current spread in pips for the top pair
//   ?balance=X         — current account balance (used for risk-based lot sizing)
router.get("/signal", async (req, res) => {
  try {
    const settings   = await getSettings();

    // ── Kill switch ────────────────────────────────────────────────────────
    if (settings.halted) {
      return res.json({ halted: true });
    }

    const minConf   = Math.max(1, parseInt(String(req.query.min_confidence ?? settings.minConfidence)) || settings.minConfidence);
    const lastId    = parseInt(String(req.query.last_id  ?? "0")) || 0;
    const openCount = parseInt(String(req.query.open_count ?? "0")) || 0;
    const spread    = parseFloat(String(req.query.spread ?? "0")) || 0;
    const balance   = parseFloat(String(req.query.balance ?? "0")) || 0;

    // ── Max open trades gate ───────────────────────────────────────────────
    if (openCount >= settings.maxOpenTrades && settings.maxOpenTrades > 0) {
      return res.json(null); // at capacity — don't open more
    }

    // ── Daily loss circuit breaker ─────────────────────────────────────────
    if (balance > 0) updateDayBalance(balance);
    if (settings.dailyLossLimit > 0 && balance > 0) {
      const dailyLoss = getDailyLoss(balance);
      if (dailyLoss >= settings.dailyLossLimit) {
        console.log(`[circuitBreaker] Daily loss $${dailyLoss.toFixed(2)} hit limit $${settings.dailyLossLimit} — halting`);
        // Auto-halt in DB so it persists across restarts
        await db.update(eaSettingsTable).set({ halted: true } as any).where(eq(eaSettingsTable.id, 1)).catch(() => {});
        invalidateSettings();
        return res.json({ halted: true, reason: "daily_loss" });
      }
    }

    // ── Query ACTIVE signals ───────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [
      eq(signalsTable.status,           "ACTIVE"),
      gte(signalsTable.confidenceScore, minConf),
    ];
    if (lastId > 0) conditions.push(gt(signalsTable.id, lastId));

    const allRows = await db
      .select()
      .from(signalsTable)
      .where(and(...conditions))
      .orderBy(desc(signalsTable.confidenceScore));

    // Prefer forex/metals — they work on all brokers including Deriv demo.
    const forexMetals = allRows.filter(r => !CRYPTO_PAIRS.includes(r.pair));
    let candidates = forexMetals.length > 0 ? forexMetals : allRows;

    // ── Spread filter ──────────────────────────────────────────────────────
    // EA sends current spread (in pips). Skip if too wide.
    if (spread > 0 && settings.maxSpreadPips > 0 && spread > settings.maxSpreadPips) {
      // Spread too wide — skip this poll cycle
      return res.json(null);
    }

    const signal = candidates[0] ?? null;
    if (!signal) return res.json(null);

    // ── Risk-based lot sizing ──────────────────────────────────────────────
    let lots: number;
    if (settings.riskPercent > 0 && balance > 0) {
      lots = calcLots(balance, settings.riskPercent, signal.entry, signal.stopLoss, signal.pair, settings.lotSize);
    } else {
      lots = settings.lotSize; // fall back to fixed lot size
    }

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
      lots,                           // risk-calculated lot size — EA should use this
      minProfitClose: settings.minProfitClose,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── Kill switch endpoints ─────────────────────────────────────────────────────

// GET /api/ea/halt — dashboard checks current halt state
router.get("/halt", async (_req, res) => {
  try {
    const settings = await getSettings();
    const dailyLoss = _dayStartBalance ? getDailyLoss(0) : 0; // placeholder
    return res.json({
      halted:          settings.halted,
      maxOpenTrades:   settings.maxOpenTrades,
      dailyLossLimit:  settings.dailyLossLimit,
      riskPercent:     settings.riskPercent,
      dayStartBalance: _dayStartBalance,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/ea/halt — dashboard sets or clears the kill switch
router.post("/halt", async (req, res) => {
  const halted = req.body.halted === true || req.body.halted === "true";
  try {
    const vals: Record<string, unknown> = {
      id:        1,
      halted,
      updatedAt: new Date(),
    };
    await db.insert(eaSettingsTable).values(vals as any).onConflictDoUpdate({
      target: eaSettingsTable.id,
      set:    { halted, updatedAt: new Date() } as any,
    });
    invalidateSettings();
    console.log(`[killSwitch] EA trading ${halted ? "HALTED" : "RESUMED"} by dashboard`);
    return res.json({ ok: true, halted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ea/balance ──────────────────────────────────────────────────────
router.post("/balance", async (req, res) => {
  const { login, balance, equity, currency, server, accountType } = req.body;
  if (!login) return res.status(400).json({ error: "login required" });

  try {
    // Track day-start balance for daily loss circuit breaker
    if (balance > 0) updateDayBalance(Number(balance));

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

// ── POST /api/ea/trade — DB-persisted trade journal ───────────────────────────
// EA calls this when a trade opens OR closes.
router.post("/trade", async (req, res) => {
  const {
    ticket, login, symbol, direction, lots,
    openPrice, sl, tp, signalId, confidence,
    timeframe, status, closePrice, profit,
  } = req.body;

  if (!ticket || !symbol || !direction) {
    return res.status(400).json({ error: "ticket, symbol and direction required" });
  }

  try {
    const now = Date.now();
    const dir = direction === "BUY" ? "BUY" : "SELL";
    const id  = `${ticket}-${String(login || "x")}`;

    if (status === "CLOSED") {
      // Update existing trade as closed
      await db.update(eaTradesTable).set({
        status:     "CLOSED",
        closePrice: closePrice != null ? Number(closePrice) : null,
        profit:     profit     != null ? Number(profit)     : null,
        closedAt:   now,
      }).where(eq(eaTradesTable.id, id));
    } else {
      // New open trade — upsert so duplicate reports are safe
      await db.insert(eaTradesTable).values({
        id,
        ticket:     String(ticket),
        login:      String(login    || ""),
        symbol:     String(symbol),
        direction:  dir,
        lots:       Number(lots      || 0.01),
        openPrice:  Number(openPrice || 0),
        sl:         Number(sl        || 0),
        tp:         Number(tp        || 0),
        signalId:   String(signalId  || ""),
        confidence: Number(confidence || 0),
        timeframe:  String(timeframe || ""),
        status:     "OPEN",
        openedAt:   now,
      }).onConflictDoNothing();

      // Record for re-entry tracking
      recordEAExecution(String(symbol), dir, Number(openPrice || 0));
    }

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ea/trades — read from DB ────────────────────────────────────────
router.get("/trades", async (req, res) => {
  try {
    const limit = Math.min(500, parseInt(String(req.query.limit ?? "200")) || 200);
    const rows = await db
      .select()
      .from(eaTradesTable)
      .orderBy(desc(eaTradesTable.openedAt))
      .limit(limit);

    return res.json(rows.map(r => ({
      id:         r.id,
      ticket:     r.ticket,
      login:      r.login,
      symbol:     r.symbol,
      direction:  r.direction,
      lots:       r.lots,
      openPrice:  r.openPrice,
      closePrice: r.closePrice,
      sl:         r.sl,
      tp:         r.tp,
      signalId:   r.signalId,
      confidence: r.confidence,
      timeframe:  r.timeframe,
      profit:     r.profit,
      status:     r.status,
      openedAt:   r.openedAt,
      closedAt:   r.closedAt,
    })));
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── In-memory open positions (reported by EA every 10s) ───────────────────────
interface EAPosition {
  ticket:       string;
  login:        string;
  symbol:       string;
  direction:    "BUY" | "SELL";
  lots:         number;
  openPrice:    number;
  currentPrice: number;
  sl:           number;
  tp:           number;
  profit:       number;
  signalId:     string;
  reportedAt:   number;
}
const _positionsByLogin = new Map<string, EAPosition[]>();

// POST /api/ea/positions — EA reports all currently open positions every 10s
router.post("/positions", (req, res) => {
  const positions = req.body;
  if (!Array.isArray(positions)) return res.status(400).json({ error: "array expected" });

  const now = Date.now();
  const byLogin = new Map<string, EAPosition[]>();
  for (const p of positions) {
    const login = String(p.login || "unknown");
    if (!byLogin.has(login)) byLogin.set(login, []);
    byLogin.get(login)!.push({
      ticket:       String(p.ticket),
      login,
      symbol:       String(p.symbol),
      direction:    p.direction === "BUY" ? "BUY" : "SELL",
      lots:         Number(p.lots)         || 0,
      openPrice:    Number(p.openPrice)    || 0,
      currentPrice: Number(p.currentPrice) || 0,
      sl:           Number(p.sl)           || 0,
      tp:           Number(p.tp)           || 0,
      profit:       Number(p.profit)       || 0,
      signalId:     String(p.signalId      || ""),
      reportedAt:   now,
    });
  }
  for (const [login, pos] of byLogin) _positionsByLogin.set(login, pos);

  return res.json({ ok: true });
});

// GET /api/ea/positions
router.get("/positions", (_req, res) => {
  const cutoff = Date.now() - 2 * 60 * 1000;
  const all: EAPosition[] = [];
  for (const positions of _positionsByLogin.values()) {
    for (const p of positions) {
      if (p.reportedAt > cutoff) all.push(p);
    }
  }
  return res.json(all);
});

// ── Force-execute queue ───────────────────────────────────────────────────────

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

    const item = {
      id:         `fq-${Date.now()}`,
      signalId:   String(signalId),
      lotSize:    Math.max(0.01, Number(lotSize) || 0.01),
      pair:       s.pair,
      direction:  (s.signal === "BUY" ? "BUY" : "SELL") as "BUY" | "SELL",
      entry:      s.entry,
      sl:         s.stopLoss,
      tp:         s.takeProfit,
      confidence: s.confidenceScore,
      timeframe:  s.timeframe,
      createdAt:  Date.now(),
      status:     "PENDING" as const,
    };
    await db.insert(forceQueueTable).values(item);
    return res.json({ ok: true, id: item.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/force-queue", async (_req, res) => {
  try {
    const pending = await db
      .select()
      .from(forceQueueTable)
      .where(eq(forceQueueTable.status, "PENDING"))
      .orderBy(desc(forceQueueTable.createdAt))
      .limit(10);
    return res.json(pending);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/force-queue/:id/done", async (req, res) => {
  try {
    await db
      .update(forceQueueTable)
      .set({ status: "TAKEN" })
      .where(eq(forceQueueTable.id, req.params.id));
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── EA Settings ───────────────────────────────────────────────────────────────

router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(eaSettingsTable).where(eq(eaSettingsTable.id, 1)).limit(1);
    if (!rows[0]) {
      return res.json({
        dailyProfitTarget: 0, dailyLossLimit: 0, lotSize: 0.01,
        minConfidence: 80, minProfitClose: 0,
        halted: false, riskPercent: 1.0, maxOpenTrades: 3, maxSpreadPips: 3.0,
      });
    }
    const s = rows[0] as any;
    return res.json({
      dailyProfitTarget: s.dailyProfitTarget,
      dailyLossLimit:    s.dailyLossLimit,
      lotSize:           s.lotSize,
      minConfidence:     s.minConfidence,
      minProfitClose:    s.minProfitClose,
      halted:            s.halted    ?? false,
      riskPercent:       s.riskPercent   ?? 1.0,
      maxOpenTrades:     s.maxOpenTrades  ?? 3,
      maxSpreadPips:     s.maxSpreadPips  ?? 3.0,
      updatedAt:         s.updatedAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/settings", async (req, res) => {
  const {
    dailyProfitTarget, dailyLossLimit, lotSize, minConfidence, minProfitClose,
    riskPercent, maxOpenTrades, maxSpreadPips,
  } = req.body;
  try {
    const vals = {
      id:                1,
      dailyProfitTarget: Math.max(0, Number(dailyProfitTarget) || 0),
      dailyLossLimit:    Math.max(0, Number(dailyLossLimit)    || 0),
      lotSize:           Math.max(0.01, Number(lotSize)        || 0.01),
      minConfidence:     Math.min(100, Math.max(1, Number(minConfidence) || 80)),
      minProfitClose:    Math.max(0, Number(minProfitClose)    || 0),
      riskPercent:       Math.min(10, Math.max(0, Number(riskPercent)   || 1.0)),
      maxOpenTrades:     Math.max(1, Math.min(20, parseInt(String(maxOpenTrades)) || 3)),
      maxSpreadPips:     Math.max(0, Number(maxSpreadPips)     || 3.0),
      updatedAt:         new Date(),
    };
    await db.insert(eaSettingsTable).values(vals as any).onConflictDoUpdate({
      target: eaSettingsTable.id,
      set:    vals as any,
    });
    invalidateSettings();
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ea/status ────────────────────────────────────────────────────────
router.get("/status", (_req, res) => {
  res.json({ ok: true, ts: Date.now(), version: "3.0" });
});

export default router;

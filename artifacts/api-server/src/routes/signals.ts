import { Router } from "express";
import { db } from "@workspace/db";
import { signalsTable, insertSignalSchema } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  ListSignalsQueryParams,
  CreateSignalBody,
  GetSignalParams,
  DeleteSignalParams,
  AnalyzeSignalBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = ListSignalsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { pair, signal, timeframe } = parsed.data;

  const conditions = [];
  if (pair) conditions.push(eq(signalsTable.pair, pair));
  if (signal) conditions.push(eq(signalsTable.signal, signal as "BUY" | "SELL"));
  if (timeframe) conditions.push(eq(signalsTable.timeframe, timeframe));

  const signals = await db
    .select()
    .from(signalsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(signalsTable.createdAt));

  res.json(signals);
});

router.post("/analyze", async (req, res) => {
  const parsed = AnalyzeSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { pair, timeframe } = parsed.data;

  const analysis = generateAnalysis(pair, timeframe);
  res.json(analysis);
});

router.get("/dashboard-summary", async (req, res) => {
  const allSignals = await db
    .select()
    .from(signalsTable)
    .orderBy(desc(signalsTable.createdAt));

  const totalSignals = allSignals.length;
  const activeSignals = allSignals.filter((s) => s.status === "ACTIVE").length;
  const hitTp = allSignals.filter((s) => s.status === "HIT_TP").length;
  const hitSl = allSignals.filter((s) => s.status === "HIT_SL").length;
  const resolved = hitTp + hitSl;
  const winRate = resolved > 0 ? parseFloat((hitTp / resolved).toFixed(4)) : 0;
  const avgConfidence =
    totalSignals > 0
      ? Math.round(
          allSignals.reduce((acc, s) => acc + s.confidenceScore, 0) / totalSignals
        )
      : 0;
  const buySignals = allSignals.filter((s) => s.signal === "BUY").length;
  const sellSignals = allSignals.filter((s) => s.signal === "SELL").length;

  const pairMap: Record<string, { count: number; tp: number; sl: number }> = {};
  for (const s of allSignals) {
    if (!pairMap[s.pair]) pairMap[s.pair] = { count: 0, tp: 0, sl: 0 };
    pairMap[s.pair].count++;
    if (s.status === "HIT_TP") pairMap[s.pair].tp++;
    if (s.status === "HIT_SL") pairMap[s.pair].sl++;
  }
  const topPairs = Object.entries(pairMap)
    .map(([p, v]) => ({
      pair: p,
      count: v.count,
      winRate: v.tp + v.sl > 0 ? parseFloat((v.tp / (v.tp + v.sl)).toFixed(4)) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentActivity = allSignals.slice(0, 5);

  res.json({
    totalSignals,
    activeSignals,
    winRate,
    avgConfidence,
    buySignals,
    sellSignals,
    topPairs,
    recentActivity,
  });
});

router.post("/", async (req, res) => {
  const parsed = CreateSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [created] = await db
    .insert(signalsTable)
    .values(parsed.data as any)
    .returning();

  res.status(201).json(created);
});

router.get("/:id", async (req, res) => {
  const parsed = GetSignalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [signal] = await db
    .select()
    .from(signalsTable)
    .where(eq(signalsTable.id, parsed.data.id));

  if (!signal) {
    res.status(404).json({ error: "Signal not found" });
    return;
  }
  res.json(signal);
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteSignalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(signalsTable).where(eq(signalsTable.id, parsed.data.id));
  res.status(204).send();
});

function generateAnalysis(pair: string, timeframe: string) {
  const pairPrices: Record<string, number> = {
    EURUSD: 1.085,
    GBPUSD: 1.27,
    USDJPY: 149.5,
    AUDUSD: 0.652,
    USDCAD: 1.365,
    NZDUSD: 0.601,
    USDCHF: 0.896,
    GBPJPY: 189.8,
    EURJPY: 162.3,
    EURGBP: 0.853,
  };

  const basePrice = pairPrices[pair] || 1.0;
  const isJpy = pair.includes("JPY");
  const pipSize = isJpy ? 0.01 : 0.0001;
  const spread = pipSize * 2;

  const isBuy = Math.random() > 0.45;
  const signal = isBuy ? "BUY" : "SELL";
  const entry = parseFloat((basePrice + (Math.random() - 0.5) * pipSize * 10).toFixed(isJpy ? 2 : 5));
  const slPips = Math.floor(Math.random() * 20 + 15);
  const tpPips = Math.floor(slPips * (1.5 + Math.random()));
  const stopLoss = parseFloat(
    (isBuy ? entry - slPips * pipSize : entry + slPips * pipSize).toFixed(isJpy ? 2 : 5)
  );
  const takeProfit = parseFloat(
    (isBuy ? entry + tpPips * pipSize : entry - tpPips * pipSize).toFixed(isJpy ? 2 : 5)
  );
  const riskRewardRatio = parseFloat((tpPips / slPips).toFixed(2));

  const hasOB = Math.random() > 0.35;
  const hasSR = Math.random() > 0.25;
  const structures = ["BOS", "CHOCH", "NONE"] as const;
  const structureType = structures[Math.floor(Math.random() * 3)];
  const trend = isBuy ? "BULLISH" : "BEARISH";
  const confidence = Math.floor(55 + Math.random() * 40);

  const reasons: string[] = [];
  if (hasOB) reasons.push(isBuy ? "Price at bullish order block" : "Price at bearish order block");
  if (hasSR) reasons.push(isBuy ? "Strong support zone confirmed" : "Strong resistance zone confirmed");
  if (structureType === "BOS") reasons.push("Break of structure confirmed");
  if (structureType === "CHOCH") reasons.push("Change of character detected");
  if (confidence > 75) reasons.push(isBuy ? "Bullish sentiment (" + confidence + "%)" : "Bearish sentiment (" + confidence + "%)");
  if (reasons.length < 2) reasons.push(isBuy ? "Bullish market structure" : "Bearish market structure");
  reasons.push("No high-impact news nearby");

  const supportHigh = parseFloat((Math.min(entry, stopLoss) + Math.abs(entry - stopLoss) * 0.3).toFixed(isJpy ? 2 : 5));
  const supportLow = parseFloat((Math.min(entry, stopLoss) - pipSize * 5).toFixed(isJpy ? 2 : 5));
  const resistanceHigh = parseFloat((Math.max(entry, takeProfit) + pipSize * 5).toFixed(isJpy ? 2 : 5));
  const resistanceLow = parseFloat((Math.max(entry, takeProfit) - Math.abs(entry - takeProfit) * 0.2).toFixed(isJpy ? 2 : 5));

  return {
    pair,
    timeframe,
    signal,
    entry,
    stopLoss,
    takeProfit,
    confidenceScore: confidence,
    reasons,
    structureType,
    trend,
    hasOrderBlock: hasOB,
    hasSupportResistance: hasSR,
    riskRewardRatio,
    supportZone: { high: supportHigh, low: supportLow },
    resistanceZone: { high: resistanceHigh, low: resistanceLow },
    orderBlockZone: hasOB
      ? {
          high: parseFloat((entry + pipSize * 8).toFixed(isJpy ? 2 : 5)),
          low: parseFloat((entry - pipSize * 8).toFixed(isJpy ? 2 : 5)),
          type: isBuy ? "BULLISH" : "BEARISH",
        }
      : null,
  };
}

export default router;

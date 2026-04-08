import { Router } from "express";
import { db } from "@workspace/db";
import { signalsTable, insertSignalSchema } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  ListSignalsQueryParams,
  CreateSignalBody,
  GetSignalParams,
  DeleteSignalParams,
  AnalyzeSignalBody,
} from "@workspace/api-zod";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Candle { open: number; high: number; low: number; close: number }

// ─────────────────────────────────────────────────────────────────────────────
// CANDLE SIMULATION  (realistic random walk with trend & volatility)
// ─────────────────────────────────────────────────────────────────────────────

function generateCandles(basePrice: number, atrPct: number, count = 150): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const drift = (Math.random() - 0.48) * atrPct * 0.25; // slight directional bias

  for (let i = 0; i < count; i++) {
    const vol = atrPct * basePrice * (0.6 + Math.random() * 0.8);
    const body = vol * (0.3 + Math.random() * 0.5);
    const open = price;
    const dir = Math.random() > 0.5 ? 1 : -1;
    const close = open + dir * body + drift;
    const high = Math.max(open, close) + Math.random() * vol * 0.4;
    const low = Math.min(open, close) - Math.random() * vol * 0.4;
    candles.push({ open, high, low, close });
    price = close;
  }
  return candles;
}

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICAL INDICATORS
// ─────────────────────────────────────────────────────────────────────────────

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function calcATR(candles: Candle[], period = 14): number {
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1];
    return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
  });
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calcRSI(candles: Candle[], period = 14): number {
  const closes = candles.map(c => c.close);
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgG = gains / period;
  const avgL = losses / period;
  if (avgL === 0) return 100;
  const rs = avgG / avgL;
  return 100 - 100 / (1 + rs);
}

function calcMACD(candles: Candle[]): { macd: number; signal: number; hist: number } {
  const closes = candles.map(c => c.close);
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  const len = Math.min(fast.length, slow.length);
  const macdLine = fast.slice(-len).map((v, i) => v - slow.slice(-len)[i]);
  const signalLine = ema(macdLine, 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return { macd, signal, hist: macd - signal };
}

function calcBB(candles: Candle[], period = 20): { upper: number; mid: number; lower: number } {
  const closes = candles.slice(-period).map(c => c.close);
  const mid = closes.reduce((a, b) => a + b, 0) / period;
  const variance = closes.reduce((acc, v) => acc + (v - mid) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mid + 2 * std, mid, lower: mid - 2 * std };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMART MONEY CONCEPTS DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function detectStructure(candles: Candle[]): { type: "BOS" | "CHOCH" | "NONE"; trend: "BULLISH" | "BEARISH" | "RANGING" } {
  const last = candles.slice(-30);
  const highs = last.map(c => c.high);
  const lows  = last.map(c => c.low);

  const highestIdx = highs.indexOf(Math.max(...highs));
  const lowestIdx  = lows.indexOf(Math.min(...lows));

  const recentHigh = Math.max(...highs.slice(-10));
  const prevHigh   = Math.max(...highs.slice(-20, -10));
  const recentLow  = Math.min(...lows.slice(-10));
  const prevLow    = Math.min(...lows.slice(-20, -10));

  const bullBOS  = recentHigh > prevHigh && recentLow > prevLow;
  const bearBOS  = recentLow  < prevLow  && recentHigh < prevHigh;
  const bullChoch = lowestIdx > highestIdx && recentHigh < prevHigh;
  const bearChoch = highestIdx > lowestIdx && recentLow > prevLow;

  let trend: "BULLISH" | "BEARISH" | "RANGING" = "RANGING";
  if (bullBOS) trend = "BULLISH";
  else if (bearBOS) trend = "BEARISH";

  let type: "BOS" | "CHOCH" | "NONE" = "NONE";
  if (bullBOS || bearBOS) type = "BOS";
  else if (bullChoch || bearChoch) type = "CHOCH";

  return { type, trend };
}

function detectOrderBlock(candles: Candle[], trend: string): { high: number; low: number; type: "BULLISH" | "BEARISH" } | null {
  const len = candles.length;
  for (let i = len - 5; i > len - 25; i--) {
    const c = candles[i];
    const next = candles[i + 1];
    if (!next) continue;
    // Bearish OB before bullish impulse (for BUY setup)
    if (trend === "BULLISH" && c.close < c.open && next.close > next.open && (next.close - next.open) > (c.open - c.close) * 1.5) {
      return { high: c.open, low: c.close, type: "BULLISH" };
    }
    // Bullish OB before bearish impulse (for SELL setup)
    if (trend === "BEARISH" && c.close > c.open && next.close < next.open && (next.open - next.close) > (c.close - c.open) * 1.5) {
      return { high: c.close, low: c.open, type: "BEARISH" };
    }
  }
  return null;
}

function detectFVG(candles: Candle[]): { high: number; low: number; type: "BULLISH" | "BEARISH" } | null {
  for (let i = candles.length - 2; i > candles.length - 20; i--) {
    const prev = candles[i - 1];
    const curr = candles[i];
    const next = candles[i + 1];
    if (!prev || !next) continue;
    // Bullish FVG: gap between prev high and next low (price moved up quickly)
    if (next.low > prev.high) {
      return { high: next.low, low: prev.high, type: "BULLISH" };
    }
    // Bearish FVG: gap between prev low and next high (price moved down quickly)
    if (next.high < prev.low) {
      return { high: prev.low, low: next.high, type: "BEARISH" };
    }
  }
  return null;
}

function detectLiquiditySweep(candles: Candle[]): { detected: boolean; type: "BSL" | "SSL" | null } {
  const len = candles.length;
  const recent = candles.slice(-5);
  const prev   = candles.slice(-20, -5);

  const prevHigh = Math.max(...prev.map(c => c.high));
  const prevLow  = Math.min(...prev.map(c => c.low));

  // Sweep of sell-side liquidity (below equal lows) then close back above
  const sslSweep = recent.some((c, i) => {
    if (i === 0) return false;
    return c.low < prevLow && c.close > prevLow;
  });

  // Sweep of buy-side liquidity (above equal highs) then close back below
  const bslSweep = recent.some((c, i) => {
    if (i === 0) return false;
    return c.high > prevHigh && c.close < prevHigh;
  });

  if (sslSweep) return { detected: true, type: "SSL" };
  if (bslSweep) return { detected: true, type: "BSL" };
  return { detected: false, type: null };
}

function detectRSIDivergence(candles: Candle[]): { detected: boolean; type: string | null } {
  const rsiNow   = calcRSI(candles, 14);
  const rsiPrev  = calcRSI(candles.slice(0, -10), 14);
  const priceNow = candles[candles.length - 1].close;
  const pricePrev = candles[candles.length - 11].close;

  // Regular bearish: price HH, RSI LH
  if (priceNow > pricePrev && rsiNow < rsiPrev && rsiNow > 50) {
    return { detected: true, type: "REGULAR_BEARISH" };
  }
  // Regular bullish: price LL, RSI HL
  if (priceNow < pricePrev && rsiNow > rsiPrev && rsiNow < 50) {
    return { detected: true, type: "REGULAR_BULLISH" };
  }
  // Hidden bullish: price HL, RSI LL (trend continuation)
  if (priceNow > pricePrev && rsiNow < rsiPrev && rsiNow < 50) {
    return { detected: true, type: "HIDDEN_BULLISH" };
  }
  // Hidden bearish: price LH, RSI HH (trend continuation)
  if (priceNow < pricePrev && rsiNow > rsiPrev && rsiNow > 50) {
    return { detected: true, type: "HIDDEN_BEARISH" };
  }
  return { detected: false, type: null };
}

function detectCandlePattern(candles: Candle[], atr: number): string | null {
  const last3 = candles.slice(-3);
  const c = last3[2];
  const p = last3[1];
  if (!c || !p) return null;

  const body   = Math.abs(c.close - c.open);
  const upWick = c.high - Math.max(c.open, c.close);
  const dnWick = Math.min(c.open, c.close) - c.low;
  const range  = c.high - c.low;

  // Pin bar / hammer
  if (dnWick > body * 2.5 && dnWick > upWick * 2) return "Bullish Pin Bar";
  if (upWick > body * 2.5 && upWick > dnWick * 2) return "Bearish Pin Bar";

  // Engulfing
  if (c.close > c.open && p.close < p.open && c.close > p.open && c.open < p.close) return "Bullish Engulfing";
  if (c.close < c.open && p.close > p.open && c.close < p.open && c.open > p.close) return "Bearish Engulfing";

  // Doji
  if (body < range * 0.1) return "Doji";

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIBONACCI OTE  (0.62–0.79 retracement of impulse leg)
// ─────────────────────────────────────────────────────────────────────────────

function checkFibOTE(candles: Candle[], trend: string): { inOTE: boolean; fibHigh: number; fibLow: number } {
  const slice = candles.slice(-40);
  const high  = Math.max(...slice.map(c => c.high));
  const low   = Math.min(...slice.map(c => c.low));
  const range = high - low;
  const current = candles[candles.length - 1].close;

  const ote618 = trend === "BULLISH" ? high - range * 0.618 : low + range * 0.618;
  const ote79  = trend === "BULLISH" ? high - range * 0.79  : low + range * 0.79;

  const fibHigh = Math.max(ote618, ote79);
  const fibLow  = Math.min(ote618, ote79);

  const inOTE = current >= fibLow && current <= fibHigh;
  return { inOTE, fibHigh, fibLow };
}

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM / DISCOUNT ZONE
// ─────────────────────────────────────────────────────────────────────────────

function premiumDiscount(candles: Candle[]): "PREMIUM" | "DISCOUNT" | "EQUILIBRIUM" {
  const high    = Math.max(...candles.slice(-50).map(c => c.high));
  const low     = Math.min(...candles.slice(-50).map(c => c.low));
  const eq      = (high + low) / 2;
  const current = candles[candles.length - 1].close;
  const buf     = (high - low) * 0.05;
  if (current > eq + buf) return "PREMIUM";
  if (current < eq - buf) return "DISCOUNT";
  return "EQUILIBRIUM";
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION DETECTION  (UTC-based)
// ─────────────────────────────────────────────────────────────────────────────

function getSession(): { name: string; quality: "OPTIMAL" | "GOOD" | "AVOID" } {
  const utcH = new Date().getUTCHours();
  const utcM = new Date().getUTCMinutes();
  const t = utcH * 60 + utcM;

  // London Open Kill Zone: 07:00–10:00 UTC
  if (t >= 420 && t < 600) return { name: "London Open", quality: "OPTIMAL" };
  // NY Open Kill Zone: 12:00–15:00 UTC
  if (t >= 720 && t < 900) return { name: "New York Open", quality: "OPTIMAL" };
  // London/NY overlap: 13:00–17:00 UTC
  if (t >= 780 && t < 1020) return { name: "London/NY Overlap", quality: "OPTIMAL" };
  // London session: 07:00–16:00 UTC
  if (t >= 420 && t < 960) return { name: "London Session", quality: "GOOD" };
  // NY session: 13:00–22:00 UTC
  if (t >= 780 && t < 1320) return { name: "New York Session", quality: "GOOD" };
  // Tokyo session: 00:00–09:00 UTC
  if (t < 540) return { name: "Tokyo Session", quality: "GOOD" };
  // Dead zones
  return { name: "Off-Hours", quality: "AVOID" };
}

// ─────────────────────────────────────────────────────────────────────────────
// DXY SENTIMENT  (USD pairs only)
// ─────────────────────────────────────────────────────────────────────────────

function getDXYSentiment(pair: string): "BULLISH_USD" | "BEARISH_USD" | "NEUTRAL" {
  const usdPairs = ["EURUSD","GBPUSD","AUDUSD","NZDUSD","USDJPY","USDCAD","USDCHF","USDCHF","XAUUSD"];
  if (!usdPairs.includes(pair)) return "NEUTRAL";
  // Simulate DXY direction from a seeded random (consistent per hour)
  const seed = Math.floor(Date.now() / 3_600_000);
  const pseudo = Math.sin(seed * 9301 + 49297) * 0.5 + 0.5;
  return pseudo > 0.55 ? "BULLISH_USD" : pseudo < 0.45 ? "BEARISH_USD" : "NEUTRAL";
}

// ─────────────────────────────────────────────────────────────────────────────
// HTF BIAS  (simulates what D1/W1 says — stable per hour)
// ─────────────────────────────────────────────────────────────────────────────

function getHTFBias(pair: string): "BULLISH" | "BEARISH" | "RANGING" {
  const seed = Math.floor(Date.now() / 14_400_000) + pair.charCodeAt(0);
  const pseudo = Math.sin(seed * 12345.6789) * 0.5 + 0.5;
  if (pseudo > 0.55) return "BULLISH";
  if (pseudo < 0.45) return "BEARISH";
  return "RANGING";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

function generateAnalysis(pair: string, timeframe: string) {
  const GRAN_SECS: Record<string, number> = { M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400 };
  const granSecs   = GRAN_SECS[timeframe] || 3600;
  const nowSec     = Math.floor(Date.now() / 1000);
  const alignedNow = Math.floor(nowSec / granSecs) * granSecs;

  const pairPrices: Record<string, number> = {
    // Forex
    EURUSD: 1.0850, GBPUSD: 1.2700, USDJPY: 149.50,
    AUDUSD: 0.6520, USDCAD: 1.3650, NZDUSD: 0.6010, USDCHF: 0.8960,
    GBPJPY: 189.80, EURJPY: 162.30, EURGBP: 0.8530,
    EURCHF: 0.9620, EURCAD: 1.4760, GBPCAD: 1.7160, AUDCAD: 0.8920, CADJPY: 109.60,
    AUDNZD: 1.0850, AUDCHF: 0.5840, GBPCHF: 1.1390, NZDJPY: 89.90,
    // Commodities
    XAUUSD: 2340.0, XAGUSD: 29.50, XPTUSD: 980.0,
    USOIL: 82.50, UKOIL: 86.20, NATGAS: 2.45, COPPER: 4.15,
    // Crypto
    BTCUSD: 68500, ETHUSD: 3450, XRPUSD: 0.52, LTCUSD: 88.0,
    DOGEUSD: 0.148, DOTUSD: 7.80, BNBUSDT: 580.0, SOLUSDT: 155.0,
    ADAUSDT: 0.45, AVAXUSDT: 38.0, MATICUSDT: 0.72, LINKUSDT: 14.50,
    // Deriv Synthetics
    R_10: 10245.32, R_25: 8932.15, R_50: 6543.78, R_75: 12876.44, R_100: 22345.67,
    "1HZ10V": 3456.21, "1HZ25V": 7823.44, "1HZ50V": 5621.33, "1HZ75V": 9034.55, "1HZ100V": 18234.12,
    BOOM300: 7823.50, BOOM500: 6543.20, BOOM1000: 5234.80,
    CRASH300: 8912.30, CRASH500: 7234.60, CRASH1000: 5876.40,
    JD10: 5234.12, JD25: 6891.34, JD50: 9123.56, JD75: 12456.78, JD100: 18765.43,
  };

  const basePrice  = pairPrices[pair] ?? 1.0;
  const isJpy      = pair.includes("JPY");
  const isGold     = pair === "XAUUSD";
  const isCrypto   = ["BTC","ETH","XRP","LTC","DOGE","DOT","BNB","SOL","ADA","AVAX","MATIC","LINK"].some(s => pair.startsWith(s));
  const isCommodity = ["XAGUSD","XPTUSD","USOIL","UKOIL","NATGAS","COPPER"].includes(pair);
  const isSynthetic = ["R_","1HZ","BOOM","CRASH","JD","STPIDX"].some(p => pair.startsWith(p));
  const decimals   = isSynthetic ? 2 : isCrypto && basePrice > 100 ? 2 : isCrypto ? 4 : isJpy || isGold || isCommodity ? 2 : 5;
  const atrPct     = isSynthetic ? 0.008 : isCrypto ? 0.012 : isGold ? 0.004 : isCommodity ? 0.006 : isJpy ? 0.003 : 0.0025;

  // ── Generate candles & run indicators ──────────────────────────────────────
  const candles = generateCandles(basePrice, atrPct, 150);
  const atr     = calcATR(candles, 14);
  const rsi     = calcRSI(candles, 14);
  const macd    = calcMACD(candles);
  const bb      = calcBB(candles, 20);
  const closes  = candles.map(c => c.close);
  const ema20   = ema(closes, 20);
  const ema50   = ema(closes, 50);
  const ema20v  = ema20[ema20.length - 1];
  const ema50v  = ema50[ema50.length - 1];
  const currentPrice = candles[candles.length - 1].close;

  // ── SMC Detection ──────────────────────────────────────────────────────────
  const { type: structureType, trend: structureTrend } = detectStructure(candles);
  const orderBlock   = detectOrderBlock(candles, structureTrend);
  const fvg          = detectFVG(candles);
  const liqSweep     = detectLiquiditySweep(candles);
  const divergence   = detectRSIDivergence(candles);
  const candlePattern = detectCandlePattern(candles, atr);
  const pdZone       = premiumDiscount(candles);
  const htfBias      = getHTFBias(pair);
  const session      = getSession();
  const dxySentiment = getDXYSentiment(pair);
  const htfTrend     = structureTrend !== "RANGING" ? structureTrend : htfBias;

  // ── Fibonacci OTE ──────────────────────────────────────────────────────────
  const fib = checkFibOTE(candles, htfTrend);

  // ── Multi-confluence Scoring ────────────────────────────────────────────────
  let bullScore = 0;
  let bearScore = 0;

  // Structure
  if (structureTrend === "BULLISH") bullScore += 2;
  if (structureTrend === "BEARISH") bearScore += 2;
  if (structureType === "BOS") { if (structureTrend === "BULLISH") bullScore += 1; else bearScore += 1; }
  if (structureType === "CHOCH") { if (structureTrend === "BULLISH") bullScore += 2; else bearScore += 2; }

  // HTF Bias alignment
  if (htfBias === "BULLISH") bullScore += 2;
  if (htfBias === "BEARISH") bearScore += 2;

  // RSI
  if (rsi < 35) bullScore += 2;
  else if (rsi > 65) bearScore += 2;
  else if (rsi < 45) bullScore += 1;
  else if (rsi > 55) bearScore += 1;

  // MACD
  if (macd.hist > 0 && macd.macd > macd.signal) bullScore += 1;
  if (macd.hist < 0 && macd.macd < macd.signal) bearScore += 1;

  // EMA cross
  if (ema20v > ema50v) bullScore += 1;
  else bearScore += 1;

  // Bollinger Band
  if (currentPrice <= bb.lower) bullScore += 2;
  else if (currentPrice >= bb.upper) bearScore += 2;

  // Order Block
  if (orderBlock?.type === "BULLISH") bullScore += 2;
  if (orderBlock?.type === "BEARISH") bearScore += 2;

  // FVG
  if (fvg?.type === "BULLISH") bullScore += 1;
  if (fvg?.type === "BEARISH") bearScore += 1;

  // Liquidity Sweep
  if (liqSweep.detected) {
    if (liqSweep.type === "SSL") bullScore += 3; // swept sells = bullish reversal
    if (liqSweep.type === "BSL") bearScore += 3; // swept buys = bearish reversal
  }

  // Premium/Discount: buy in discount, sell in premium
  if (pdZone === "DISCOUNT") bullScore += 2;
  if (pdZone === "PREMIUM")  bearScore += 2;

  // OTE
  if (fib.inOTE && structureTrend === "BULLISH") bullScore += 2;
  if (fib.inOTE && structureTrend === "BEARISH") bearScore += 2;

  // RSI Divergence
  if (divergence.detected) {
    if (divergence.type === "REGULAR_BULLISH" || divergence.type === "HIDDEN_BULLISH") bullScore += 2;
    if (divergence.type === "REGULAR_BEARISH" || divergence.type === "HIDDEN_BEARISH") bearScore += 2;
  }

  // Candle Pattern
  if (candlePattern?.startsWith("Bullish")) bullScore += 2;
  if (candlePattern?.startsWith("Bearish")) bearScore += 2;

  // DXY
  if (dxySentiment !== "NEUTRAL") {
    const usdBaseStrong = ["USDJPY","USDCAD","USDCHF"].includes(pair);
    if (dxySentiment === "BULLISH_USD" && usdBaseStrong) bullScore += 1;
    if (dxySentiment === "BULLISH_USD" && !usdBaseStrong) bearScore += 1;
    if (dxySentiment === "BEARISH_USD" && usdBaseStrong) bearScore += 1;
    if (dxySentiment === "BEARISH_USD" && !usdBaseStrong) bullScore += 1;
  }

  // Session quality
  if (session.quality === "AVOID" && !isSynthetic) {
    bullScore = Math.floor(bullScore * 0.7);
    bearScore = Math.floor(bearScore * 0.7);
  }

  // ── Determine Signal ────────────────────────────────────────────────────────
  const totalScore  = bullScore + bearScore;
  const bullPct     = totalScore > 0 ? bullScore / totalScore : 0.5;
  const threshold   = 0.58;

  let signal: "BUY" | "SELL" | "NEUTRAL";
  let signalTrend: "BULLISH" | "BEARISH";

  if (bullPct >= threshold) {
    signal = "BUY"; signalTrend = "BULLISH";
  } else if (bullPct <= 1 - threshold) {
    signal = "SELL"; signalTrend = "BEARISH";
  } else {
    // No clear edge → NEUTRAL
    signal = "NEUTRAL"; signalTrend = bullPct >= 0.5 ? "BULLISH" : "BEARISH";
  }

  // ── Confidence Score (30 max possible individual points → scale to 55–97) ──
  const winnerScore = signal === "BUY" ? bullScore : bearScore;
  const confidence  = Math.min(97, Math.max(55, Math.round(55 + (winnerScore / 20) * 42)));

  // ── ATR-based Stops ─────────────────────────────────────────────────────────
  const entry     = parseFloat(currentPrice.toFixed(decimals));
  const slAtr     = atr * (isSynthetic ? 1.5 : 1.2);
  const tpAtr     = slAtr * (1.8 + Math.random() * 0.6);
  const stopLoss  = parseFloat(
    (signal === "BUY" ? entry - slAtr : entry + slAtr).toFixed(decimals)
  );
  const takeProfit = parseFloat(
    (signal === "BUY" ? entry + tpAtr : entry - tpAtr).toFixed(decimals)
  );
  const riskRewardRatio = parseFloat((tpAtr / slAtr).toFixed(2));

  // ── Support / Resistance Zones ──────────────────────────────────────────────
  const recentHigh = Math.max(...candles.slice(-30).map(c => c.high));
  const recentLow  = Math.min(...candles.slice(-30).map(c => c.low));
  const midRange   = (recentHigh + recentLow) / 2;

  const supportZone = {
    high: parseFloat((recentLow + (midRange - recentLow) * 0.3).toFixed(decimals)),
    low:  parseFloat((recentLow - atr * 0.5).toFixed(decimals)),
  };
  const resistanceZone = {
    high: parseFloat((recentHigh + atr * 0.5).toFixed(decimals)),
    low:  parseFloat((recentHigh - (recentHigh - midRange) * 0.3).toFixed(decimals)),
  };

  // ── Build Reasons Array ─────────────────────────────────────────────────────
  const reasons: string[] = [];

  if (htfBias !== "RANGING") reasons.push(`HTF D1 bias is ${htfBias.toLowerCase()} — trade with the trend`);
  if (structureType === "BOS") reasons.push(`${signalTrend === "BULLISH" ? "Bullish" : "Bearish"} Break of Structure confirmed`);
  if (structureType === "CHOCH") reasons.push(`Change of Character detected — potential reversal`);
  if (orderBlock) reasons.push(`Price at ${orderBlock.type.toLowerCase()} order block (${orderBlock.low.toFixed(decimals)} – ${orderBlock.high.toFixed(decimals)})`);
  if (fvg) reasons.push(`${fvg.type === "BULLISH" ? "Bullish" : "Bearish"} Fair Value Gap detected`);
  if (liqSweep.detected) reasons.push(`Liquidity sweep of ${liqSweep.type === "SSL" ? "sell-side" : "buy-side"} liquidity — reversal expected`);
  if (pdZone !== "EQUILIBRIUM") reasons.push(`Price in ${pdZone} zone — ${pdZone === "DISCOUNT" ? "buy opportunities" : "sell opportunities"} favoured`);
  if (fib.inOTE) reasons.push(`Price in Fibonacci OTE zone (0.618–0.79 retracement)`);
  if (divergence.detected) reasons.push(`RSI ${divergence.type?.replace(/_/g, " ").toLowerCase()} divergence detected`);
  if (candlePattern) reasons.push(`${candlePattern} candlestick pattern at key level`);
  if (rsi < 30) reasons.push(`RSI oversold (${rsi.toFixed(1)}) — bullish pressure building`);
  if (rsi > 70) reasons.push(`RSI overbought (${rsi.toFixed(1)}) — bearish pressure building`);
  if (ema20v > ema50v && signal === "BUY") reasons.push("EMA 20 above EMA 50 — bullish momentum");
  if (ema20v < ema50v && signal === "SELL") reasons.push("EMA 20 below EMA 50 — bearish momentum");
  if (macd.hist > 0 && signal === "BUY") reasons.push("MACD histogram positive — bullish");
  if (macd.hist < 0 && signal === "SELL") reasons.push("MACD histogram negative — bearish");
  if (session.quality === "AVOID") reasons.push(`Low-liquidity session (${session.name}) — signal weight reduced`);
  else reasons.push(`${session.name} — ${session.quality === "OPTIMAL" ? "high-liquidity kill zone" : "active market session"}`);

  if (reasons.length === 0) reasons.push("Multi-indicator confluence analysis completed");

  // ── Return Full Result ──────────────────────────────────────────────────────
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
    trend: signalTrend,
    hasOrderBlock: !!orderBlock,
    hasSupportResistance: true,
    riskRewardRatio,
    supportZone,
    resistanceZone,
    orderBlockZone: orderBlock
      ? { high: parseFloat(orderBlock.high.toFixed(decimals)), low: parseFloat(orderBlock.low.toFixed(decimals)), type: orderBlock.type }
      : null,
    // ── New Advanced Fields ──
    session: session.name,
    sessionQuality: session.quality,
    htfBias,
    premiumDiscount: pdZone,
    hasFVG: !!fvg,
    fvgZone: fvg
      ? { high: parseFloat(fvg.high.toFixed(decimals)), low: parseFloat(fvg.low.toFixed(decimals)), type: fvg.type }
      : null,
    hasLiquiditySweep: liqSweep.detected,
    liquiditySweepType: liqSweep.type,
    isInOTE: fib.inOTE,
    oteFibHigh: parseFloat(fib.fibHigh.toFixed(decimals)),
    oteFibLow: parseFloat(fib.fibLow.toFixed(decimals)),
    hasDivergence: divergence.detected,
    divergenceType: divergence.type ?? null,
    hasCandlePattern: !!candlePattern,
    candlePattern: candlePattern ?? null,
    atr: parseFloat(atr.toFixed(decimals + 1)),
    rsi: parseFloat(rsi.toFixed(1)),
    macdHist: parseFloat(macd.hist.toFixed(decimals + 2)),
    dxySentiment,
    bullScore,
    bearScore,
    // ── Chart Drawing Data ──
    chartCandles: candles.map((c, i) => ({
      time:  alignedNow - (candles.length - 1 - i) * granSecs,
      open:  parseFloat(c.open.toFixed(decimals)),
      high:  parseFloat(c.high.toFixed(decimals)),
      low:   parseFloat(c.low.toFixed(decimals)),
      close: parseFloat(c.close.toFixed(decimals)),
    })),
    swingHighLevel:  parseFloat(recentHigh.toFixed(decimals)),
    swingLowLevel:   parseFloat(recentLow.toFixed(decimals)),
    equilibriumLevel: parseFloat(midRange.toFixed(decimals)),
    liquidityLevel: liqSweep.detected
      ? parseFloat(
          (liqSweep.type === "SSL"
            ? Math.min(...candles.slice(-20, -5).map(c => c.low))
            : Math.max(...candles.slice(-20, -5).map(c => c.high))
          ).toFixed(decimals)
        )
      : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const parsed = ListSignalsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query parameters" }); return; }
  const { pair, signal, timeframe } = parsed.data;
  const conditions = [];
  if (pair) conditions.push(eq(signalsTable.pair, pair));
  if (signal) conditions.push(eq(signalsTable.signal, signal as "BUY" | "SELL"));
  if (timeframe) conditions.push(eq(signalsTable.timeframe, timeframe));
  const signals = await db.select().from(signalsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(signalsTable.createdAt));
  res.json(signals);
});

router.post("/analyze", async (req, res) => {
  const parsed = AnalyzeSignalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const { pair, timeframe } = parsed.data;
  const analysis = generateAnalysis(pair, timeframe);
  res.json(analysis);
});

router.get("/dashboard-summary", async (req, res) => {
  const allSignals = await db.select().from(signalsTable).orderBy(desc(signalsTable.createdAt));
  const totalSignals  = allSignals.length;
  const activeSignals = allSignals.filter(s => s.status === "ACTIVE").length;
  const hitTp  = allSignals.filter(s => s.status === "HIT_TP").length;
  const hitSl  = allSignals.filter(s => s.status === "HIT_SL").length;
  const resolved = hitTp + hitSl;
  const winRate  = resolved > 0 ? parseFloat((hitTp / resolved).toFixed(4)) : 0;
  const avgConfidence = totalSignals > 0
    ? Math.round(allSignals.reduce((acc, s) => acc + s.confidenceScore, 0) / totalSignals) : 0;
  const buySignals  = allSignals.filter(s => s.signal === "BUY").length;
  const sellSignals = allSignals.filter(s => s.signal === "SELL").length;
  const pairMap: Record<string, { count: number; tp: number; sl: number }> = {};
  for (const s of allSignals) {
    if (!pairMap[s.pair]) pairMap[s.pair] = { count: 0, tp: 0, sl: 0 };
    pairMap[s.pair].count++;
    if (s.status === "HIT_TP") pairMap[s.pair].tp++;
    if (s.status === "HIT_SL") pairMap[s.pair].sl++;
  }
  const topPairs = Object.entries(pairMap).map(([p, v]) => ({
    pair: p, count: v.count,
    winRate: v.tp + v.sl > 0 ? parseFloat((v.tp / (v.tp + v.sl)).toFixed(4)) : 0,
  })).sort((a, b) => b.count - a.count).slice(0, 5);
  res.json({ totalSignals, activeSignals, winRate, avgConfidence, buySignals, sellSignals, topPairs, recentActivity: allSignals.slice(0, 5) });
});

router.post("/", async (req, res) => {
  const parsed = CreateSignalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const [created] = await db.insert(signalsTable).values(parsed.data as any).returning();
  res.status(201).json(created);
});

router.get("/:id", async (req, res) => {
  const parsed = GetSignalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [signal] = await db.select().from(signalsTable).where(eq(signalsTable.id, parsed.data.id));
  if (!signal) { res.status(404).json({ error: "Signal not found" }); return; }
  res.json(signal);
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteSignalParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(signalsTable).where(eq(signalsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;

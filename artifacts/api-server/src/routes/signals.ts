import { Router } from "express";
import { db } from "@workspace/db";
import { signalsTable, insertSignalSchema } from "@workspace/db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import {
  ListSignalsQueryParams,
  CreateSignalBody,
  GetSignalParams,
  DeleteSignalParams,
  AnalyzeSignalBody,
} from "@workspace/api-zod";
const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// RE-ENTRY TRACKER
// Prevents the EA from jumping straight back into the same pair/direction after
// a trade closes. Resets on server restart (acceptable — short-lived state).
// ─────────────────────────────────────────────────────────────────────────────

interface ReEntryRecord {
  lastEntryPrice: number;
  lastExecutedAt: number;
  otherTradesAfter: number; // # of OTHER pair executions since this one
}
const _reEntryMap = new Map<string, ReEntryRecord>(); // key: "PAIR|DIRECTION"

/** Called by ea.ts when the EA opens a new trade */
export function recordEAExecution(pair: string, direction: string, openPrice: number) {
  const key = `${pair}|${direction}`;
  // Bump "other trades" counter for every OTHER pair already tracked
  for (const [k, v] of _reEntryMap) {
    if (k !== key) v.otherTradesAfter++;
  }
  _reEntryMap.set(key, {
    lastEntryPrice: openPrice,
    lastExecutedAt: Date.now(),
    otherTradesAfter: 0,
  });
  console.log(`[reEntry] Recorded execution: ${key} @ ${openPrice}`);
}

/** Returns true if a new PENDING signal for this pair/direction is allowed */
function canGenerateNewSignal(pair: string, direction: string, newEntry: number): boolean {
  const key = `${pair}|${direction}`;
  const rec = _reEntryMap.get(key);
  if (!rec) return true; // never traded this pair — always allow
  if (rec.otherTradesAfter < 1) return false; // must trade at least one other pair first
  return Math.abs(newEntry - rec.lastEntryPrice) >= getMinEntryDiff(pair); // must be a new price level
}

/** Minimum price difference to count as a "new" entry point */
function getMinEntryDiff(pair: string): number {
  if (pair === "XAUUSD") return 2.0;
  if (pair === "XAGUSD") return 0.20;
  if (pair.includes("JPY")) return 0.20;
  if (pair === "BTCUSD") return 200;
  if (pair === "ETHUSD") return 20;
  if (pair === "XRPUSD") return 0.010;
  return 0.00200; // Forex: 20 pips
}

/** How close live price must be to the signal entry to trigger activation */
function getEntryTolerance(pair: string): number {
  if (pair === "XAUUSD") return 0.50;
  if (pair === "XAGUSD") return 0.05;
  if (pair.includes("JPY")) return 0.050;
  if (pair === "BTCUSD") return 50;
  if (pair === "ETHUSD") return 5;
  if (pair === "XRPUSD") return 0.005;
  return 0.00050; // Forex: 5 pips
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Candle { open: number; high: number; low: number; close: number; volume?: number }
interface CandleWithTime extends Candle { time: number }

// ─────────────────────────────────────────────────────────────────────────────
// YAHOO FINANCE  (free, no API key required)
// ─────────────────────────────────────────────────────────────────────────────

/** Our pair name → Yahoo Finance symbol */
const YAHOO_MAP: Record<string, string> = {
  // Forex majors
  EURUSD: "EURUSD=X", GBPUSD: "GBPUSD=X", USDJPY: "JPY=X",
  AUDUSD: "AUDUSD=X", USDCAD: "CAD=X",    NZDUSD: "NZDUSD=X",
  USDCHF: "CHF=X",
  // Forex crosses
  GBPJPY: "GBPJPY=X", EURJPY: "EURJPY=X", EURGBP: "EURGBP=X",
  AUDJPY: "AUDJPY=X", GBPCAD: "GBPCAD=X", AUDCAD: "AUDCAD=X",
  GBPCHF: "GBPCHF=X", AUDNZD: "AUDNZD=X", CADCHF: "CADCHF=X",
  NZDJPY: "NZDJPY=X", EURCAD: "EURCAD=X", EURCHF: "EURCHF=X",
  EURAUD: "EURAUD=X", GBPAUD: "GBPAUD=X", CADJPY: "CADJPY=X",
  AUDCHF: "AUDCHF=X",
  // Metals
  XAUUSD: "GC=F",     XAGUSD: "SI=F",
  // Crypto (24/7)
  BTCUSD: "BTC-USD",  ETHUSD: "ETH-USD",  XRPUSD: "XRP-USD",
  LTCUSD: "LTC-USD",  DOGEUSD: "DOGE-USD",
};

/** Timeframe → Yahoo interval + range to fetch enough bars */
const TF_TO_YF: Record<string, { interval: string; range: string }> = {
  M1:  { interval: "1m",  range: "1d"   },
  M5:  { interval: "5m",  range: "5d"   },
  M15: { interval: "15m", range: "60d"  },
  M30: { interval: "30m", range: "60d"  },
  H1:  { interval: "1h",  range: "730d" },
  H4:  { interval: "1h",  range: "730d" }, // resample in caller if needed
  D1:  { interval: "1d",  range: "max"  },
  W1:  { interval: "1wk", range: "max"  },
};

// ── Candle cache (5-minute TTL) ───────────────────────────────────────────────
const _candleCache = new Map<string, { candles: CandleWithTime[]; fetchedAt: number }>();
const CANDLE_TTL = 5 * 60 * 1000;

async function fetchRealCandles(pair: string, timeframe: string, limit = 150): Promise<CandleWithTime[]> {
  const key = `${pair}_${timeframe}`;
  const cached = _candleCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CANDLE_TTL) return cached.candles.slice(-limit);

  const sym = YAHOO_MAP[pair];
  if (!sym) return []; // synthetic/unmapped pair — no external data source

  const { interval, range } = TF_TO_YF[timeframe] ?? { interval: "1h", range: "60d" };

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json() as any;
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error("empty response");

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};

    const candles: CandleWithTime[] = timestamps
      .map((t: number, i: number) => ({
        time:   t,
        open:   quote.open?.[i],
        high:   quote.high?.[i],
        low:    quote.low?.[i],
        close:  quote.close?.[i],
        volume: quote.volume?.[i] ?? 0,
      }))
      .filter(c => c.open != null && c.high != null && c.low != null && c.close != null);

    if (!candles.length) throw new Error("no valid candles in response");

    _candleCache.set(key, { candles, fetchedAt: Date.now() });
    console.log(`[Yahoo] ${pair}/${timeframe}: ${candles.length} candles (last=${candles.at(-1)?.close})`);
    return candles.slice(-limit);
  } catch (e) {
    console.warn(`[Yahoo] ${pair}/${timeframe}: ${(e as Error).message}`);
    return [];
  }
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
// VOLUME PROFILE  (real volume from Yahoo Finance candles)
// ─────────────────────────────────────────────────────────────────────────────

export interface VolumeProfileBucket {
  priceLevel: number;
  volume: number;
  bullVolume: number;
  bearVolume: number;
  isPOC: boolean;   // Point of Control — highest volume level
  isHVN: boolean;   // High Value Node (top 30% by volume)
  isLVN: boolean;   // Low Value Node (bottom 30%)
}

function calcVolumeProfile(candles: CandleWithTime[], buckets = 24): VolumeProfileBucket[] {
  const withVol = candles.filter(c => (c.volume ?? 0) > 0);
  if (withVol.length < 10) return [];

  const priceMin = Math.min(...candles.map(c => c.low));
  const priceMax = Math.max(...candles.map(c => c.high));
  if (priceMax === priceMin) return [];
  const bucketSize = (priceMax - priceMin) / buckets;

  const profile: { vol: number; bullVol: number; bearVol: number }[] =
    Array.from({ length: buckets }, () => ({ vol: 0, bullVol: 0, bearVol: 0 }));

  for (const c of candles) {
    const vol = c.volume ?? 0;
    if (vol <= 0) continue;
    const isBull = c.close >= c.open;
    const range  = c.high - c.low || bucketSize;
    for (let b = 0; b < buckets; b++) {
      const bLow  = priceMin + b * bucketSize;
      const bHigh = bLow + bucketSize;
      const overlap = Math.max(0, Math.min(c.high, bHigh) - Math.max(c.low, bLow));
      if (overlap > 0) {
        const frac = overlap / range;
        profile[b].vol += vol * frac;
        if (isBull) profile[b].bullVol += vol * frac;
        else        profile[b].bearVol += vol * frac;
      }
    }
  }

  const maxVol = Math.max(...profile.map(p => p.vol));
  const pocIdx = profile.findIndex(p => p.vol === maxVol);
  const sortedVols = [...profile.map(p => p.vol)].sort((a, b) => a - b);
  const hvnThreshold = sortedVols[Math.floor(buckets * 0.7)];
  const lvnThreshold = sortedVols[Math.floor(buckets * 0.3)];

  return profile.map((p, i) => ({
    priceLevel: priceMin + (i + 0.5) * bucketSize,
    volume:     Math.round(p.vol),
    bullVolume: Math.round(p.bullVol),
    bearVolume: Math.round(p.bearVol),
    isPOC: i === pocIdx,
    isHVN: p.vol >= hvnThreshold && p.vol > 0,
    isLVN: p.vol <= lvnThreshold && p.vol > 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// KEY LEVELS  (swing-based S/R with cluster strength)
// ─────────────────────────────────────────────────────────────────────────────

export interface KeyLevel {
  price: number;
  type: "RESISTANCE" | "SUPPORT" | "PIVOT";
  strength: number;   // 1–5
  isRoundNumber: boolean;
  label: string;
}

function _isRoundNumber(price: number, decimals: number): boolean {
  if (decimals <= 2) return price % 50 === 0 || price % 100 === 0;
  const frac = price.toFixed(5).split(".")[1] ?? "";
  return frac.endsWith("000") || frac.endsWith("500") || frac.endsWith("00");
}

function calcKeyLevels(candles: CandleWithTime[], decimals: number): KeyLevel[] {
  if (candles.length < 20) return [];
  const atr = calcATR(candles, 14);
  const clusterR = atr * 0.5;
  const pivot = 5;
  const rawHighs: number[] = [];
  const rawLows:  number[] = [];

  for (let i = pivot; i < candles.length - pivot; i++) {
    const slice = candles.slice(i - pivot, i + pivot + 1);
    if (candles[i].high === Math.max(...slice.map(c => c.high))) rawHighs.push(candles[i].high);
    if (candles[i].low  === Math.min(...slice.map(c => c.low)))  rawLows.push(candles[i].low);
  }

  function cluster(prices: number[]): { price: number; count: number }[] {
    if (!prices.length) return [];
    const sorted = [...prices].sort((a, b) => a - b);
    const groups: { prices: number[]; count: number }[] = [];
    for (const p of sorted) {
      const g = groups.find(g => Math.abs(g.prices[0] - p) <= clusterR);
      if (g) { g.prices.push(p); g.count++; }
      else groups.push({ prices: [p], count: 1 });
    }
    return groups.map(g => ({ price: g.prices.reduce((a, b) => a + b, 0) / g.prices.length, count: g.count }));
  }

  const currentPrice = candles.at(-1)!.close;
  const levels: KeyLevel[] = [];

  for (const c of cluster(rawHighs)) {
    const price = parseFloat(c.price.toFixed(decimals));
    const isRound = _isRoundNumber(price, decimals);
    levels.push({ price, type: price > currentPrice ? "RESISTANCE" : "PIVOT", strength: Math.min(5, c.count), isRoundNumber: isRound, label: `${price > currentPrice ? "Resistance" : "Pivot"} ×${c.count}${isRound ? " 🔑" : ""}` });
  }
  for (const c of cluster(rawLows)) {
    const price = parseFloat(c.price.toFixed(decimals));
    const isRound = _isRoundNumber(price, decimals);
    levels.push({ price, type: price < currentPrice ? "SUPPORT" : "PIVOT", strength: Math.min(5, c.count), isRoundNumber: isRound, label: `${price < currentPrice ? "Support" : "Pivot"} ×${c.count}${isRound ? " 🔑" : ""}` });
  }

  return levels
    .sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice))
    .slice(0, 12);
}

// ─────────────────────────────────────────────────────────────────────────────
// LIQUIDITY MAP  (equal highs/lows + unswept liquidity pools)
// ─────────────────────────────────────────────────────────────────────────────

export interface LiquidityZone {
  price: number;
  type: "BSL" | "SSL" | "EQH" | "EQL";
  label: string;
  strength: number;  // 1–5
  swept: boolean;
}

function calcLiquidityMap(candles: CandleWithTime[], decimals: number): LiquidityZone[] {
  if (candles.length < 30) return [];
  const atr = calcATR(candles, 14);
  const eqThresh = atr * 0.15;
  const currentPrice = candles.at(-1)!.close;
  const window = candles.slice(-80);
  const pivot = 4;

  const swingHighs: { price: number }[] = [];
  const swingLows:  { price: number }[] = [];
  for (let i = pivot; i < window.length - pivot; i++) {
    const slice = window.slice(i - pivot, i + pivot + 1);
    if (window[i].high === Math.max(...slice.map(c => c.high))) swingHighs.push({ price: window[i].high });
    if (window[i].low  === Math.min(...slice.map(c => c.low)))  swingLows.push({ price: window[i].low  });
  }

  const zones: LiquidityZone[] = [];

  // Equal Highs — stop clusters above
  for (let i = 0; i < swingHighs.length; i++) {
    for (let j = i + 1; j < swingHighs.length; j++) {
      if (Math.abs(swingHighs[i].price - swingHighs[j].price) <= eqThresh) {
        const price = parseFloat(((swingHighs[i].price + swingHighs[j].price) / 2).toFixed(decimals));
        zones.push({ price, type: "EQH", label: "Equal Highs — Buyside Liquidity", strength: 4, swept: currentPrice > price });
        break;
      }
    }
  }
  // Equal Lows — stop clusters below
  for (let i = 0; i < swingLows.length; i++) {
    for (let j = i + 1; j < swingLows.length; j++) {
      if (Math.abs(swingLows[i].price - swingLows[j].price) <= eqThresh) {
        const price = parseFloat(((swingLows[i].price + swingLows[j].price) / 2).toFixed(decimals));
        zones.push({ price, type: "EQL", label: "Equal Lows — Sellside Liquidity", strength: 4, swept: currentPrice < price });
        break;
      }
    }
  }
  // Major swing highs (BSL pools)
  for (const sh of swingHighs.slice(-6)) {
    const price = parseFloat(sh.price.toFixed(decimals));
    if (!zones.find(z => Math.abs(z.price - price) < eqThresh))
      zones.push({ price, type: "BSL", label: "Swing High — Buyside Stops", strength: 2, swept: currentPrice > price });
  }
  // Major swing lows (SSL pools)
  for (const sl of swingLows.slice(-6)) {
    const price = parseFloat(sl.price.toFixed(decimals));
    if (!zones.find(z => Math.abs(z.price - price) < eqThresh))
      zones.push({ price, type: "SSL", label: "Swing Low — Sellside Stops", strength: 2, swept: currentPrice < price });
  }

  return zones
    .filter((z, i) => !zones.slice(0, i).some(o => Math.abs(o.price - z.price) < eqThresh * 0.5))
    .sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice))
    .slice(0, 14);
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAIL SENTIMENT  (volume-weighted directional bias from real candles)
// ─────────────────────────────────────────────────────────────────────────────

export interface RetailSentiment {
  longPct: number;
  shortPct: number;
  volumeBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  strength: "EXTREME" | "STRONG" | "MODERATE" | "WEAK";
  sessionVolumeTrend: "INCREASING" | "DECREASING" | "FLAT";
  recentDelta: number;  // last-10-bar vol imbalance −100…+100
}

function calcRetailSentiment(candles: CandleWithTime[]): RetailSentiment {
  if (candles.length < 20) return { longPct: 50, shortPct: 50, volumeBias: "NEUTRAL", strength: "WEAK", sessionVolumeTrend: "FLAT", recentDelta: 0 };

  const recent = candles.slice(-50);
  let bullVol = 0, bearVol = 0;
  for (const c of recent) {
    const vol = c.volume ?? 1;
    if (c.close >= c.open) bullVol += vol;
    else bearVol += vol;
  }
  const total   = bullVol + bearVol || 1;
  const longPct = Math.round((bullVol / total) * 100);
  const imbal   = Math.abs(longPct - 50);

  const strength: RetailSentiment["strength"] = imbal >= 20 ? "EXTREME" : imbal >= 12 ? "STRONG" : imbal >= 6 ? "MODERATE" : "WEAK";
  const volumeBias: RetailSentiment["volumeBias"] = longPct > 55 ? "BULLISH" : longPct < 45 ? "BEARISH" : "NEUTRAL";

  const vRecent = recent.slice(-10).reduce((s, c) => s + (c.volume ?? 1), 0);
  const vPrev   = recent.slice(-20, -10).reduce((s, c) => s + (c.volume ?? 1), 0);
  const sessionVolumeTrend: RetailSentiment["sessionVolumeTrend"] = vRecent > vPrev * 1.2 ? "INCREASING" : vRecent < vPrev * 0.8 ? "DECREASING" : "FLAT";

  let rBull = 0, rBear = 0;
  for (const c of candles.slice(-10)) {
    const v = c.volume ?? 1;
    if (c.close >= c.open) rBull += v; else rBear += v;
  }
  const rTotal = rBull + rBear || 1;
  const recentDelta = Math.round(((rBull - rBear) / rTotal) * 100);

  return { longPct, shortPct: 100 - longPct, volumeBias, strength, sessionVolumeTrend, recentDelta };
}

// ─────────────────────────────────────────────────────────────────────────────
// COT DATA  (CFTC Traders in Financial Futures — free, no API key)
// ─────────────────────────────────────────────────────────────────────────────

export interface COTCurrencyData {
  currency: string;
  netPosition: number;
  longPct: number;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  reportDate: string;
}

export interface COTData {
  currencies: COTCurrencyData[];
  pairBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  reportDate: string;
}

const COT_CODES: Record<string, string> = {
  EUR: "099741", GBP: "096742", JPY: "097741",
  CHF: "092741", CAD: "090741", AUD: "232741", NZD: "112741",
};

let _cotCache: { data: Map<string, COTCurrencyData>; fetchedAt: number } | null = null;
const COT_TTL = 12 * 60 * 60 * 1000; // 12 hours

async function fetchCOTData(): Promise<Map<string, COTCurrencyData>> {
  if (_cotCache && Date.now() - _cotCache.fetchedAt < COT_TTL) return _cotCache.data;
  try {
    // CFTC Socrata public JSON API — Traders in Financial Futures (TFF)
    // Field names confirmed from live API response (no _all suffix for lev_money)
    const url = "https://publicreporting.cftc.gov/resource/gpe5-46if.json" +
      "?$limit=500&$order=report_date_as_yyyy_mm_dd+DESC" +
      "&$select=cftc_contract_market_code,report_date_as_yyyy_mm_dd,lev_money_positions_long,lev_money_positions_short";
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows: any[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("empty COT response");
    const knownCodes = new Set(Object.values(COT_CODES));

    const result = new Map<string, COTCurrencyData>();
    for (const row of rows) {
      const code     = row.cftc_contract_market_code;
      if (!knownCodes.has(code)) continue;
      const currency = Object.entries(COT_CODES).find(([, c]) => c === code)?.[0];
      if (!currency || result.has(currency)) continue; // keep most-recent row per currency
      const longs  = parseFloat(row.lev_money_positions_long  ?? "0");
      const shorts = parseFloat(row.lev_money_positions_short ?? "0");
      const net    = longs - shorts;
      const ttl    = longs + shorts || 1;
      result.set(currency, {
        currency,
        netPosition: Math.round(net),
        longPct: Math.round((longs / ttl) * 100),
        bias: net > 5000 ? "BULLISH" : net < -5000 ? "BEARISH" : "NEUTRAL",
        reportDate: row.report_date_as_yyyy_mm_dd ?? "",
      });
    }
    _cotCache = { data: result, fetchedAt: Date.now() };
    console.log(`[COT] Fetched ${result.size} currency COT positions`);
    return result;
  } catch (e) {
    console.warn(`[COT] Fetch failed: ${(e as Error).message}`);
    return _cotCache?.data ?? new Map();
  }
}

function getCOTForPair(pair: string, cotMap: Map<string, COTCurrencyData>): COTData | null {
  if (!cotMap.size) return null;
  const CURR = ["EUR","GBP","USD","JPY","CHF","CAD","AUD","NZD"];
  const base  = CURR.find(c => pair.startsWith(c)) ?? null;
  const quote = CURR.find(c => pair.endsWith(c))   ?? null;
  const baseD  = base  ? cotMap.get(base)  : undefined;
  const quoteD = quote ? cotMap.get(quote) : undefined;

  let pairBias: COTData["pairBias"] = "NEUTRAL";
  if (baseD && quoteD) {
    if (baseD.bias === "BULLISH"  && quoteD.bias === "BEARISH")  pairBias = "BULLISH";
    else if (baseD.bias === "BEARISH"  && quoteD.bias === "BULLISH")  pairBias = "BEARISH";
    else if (baseD.bias === "BULLISH"  && quoteD.bias === "NEUTRAL")  pairBias = "BULLISH";
    else if (baseD.bias === "BEARISH"  && quoteD.bias === "NEUTRAL")  pairBias = "BEARISH";
    else if (baseD.bias === "NEUTRAL"  && quoteD.bias === "BEARISH")  pairBias = "BULLISH";
    else if (baseD.bias === "NEUTRAL"  && quoteD.bias === "BULLISH")  pairBias = "BEARISH";
  } else if (baseD && baseD.bias !== "NEUTRAL") pairBias = baseD.bias;

  const reportDate = [...cotMap.values()][0]?.reportDate ?? "";
  return { currencies: [...cotMap.values()], pairBias, reportDate };
}

// Kick off COT fetch on startup (non-blocking)
fetchCOTData().catch(() => {});

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

  // Shooting Star (bearish) / Hammer (bullish) — directional with body colour
  if (upWick > body * 2.5 && upWick > dnWick * 2 && c.close < c.open) return "Shooting Star";
  if (dnWick > body * 2.5 && dnWick > upWick * 2 && c.close > c.open) return "Hammer";

  // Engulfing
  if (c.close > c.open && p.close < p.open && c.close > p.open && c.open < p.close) return "Bullish Engulfing";
  if (c.close < c.open && p.close > p.open && c.close < p.open && c.open > p.close) return "Bearish Engulfing";

  // Doji — indecision
  if (body < range * 0.1) return "Doji";

  // Morning Star — 3-bar bullish reversal (bearish → small body → bullish)
  if (last3.length === 3) {
    const c0 = last3[0], c1 = last3[1];
    const b0 = c0.open - c0.close;   // bearish body
    const b1 = Math.abs(c1.close - c1.open);
    const b2 = c.close - c.open;     // bullish body
    if (b0 > atr * 0.3 && b1 < atr * 0.2 && b2 > atr * 0.3 &&
        c.close > (c0.open + c0.close) / 2)
      return "Morning Star";
  }

  // Evening Star — 3-bar bearish reversal (bullish → small body → bearish)
  if (last3.length === 3) {
    const c0 = last3[0], c1 = last3[1];
    const b0 = c0.close - c0.open;   // bullish body
    const b1 = Math.abs(c1.close - c1.open);
    const b2 = c.open - c.close;     // bearish body
    if (b0 > atr * 0.3 && b1 < atr * 0.2 && b2 > atr * 0.3 &&
        c.close < (c0.open + c0.close) / 2)
      return "Evening Star";
  }

  // Three White Soldiers — 3 consecutive bullish candles, each closing higher
  if (last3.length === 3) {
    const c0 = last3[0], c1 = last3[1];
    if (c0.close > c0.open && c1.close > c1.open && c.close > c.open &&
        c1.open > c0.open && c1.close > c0.close &&
        c.open  > c1.open && c.close  > c1.close)
      return "Three White Soldiers";
  }

  // Three Black Crows — 3 consecutive bearish candles, each closing lower
  if (last3.length === 3) {
    const c0 = last3[0], c1 = last3[1];
    if (c0.close < c0.open && c1.close < c1.open && c.close < c.open &&
        c1.open < c0.open && c1.close < c0.close &&
        c.open  < c1.open && c.close  < c1.close)
      return "Three Black Crows";
  }

  // Bullish Marubozu — strong momentum candle, no wicks
  if (c.close > c.open && upWick < atr * 0.08 && dnWick < atr * 0.08 && body > atr * 0.6)
    return "Bullish Marubozu";

  // Bearish Marubozu
  if (c.close < c.open && upWick < atr * 0.08 && dnWick < atr * 0.08 && body > atr * 0.6)
    return "Bearish Marubozu";

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
// USD STRENGTH  (derived from Deriv EURUSD + USDJPY candles — no DXY feed needed)
// ─────────────────────────────────────────────────────────────────────────────

async function getDXYSentiment(pair: string): Promise<"BULLISH_USD" | "BEARISH_USD" | "NEUTRAL"> {
  const usdPairs = ["EURUSD","GBPUSD","AUDUSD","NZDUSD","USDJPY","USDCAD","USDCHF","XAUUSD"];
  if (!usdPairs.includes(pair)) return "NEUTRAL";
  try {
    // Derive USD strength from two Deriv pairs:
    //   EURUSD falling  → USD strong (negative correlation)
    //   USDJPY rising   → USD strong (positive correlation)
    const [eur, jpy] = await Promise.all([
      fetchRealCandles("EURUSD", "H1", 10),
      fetchRealCandles("USDJPY", "H1", 10),
    ]);
    if (eur.length >= 5 && jpy.length >= 5) {
      const eurChg = eur.at(-1)!.close - eur.at(-5)!.close; // negative = USD strong
      const jpyChg = jpy.at(-1)!.close - jpy.at(-5)!.close; // positive = USD strong
      const signal = (-eurChg / 0.005 + jpyChg / 0.5) / 2;   // normalised composite
      if (signal >  0.3) return "BULLISH_USD";
      if (signal < -0.3) return "BEARISH_USD";
      return "NEUTRAL";
    }
  } catch { /* fall through */ }
  // No real data available — return NEUTRAL rather than guessing
  return "NEUTRAL";
}

// ─────────────────────────────────────────────────────────────────────────────
// HTF BIAS  (real D1 candles — 20-bar moving average slope)
// ─────────────────────────────────────────────────────────────────────────────

async function getHTFBias(pair: string): Promise<"BULLISH" | "BEARISH" | "RANGING"> {
  try {
    const d1 = await fetchRealCandles(pair, "D1", 20);
    if (d1.length >= 10) {
      const old5avg = d1.slice(-10, -5).reduce((s, c) => s + c.close, 0) / 5;
      const new5avg = d1.slice(-5).reduce((s, c) => s + c.close, 0) / 5;
      const pct = (new5avg - old5avg) / old5avg;
      if (pct >  0.002) return "BULLISH";
      if (pct < -0.002) return "BEARISH";
      return "RANGING";
    }
  } catch { /* fall through */ }
  // No real D1 data available — return RANGING rather than guessing
  return "RANGING";
}

// ─────────────────────────────────────────────────────────────────────────────
// W1 BIAS  (real weekly candles — top of the timeframe pyramid)
// ─────────────────────────────────────────────────────────────────────────────

async function getW1Bias(pair: string): Promise<"BULLISH" | "BEARISH" | "RANGING"> {
  try {
    const w1 = await fetchRealCandles(pair, "W1", 30);
    if (w1.length >= 10) {
      const old5avg = w1.slice(-10, -5).reduce((s, c) => s + c.close, 0) / 5;
      const new5avg = w1.slice(-5).reduce((s, c) => s + c.close, 0) / 5;
      const pct = (new5avg - old5avg) / old5avg;
      if (pct >  0.003) return "BULLISH";
      if (pct < -0.003) return "BEARISH";
      return "RANGING";
    }
  } catch { /* fall through */ }
  return "RANGING";
}

// ─────────────────────────────────────────────────────────────────────────────
// PSYCHOLOGICAL LEVEL  (round number confluence)
// ─────────────────────────────────────────────────────────────────────────────

function detectPsychLevel(price: number, pair: string): { hit: boolean; level: number } {
  const isJpy  = pair.includes("JPY");
  const isGold = pair === "XAUUSD";
  const isBtc  = pair === "BTCUSD";
  const isEth  = pair === "ETHUSD";
  const isXrp  = pair === "XRPUSD" || pair === "XAGUSD";

  let step: number;
  if (isBtc)       step = 1000;
  else if (isEth)  step = 100;
  else if (isGold) step = 50;
  else if (isXrp)  step = 0.05;
  else if (isJpy)  step = 0.5;
  else             step = 0.005;  // 50-pip round numbers for 5-decimal pairs

  const nearest   = Math.round(price / step) * step;
  const distance  = Math.abs(price - nearest);
  const threshold = step * 0.15;  // within 15% of step = "near"
  return { hit: distance < threshold, level: parseFloat(nearest.toFixed(8)) };
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGH-IMPACT NEWS FILTER  (UTC schedule — no external API needed)
// Blocks signals 30+ min around recurring high-impact windows.
// Crypto is exempt — it trades through news.
// ─────────────────────────────────────────────────────────────────────────────

function isNearHighImpactNews(): { blocked: boolean; reason: string } {
  const now  = new Date();
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const dow  = now.getUTCDay();   // 0=Sun … 6=Sat
  const dom  = now.getUTCDate();

  // NFP — first Friday of month, 12:30–14:30 UTC (±30 min buffer)
  if (dow === 5 && dom <= 7 && mins >= 720 && mins <= 870)
    return { blocked: true, reason: "NFP release window (first Friday)" };

  // FOMC rate decision — Wednesdays, 19:00–20:30 UTC
  if (dow === 3 && mins >= 1110 && mins <= 1230)
    return { blocked: true, reason: "FOMC decision window (Wednesday)" };

  // US CPI / PPI — mid-month Tue–Wed, 12:30–14:30 UTC
  if ((dow === 2 || dow === 3) && dom >= 8 && dom <= 21 && mins >= 720 && mins <= 870)
    return { blocked: true, reason: "US CPI/PPI release window (mid-month)" };

  // ECB — last Thu of month, 12:45–14:15 UTC
  if (dow === 4 && dom >= 22 && mins >= 750 && mins <= 855)
    return { blocked: true, reason: "ECB rate decision window (last Thursday)" };

  // BOE — first Thu of month, 12:00–13:00 UTC
  if (dow === 4 && dom <= 7 && mins >= 720 && mins <= 780)
    return { blocked: true, reason: "BOE rate decision window (first Thursday)" };

  // NYSE open volatility spike — 13:30–13:45 UTC, Mon–Fri
  if (dow >= 1 && dow <= 5 && mins >= 810 && mins <= 825)
    return { blocked: true, reason: "NYSE open — first 15-min volatility spike" };

  // Friday late session / weekend gap risk — after 20:00 UTC
  if (dow === 5 && mins >= 1200)
    return { blocked: true, reason: "Friday late session — weekend gap risk" };

  return { blocked: false, reason: "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE PRICE FETCHING  via Deriv API  (60-second cache)
// ─────────────────────────────────────────────────────────────────────────────

/** Reasonable last-known prices — used only if Deriv fetch fails on startup */
const FALLBACK_PRICES: Record<string, number> = {
  EURUSD: 1.1370, GBPUSD: 1.3320, USDJPY: 163.85,
  AUDUSD: 0.6980, USDCAD: 1.4100, NZDUSD: 0.5790, USDCHF: 0.8185,
  GBPJPY: 218.28, EURJPY: 186.30, EURGBP: 0.8535,
  AUDJPY: 114.38, GBPCAD: 1.8785, AUDCAD: 0.9843, GBPCHF: 1.0902,
  AUDNZD: 1.2058, CADCHF: 0.5804, NZDJPY: 94.85, EURCAD: 1.6033,
  EURCHF: 0.9305, EURAUD: 1.6289, GBPAUD: 1.9084, CADJPY: 116.20, AUDCHF: 0.5712,
  XAUUSD: 4054.0, XAGUSD: 58.20,
  BTCUSD: 64027, ETHUSD: 1857, XRPUSD: 1.089, LTCUSD: 45.9, DOGEUSD: 0.0695,
  // Deriv synthetic indices removed — scanner only trades real markets
};

let _priceCache: Record<string, number> = { ...FALLBACK_PRICES };
let _priceFetchedAt = 0;
let _fetchInFlight: Promise<void> | null = null;

async function _doFetchPrices(): Promise<void> {
  const pairs = Object.keys(YAHOO_MAP);
  const live: Record<string, number> = {};

  // Batch symbols into Yahoo Finance quote requests (up to 10 per call)
  const BATCH = 10;
  for (let i = 0; i < pairs.length; i += BATCH) {
    const chunk = pairs.slice(i, i + BATCH);
    const symbols = chunk.map(p => YAHOO_MAP[p]).join(",");
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`,
        { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) continue;
      const json = await res.json() as any;
      for (const q of json?.quoteResponse?.result ?? []) {
        const pair = chunk.find(p => YAHOO_MAP[p] === q.symbol);
        if (pair && q.regularMarketPrice != null) live[pair] = q.regularMarketPrice;
      }
    } catch { /* keep existing cached value */ }
  }

  _priceCache = { ..._priceCache, ...live };
  _priceFetchedAt = Date.now();
  console.log(`[Yahoo prices] refreshed ${Object.keys(live).length}/${pairs.length} pairs`);
}

async function getLivePrices(): Promise<Record<string, number>> {
  if (Date.now() - _priceFetchedAt > 60_000) {
    if (!_fetchInFlight) {
      _fetchInFlight = _doFetchPrices().finally(() => { _fetchInFlight = null; });
    }
    await _fetchInFlight;
  }
  return _priceCache;
}

// Warm up prices on startup
_doFetchPrices().catch(() => {});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

async function generateAnalysis(pair: string, timeframe: string, basePrice: number) {
  const GRAN_SECS: Record<string, number> = { M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400 };
  const granSecs   = GRAN_SECS[timeframe] || 3600;

  const isJpy      = pair.includes("JPY");
  const isGold     = pair === "XAUUSD";
  const isCrypto   = ["BTC","ETH","XRP","LTC","DOGE","DOT","BNB","SOL","ADA","AVAX","MATIC","LINK"].some(s => pair.startsWith(s));
  const isCommodity = ["XAGUSD"].includes(pair); // only silver available via Deriv
  const isSynthetic = ["R_","1HZ","BOOM","CRASH","JD","STPIDX"].some(p => pair.startsWith(p));
  const decimals   = isSynthetic ? 2 : isCrypto && basePrice > 100 ? 2 : isCrypto ? 4 : isJpy || isGold || isCommodity ? 2 : 5;
  const atrPct     = isSynthetic ? 0.008 : isCrypto ? 0.012 : isGold ? 0.004 : isCommodity ? 0.006 : isJpy ? 0.003 : 0.0025;

  // ── Fetch real OHLCV candles — NO simulation fallback ──────────────────────
  // If Deriv returns fewer than 30 candles the data is insufficient for analysis.
  // We return NEUTRAL immediately rather than inventing fake price history.
  const candles: CandleWithTime[] = await fetchRealCandles(pair, timeframe, 150);
  if (candles.length < 30) {
    console.warn(`[analysis] ${pair}/${timeframe}: insufficient real data (${candles.length} candles) — skipping`);
    return {
      pair, timeframe, signal: "NEUTRAL" as const,
      entry: basePrice, stopLoss: 0, takeProfit: 0,
      confidenceScore: 0, reasons: ["Insufficient real market data — no signal generated"],
      structureType: "NONE" as const, trend: "BULLISH" as const,
      hasOrderBlock: false, hasSupportResistance: false,
      riskRewardRatio: 0, supportZone: { high: 0, low: 0 },
      resistanceZone: { high: 0, low: 0 }, orderBlockZone: null,
      session: "", sessionQuality: "AVOID" as const, htfBias: "RANGING" as const,
      premiumDiscount: "EQUILIBRIUM" as const, hasFVG: false, fvgZone: null,
      hasLiquiditySweep: false, liquiditySweepType: null, isInOTE: false,
      oteFibHigh: 0, oteFibLow: 0, hasDivergence: false, divergenceType: null,
      hasCandlePattern: false, candlePattern: null, atr: 0, rsi: 0, macdHist: 0,
      dxySentiment: "NEUTRAL" as const, bullScore: 0, bearScore: 0,
      chartCandles: [], swingHighLevel: 0, swingLowLevel: 0,
      equilibriumLevel: 0, liquidityLevel: null,
      volumeProfile: [], keyLevels: [], liquidityMap: [],
      sentiment: { longPct: 50, shortPct: 50, volumeBias: "NEUTRAL" as const, strength: "WEAK" as const, sessionVolumeTrend: "FLAT" as const, recentDelta: 0 },
      cotData: null,
    };
  }
  console.log(`[analysis] ${pair}/${timeframe}: ${candles.length} real candles (last close ${candles[candles.length-1].close})`);

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
  const [htfBias, w1Bias, dxySentiment, cotMap] = await Promise.all([
    getHTFBias(pair), getW1Bias(pair), getDXYSentiment(pair), fetchCOTData(),
  ]);
  const cotData    = getCOTForPair(pair, cotMap);
  const newsFilter = isNearHighImpactNews();
  const psychLevel = detectPsychLevel(currentPrice, pair);
  // ── New Deep Analysis ─────────────────────────────────────────────────────
  const volumeProfile = calcVolumeProfile(candles, 24);
  const keyLevels     = calcKeyLevels(candles, decimals);
  const liquidityMap  = calcLiquidityMap(candles, decimals);
  const sentiment     = calcRetailSentiment(candles);
  const session      = getSession();
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
    if (liqSweep.type === "SSL") bullScore += 2; // swept sells = bullish reversal
    if (liqSweep.type === "BSL") bearScore += 2; // swept buys = bearish reversal
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

  // COT institutional positioning (+2 for strong alignment)
  if (cotData && cotData.pairBias !== "NEUTRAL") {
    if (cotData.pairBias === "BULLISH") bullScore += 2;
    if (cotData.pairBias === "BEARISH") bearScore += 2;
  }

  // W1 (weekly) bias — top of the timeframe pyramid (+2)
  if (w1Bias === "BULLISH") bullScore += 2;
  if (w1Bias === "BEARISH") bearScore += 2;

  // Psychological level — round number confluence (+1 to leading side)
  if (psychLevel.hit) {
    if (bullScore >= bearScore) bullScore += 1;
    else bearScore += 1;
  }

  // Volume Sentiment alignment (+1 for moderate, +2 for extreme)
  if (sentiment.volumeBias !== "NEUTRAL") {
    const volBonus = sentiment.strength === "EXTREME" || sentiment.strength === "STRONG" ? 2 : 1;
    if (sentiment.volumeBias === "BULLISH") bullScore += volBonus;
    if (sentiment.volumeBias === "BEARISH") bearScore += volBonus;
  }

  // Session quality — noted in reasons but does NOT reduce raw scores.
  // Off-hours signals are rarer but structurally valid; confidence reflects session quality.

  // ── Determine Signal ────────────────────────────────────────────────────────
  // Forex/metals move less than crypto — lower thresholds so valid setups aren't filtered out.
  // Crypto keeps stricter thresholds because high volatility can produce false confluence.
  const totalScore  = bullScore + bearScore;
  const bullPct     = totalScore > 0 ? bullScore / totalScore : 0.5;
  const threshold        = isCrypto ? 0.58 : 0.55;  // forex/metals: 55% dominance
  const MIN_WINNER_SCORE = isCrypto ? 4 : 3;        // forex/metals: 3 confluence points

  let signal: "BUY" | "SELL" | "NEUTRAL";
  let signalTrend: "BULLISH" | "BEARISH";

  const rawWinnerBull = bullScore;
  const rawWinnerBear = bearScore;

  if (bullPct >= threshold && rawWinnerBull >= MIN_WINNER_SCORE) {
    signal = "BUY"; signalTrend = "BULLISH";
  } else if (bullPct <= 1 - threshold && rawWinnerBear >= MIN_WINNER_SCORE) {
    signal = "SELL"; signalTrend = "BEARISH";
  } else {
    signal = "NEUTRAL"; signalTrend = bullPct >= 0.5 ? "BULLISH" : "BEARISH";
  }

  // ── Real Confidence Score ──────────────────────────────────────────────────
  // Max achievable score across all confluence factors ≈ 28 points.
  // Confidence scales linearly from 0–95% based on actual winner score.
  // No artificial floor — a weak signal gets a weak confidence.
  const winnerScore = signal === "BUY" ? bullScore : bearScore;
  const MAX_SCORE   = 28;
  const confidence  = signal === "NEUTRAL"
    ? 0
    : Math.min(95, Math.round((winnerScore / MAX_SCORE) * 95));

  // ── Price Levels from real candle structure ──────────────────────────────────
  const recentHigh = Math.max(...candles.slice(-30).map(c => c.high));
  const recentLow  = Math.min(...candles.slice(-30).map(c => c.low));
  const midRange   = (recentHigh + recentLow) / 2;
  const slAtr      = atr * (isSynthetic ? 1.5 : 1.2);

  // ── Entry Price — Real Pullback Zone (NOT current price) ─────────────────────
  // The EA places a LIMIT order at this price and waits for the market to come back.
  // BUY:  entry must be BELOW current price — EA waits for a pullback dip.
  //       Priority: 1) Bullish OB high  2) Bullish FVG low  3) 0.3×ATR below current
  // SELL: entry must be ABOVE current price — EA waits for a retracement rally.
  //       Priority: 1) Bearish OB low   2) Bearish FVG high  3) 0.3×ATR above current
  // A hard safety clamp ensures the entry is always on the correct side of market price.
  let entryRaw: number;
  let entrySource: string;

  if (signal === "BUY") {
    if (orderBlock?.type === "BULLISH" && orderBlock.high < currentPrice - atr * 0.05) {
      entryRaw   = orderBlock.high;            // top of bullish OB — key support
      entrySource = "Order Block";
    } else if (fvg?.type === "BULLISH" && fvg.low < currentPrice - atr * 0.05) {
      entryRaw   = fvg.low;                   // bottom of bullish FVG — fill the gap
      entrySource = "FVG";
    } else {
      entryRaw   = currentPrice - atr * 0.3;  // minor pullback zone below current
      entrySource = "ATR Pullback";
    }
    // Safety clamp: BUY entry must always be strictly below current price
    if (entryRaw >= currentPrice) entryRaw = currentPrice - atr * 0.2;

  } else if (signal === "SELL") {
    if (orderBlock?.type === "BEARISH" && orderBlock.low > currentPrice + atr * 0.05) {
      entryRaw   = orderBlock.low;            // bottom of bearish OB — key resistance
      entrySource = "Order Block";
    } else if (fvg?.type === "BEARISH" && fvg.high > currentPrice + atr * 0.05) {
      entryRaw   = fvg.high;                  // top of bearish FVG — fill the gap
      entrySource = "FVG";
    } else {
      entryRaw   = currentPrice + atr * 0.3;  // minor retracement zone above current
      entrySource = "ATR Pullback";
    }
    // Safety clamp: SELL entry must always be strictly above current price
    if (entryRaw <= currentPrice) entryRaw = currentPrice + atr * 0.2;

  } else {
    entryRaw   = currentPrice;
    entrySource = "Current";
  }

  const entry = parseFloat(entryRaw.toFixed(decimals));

  // ── Stop Loss + Take Profit from real structure levels ───────────────────────
  // SL: placed beyond the entry zone (OB/FVG low for BUY, high for SELL) + 1×ATR buffer
  // TP: targets real swing high (BUY) or swing low (SELL); min 1.5:1 R:R enforced
  let stopLoss: number;
  let takeProfit: number;

  if (signal === "BUY") {
    // SL below entry — if OB was used, protect below OB low; else ATR-based
    const slLevel = orderBlock?.type === "BULLISH"
      ? orderBlock.low - atr * 0.2
      : entry - slAtr;
    stopLoss = parseFloat(slLevel.toFixed(decimals));
    const actualSlDist = entry - stopLoss;
    const swingRR = actualSlDist > 0 ? (recentHigh - entry) / actualSlDist : 0;
    takeProfit = swingRR >= 1.5
      ? parseFloat(recentHigh.toFixed(decimals))
      : parseFloat((entry + actualSlDist * 2.0).toFixed(decimals));
  } else if (signal === "SELL") {
    const slLevel = orderBlock?.type === "BEARISH"
      ? orderBlock.high + atr * 0.2
      : entry + slAtr;
    stopLoss = parseFloat(slLevel.toFixed(decimals));
    const actualSlDist = stopLoss - entry;
    const swingRR = actualSlDist > 0 ? (entry - recentLow) / actualSlDist : 0;
    takeProfit = swingRR >= 1.5
      ? parseFloat(recentLow.toFixed(decimals))
      : parseFloat((entry - actualSlDist * 2.0).toFixed(decimals));
  } else {
    stopLoss   = parseFloat((entry - slAtr).toFixed(decimals));
    takeProfit = parseFloat((entry + slAtr * 2.0).toFixed(decimals));
  }

  // ── Minimum pip guard — prevents SL/TP collapsing to entry when ATR is tiny ──
  // JPY pairs: pip = 0.01 → min 5 pips = 0.05
  // Gold: pip = 0.1 → min 5 pips = 0.50
  // Standard forex: pip = 0.0001 → min 5 pips = 0.0005
  // Synthetics / crypto: use 0.5% of entry as floor
  const minDist = isSynthetic || isCrypto
    ? entry * 0.003
    : isGold || isCommodity
      ? 0.50
      : isJpy
        ? 0.05         // 5 JPY pips
        : 0.0005;      // 5 standard pips

  if (signal === "BUY") {
    // SL must be strictly below entry; TP must be strictly above entry
    if (stopLoss >= entry)  stopLoss   = parseFloat((entry - minDist).toFixed(decimals));
    if (takeProfit <= entry) takeProfit = parseFloat((entry + minDist * 2).toFixed(decimals));
    // Ensure minimum distance
    if (entry - stopLoss   < minDist) stopLoss   = parseFloat((entry - minDist).toFixed(decimals));
    if (takeProfit - entry < minDist) takeProfit = parseFloat((entry + minDist * 2).toFixed(decimals));
  } else if (signal === "SELL") {
    // SL must be strictly above entry; TP must be strictly below entry
    if (stopLoss <= entry)  stopLoss   = parseFloat((entry + minDist).toFixed(decimals));
    if (takeProfit >= entry) takeProfit = parseFloat((entry - minDist * 2).toFixed(decimals));
    if (stopLoss - entry   < minDist) stopLoss   = parseFloat((entry + minDist).toFixed(decimals));
    if (entry - takeProfit < minDist) takeProfit = parseFloat((entry - minDist * 2).toFixed(decimals));
  }

  const tpDistance = Math.abs(takeProfit - entry);
  const slDistance = Math.abs(entry - stopLoss);
  const riskRewardRatio = parseFloat((slDistance > 0 ? tpDistance / slDistance : 2).toFixed(2));

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
  if (cotData && cotData.pairBias !== "NEUTRAL") reasons.push(`COT: Institutional money is ${cotData.pairBias.toLowerCase()} on this pair (CFTC TFF)`);
  if (sentiment.volumeBias !== "NEUTRAL") reasons.push(`Volume sentiment ${sentiment.volumeBias.toLowerCase()} — ${sentiment.longPct}% bull / ${sentiment.shortPct}% bear (${sentiment.strength.toLowerCase()})`);
  if (w1Bias !== "RANGING") reasons.push(`W1 weekly trend is ${w1Bias.toLowerCase()} — top-down MTF confirmed (W1 → D1 aligned)`);
  if (psychLevel.hit) reasons.push(`Entry at psychological level ${psychLevel.level} — major round-number confluence`);

  if (reasons.length === 0) reasons.push("Multi-indicator confluence analysis completed");

  // ── Hard MTF filter: W1 + D1 must NOT both oppose the signal direction ────────
  // Counter-trend against ALL higher timeframes = institutional trap. Kill it.
  if (signal !== "NEUTRAL") {
    const w1Opp = (signal === "BUY" && w1Bias === "BEARISH") || (signal === "SELL" && w1Bias === "BULLISH");
    const d1Opp = (signal === "BUY" && htfBias === "BEARISH") || (signal === "SELL" && htfBias === "BULLISH");
    if (w1Opp && d1Opp) {
      console.log(`[MTF-filter] ${pair}/${timeframe}: blocked — W1 ${w1Bias} + D1 ${htfBias} vs ${signal}`);
      signal = "NEUTRAL"; signalTrend = bullPct >= 0.5 ? "BULLISH" : "BEARISH";
    }
  }

  // ── News filter: suppress forex during high-impact windows (crypto exempt) ───
  if (signal !== "NEUTRAL" && newsFilter.blocked && !isCrypto) {
    console.log(`[news-filter] ${pair}/${timeframe}: blocked — ${newsFilter.reason}`);
    signal = "NEUTRAL"; signalTrend = bullPct >= 0.5 ? "BULLISH" : "BEARISH";
  }

  // Calibrated MAX_SCORE: a 16-pt winner → ~84% confidence. Strong signal = 80%+ for EA.
  const MAX_SCORE_V2 = 18;
  const winnerScoreV2 = signal === "BUY" ? bullScore : bearScore;
  const confidenceV2  = signal === "NEUTRAL"
    ? 0
    : Math.min(95, Math.round((winnerScoreV2 / MAX_SCORE_V2) * 95));

  // ── Return Full Result ──────────────────────────────────────────────────────
  return {
    pair,
    timeframe,
    signal,
    entry,
    stopLoss,
    takeProfit,
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
    confidenceScore: confidenceV2,
    // ── Chart Drawing Data (real timestamps from fetched candles) ──
    chartCandles: candles.map(c => ({
      time:  c.time,
      open:  parseFloat(c.open.toFixed(decimals)),
      high:  parseFloat(c.high.toFixed(decimals)),
      low:   parseFloat(c.low.toFixed(decimals)),
      close: parseFloat(c.close.toFixed(decimals)),
      volume: c.volume ?? 0,
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
    // ── Deep Analysis Fields ──
    volumeProfile: volumeProfile.map(b => ({ ...b, priceLevel: parseFloat(b.priceLevel.toFixed(decimals)) })),
    keyLevels,
    liquidityMap,
    sentiment,
    cotData,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS  (Telegram + Webhook)
// ─────────────────────────────────────────────────────────────────────────────

async function sendNotifications(signal: any) {
  const emoji = signal.signal === "BUY" ? "🟢" : "🔴";
  const message = [
    `${emoji} *SmartFX Signal*`,
    `*${signal.pair}* ${signal.signal} @ \`${signal.entry}\``,
    `TP: \`${signal.takeProfit}\` | SL: \`${signal.stopLoss}\``,
    `R:R 1:${Number(signal.riskRewardRatio).toFixed(1)} | Confidence: ${signal.confidenceScore}%`,
    `Timeframe: ${signal.timeframe}`,
  ].join("\n");

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;
  if (botToken && chatId) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
      signal: AbortSignal.timeout(6000),
    }).catch(() => {});
  }

  const webhookUrl = process.env.SIGNAL_WEBHOOK_URL;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "new_signal", signal }),
      signal: AbortSignal.timeout(6000),
    }).catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  const parsed = ListSignalsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query parameters" }); return; }
  const { pair, signal, timeframe, status: statusFilter } = parsed.data as any;

  // Status filter: PENDING = watching for entry, ACTIVE = entry hit (EA executing)
  // Default: return both so the dashboard can show both tabs from one request
  const conditions: any[] = [];
  if (statusFilter === "ACTIVE") {
    conditions.push(eq(signalsTable.status, "ACTIVE"));
  } else if (statusFilter === "PENDING") {
    conditions.push(sql`${signalsTable.status} = 'PENDING'`);
  } else {
    conditions.push(sql`${signalsTable.status} IN ('PENDING', 'ACTIVE')`);
  }
  if (pair)      conditions.push(eq(signalsTable.pair, pair));
  if (signal)    conditions.push(eq(signalsTable.signal, signal as "BUY" | "SELL"));
  if (timeframe) conditions.push(eq(signalsTable.timeframe, timeframe));
  const signals = await db.select().from(signalsTable)
    .where(and(...conditions))
    .orderBy(desc(signalsTable.createdAt));
  res.json(signals);
});

// ── Signal history (resolved trades: HIT_TP or HIT_SL) for the Transactions page ──
router.get("/history", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 200), 500);
  const records = await db.select().from(signalsTable)
    .where(sql`${signalsTable.status} IN ('HIT_TP', 'HIT_SL')`)
    .orderBy(desc(signalsTable.createdAt))
    .limit(limit);
  res.json(records);
});

router.post("/analyze", async (req, res) => {
  const parsed = AnalyzeSignalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const { pair, timeframe } = parsed.data;
  const prices   = await getLivePrices();
  const basePrice = prices[pair] ?? FALLBACK_PRICES[pair] ?? 1.0;
  const analysis = await generateAnalysis(pair, timeframe, basePrice);
  res.json(analysis);
});

// ── Multi-Timeframe Bias ──────────────────────────────────────────────────────
router.post("/mtf-bias", async (req, res) => {
  const { pair } = req.body;
  if (!pair || typeof pair !== "string") { res.status(400).json({ error: "pair required" }); return; }
  const prices    = await getLivePrices();
  const basePrice = prices[pair] ?? FALLBACK_PRICES[pair] ?? 1.0;
  const timeframes = ["M15", "H1", "H4", "D1"];
  const results = await Promise.all(timeframes.map(async tf => {
    const a = await generateAnalysis(pair, tf, basePrice);
    const bullPct = a.signal === "BUY" ? Math.round(50 + (a.confidenceScore - 50) * 0.6) :
                    a.signal === "SELL" ? Math.round(50 - (a.confidenceScore - 50) * 0.6) : 50;
    return {
      timeframe: tf,
      signal: a.signal,
      confidence: a.confidenceScore,
      trend: a.trend,
      bullPct,
    };
  }));
  const bullCount = results.filter(r => r.signal === "BUY").length;
  const bearCount = results.filter(r => r.signal === "SELL").length;
  const alignment =
    bullCount >= 3 ? "STRONG_BULL" :
    bullCount === 2 ? "MILD_BULL" :
    bearCount >= 3 ? "STRONG_BEAR" :
    bearCount === 2 ? "MILD_BEAR" : "MIXED";
  res.json({ pair, timeframes: results, alignment });
});

// ── Market status helpers ─────────────────────────────────────────────────────

function getMarketStatus() {
  const d   = new Date();
  const day = d.getUTCDay();           // 0=Sun 1=Mon … 5=Fri 6=Sat
  const t   = d.getUTCHours() * 60 + d.getUTCMinutes();

  // Forex closes Fri 21:00 UTC, reopens Sun 21:00 UTC
  const forexOpen =
    !(day === 6 ||
      (day === 0 && t < 21 * 60) ||
      (day === 5 && t >= 21 * 60));

  return {
    forex:      forexOpen,
    metals:     forexOpen,   // Gold/Silver follow forex hours
    crypto:     true,        // 24/7
    synthetics: true,        // Deriv synthetics 24/7
    isWeekend:  day === 0 || day === 6,
  };
}

function getPairMarket(pair: string): "forex" | "crypto" | "metals" | "energy" | "synthetic" {
  if (["R_","1HZ","BOOM","CRASH","JD","STPIDX"].some(p => pair.startsWith(p))) return "synthetic";
  const cryptoBases = ["BTC","ETH","BNB","SOL","ADA","XRP","DOGE","DOT","LTC","AVAX","MATIC","LINK"];
  if (cryptoBases.some(b => pair.startsWith(b))) return "crypto";
  if (["XAUUSD","XAGUSD","XPTUSD"].includes(pair)) return "metals";
  // Energy instruments not available via Deriv ticks_history
  return "forex";
}

function isPairTradeable(pair: string, status: ReturnType<typeof getMarketStatus>): boolean {
  const market = getPairMarket(pair);
  if (market === "forex")  return status.forex;
  if (market === "metals") return status.metals;
  if (market === "energy") return status.metals; // energy roughly follows forex hours
  return true; // crypto + synthetics always open
}

// ── AI Scanner — scan a watchlist, return only high-confidence signals ────────

// Pairs sourced from Yahoo Finance (free, no key required)
const SCANNER_DEFAULT_PAIRS = [
  // Forex majors
  "EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF",
  // Forex crosses — high-liquidity pairs with strong trending behaviour
  "GBPJPY","EURJPY","EURGBP",
  // Metals
  "XAUUSD","XAGUSD",
  // Crypto — 24/7 real markets
  "BTCUSD","ETHUSD","XRPUSD",
];

router.get("/market-status", (_req, res) => {
  res.json(getMarketStatus());
});

router.post("/scan", async (req, res) => {
  const {
    pairs         = SCANNER_DEFAULT_PAIRS,
    timeframes    = ["H1"],
    minConfidence = 80,
  } = req.body;

  if (!Array.isArray(pairs) || pairs.length === 0 || pairs.length > 40)
    return res.status(400).json({ error: "pairs must be a non-empty array (max 40)" });
  if (!Array.isArray(timeframes) || timeframes.length === 0)
    return res.status(400).json({ error: "timeframes required" });

  const marketStatus = getMarketStatus();
  const prices       = await getLivePrices();

  // Separate tradeable from closed pairs
  const tradeablePairs = (pairs as string[]).filter(p => isPairTradeable(p, marketStatus));
  const closedPairs    = (pairs as string[]).filter(p => !isPairTradeable(p, marketStatus));

  const tasks = tradeablePairs.flatMap(pair =>
    (timeframes as string[]).map(tf => ({ pair, tf }))
  );

  const settled = await Promise.allSettled(
    tasks.map(async ({ pair, tf }) => {
      const basePrice = prices[pair] ?? FALLBACK_PRICES[pair] ?? 1.0;
      return generateAnalysis(pair, tf, basePrice);
    })
  );

  const signals = settled
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
    .map(r => r.value)
    .filter(a => a.signal !== "NEUTRAL" && a.confidenceScore >= Number(minConfidence))
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  return res.json({
    signals,
    scannedAt:         Date.now(),
    pairsScanned:      tradeablePairs.length,
    pairsSkipped:      closedPairs,
    timeframesScanned: timeframes,
    totalFound:        signals.length,
    marketStatus,
  });
});

// ── Expire stale ACTIVE signals (no fake win/loss simulation) ─────────────────
// Signals older than 4 hours that haven't been resolved by the EA are marked
// EXPIRED. We never simulate HIT_TP / HIT_SL with random numbers — win rate on
// the dashboard reflects only real EA trade outcomes reported via /api/ea/trade.
router.post("/resolve-pending", async (_req, res) => {
  const active = await db.select().from(signalsTable).where(eq(signalsTable.status, "ACTIVE"));
  const now = Date.now();
  const EXPIRE_AFTER_HRS = 24;
  let expired = 0;
  for (const sig of active) {
    const ageHours = (now - new Date(sig.createdAt!).getTime()) / 3_600_000;
    if (ageHours < EXPIRE_AFTER_HRS) continue;
    await db.update(signalsTable).set({ status: "EXPIRED" }).where(eq(signalsTable.id, sig.id));
    expired++;
  }
  res.json({ expired, checked: active.length });
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
  // recentActivity: ACTIVE signals only — no expired noise, no old synthetic junk
  const REAL_PAIRS = new Set(["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF",
    "GBPJPY","EURJPY","EURGBP","XAUUSD","XAGUSD","BTCUSD","ETHUSD","XRPUSD"]);
  const recentActivity = allSignals
    .filter(s => s.status === "ACTIVE" && REAL_PAIRS.has(s.pair))
    .slice(0, 5);
  res.json({ totalSignals, activeSignals, winRate, avgConfidence, buySignals, sellSignals, topPairs, recentActivity });
});

router.patch("/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body;
  const valid = ["ACTIVE", "HIT_TP", "HIT_SL", "EXPIRED"];
  if (!valid.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [updated] = await db
    .update(signalsTable)
    .set({ status })
    .where(eq(signalsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Signal not found" }); return; }
  res.json(updated);
});

router.post("/", async (req, res) => {
  const parsed = CreateSignalBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const [created] = await db.insert(signalsTable).values(parsed.data as any).returning();
  res.status(201).json(created);
  sendNotifications(created).catch(() => {});
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

// ── One-shot admin purge: removes synthetic + expired signals from production ──
router.post("/admin/purge-synthetic", async (_req, res) => {
  const SYNTHETIC_PAIRS = [
    "R_10","R_25","R_50","R_75","R_100",
    "1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V",
    "BOOM500","BOOM1000","CRASH500","CRASH1000",
    "JD10","JD25","JD50","JD75","JD100",
  ];
  const [expiredDel] = await Promise.all([
    db.delete(signalsTable).where(eq(signalsTable.status, "EXPIRED")).returning({ id: signalsTable.id }),
  ]);
  const synthDel = await db.delete(signalsTable)
    .where(inArray(signalsTable.pair, SYNTHETIC_PAIRS))
    .returning({ id: signalsTable.id });
  const remaining = await db.select({ count: sql<number>`count(*)` }).from(signalsTable);
  console.log(`[purge] Deleted ${expiredDel.length} EXPIRED + ${synthDel.length} synthetic. Remaining: ${remaining[0].count}`);
  res.json({ deletedExpired: expiredDel.length, deletedSynthetic: synthDel.length, remaining: remaining[0].count });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE AUTO SCANNER  (runs every 5 min without browser)
// ─────────────────────────────────────────────────────────────────────────────

export function startAutoScanner() {
  const SCAN_INTERVAL_MS  = 2 * 60 * 1000;   // every 2 minutes
  const MIN_CONFIDENCE    = 25;
  const EXPIRE_AFTER_HRS  = 24;
  // M15 only for execution — H1/H4/D1/W1 are used internally by generateAnalysis
  // for multi-timeframe trend confirmation (MTF filter) but not saved as separate signals.
  const SCAN_TIMEFRAMES   = ["M15"];

  async function runScan() {
    try {
      const marketStatus = getMarketStatus();
      const prices       = await getLivePrices();

      // ── Cleanup steps: each wrapped independently so a DB hiccup doesn't abort the scan ──

      // Hard-delete EXPIRED signals (keep DB clean)
      try {
        await db.delete(signalsTable).where(eq(signalsTable.status, "EXPIRED"));
      } catch (e) {
        console.warn("[autoScanner] cleanup-expired failed (non-fatal):", (e as Error).message);
      }

      // Hard-delete stale ACTIVE signals past expiry window
      try {
        const cutoffTime = new Date(Date.now() - EXPIRE_AFTER_HRS * 3_600_000);
        const active = await db.select().from(signalsTable)
          .where(eq(signalsTable.status, "ACTIVE"));
        for (const sig of active) {
          if (new Date(sig.createdAt!) < cutoffTime) {
            await db.delete(signalsTable).where(eq(signalsTable.id, sig.id)).catch(() => {});
          }
        }
      } catch (e) {
        console.warn("[autoScanner] cleanup-stale failed (non-fatal):", (e as Error).message);
      }

      // Hard-delete any lingering synthetic pair signals
      try {
        const SYNTHETIC_PAIRS = ["R_10","R_25","R_50","R_75","R_100",
          "1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V",
          "BOOM500","BOOM1000","CRASH500","CRASH1000",
          "JD10","JD25","JD50","JD75","JD100",
          "GBPAUD","AUDNZD"];
        for (const sp of SYNTHETIC_PAIRS) {
          await db.delete(signalsTable).where(eq(signalsTable.pair, sp)).catch(() => {});
        }
      } catch (e) {
        console.warn("[autoScanner] cleanup-synthetics failed (non-fatal):", (e as Error).message);
      }

      // Dedup: keep only the newest signal per pair|TF|direction
      try {
        const allActive = await db.select().from(signalsTable)
          .where(eq(signalsTable.status, "ACTIVE"))
          .orderBy(desc(signalsTable.createdAt));
        const seenKeys = new Set<string>();
        for (const sig of allActive) {
          const key = `${sig.pair}|${sig.timeframe}|${sig.signal}`;
          if (seenKeys.has(key)) {
            await db.delete(signalsTable).where(eq(signalsTable.id, sig.id)).catch(() => {});
          } else {
            seenKeys.add(key);
          }
        }
      } catch (e) {
        console.warn("[autoScanner] dedup failed (non-fatal):", (e as Error).message);
      }

      // ── Only scan pairs currently open ───────────────────────────────────
      const openPairs = SCANNER_DEFAULT_PAIRS.filter(p => isPairTradeable(p, marketStatus));
      if (openPairs.length === 0) {
        console.log("[autoScanner] Market closed — skipping scan");
        return;
      }

      const tasks = openPairs.flatMap(pair =>
        SCAN_TIMEFRAMES.map(tf => ({ pair, tf }))
      );

      // Run max 6 analyses concurrently (Yahoo Finance handles this fine)
      const CONCURRENCY = 6;
      const results: PromiseSettledResult<any>[] = [];
      for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const batch = tasks.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.allSettled(
          batch.map(({ pair, tf }) => {
            const basePrice = prices[pair] ?? FALLBACK_PRICES[pair] ?? 1.0;
            return generateAnalysis(pair, tf, basePrice);
          })
        );
        results.push(...batchResults);
      }
      const settled = results;

      const highConf = settled
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map(r => r.value)
        .filter(a => a.signal !== "NEUTRAL" && a.confidenceScore >= MIN_CONFIDENCE)
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 15); // cap at 15 per cycle

      // Dedup: skip pairs that already have a PENDING or ACTIVE signal in the same direction
      const existingLive = await db.select().from(signalsTable)
        .where(sql`${signalsTable.status} IN ('PENDING', 'ACTIVE')`);
      const liveKeys = new Set(
        existingLive.map(s => `${s.pair}|${s.timeframe}|${s.signal}`)
      );

      let saved_count = 0;
      let blocked_reentry = 0;
      for (const sig of highConf) {
        const key = `${sig.pair}|${sig.timeframe}|${sig.signal}`;
        if (liveKeys.has(key)) continue; // already watching/executing this signal

        // Re-entry guard: block if same pair/direction traded recently with no other trades in between
        if (!canGenerateNewSignal(sig.pair, sig.signal, sig.entry)) {
          blocked_reentry++;
          continue;
        }

        const [saved] = await db.insert(signalsTable).values({
          pair:            sig.pair,
          signal:          sig.signal,
          timeframe:       sig.timeframe,
          entry:           sig.entry,
          stopLoss:        sig.stopLoss,
          takeProfit:      sig.takeProfit,
          confidenceScore: sig.confidenceScore,
          reasons:         sig.reasons,
          structureType:   sig.structureType,
          trend:           sig.trend,
          riskRewardRatio: sig.riskRewardRatio,
          status:          "PENDING" as any, // waits for price to hit entry before EA picks it up
        } as any).returning();
        sendNotifications(saved).catch(() => {});
        liveKeys.add(key); // prevent dupes within the same batch
        saved_count++;
      }

      console.log(
        `[autoScanner] Scanned ${openPairs.length} pairs × ${SCAN_TIMEFRAMES.length} TFs` +
        ` → ${saved_count} new PENDING signals` +
        ` (${highConf.length - saved_count - blocked_reentry} dupes, ${blocked_reentry} re-entry blocked)`
      );
    } catch (err) {
      console.error("[autoScanner] Error:", err);
    }
  }

  // Run immediately on startup, then every 2 minutes
  runScan();
  setInterval(runScan, SCAN_INTERVAL_MS);
  console.log(`[autoScanner] Started — scanning every ${SCAN_INTERVAL_MS / 60_000} min`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE MONITOR
// Checks every 30s whether live price has touched a PENDING signal's entry.
// When it does → flip to ACTIVE so the EA picks it up immediately.
// ─────────────────────────────────────────────────────────────────────────────

export function startPriceMonitor() {
  const INTERVAL_MS = 30_000;

  async function checkPendingEntries() {
    try {
      const pending = await db.select().from(signalsTable)
        .where(sql`${signalsTable.status} = 'PENDING'`);
      if (pending.length === 0) return;

      const prices = await getLivePrices();
      let activated = 0;

      for (const sig of pending) {
        const currentPrice = prices[sig.pair];
        if (!currentPrice) continue;

        const diff = Math.abs(currentPrice - sig.entry);
        if (diff <= getEntryTolerance(sig.pair)) {
          await db.update(signalsTable)
            .set({ status: "ACTIVE" as any })
            .where(eq(signalsTable.id, sig.id))
            .catch(() => {});
          console.log(
            `[priceMonitor] ✅ Entry hit: ${sig.pair} ${sig.signal} M15` +
            ` | live=${currentPrice} entry=${sig.entry} diff=${diff.toFixed(5)} → ACTIVE`
          );
          activated++;
        }
      }

      if (activated > 0) {
        console.log(`[priceMonitor] ${activated} signal(s) activated — EA will pick up on next poll`);
      }
    } catch (err) {
      console.warn("[priceMonitor] Error (non-fatal):", (err as Error).message);
    }
  }

  checkPendingEntries();
  setInterval(checkPendingEntries, INTERVAL_MS);
  console.log("[priceMonitor] Started — checking entries every 30s");
}

export default router;

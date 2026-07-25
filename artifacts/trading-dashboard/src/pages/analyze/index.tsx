import { useState, useCallback, useEffect, useRef } from "react";
import { useAnalyzeSignal, useCreateSignal } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Activity, ShieldAlert, ArrowRight, BarChart2,
  Clock, Layers, Target, BarChart, Waves, ChevronDown, ChevronUp,
  X, RefreshCw, ExternalLink,
  TrendingUp, TrendingDown, Scan, AlertTriangle, Search,
} from "lucide-react";
import { ConfidenceGauge } from "@/components/shared/ConfidenceGauge";
import { TrendBadge } from "@/components/shared/TrendBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import TradingViewChart from "@/components/shared/TradingViewChart";
import SyntheticChart from "@/components/shared/SyntheticChart";
import SMCAnalysisChart from "@/components/shared/SMCAnalysisChart";
import { LivePriceTicker } from "@/components/shared/LivePriceTicker";
import { MTFConfluence } from "@/components/shared/MTFConfluence";
import { PositionSizeCalc } from "@/components/shared/PositionSizeCalc";
import { HistoryBar } from "@/components/shared/HistoryBar";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import { useChart } from "@/contexts/ChartContext";
import { useDerivTradeCtx } from "@/contexts/DerivTradeContext";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// Which markets each watchlist touches
const WATCHLIST_MARKETS: Record<string, ("forex"|"metals"|"energy"|"crypto"|"synthetic")[]> = {
  "Full Scan":         ["forex","metals","energy","crypto","synthetic"],
  "Forex Majors":      ["forex"],
  "Forex Crosses":     ["forex"],
  "Metals & Energy":   ["metals","energy"],
  "Crypto":            ["crypto"],
  "Deriv Synthetics":  ["synthetic"],
  "24/7 Markets":      ["crypto","synthetic"],
};

const SCAN_WATCHLISTS: Record<string, string[]> = {
  "Full Scan": [
    "EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF",
    "GBPJPY","EURJPY","EURGBP","AUDJPY",
    "XAUUSD","XAGUSD",
    "BTCUSD","ETHUSD",
    "USOIL","UKOIL",
    "R_10","R_25","R_50","R_75","R_100",
    "BOOM500","BOOM1000","CRASH500","CRASH1000",
  ],
  "Forex Majors":  ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF"],
  "Forex Crosses": ["GBPJPY","EURJPY","EURGBP","AUDJPY","GBPCAD","AUDNZD"],
  "Metals & Energy": ["XAUUSD","XAGUSD","USOIL","UKOIL"],
  "Crypto":          ["BTCUSD","ETHUSD"],
  // Deriv Broker — always open 24/7
  "Deriv Synthetics": [
    "R_10","R_25","R_50","R_75","R_100",
    "1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V",
    "BOOM300","BOOM500","BOOM1000",
    "CRASH300","CRASH500","CRASH1000",
    "JD10","JD25","JD50",
  ],
  "24/7 Markets": [
    "BTCUSD","ETHUSD",
    "R_10","R_25","R_50","R_75","R_100",
    "BOOM500","BOOM1000","CRASH500","CRASH1000",
  ],
};

// ── Client-side market status ─────────────────────────────────────────────────
function detectMarketStatus() {
  const d   = new Date();
  const day = d.getUTCDay();
  const t   = d.getUTCHours() * 60 + d.getUTCMinutes();
  const forexOpen = !(day === 6 || (day === 0 && t < 21*60) || (day === 5 && t >= 21*60));
  return { forex: forexOpen, metals: forexOpen, energy: forexOpen, crypto: true, synthetic: true, isWeekend: day === 0 || day === 6 };
}

function watchlistHasClosedMarkets(key: string, status: ReturnType<typeof detectMarketStatus>) {
  const markets = WATCHLIST_MARKETS[key] ?? [];
  return markets.some(m => !status[m as keyof typeof status]);
}

// Suggest the best watchlist given current market hours
function suggestWatchlist(status: ReturnType<typeof detectMarketStatus>): string {
  if (status.forex) return "Full Scan";
  return "Deriv Synthetics"; // weekend → go 24/7 synthetics
}

const SCAN_TIMEFRAMES = [
  { value: "M15", label: "M15" },
  { value: "H1",  label: "H1"  },
  { value: "H4",  label: "H4"  },
  { value: "D1",  label: "D1"  },
];

const PAIR_GROUPS = [
  { label: "Forex Majors",       symbols: ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF"] },
  { label: "Forex Crosses",      symbols: ["GBPJPY","EURJPY","EURGBP","EURCHF","EURCAD","GBPCAD","AUDCAD","CADJPY","AUDNZD","AUDCHF","GBPCHF","NZDJPY"] },
  { label: "Cryptocurrency",     symbols: ["BTCUSD","ETHUSD","XRPUSD","BNBUSDT","SOLUSDT","ADAUSDT","DOTUSD","AVAXUSDT","DOGEUSD","MATICUSDT","LINKUSDT","LTCUSD"] },
  { label: "Commodities",        symbols: ["XAUUSD","XAGUSD","XPTUSD","USOIL","UKOIL","NATGAS","COPPER"] },
  { label: "Volatility Indices", symbols: ["R_10","R_25","R_50","R_75","R_100"] },
  { label: "Volatility 1s",      symbols: ["1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V"] },
  { label: "Boom & Crash",       symbols: ["BOOM300","BOOM500","BOOM1000","CRASH300","CRASH500","CRASH1000"] },
  { label: "Jump Indices",       symbols: ["JD10","JD25","JD50","JD75","JD100"] },
];

const TIMEFRAMES = [
  { value: "M15", label: "M15", sub: "15 min" },
  { value: "H1",  label: "H1",  sub: "1 hour" },
  { value: "H4",  label: "H4",  sub: "4 hours" },
  { value: "D1",  label: "D1",  sub: "Daily" },
];

const SYNTHETIC_SYMBOLS = new Set([
  "R_10","R_25","R_50","R_75","R_100",
  "1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V",
  "BOOM300","BOOM500","BOOM1000","CRASH300","CRASH500","CRASH1000",
  "JD10","JD25","JD50","JD75","JD100","STPIDX10",
]);

const PAIR_LABELS: Record<string, string> = {
  BTCUSD:"Bitcoin / USD", ETHUSD:"Ethereum / USD", XRPUSD:"Ripple / USD",
  LTCUSD:"Litecoin / USD", DOGEUSD:"Dogecoin / USD", DOTUSD:"Polkadot / USD",
  BNBUSDT:"BNB / Tether", SOLUSDT:"Solana / Tether", ADAUSDT:"Cardano / Tether",
  AVAXUSDT:"Avalanche / Tether", MATICUSDT:"Polygon / Tether", LINKUSDT:"Chainlink / Tether",
  XAUUSD:"Gold / USD", XAGUSD:"Silver / USD", XPTUSD:"Platinum / USD",
  USOIL:"WTI Crude Oil", UKOIL:"Brent Crude Oil", NATGAS:"Natural Gas", COPPER:"Copper",
  R_10:"Volatility 10", R_25:"Volatility 25", R_50:"Volatility 50",
  R_75:"Volatility 75", R_100:"Volatility 100",
};

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ScanResult {
  pair: string; timeframe: string; signal: "BUY" | "SELL";
  entry: number; stopLoss: number; takeProfit: number;
  confidenceScore: number; riskRewardRatio: number;
  reasons: string[]; trend: string; structureType: string;
  htfBias: string; session: string; sessionQuality: string;
  premiumDiscount: string; bullScore: number; bearScore: number;
  hasOrderBlock: boolean; hasFVG: boolean; hasLiquiditySweep: boolean;
  orderBlockZone: any; fvgZone: any; rsi: number; atr: number; macdHist: number;
  dxySentiment: string; supportZone: any; resistanceZone: any;
  isInOTE: boolean; oteFibHigh: number; oteFibLow: number;
  hasDivergence: boolean; divergenceType: string | null;
  hasCandlePattern: boolean; candlePattern: string | null;
  chartCandles: any[];
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtPriceFor(v: number, pair: string, isSynthetic: boolean) {
  if (!v) return "—";
  if (isSynthetic) return v.toFixed(2);
  const CRYPTO = ["BTCUSD","ETHUSD","BNBUSDT","SOLUSDT","AVAXUSDT","LTCUSD","DOGEUSD","MATICUSDT","ADAUSDT","LINKUSDT","DOTUSD","XRPUSD"];
  if (CRYPTO.includes(pair)) return v >= 100 ? v.toFixed(2) : v.toFixed(4);
  if (["XAUUSD","XAGUSD","XPTUSD","USOIL","UKOIL"].includes(pair)) return v.toFixed(2);
  if (["NATGAS","COPPER"].includes(pair)) return v.toFixed(3);
  if (pair.includes("JPY")) return v.toFixed(2);
  return v.toFixed(5);
}

function SessionBadge({ name, quality }: { name: string; quality: string }) {
  const color = quality === "OPTIMAL" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : quality === "GOOD" ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
    : "bg-slate-500/10 text-slate-400 border-slate-500/30";
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border", color)}>
      <Clock className="w-3 h-3" /> {name}
    </span>
  );
}

function MetricRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function ConfluenceBar({ bull, bear }: { bull: number; bear: number }) {
  const total = bull + bear || 1;
  const bullPct = Math.round((bull / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="text-emerald-400 font-semibold">Bull {bullPct}%</span>
        <span className="text-rose-400 font-semibold">Bear {100 - bullPct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-rose-500/20 flex">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${bullPct}%` }} />
      </div>
    </div>
  );
}

function PdBadge({ zone }: { zone: string }) {
  if (zone === "PREMIUM") return <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-0.5">PREMIUM</span>;
  if (zone === "DISCOUNT") return <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">DISCOUNT</span>;
  return <span className="text-xs font-bold text-slate-400 bg-slate-500/10 border border-slate-500/20 rounded px-2 py-0.5">EQUILIBRIUM</span>;
}

function SignalDot({ active, color }: { active: boolean; color: string }) {
  return <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5", active ? color : "bg-muted")} />;
}

function VolatilityBadge({ entry, stopLoss }: { entry: number; stopLoss: number }) {
  const atr = Math.abs(entry - stopLoss) / 1.2;
  const pct = entry > 0 ? (atr / entry) * 100 : 0;
  const level = pct > 0.5 ? "HIGH" : pct > 0.15 ? "MEDIUM" : "LOW";
  const styles = level === "HIGH" ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
    : level === "MEDIUM" ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
    : "bg-sky-500/10 text-sky-400 border-sky-500/25";
  return (
    <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", styles)}>
      <Waves className="w-3 h-3" /> {level} VOL
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCANNER SIGNAL CARD
// ─────────────────────────────────────────────────────────────────────────────

function ScannerSignalCard({
  result, onDeepAnalyze
}: {
  result: ScanResult;
  onDeepAnalyze: (pair: string, tf: string) => void;
}) {
  const [cardResult, setCardResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [feeding, setFeeding] = useState(false);

  async function handleFeedToEA() {
    setFeeding(true);
    setCardResult(null);
    try {
      const body = {
        pair:             result.pair,
        signal:           result.signal,
        timeframe:        result.timeframe,
        entry:            result.entry,
        stopLoss:         result.stopLoss,
        takeProfit:       result.takeProfit,
        confidenceScore:  result.confidenceScore,
        riskRewardRatio:  result.riskRewardRatio,
        reasons:          result.reasons,
        structureType:    result.structureType ?? "NONE",
        trend:            result.trend ?? "NEUTRAL",
        hasOrderBlock:        result.hasOrderBlock ?? false,
        hasSupportResistance: false,
      };
      const r = await fetch(`${BASE}/api/signals`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      setCardResult({ ok: true, message: "✓ Signal queued — EA will trade it" });
    } catch (e: any) {
      setCardResult({ ok: false, message: e.message ?? "Failed to queue signal" });
    } finally {
      setFeeding(false);
      setTimeout(() => setCardResult(null), 5000);
    }
  }

  const isBuy = result.signal === "BUY";
  const isSynthetic = SYNTHETIC_SYMBOLS.has(result.pair);
  const fmt = (v: number) => fmtPriceFor(v, result.pair, isSynthetic);
  const isHighConf = result.confidenceScore >= 80;

  const borderColor = isBuy ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)";
  const glowColor   = isBuy ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)";

  return (
    <div
      style={{
        background: `rgba(11,15,25,0.85)`,
        border: `1px solid ${borderColor}`,
        boxShadow: `0 4px 24px ${glowColor}, 0 0 0 1px rgba(255,255,255,0.02)`,
        backdropFilter: "blur(16px)",
        borderLeft: `3px solid ${isBuy ? "#34d399" : "#f87171"}`,
      }}
      className="rounded-[14px] p-4 flex flex-col gap-3 relative overflow-hidden"
    >
      {/* High confidence badge */}
      {isHighConf && (
        <div
          style={{ background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.2)" }}
          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full"
        >
          <Zap className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">High Conf</span>
        </div>
      )}

      {/* Header: pair + signal */}
      <div className="pr-20">
        <div className="flex items-center gap-2 mb-1">
          <span
            style={isBuy
              ? { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }
              : { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }
            }
            className="font-mono text-xs font-bold px-2.5 py-1 rounded-[6px] flex items-center gap-1.5"
          >
            {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {result.signal}
          </span>
          <span className="font-mono font-bold text-white text-sm">{result.pair}</span>
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">{result.timeframe}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400">
            HTF <span className={result.htfBias === "BULLISH" ? "text-emerald-400 font-semibold" : result.htfBias === "BEARISH" ? "text-rose-400 font-semibold" : "text-slate-400"}>{result.htfBias}</span>
          </span>
          <span className="text-slate-700">·</span>
          <SessionBadge name={result.session} quality={result.sessionQuality} />
        </div>
      </div>

      {/* Confidence + Entry/SL/TP */}
      <div className="flex items-center gap-3">
        {/* Confidence score */}
        <div
          style={isHighConf
            ? { background: "rgba(0,255,255,0.06)", border: "1px solid rgba(0,255,255,0.18)" }
            : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }
          }
          className="rounded-[10px] px-3 py-2 text-center min-w-[60px] shrink-0"
        >
          <div className={cn("text-2xl font-bold font-mono leading-tight", isHighConf ? "text-cyan-400" : "text-white")}>
            {result.confidenceScore}<span className="text-xs font-normal opacity-60">%</span>
          </div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">confidence</div>
        </div>

        {/* Levels grid */}
        <div className="flex-1 grid grid-cols-3 gap-2">
          {[
            { label: "Entry",  val: fmt(result.entry),      col: "text-white" },
            { label: "SL",     val: fmt(result.stopLoss),   col: "text-rose-400" },
            { label: "TP",     val: fmt(result.takeProfit), col: "text-emerald-400" },
          ].map(({ label, val, col }) => (
            <div key={label}
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
              className="rounded-[8px] px-2 py-1.5 text-center"
            >
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
              <div className={cn("font-mono text-[11px] font-bold mt-0.5 leading-tight", col)}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* R:R + Confluence */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-mono text-slate-500">R:R <span className="text-white font-bold">1:{result.riskRewardRatio.toFixed(1)}</span></span>
        <div className="flex-1">
          <ConfluenceBar bull={result.bullScore} bear={result.bearScore} />
        </div>
      </div>

      {/* Top 2 reasons */}
      {result.reasons.slice(0, 2).map((r, i) => (
        <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400 leading-snug">
          <div className="w-1 h-1 rounded-full bg-cyan-500/60 mt-1.5 shrink-0" />
          <span>{r}</span>
        </div>
      ))}

      {/* Card trade result */}
      {cardResult && (
        <div style={cardResult.ok
          ? { background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }
          : { background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }
        } className="flex items-center gap-2 px-3 py-2 rounded-[8px] text-[11px] font-semibold"
        >
          <span className={cardResult.ok ? "text-emerald-400" : "text-rose-400"}>{cardResult.message}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1 flex-wrap">
        <button
          onClick={() => onDeepAnalyze(result.pair, result.timeframe)}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-xs font-semibold text-slate-400 hover:text-white hover:border-white/15 transition-all"
        >
          <Search className="w-3 h-3" /> Deep Analyse
        </button>
        {isHighConf && (
          <button
            onClick={handleFeedToEA}
            disabled={feeding}
            style={{
              background: isBuy
                ? "linear-gradient(135deg,rgba(52,211,153,0.18),rgba(0,255,255,0.12))"
                : "linear-gradient(135deg,rgba(248,113,113,0.18),rgba(239,68,68,0.12))",
              border: isBuy ? "1px solid rgba(52,211,153,0.35)" : "1px solid rgba(248,113,113,0.35)",
              opacity: feeding ? 0.6 : 1,
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-xs font-bold text-white hover:scale-[1.02] active:scale-[0.98] transition-all disabled:cursor-wait"
          >
            <Zap className="w-3 h-3" /> {feeding ? "Queuing…" : `Feed to EA — ${result.signal} ${result.pair}`}
          </button>
        )}
      </div>
    </div>
  );
}

// Skeleton card while scanning
function SkeletonCard() {
  return (
    <div
      style={{ background: "rgba(11,15,25,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}
      className="rounded-[14px] p-4 space-y-3 animate-pulse"
    >
      <div className="flex items-center gap-2">
        <div className="h-6 w-12 rounded bg-white/5" />
        <div className="h-5 w-20 rounded bg-white/5" />
        <div className="h-4 w-8 rounded bg-white/5" />
      </div>
      <div className="flex gap-3">
        <div className="h-14 w-16 rounded-[10px] bg-white/5" />
        <div className="flex-1 grid grid-cols-3 gap-2">
          {[0,1,2].map(i => <div key={i} className="h-10 rounded-[8px] bg-white/5" />)}
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/5" />
      <div className="h-3 w-3/4 rounded bg-white/5" />
      <div className="flex gap-2">
        <div className="flex-1 h-8 rounded-[8px] bg-white/5" />
        <div className="flex-1 h-8 rounded-[8px] bg-white/5" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Analyze() {
  const { pair, timeframe, setPair, setTimeframe } = useChart();
  const analyzeMutation = useAnalyzeSignal();
  const createMutation  = useCreateSignal();
  const { toast }       = useToast();
  const { history, push: pushHistory, clear: clearHistory } = useAnalysisHistory();
  const [historyResult, setHistoryResult] = useState<any>(null);

  // Market status (recomputed on mount + every minute)
  const [marketStatus, setMarketStatus] = useState(detectMarketStatus);
  useEffect(() => {
    const tick = () => setMarketStatus(detectMarketStatus());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Scanner state — default to best watchlist for current market hours
  const [watchlistKey, setWatchlistKey] = useState<string>(() => suggestWatchlist(detectMarketStatus()));
  const [scanTF, setScanTF]             = useState<string[]>(["H1"]);
  const [minConf, setMinConf]           = useState(80);
  const [scanning, setScanning]         = useState(false);
  const [scanResults, setScanResults]   = useState<ScanResult[] | null>(null);
  const [skippedPairs, setSkippedPairs] = useState<string[]>([]);
  const [lastScanned, setLastScanned]   = useState<Date | null>(null);
  const [scanError, setScanError]       = useState<string | null>(null);
  const [autoScan, setAutoScan]         = useState(false);
  const autoIntervalRef                 = useRef<NodeJS.Timeout | null>(null);
  const autoFedIds                      = useRef<Set<string>>(new Set());

  // Deep analyze (single pair) — shown when user clicks "Deep Analyse" on a card
  const [deepOpen, setDeepOpen] = useState(false);
  const isSynthetic = pair ? SYNTHETIC_SYMBOLS.has(pair) : false;

  function fmtPrice(v: number) { return pair ? fmtPriceFor(v, pair, isSynthetic) : String(v); }

  // ── Scanner core ───────────────────────────────────────────────────────────

  const runScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    try {
      const pairs = SCAN_WATCHLISTS[watchlistKey] ?? SCAN_WATCHLISTS["Full Scan"];
      const resp = await fetch(`${BASE}/api/signals/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs, timeframes: scanTF, minConfidence: minConf }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setScanResults(data.signals);
      setSkippedPairs(data.pairsSkipped ?? []);
      setLastScanned(new Date());
    } catch (e: any) {
      setScanError(e.message ?? "Scan failed");
      toast({ variant: "destructive", title: "Scan failed", description: e.message });
    } finally {
      setScanning(false);
    }
  }, [watchlistKey, scanTF, minConf]);

  // Auto-scan on mount — run one scan immediately when the page first loads
  const didMountScan = useRef(false);
  useEffect(() => {
    if (didMountScan.current) return;
    didMountScan.current = true;
    runScan();
  }, [runScan]);

  // Auto-scan interval
  useEffect(() => {
    if (autoIntervalRef.current) clearInterval(autoIntervalRef.current);
    if (autoScan) {
      autoIntervalRef.current = setInterval(() => runScan(), 60_000);
    }
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current); };
  }, [autoScan, runScan]);

  function handleDeepAnalyze(p: string, tf: string) {
    setPair(p);
    setTimeframe(tf);
    setDeepOpen(true);
    setTimeout(() => {
      document.getElementById("deep-analyze-section")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // ── Deep analyze (single pair) ─────────────────────────────────────────────

  function runAnalysis() {
    if (!pair) {
      toast({ variant: "destructive", title: "No instrument selected" });
      return;
    }
    setHistoryResult(null);
    analyzeMutation.mutate({ data: { pair, timeframe } }, {
      onSuccess: (data) => pushHistory(data),
      onError:   () => toast({ variant: "destructive", title: "Analysis Failed" }),
    });
  }

  function handleSave() {
    const result = historyResult ?? analyzeMutation.data;
    if (!result) return;
    if (result.signal === "NEUTRAL") {
      toast({ variant: "destructive", title: "Cannot save neutral signal" });
      return;
    }
    createMutation.mutate({
      data: {
        pair: result.pair, signal: result.signal as any, timeframe: result.timeframe,
        entry: result.entry, stopLoss: result.stopLoss, takeProfit: result.takeProfit,
        confidenceScore: result.confidenceScore, reasons: result.reasons,
        structureType: result.structureType, trend: result.trend,
        hasOrderBlock: result.hasOrderBlock, hasSupportResistance: result.hasSupportResistance,
        riskRewardRatio: result.riskRewardRatio,
      }
    }, {
      onSuccess: () => toast({ title: "Signal Saved" }),
      onError:   () => toast({ variant: "destructive", title: "Error", description: "Failed to save." }),
    });
  }

  const deepResult = historyResult ?? analyzeMutation.data;
  const secondsAgo = lastScanned ? Math.round((Date.now() - lastScanned.getTime()) / 1000) : null;

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Page header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scan className="w-6 h-6 text-cyan-400" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">AI Scanner</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {marketStatus.forex
              ? <>Scans {SCAN_WATCHLISTS[watchlistKey]?.length ?? 17} instruments with live OHLCV data. Only signals ≥{minConf}% confidence are shown.</>
              : <>Forex &amp; metals markets are <span className="text-orange-400 font-semibold">closed</span> this weekend. Deriv Synthetics and Crypto trade <span className="text-emerald-400 font-semibold">24/7</span>.</>
            }
          </p>
        </div>
      </div>

      {/* ── Market Status Banner ──────────────────────────────────────────────── */}
      {!marketStatus.forex && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(251,146,60,0.06), rgba(234,88,12,0.04))",
            border: "1px solid rgba(251,146,60,0.25)",
          }}
          className="rounded-[14px] p-4 flex flex-wrap items-center gap-3"
        >
          {/* Status dots */}
          <div className="flex items-center gap-4 flex-wrap flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-semibold text-rose-400">Forex — Closed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-semibold text-rose-400">Metals / Oil — Closed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Crypto — Open 24/7</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400">Deriv Synthetics — Open 24/7</span>
            </div>
          </div>

          {/* Suggest 24/7 watchlist */}
          {watchlistHasClosedMarkets(watchlistKey, marketStatus) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-orange-300/80">
                {skippedPairs.length > 0
                  ? `${skippedPairs.length} pairs skipped — markets closed`
                  : "Your watchlist includes closed markets"}
              </span>
              <button
                onClick={() => setWatchlistKey("Deriv Synthetics")}
                style={{
                  background: "rgba(0,255,255,0.1)",
                  border: "1px solid rgba(0,255,255,0.3)",
                }}
                className="text-xs font-bold text-cyan-300 px-3 py-1.5 rounded-full transition-all hover:bg-cyan-500/20 shrink-0"
              >
                Switch to Deriv Synthetics →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Scanner Controls ──────────────────────────────────────────────────── */}
      <div style={{ background:"rgba(11,15,25,0.7)", border:"1px solid rgba(0,255,255,0.1)", backdropFilter:"blur(16px)" }}
        className="rounded-[16px] p-5 space-y-4"
      >
        <div className="flex flex-wrap gap-4 items-end">

          {/* Watchlist */}
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Watchlist</label>
            <div className="relative">
              <select value={watchlistKey} onChange={e => setWatchlistKey(e.target.value)}
                style={{ background:"rgba(255,255,255,0.04)", border: watchlistHasClosedMarkets(watchlistKey, marketStatus) ? "1px solid rgba(251,146,60,0.4)" : "1px solid rgba(0,255,255,0.2)" }}
                className="w-full appearance-none rounded-[10px] px-4 py-3 text-sm font-mono text-white focus:outline-none cursor-pointer pr-10"
              >
                {Object.keys(SCAN_WATCHLISTS).map(k => {
                  const hasClosed = watchlistHasClosedMarkets(k, marketStatus);
                  const is247 = WATCHLIST_MARKETS[k]?.every(m => m === "crypto" || m === "synthetic");
                  const prefix = is247 ? "🟢 " : hasClosed ? "🔴 " : "";
                  return (
                    <option key={k} value={k} style={{ background:"#0b0f19" }}>
                      {prefix}{k} ({SCAN_WATCHLISTS[k].length} pairs){is247 ? " — 24/7" : hasClosed ? " — CLOSED" : ""}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Timeframes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Timeframes</label>
            <div className="flex items-center gap-2 h-[46px]">
              {SCAN_TIMEFRAMES.map(tf => {
                const active = scanTF.includes(tf.value);
                return (
                  <button key={tf.value}
                    onClick={() => setScanTF(prev =>
                      active ? (prev.length > 1 ? prev.filter(t => t !== tf.value) : prev) : [...prev, tf.value]
                    )}
                    style={active
                      ? { background:"rgba(0,255,255,0.1)", border:"1px solid rgba(0,255,255,0.3)", color:"#00ffff" }
                      : { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8" }
                    }
                    className="w-14 h-full flex items-center justify-center rounded-[10px] text-sm font-bold transition-all hover:border-cyan-400/25"
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Min confidence */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Min Confidence</label>
            <div className="flex items-center gap-2 h-[46px]">
              {[70, 80, 85, 90].map(v => (
                <button key={v}
                  onClick={() => setMinConf(v)}
                  style={minConf === v
                    ? { background:"rgba(0,255,255,0.1)", border:"1px solid rgba(0,255,255,0.3)", color:"#00ffff" }
                    : { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8" }
                  }
                  className="w-14 h-full flex items-center justify-center rounded-[10px] text-sm font-bold transition-all hover:border-cyan-400/25"
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>

          {/* Scan button */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-transparent select-none">Run</label>
            <button
              onClick={() => runScan()}
              disabled={scanning}
              style={!scanning ? {
                background:"linear-gradient(135deg,rgba(0,255,255,0.15),rgba(139,92,246,0.15))",
                border:"1px solid rgba(0,255,255,0.3)",
                boxShadow:"0 0 20px rgba(0,255,255,0.12)",
              } : { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}
              className="h-[46px] px-6 rounded-[10px] text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
            >
              {scanning
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scanning…</>
                : <><Zap className="w-4 h-4 text-cyan-400" /> Scan Now</>}
            </button>
          </div>
        </div>

        {/* Auto controls */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/[0.04]">
          {/* Auto-scan toggle */}
          <button
            onClick={() => setAutoScan(v => !v)}
            style={autoScan
              ? { background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.25)", color:"#34d399" }
              : { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b" }
            }
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold transition-all hover:border-emerald-400/25"
          >
            <div className={cn("w-3 h-3 rounded-full", autoScan ? "bg-emerald-400 animate-pulse" : "bg-slate-600")} />
            {autoScan ? "Auto-Scan ON (60s)" : "Auto-Scan OFF"}
          </button>

          {/* Status */}
          {lastScanned && (
            <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Last scan: {secondsAgo}s ago · {scanResults?.length ?? 0} signal{scanResults?.length !== 1 ? "s" : ""} found
              {skippedPairs.length > 0 && (
                <span className="text-orange-400/70">· {skippedPairs.length} skipped (market closed)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Scanner Results ───────────────────────────────────────────────────── */}

      {/* Error state */}
      {scanError && (
        <div style={{ background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.2)" }}
          className="rounded-[12px] p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-400">Scan Error</p>
            <p className="text-xs text-slate-400 mt-0.5">{scanError}</p>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {scanning && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-sm font-mono text-slate-400">
              Fetching live candles from Binance & Yahoo Finance for {SCAN_WATCHLISTS[watchlistKey]?.length} pairs…
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* Results grid */}
      {!scanning && scanResults !== null && (
        scanResults.length === 0 ? (
          <div style={{ border:"1px dashed rgba(0,255,255,0.1)", background:"rgba(0,255,255,0.01)" }}
            className="rounded-[16px] flex flex-col items-center justify-center py-16 gap-4"
          >
            <div style={{ background:"rgba(0,255,255,0.05)", border:"1px solid rgba(0,255,255,0.1)" }}
              className="w-14 h-14 rounded-[14px] flex items-center justify-center">
              <Scan className="w-7 h-7 text-cyan-400/40" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold font-mono text-slate-400">No high-confidence signals found</h3>
              <p className="text-sm text-slate-600 mt-1">
                No BUY or SELL signal met the ≥{minConf}% threshold on the scanned pairs.
                Try lowering the minimum confidence or wait for better setups.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Summary bar */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div style={{ background:"rgba(0,255,255,0.06)", border:"1px solid rgba(0,255,255,0.15)" }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-[8px]"
              >
                <Scan className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white">{scanResults.length}</span>
                <span className="text-xs text-slate-400">signal{scanResults.length !== 1 ? "s" : ""} ≥{minConf}%</span>
              </div>
              <div className="flex items-center gap-2">
                {scanResults.filter(s => s.signal === "BUY").length > 0 && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    {scanResults.filter(s => s.signal === "BUY").length} BUY
                  </span>
                )}
                {scanResults.filter(s => s.signal === "SELL").length > 0 && (
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                    {scanResults.filter(s => s.signal === "SELL").length} SELL
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-600 ml-auto">Sorted by confidence ↓</span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scanResults.map((sig, i) => (
                <ScannerSignalCard
                  key={`${sig.pair}_${sig.timeframe}_${i}`}
                  result={sig}
                  onDeepAnalyze={handleDeepAnalyze}
                />
              ))}
            </div>
          </div>
        )
      )}

      {/* Initial state (no scan yet) */}
      {!scanning && scanResults === null && (
        <div style={{ border:"1px dashed rgba(0,255,255,0.08)", background:"rgba(0,255,255,0.01)" }}
          className="rounded-[16px] flex flex-col items-center justify-center py-20 gap-4"
        >
          <div style={{ background:"rgba(0,255,255,0.06)", border:"1px solid rgba(0,255,255,0.12)" }}
            className="w-16 h-16 rounded-[16px] flex items-center justify-center"
          >
            <Scan className="w-8 h-8 text-cyan-400/60" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold font-mono text-slate-400">Scanner ready</h3>
            <p className="text-sm text-slate-600 mt-1">
              Click <span className="text-cyan-400 font-semibold">Scan Now</span> to analyse {SCAN_WATCHLISTS[watchlistKey]?.length} instruments with real live OHLCV data.
              <br />Only signals ≥{minConf}% confidence will be shown.
            </p>
          </div>
          <button
            onClick={() => runScan()}
            style={{ background:"linear-gradient(135deg,rgba(0,255,255,0.15),rgba(139,92,246,0.15))", border:"1px solid rgba(0,255,255,0.3)", boxShadow:"0 0 20px rgba(0,255,255,0.1)" }}
            className="px-8 py-3 rounded-[12px] text-sm font-bold text-white flex items-center gap-2 hover:scale-[1.02] transition-all"
          >
            <Zap className="w-4 h-4 text-cyan-400" /> Start Scanning
          </button>
        </div>
      )}

      {/* ── Deep Analyze (single pair) ───────────────────────────────────────── */}
      <div id="deep-analyze-section">
        <button
          onClick={() => setDeepOpen(v => !v)}
          style={{ background:"rgba(11,15,25,0.6)", border:"1px solid rgba(255,255,255,0.07)" }}
          className="w-full flex items-center justify-between px-5 py-3 rounded-[12px] text-sm font-semibold text-slate-400 hover:text-white hover:border-white/12 transition-all"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Deep Analyse — single pair
            <span className="text-[11px] text-slate-600">Full SMC analysis on one instrument</span>
          </div>
          {deepOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {deepOpen && (
        <div className="space-y-6">
          {/* Instrument + Timeframe selector */}
          <div style={{ background:"rgba(11,15,25,0.7)", border:"1px solid rgba(0,255,255,0.1)", backdropFilter:"blur(16px)" }}
            className="rounded-[16px] p-5 space-y-4"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Instrument</label>
                <div className="relative">
                  <select value={pair} onChange={e => setPair(e.target.value)}
                    style={{ background:"rgba(255,255,255,0.04)", border: pair ? "1px solid rgba(0,255,255,0.25)" : "1px solid rgba(255,255,255,0.08)" }}
                    className="w-full appearance-none rounded-[10px] px-4 py-3 text-sm font-mono text-white focus:outline-none cursor-pointer pr-10 transition-all"
                  >
                    <option value="" disabled style={{ background:"#0b0f19" }}>Select instrument…</option>
                    {PAIR_GROUPS.map(g => (
                      <optgroup key={g.label} label={g.label} style={{ background:"#0b0f19", color:"#64748b" }}>
                        {g.symbols.map(s => <option key={s} value={s} style={{ background:"#0b0f19", color:"#fff" }}>{s}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Timeframe</label>
                <div className="flex items-center gap-2 h-[46px]">
                  {TIMEFRAMES.map(tf => {
                    const active = timeframe === tf.value;
                    return (
                      <button key={tf.value} onClick={() => setTimeframe(tf.value)}
                        style={active
                          ? { background:"rgba(0,255,255,0.1)", border:"1px solid rgba(0,255,255,0.3)", boxShadow:"0 0 12px rgba(0,255,255,0.12)", color:"#00ffff" }
                          : { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"#94a3b8" }
                        }
                        className="flex flex-col items-center justify-center w-16 h-full rounded-[10px] transition-all hover:border-cyan-400/25 hover:text-white"
                      >
                        <span className="text-sm font-bold leading-tight">{tf.label}</span>
                        <span className="text-[9px] opacity-60">{tf.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-transparent select-none">Run</label>
                <button onClick={runAnalysis} disabled={analyzeMutation.isPending || !pair}
                  style={pair && !analyzeMutation.isPending
                    ? { background:"linear-gradient(135deg,rgba(0,255,255,0.15),rgba(139,92,246,0.15))", border:"1px solid rgba(0,255,255,0.3)", boxShadow:"0 0 20px rgba(0,255,255,0.12)" }
                    : { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }
                  }
                  className="h-[46px] px-6 rounded-[10px] text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
                >
                  {analyzeMutation.isPending
                    ? <><Activity className="w-4 h-4 animate-spin" /> Analyzing…</>
                    : <><Zap className="w-4 h-4 text-cyan-400" /> Run Analysis</>}
                </button>
              </div>
            </div>
            {pair && (
              <div className="flex items-center gap-3 pt-1 border-t border-white/[0.04]">
                <span style={{ background:"rgba(0,255,255,0.08)", border:"1px solid rgba(0,255,255,0.2)", color:"#00e5e5" }}
                  className="font-mono text-sm font-bold px-3 py-1 rounded-[7px]">{pair}</span>
                <span className="text-slate-500 text-sm">·</span>
                <span className="text-slate-400 text-sm">{timeframe} timeframe</span>
                {PAIR_LABELS[pair] && <><span className="text-slate-500 text-sm">·</span><span className="text-slate-500 text-sm">{PAIR_LABELS[pair]}</span></>}
              </div>
            )}
          </div>

          <HistoryBar history={history} onReload={r => setHistoryResult(r)} onClear={clearHistory} />

          {pair && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold font-mono tracking-tight">
                  {pair} <span className="text-muted-foreground font-normal">— {timeframe} Live Chart</span>
                </h2>
                {PAIR_LABELS[pair] && <span className="text-sm text-muted-foreground">{PAIR_LABELS[pair]}</span>}
              </div>
              <Separator className="opacity-30" />
              <LivePriceTicker symbol={pair} />
              {isSynthetic
                ? <SyntheticChart key={`${pair}-${timeframe}`} symbol={pair} timeframe={timeframe} height={560} />
                : <TradingViewChart key={`${pair}-${timeframe}`} symbol={pair} timeframe={timeframe} height={560} />
              }
            </div>
          )}

          {pair && <MTFConfluence pair={pair} />}

          {deepResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold font-mono tracking-tight">
                  SMC Analysis <span className="text-muted-foreground font-normal text-sm">— auto-marked levels (real candles)</span>
                </h2>
              </div>
              <Separator className="opacity-30" />
              <SMCAnalysisChart result={deepResult} height={640} />
            </div>
          )}

          {deepResult && deepResult.signal === "NEUTRAL" && (
            <div className="rounded-xl border border-slate-500/30 bg-slate-500/5 p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-500/15 flex items-center justify-center shrink-0">
                  <span className="text-slate-400 text-lg font-bold">–</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-mono text-slate-300">No Valid Signal — Stay Out</h3>
                  <p className="text-sm text-muted-foreground">
                    {deepResult.pair} / {deepResult.timeframe} has no clear directional edge right now.
                  </p>
                </div>
              </div>
            </div>
          )}

          {deepResult && deepResult.signal !== "NEUTRAL" && (
            <PositionSizeCalc
              pair={deepResult.pair} entry={deepResult.entry} stopLoss={deepResult.stopLoss}
              takeProfit={deepResult.takeProfit} signal={deepResult.signal}
              confidence={deepResult.confidenceScore} sessionQuality={deepResult.sessionQuality}
              session={deepResult.session}
            />
          )}

          {deepResult && (
            <Card className="bg-card/50 border-border/50 border-t-2 border-t-primary shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <Zap className="w-32 h-32" />
              </div>
              <CardHeader className="pb-4 relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold font-mono">{deepResult.pair}</h3>
                      <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary bg-primary/5">{deepResult.timeframe} LIVE</Badge>
                      <SessionBadge name={deepResult.session} quality={deepResult.sessionQuality} />
                      <VolatilityBadge entry={deepResult.entry} stopLoss={deepResult.stopLoss} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-lg font-bold tracking-wider px-2 py-0.5 rounded",
                        deepResult.signal === "BUY"  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                        deepResult.signal === "SELL" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                        "bg-slate-500/10 text-slate-400 border border-slate-500/20")}>{deepResult.signal}</span>
                      {deepResult.signal !== "NEUTRAL" && (
                        <span className="text-sm font-mono text-muted-foreground">ENTRY: <span className="text-foreground">{fmtPrice(deepResult.entry)}</span></span>
                      )}
                    </div>
                  </div>
                  <ConfidenceGauge score={deepResult.confidenceScore} size="lg" />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <TrendBadge trend={deepResult.trend} />
                  {deepResult.structureType !== "NONE" && (
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20">
                      {deepResult.structureType === "BOS" ? "Break of Structure" : "Change of Character"}
                    </Badge>
                  )}
                  {deepResult.signal !== "NEUTRAL" && <Badge variant="outline" className="font-mono bg-card">R:R 1:{deepResult.riskRewardRatio.toFixed(1)}</Badge>}
                  <Badge variant="outline" className={cn("font-mono text-xs",
                    deepResult.htfBias === "BULLISH" ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" :
                    deepResult.htfBias === "BEARISH" ? "bg-rose-500/5 text-rose-400 border-rose-500/20" :
                    "bg-slate-500/5 text-slate-400 border-slate-500/20")}>HTF {deepResult.htfBias}</Badge>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 space-y-5">
                {deepResult.signal !== "NEUTRAL" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
                      <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Take Profit</div>
                      <div className="font-mono text-xl text-emerald-500 font-bold">{fmtPrice(deepResult.takeProfit)}</div>
                    </div>
                    <div className="bg-rose-500/5 rounded-lg p-4 border border-rose-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-1 h-full bg-rose-500" />
                      <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Stop Loss</div>
                      <div className="font-mono text-xl text-rose-500 font-bold">{fmtPrice(deepResult.stopLoss)}</div>
                    </div>
                  </div>
                )}
                <div className="border border-border/50 rounded-xl p-4 bg-background/50">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart className="w-4 h-4 text-primary" /> Confluence Score</h4>
                  <ConfluenceBar bull={deepResult.bullScore} bear={deepResult.bearScore} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-border/50 rounded-xl p-4 bg-background/50 space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-primary" /> Analysis Reasons</h4>
                    <ul className="space-y-2">
                      {deepResult.reasons.map((reason: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-snug">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" /><span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <div className="border border-border/50 rounded-xl p-4 bg-background/50">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> SMC Signals</h4>
                      <div className="space-y-1.5 text-xs">
                        {[
                          { label:"Order Block",     active:deepResult.hasOrderBlock,     color:"bg-amber-400",  val:deepResult.hasOrderBlock ? deepResult.orderBlockZone?.type || "DETECTED" : "None" },
                          { label:"Fair Value Gap",  active:deepResult.hasFVG,            color:"bg-violet-400", val:deepResult.hasFVG ? deepResult.fvgZone?.type || "DETECTED" : "None" },
                          { label:"Liquidity Sweep", active:deepResult.hasLiquiditySweep, color:"bg-cyan-400",   val:deepResult.hasLiquiditySweep ? (deepResult.liquiditySweepType === "SSL" ? "Sell-Side" : "Buy-Side") : "None" },
                          { label:"Fibonacci OTE",   active:deepResult.isInOTE,           color:"bg-yellow-400", val:deepResult.isInOTE ? `${deepResult.oteFibLow} – ${deepResult.oteFibHigh}` : "Not in zone" },
                          { label:"RSI Divergence",  active:deepResult.hasDivergence,     color:"bg-pink-400",   val:deepResult.hasDivergence ? deepResult.divergenceType?.replace(/_/g," ") : "None" },
                          { label:"Candle Pattern",  active:deepResult.hasCandlePattern,  color:"bg-orange-400", val:deepResult.hasCandlePattern ? deepResult.candlePattern : "None" },
                        ].map(({ label, active, color, val }) => (
                          <div key={label} className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center"><SignalDot active={active} color={color} />{label}</span>
                            <span className={active ? `${color.replace("bg-","text-")} font-semibold` : "text-muted-foreground/40"}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border border-border/50 rounded-xl p-4 bg-background/50">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Waves className="w-4 h-4 text-primary" /> Indicators</h4>
                      <MetricRow label="RSI (14)" mono value={<span className={deepResult.rsi < 30 ? "text-emerald-400" : deepResult.rsi > 70 ? "text-rose-400" : "text-foreground"}>{deepResult.rsi}</span>} />
                      <MetricRow label="MACD Histogram" mono value={<span className={deepResult.macdHist > 0 ? "text-emerald-400" : "text-rose-400"}>{deepResult.macdHist > 0 ? "+" : ""}{deepResult.macdHist}</span>} />
                      <MetricRow label="ATR (14)" mono value={deepResult.atr} />
                      <MetricRow label="Premium/Discount" value={<PdBadge zone={deepResult.premiumDiscount} />} />
                      <MetricRow label="DXY Sentiment" value={
                        deepResult.dxySentiment === "BULLISH_USD" ? <span className="text-emerald-400">USD Strong</span> :
                        deepResult.dxySentiment === "BEARISH_USD" ? <span className="text-rose-400">USD Weak</span> :
                        <span className="text-muted-foreground">Neutral</span>
                      } />
                    </div>
                  </div>
                </div>
                {deepResult.signal !== "NEUTRAL" && (
                  <div className="border border-border/50 rounded-xl p-4 bg-background/50">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Key Price Zones</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {deepResult.orderBlockZone && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                          <div className="text-amber-400 font-semibold mb-1">Order Block ({deepResult.orderBlockZone.type})</div>
                          <div className="font-mono text-muted-foreground">{fmtPrice(deepResult.orderBlockZone.low)}</div>
                          <div className="font-mono text-muted-foreground">– {fmtPrice(deepResult.orderBlockZone.high)}</div>
                        </div>
                      )}
                      {deepResult.fvgZone && (
                        <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                          <div className="text-violet-400 font-semibold mb-1">FVG ({deepResult.fvgZone.type})</div>
                          <div className="font-mono text-muted-foreground">{fmtPrice(deepResult.fvgZone.low)}</div>
                          <div className="font-mono text-muted-foreground">– {fmtPrice(deepResult.fvgZone.high)}</div>
                        </div>
                      )}
                      <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
                        <div className="text-rose-400 font-semibold mb-1">Resistance</div>
                        <div className="font-mono text-muted-foreground">{fmtPrice(deepResult.resistanceZone.low)}</div>
                        <div className="font-mono text-muted-foreground">– {fmtPrice(deepResult.resistanceZone.high)}</div>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                        <div className="text-emerald-400 font-semibold mb-1">Support</div>
                        <div className="font-mono text-muted-foreground">{fmtPrice(deepResult.supportZone.low)}</div>
                        <div className="font-mono text-muted-foreground">– {fmtPrice(deepResult.supportZone.high)}</div>
                      </div>
                    </div>
                  </div>
                )}
                {deepResult.signal !== "NEUTRAL" && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={handleSave} className="flex-1 font-bold" size="lg" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Saving..." : "Save Signal"} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

    </div>
  );
}

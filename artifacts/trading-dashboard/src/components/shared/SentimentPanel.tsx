import { cn } from "@/lib/utils";
import { BarChart2, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface RetailSentiment {
  longPct: number;
  shortPct: number;
  volumeBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  strength: "EXTREME" | "STRONG" | "MODERATE" | "WEAK";
  sessionVolumeTrend: "INCREASING" | "DECREASING" | "FLAT";
  recentDelta: number;
}

interface Props {
  sentiment: RetailSentiment;
  pair: string;
  className?: string;
}

const STRENGTH_COLOR: Record<string, string> = {
  EXTREME:  "text-yellow-400",
  STRONG:   "text-primary",
  MODERATE: "text-blue-400",
  WEAK:     "text-muted-foreground",
};

const TREND_COLOR: Record<string, string> = {
  INCREASING: "text-emerald-400",
  DECREASING: "text-rose-400",
  FLAT:       "text-muted-foreground",
};

export function SentimentPanel({ sentiment, pair, className }: Props) {
  const { longPct, shortPct, volumeBias, strength, sessionVolumeTrend, recentDelta } = sentiment;
  const isContrarian = (volumeBias === "BULLISH" && longPct > 70) || (volumeBias === "BEARISH" && shortPct > 70);

  // Gauge arc calculation
  const gaugeAngle = ((longPct - 50) / 50) * 90; // −90° (max bear) to +90° (max bull)
  const needleRad  = (gaugeAngle * Math.PI) / 180;
  const cx = 100, cy = 90, r = 75;
  const needleX = cx + r * Math.sin(needleRad);
  const needleY = cy - r * Math.cos(needleRad);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Gauge + headline */}
      <div className="flex items-start gap-6">
        {/* SVG Gauge */}
        <div className="shrink-0">
          <svg width="200" height="110" viewBox="0 0 200 110" className="overflow-visible">
            {/* Background arc */}
            <path d="M 25 90 A 75 75 0 0 1 175 90" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" strokeLinecap="round" />
            {/* Bear arc */}
            <path d="M 25 90 A 75 75 0 0 1 100 15" fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="14" strokeLinecap="round" />
            {/* Bull arc */}
            <path d="M 100 15 A 75 75 0 0 1 175 90" fill="none" stroke="rgba(16,185,129,0.4)" strokeWidth="14" strokeLinecap="round" />
            {/* POC indicator at 50% */}
            <line x1="100" y1="17" x2="100" y2="10" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

            {/* Needle */}
            <line x1={cx} y1={cy} x2={needleX} y2={needleY}
              stroke={longPct > 55 ? "#10b981" : longPct < 45 ? "#ef4444" : "#94a3b8"}
              strokeWidth="3" strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r="5"
              fill={longPct > 55 ? "#10b981" : longPct < 45 ? "#ef4444" : "#94a3b8"}
            />

            {/* Labels */}
            <text x="18" y="105" fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="monospace">BEAR</text>
            <text x="160" y="105" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="monospace">BULL</text>
          </svg>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3 pt-1">
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Volume Sentiment</div>
            <div className="text-2xl font-bold font-mono">
              <span className="text-emerald-400">{longPct}%</span>
              <span className="text-muted-foreground/40 mx-2 text-base">vs</span>
              <span className="text-rose-400">{shortPct}%</span>
            </div>
            <div className="text-xs text-muted-foreground">{pair} — Long vs Short (vol-weighted)</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", STRENGTH_COLOR[strength],
              strength === "EXTREME" ? "bg-yellow-400/10 border-yellow-400/20" : "bg-primary/5 border-primary/20")}>
              {strength}
            </span>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded border bg-white/5 border-white/10", TREND_COLOR[sessionVolumeTrend])}>
              Vol {sessionVolumeTrend}
            </span>
            {isContrarian && (
              <span className="text-xs font-bold px-2 py-0.5 rounded border bg-yellow-400/10 border-yellow-400/20 text-yellow-400">
                ⚠ Extreme — Contrarian Caution
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bull/Bear bar */}
      <div className="space-y-1">
        <div className="relative h-3 rounded-full overflow-hidden bg-rose-500/20">
          <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${longPct}%` }} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[9px] font-bold text-white/80 drop-shadow">{longPct}% Long</span>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span className="text-emerald-400">🟢 Bull volume</span>
          <span className="text-rose-400">Bear volume 🔴</span>
        </div>
      </div>

      {/* Recent delta */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border/40 rounded-lg p-3 bg-background/30 text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Recent Delta</div>
          <div className={cn("text-base font-bold font-mono",
            recentDelta > 0 ? "text-emerald-400" : recentDelta < 0 ? "text-rose-400" : "text-muted-foreground")}>
            {recentDelta > 0 ? "+" : ""}{recentDelta}
          </div>
          <div className="text-[10px] text-muted-foreground/60">last 10 bars</div>
        </div>
        <div className="border border-border/40 rounded-lg p-3 bg-background/30 text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Volume Trend</div>
          <Activity className={cn("w-4 h-4 mx-auto my-0.5", TREND_COLOR[sessionVolumeTrend])} />
          <div className={cn("text-[10px] font-semibold", TREND_COLOR[sessionVolumeTrend])}>{sessionVolumeTrend}</div>
        </div>
        <div className="border border-border/40 rounded-lg p-3 bg-background/30 text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Bias</div>
          {volumeBias === "BULLISH" ? <TrendingUp className="w-4 h-4 mx-auto my-0.5 text-emerald-400" /> :
           volumeBias === "BEARISH" ? <TrendingDown className="w-4 h-4 mx-auto my-0.5 text-rose-400" /> :
           <BarChart2 className="w-4 h-4 mx-auto my-0.5 text-muted-foreground" />}
          <div className={cn("text-[10px] font-semibold",
            volumeBias === "BULLISH" ? "text-emerald-400" : volumeBias === "BEARISH" ? "text-rose-400" : "text-muted-foreground")}>
            {volumeBias}
          </div>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground/40">
        Volume sentiment is derived from real OHLCV candle data (bull vs bear volume). Not a retail broker poll — reflects actual traded volume direction.
      </div>
    </div>
  );
}

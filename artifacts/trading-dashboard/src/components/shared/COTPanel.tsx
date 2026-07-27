import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface COTCurrencyData {
  currency: string;
  netPosition: number;
  longPct: number;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  reportDate: string;
}

interface COTData {
  currencies: COTCurrencyData[];
  pairBias: "BULLISH" | "BEARISH" | "NEUTRAL";
  reportDate: string;
}

interface Props {
  cot: COTData;
  pair: string;
  className?: string;
}

const BIAS_CONFIG = {
  BULLISH: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", Icon: TrendingUp,  label: "Bullish" },
  BEARISH: { color: "text-rose-400",    bg: "bg-rose-400/10 border-rose-400/20",       Icon: TrendingDown, label: "Bearish" },
  NEUTRAL: { color: "text-slate-400",   bg: "bg-slate-400/10 border-slate-400/20",     Icon: Minus,        label: "Neutral" },
};

const CURRENCY_FLAGS: Record<string, string> = {
  EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CHF: "🇨🇭",
  CAD: "🇨🇦", AUD: "🇦🇺", NZD: "🇳🇿", USD: "🇺🇸",
};

function fmtNet(n: number): string {
  const sign = n > 0 ? "+" : "";
  if (Math.abs(n) >= 100_000) return `${sign}${(n / 1000).toFixed(0)}K`;
  if (Math.abs(n) >= 1_000)   return `${sign}${(n / 1000).toFixed(1)}K`;
  return `${sign}${n}`;
}

export function COTPanel({ cot, pair, className }: Props) {
  const pairCfg = BIAS_CONFIG[cot.pairBias];
  const PairIcon = pairCfg.Icon;

  // Sort: most extreme positioning first
  const sorted = [...cot.currencies].sort((a, b) => Math.abs(b.netPosition) - Math.abs(a.netPosition));

  return (
    <div className={cn("space-y-4", className)}>
      {/* Pair-level COT verdict */}
      <div className={cn("flex items-center justify-between rounded-xl border p-4", pairCfg.bg)}>
        <div className="flex items-center gap-3">
          <PairIcon className={cn("w-5 h-5", pairCfg.color)} />
          <div>
            <div className="text-xs text-muted-foreground">COT Institutional Bias for</div>
            <div className={cn("text-base font-bold font-mono", pairCfg.color)}>{pair} — {pairCfg.label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">Report date</div>
          <div className="text-xs font-mono text-muted-foreground/80">{cot.reportDate || "—"}</div>
        </div>
      </div>

      {/* Per-currency positioning grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {sorted.map(c => {
          const cfg = BIAS_CONFIG[c.bias];
          const Icon = cfg.Icon;
          const barWidth = Math.min(100, c.longPct);
          return (
            <div key={c.currency} className={cn("rounded-lg border p-3 space-y-2", cfg.bg)}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{CURRENCY_FLAGS[c.currency] ?? "🏳️"} {c.currency}</span>
                <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
              </div>
              {/* Long/Short bar */}
              <div className="relative h-2 bg-rose-500/20 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full" style={{ width: `${barWidth}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-emerald-400">L {c.longPct}%</span>
                <span className="text-rose-400">S {100 - c.longPct}%</span>
              </div>
              <div className={cn("text-xs font-bold font-mono text-center", cfg.color)}>{fmtNet(c.netPosition)}</div>
            </div>
          );
        })}
      </div>

      {/* Data source note */}
      <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/50">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>Source: CFTC Traders in Financial Futures (TFF) report. Leveraged Money (hedge funds) positioning. Updated every Friday for the previous Tuesday. <strong className="text-muted-foreground/70">COT signals the big-money directional bias — use it as a macro filter, not an entry trigger.</strong></span>
      </div>
    </div>
  );
}

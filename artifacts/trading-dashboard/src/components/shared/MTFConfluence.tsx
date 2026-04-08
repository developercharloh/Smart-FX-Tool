import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Loader2, Layers } from "lucide-react";

interface TFBias {
  timeframe: string;
  signal: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  trend: string;
  bullPct: number;
}

interface MTFData {
  pair: string;
  timeframes: TFBias[];
  alignment: string;
}

const ALIGNMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  STRONG_BULL: { label: "Strong Bullish Alignment",  color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  MILD_BULL:   { label: "Mild Bullish Alignment",    color: "text-emerald-400", bg: "bg-emerald-500/5  border-emerald-500/20" },
  STRONG_BEAR: { label: "Strong Bearish Alignment",  color: "text-rose-400",    bg: "bg-rose-500/10    border-rose-500/30" },
  MILD_BEAR:   { label: "Mild Bearish Alignment",    color: "text-rose-400",    bg: "bg-rose-500/5     border-rose-500/20" },
  MIXED:       { label: "Mixed — No Clear Bias",     color: "text-slate-400",   bg: "bg-slate-500/10   border-slate-500/30" },
};

function TFCard({ tf }: { tf: TFBias }) {
  const isBuy  = tf.signal === "BUY";
  const isSell = tf.signal === "SELL";
  return (
    <div className={cn(
      "flex-1 min-w-[72px] rounded-xl border p-3 flex flex-col items-center gap-1.5 transition-all",
      isBuy  ? "bg-emerald-500/10 border-emerald-500/30" :
      isSell ? "bg-rose-500/10    border-rose-500/30" :
               "bg-slate-500/10   border-slate-500/30",
    )}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{tf.timeframe}</span>
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center",
        isBuy  ? "bg-emerald-500/20" :
        isSell ? "bg-rose-500/20" : "bg-slate-500/20",
      )}>
        {isBuy  ? <TrendingUp  className="w-5 h-5 text-emerald-400" /> :
         isSell ? <TrendingDown className="w-5 h-5 text-rose-400" />    :
                  <Minus        className="w-5 h-5 text-slate-400" />}
      </div>
      <span className={cn(
        "text-xs font-bold",
        isBuy ? "text-emerald-400" : isSell ? "text-rose-400" : "text-slate-400",
      )}>{tf.signal}</span>
      <div className="w-full h-1 rounded-full bg-black/30 overflow-hidden">
        <div
          className={cn("h-full rounded-full", isBuy ? "bg-emerald-500" : isSell ? "bg-rose-500" : "bg-slate-500")}
          style={{ width: `${tf.confidence}%` }}
        />
      </div>
      <span className="text-[9px] text-muted-foreground/70">{tf.confidence}%</span>
    </div>
  );
}

export function MTFConfluence({ pair }: { pair: string }) {
  const [data, setData]       = useState<MTFData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!pair) return;
    setLoading(true);
    setError(false);
    fetch(`${import.meta.env.BASE_URL}api/signals/mtf-bias`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ pair }),
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [pair]);

  const align = data ? (ALIGNMENT_CONFIG[data.alignment] ?? ALIGNMENT_CONFIG.MIXED) : null;

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold font-mono">Multi-Timeframe Confluence</span>
        </div>
        {align && !loading && (
          <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", align.bg, align.color)}>
            {align.label}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Scanning all timeframes…
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-400 text-center py-4">Failed to load MTF data.</p>
      )}

      {data && !loading && (
        <div className="flex gap-2">
          {data.timeframes.map(tf => <TFCard key={tf.timeframe} tf={tf} />)}
        </div>
      )}

      {data && !loading && (
        <p className="text-[10px] text-muted-foreground/50 text-right">
          Strongest confluence when D1 + H4 + H1 all agree on direction.
        </p>
      )}
    </div>
  );
}

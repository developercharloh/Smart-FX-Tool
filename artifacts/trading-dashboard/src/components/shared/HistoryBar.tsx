import { cn } from "@/lib/utils";
import { History, Trash2, RotateCcw } from "lucide-react";
import type { HistoryEntry } from "@/hooks/useAnalysisHistory";

interface Props {
  history:  HistoryEntry[];
  onReload: (result: any) => void;
  onClear:  () => void;
}

function ago(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function HistoryBar({ history, onReload, onClear }: Props) {
  if (!history.length) return null;

  return (
    <div className="rounded-xl border border-border/30 bg-card/20 px-3 py-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Analyses</span>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-rose-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" /> Clear
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {history.map(entry => {
          const isBuy  = entry.signal === "BUY";
          const isSell = entry.signal === "SELL";
          return (
            <button
              key={entry.id}
              onClick={() => onReload(entry.result)}
              className={cn(
                "flex-shrink-0 flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-all hover:scale-[1.03] active:scale-95",
                isBuy  ? "bg-emerald-500/8  border-emerald-500/25 hover:border-emerald-500/50" :
                isSell ? "bg-rose-500/8     border-rose-500/25    hover:border-rose-500/50" :
                         "bg-slate-500/8    border-slate-500/25   hover:border-slate-500/50",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold font-mono text-foreground">{entry.pair}</span>
                <span className="text-[9px] text-muted-foreground">{entry.timeframe}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-[10px] font-bold",
                  isBuy ? "text-emerald-400" : isSell ? "text-rose-400" : "text-slate-400",
                )}>{entry.signal}</span>
                <span className="text-[9px] text-muted-foreground/60">{entry.confidence}%</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground/40">
                <RotateCcw className="w-2.5 h-2.5" />
                <span className="text-[9px]">{ago(entry.savedAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

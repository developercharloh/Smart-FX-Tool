import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Bucket {
  priceLevel: number;
  volume: number;
  bullVolume: number;
  bearVolume: number;
  isPOC: boolean;
  isHVN: boolean;
  isLVN: boolean;
}

interface Props {
  buckets: Bucket[];
  currentPrice: number;
  decimals?: number;
  className?: string;
}

function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

export function VolumeProfileChart({ buckets, currentPrice, decimals = 5, className }: Props) {
  const sorted = useMemo(() => [...buckets].sort((a, b) => b.priceLevel - a.priceLevel), [buckets]);
  const maxVol = useMemo(() => Math.max(...buckets.map(b => b.volume), 1), [buckets]);
  const totalVol = useMemo(() => buckets.reduce((s, b) => s + b.volume, 0) || 1, [buckets]);

  if (!buckets.length) return (
    <div className="text-xs text-muted-foreground/50 italic p-4 text-center">No volume data available for this instrument</div>
  );

  return (
    <div className={cn("space-y-1", className)}>
      {sorted.map((b, i) => {
        const barPct    = (b.volume / maxVol) * 100;
        const bullPct   = b.volume > 0 ? (b.bullVolume / b.volume) * 100 : 50;
        const isAbove   = b.priceLevel > currentPrice;
        const isCurrent = Math.abs(b.priceLevel - currentPrice) < (sorted[0].priceLevel - sorted[sorted.length - 1].priceLevel) / sorted.length;

        return (
          <div key={i} className={cn(
            "flex items-center gap-2 group transition-opacity",
            b.isLVN && "opacity-60"
          )}>
            {/* Price label */}
            <div className={cn(
              "text-[10px] font-mono w-[60px] shrink-0 text-right",
              b.isPOC ? "text-yellow-400 font-bold" :
              isCurrent ? "text-primary font-semibold" :
              isAbove ? "text-rose-400/70" : "text-emerald-400/70"
            )}>
              {b.priceLevel.toFixed(decimals)}
            </div>

            {/* Bar */}
            <div className="flex-1 relative h-4 bg-white/[0.03] rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-300"
                style={{
                  width: `${barPct}%`,
                  background: b.isPOC
                    ? "linear-gradient(90deg, rgba(234,179,8,0.7), rgba(234,179,8,0.3))"
                    : `linear-gradient(90deg, rgba(16,185,129,${0.3 + bullPct/200}) ${bullPct}%, rgba(239,68,68,${0.3 + (100-bullPct)/200}) ${bullPct}%)`,
                }}
              />
              {/* Current price indicator */}
              {isCurrent && (
                <div className="absolute inset-0 border border-primary/60 rounded-sm pointer-events-none" />
              )}
            </div>

            {/* Volume label + badges */}
            <div className="flex items-center gap-1 w-[72px] shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground">{fmtVol(b.volume)}</span>
              {b.isPOC && <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 px-1 rounded">POC</span>}
              {b.isHVN && !b.isPOC && <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-1 rounded">HVN</span>}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-400 inline-block" />POC — Point of Control (most traded)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />HVN — High Value Node</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />Bull vol</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-400 inline-block" />Bear vol</span>
      </div>
    </div>
  );
}

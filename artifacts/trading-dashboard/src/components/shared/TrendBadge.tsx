import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { SignalTrend } from "@workspace/api-client-react";

interface TrendBadgeProps {
  trend: string;
  className?: string;
}

export function TrendBadge({ trend, className }: TrendBadgeProps) {
  if (trend === SignalTrend.BULLISH) {
    return (
      <div className={cn("flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20", className)}>
        <ArrowUpRight className="w-3 h-3" />
        BULLISH
      </div>
    );
  }
  
  if (trend === SignalTrend.BEARISH) {
    return (
      <div className={cn("flex items-center gap-1 text-xs font-semibold text-rose-500 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20", className)}>
        <ArrowDownRight className="w-3 h-3" />
        BEARISH
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-500/10 px-2 py-1 rounded border border-slate-500/20", className)}>
      <Minus className="w-3 h-3" />
      NEUTRAL
    </div>
  );
}

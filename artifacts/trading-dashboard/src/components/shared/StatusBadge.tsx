import { cn } from "@/lib/utils";
import { SignalStatus } from "@workspace/api-client-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorClasses = "bg-slate-500/10 text-slate-400 border-slate-500/20";
  let label = status;

  switch (status) {
    case SignalStatus.ACTIVE:
      colorClasses = "bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(0,255,255,0.2)]";
      break;
    case SignalStatus.HIT_TP:
      colorClasses = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      label = "HIT TP";
      break;
    case SignalStatus.HIT_SL:
      colorClasses = "bg-rose-500/10 text-rose-500 border-rose-500/20";
      label = "HIT SL";
      break;
    case SignalStatus.EXPIRED:
      colorClasses = "bg-amber-500/10 text-amber-500 border-amber-500/20";
      break;
  }

  return (
    <span className={cn("px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border", colorClasses, className)}>
      {label}
    </span>
  );
}

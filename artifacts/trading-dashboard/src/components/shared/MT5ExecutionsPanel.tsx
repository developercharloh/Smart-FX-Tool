import { useMT5Executions, useCancelMT5, type MT5Execution, type MT5ExecutionStatus } from "@/hooks/useMT5";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, Clock, Zap, XCircle, AlertCircle, RefreshCw } from "lucide-react";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MT5ExecutionStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  approved:   { label: "Queued",     color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/25",   icon: Clock },
  picked_up:  { label: "Sending…",   color: "text-amber-400 bg-amber-400/10 border-amber-400/25", icon: RefreshCw },
  executed:   { label: "Executed",   color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25", icon: CheckCircle2 },
  failed:     { label: "Failed",     color: "text-rose-400 bg-rose-400/10 border-rose-400/25",   icon: XCircle },
  cancelled:  { label: "Cancelled",  color: "text-slate-400 bg-slate-400/10 border-slate-400/20", icon: AlertCircle },
};

function fmtPrice(n: number | null) {
  if (n == null) return "—";
  return n >= 100 ? n.toFixed(2) : n >= 1 ? n.toFixed(4) : n.toFixed(5);
}

function StatusBadge({ status }: { status: MT5ExecutionStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border", cfg.color)}>
      <Icon className={cn("w-3 h-3", status === "picked_up" && "animate-spin")} />
      {cfg.label}
    </span>
  );
}

function ExecutionRow({ exec }: { exec: MT5Execution }) {
  const cancel = useCancelMT5();
  const canCancel = exec.status === "approved";
  const isBuy = exec.signal === "BUY";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      className="rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      {/* Signal badge */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          style={isBuy
            ? { background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }
            : { background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }
          }
          className="font-mono text-sm font-bold px-2.5 py-1 rounded-[7px] shrink-0"
        >
          {exec.signal}
        </span>
        <span className="font-mono font-bold text-white text-sm">{exec.pair}</span>
        <span className="text-slate-600 text-xs font-mono">{exec.timeframe}</span>
      </div>

      {/* Prices */}
      <div className="flex items-center gap-4 text-xs font-mono flex-wrap sm:ml-4">
        <span className="text-slate-500">Entry <span className="text-slate-300">{fmtPrice(exec.entry)}</span></span>
        <span className="text-rose-400/80">SL <span className="text-rose-400">{fmtPrice(exec.stopLoss)}</span></span>
        <span className="text-emerald-400/80">TP <span className="text-emerald-400">{fmtPrice(exec.takeProfit)}</span></span>
        {exec.eaLots != null && (
          <span className="text-slate-500">Lots <span className="text-slate-300">{exec.eaLots.toFixed(2)}</span></span>
        )}
        {exec.eaTicket != null && (
          <span className="text-slate-500">#{exec.eaTicket}</span>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:ml-auto shrink-0">
        <StatusBadge status={exec.status} />
        {exec.eaError && (
          <span className="text-[10px] text-rose-400/70 max-w-[140px] truncate" title={exec.eaError}>
            {exec.eaError}
          </span>
        )}
        {canCancel && (
          <button
            onClick={() => cancel.mutate(exec.id)}
            disabled={cancel.isPending}
            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all disabled:opacity-40"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function MT5ExecutionsPanel() {
  const { data: executions, isLoading } = useMT5Executions();

  if (isLoading) return null;
  if (!executions || executions.length === 0) return null;

  const active  = executions.filter(e => ["approved", "picked_up"].includes(e.status));
  const history = executions.filter(e => !["approved", "picked_up"].includes(e.status)).slice(0, 10);

  return (
    <div
      style={{
        background: "rgba(11,15,25,0.7)",
        border: "1px solid rgba(0,255,255,0.1)",
        backdropFilter: "blur(16px)",
      }}
      className="rounded-[16px] p-5 space-y-4"
    >
      <div className="flex items-center gap-2">
        <div
          style={{ background: "rgba(0,255,255,0.06)", border: "1px solid rgba(0,255,255,0.15)" }}
          className="w-8 h-8 rounded-[8px] flex items-center justify-center"
        >
          <Zap className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">MT5 Executions</h3>
          <p className="text-xs text-slate-500">Live status from your Expert Advisor</p>
        </div>
        {active.length > 0 && (
          <span
            style={{ background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.2)" }}
            className="ml-auto text-[11px] font-bold text-cyan-400 px-2.5 py-1 rounded-full"
          >
            {active.length} pending
          </span>
        )}
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Awaiting EA</p>
          {active.map(e => <ExecutionRow key={e.id} exec={e} />)}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Recent History</p>
          {history.map(e => <ExecutionRow key={e.id} exec={e} />)}
        </div>
      )}
    </div>
  );
}

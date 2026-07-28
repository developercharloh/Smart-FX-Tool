import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ChevronRight, CheckCircle2, ShieldAlert, Copy, ChevronDown, ChevronUp, Check, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { Signal } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendBadge } from "./TrendBadge";
import { StatusBadge } from "./StatusBadge";
import { ExecuteTradeModal } from "./ExecuteTradeModal";

interface SignalCardProps {
  signal: Signal;
  detailed?: boolean;
  className?: string;
}

export function SignalCard({ signal, detailed = false, className }: SignalCardProps) {
  const isBuy = signal.signal === "BUY";
  const [copied, setCopied] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [showExecute, setShowExecute] = useState(false);

  const allReasons = [
    ...(signal.hasOrderBlock ? ["Valid Order Block present at entry zone"] : []),
    ...(signal.hasSupportResistance ? ["Key Support/Resistance level aligned"] : []),
    ...signal.reasons,
  ];

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    const text = [
      `${signal.pair} ${signal.signal} @ ${signal.entry.toFixed(5)}`,
      `SL: ${signal.stopLoss.toFixed(5)}`,
      `TP: ${signal.takeProfit.toFixed(5)}`,
      `R:R 1:${signal.riskRewardRatio.toFixed(1)} | Confidence: ${signal.confidenceScore}%`,
      `Timeframe: ${signal.timeframe}`,
    ].join(" | ");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const conf = signal.confidenceScore;
  const confColor = conf >= 80 ? "#3B82F6" : conf >= 65 ? "#10B981" : "#F59E0B";
  const circleCircumference = 2 * Math.PI * 18;
  const circleDash = (conf / 100) * circleCircumference;

  return (
    <div
      className={cn("rounded-[14px] overflow-hidden transition-all duration-200 hover:translate-y-[-1px] group", className)}
      style={{
        background: "hsl(var(--card))",
        border: `1px solid ${isBuy ? "rgba(16,185,129,0.18)" : "rgba(239,68,68,0.18)"}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
      }}
    >
      {/* Direction accent bar */}
      <div
        className="h-[3px] w-full"
        style={{ background: isBuy ? "linear-gradient(90deg,#10B981,#059669)" : "linear-gradient(90deg,#EF4444,#DC2626)" }}
      />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {/* Direction icon */}
            <div
              className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
              style={{
                background: isBuy ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${isBuy ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}
            >
              {isBuy
                ? <TrendingUp className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
                : <TrendingDown className="w-4 h-4 text-red-400" strokeWidth={2.5} />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-extrabold font-mono text-foreground tracking-tight">{signal.pair}</span>
                <StatusBadge status={signal.status} />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-[11px] font-bold tracking-wide"
                  style={{ color: isBuy ? "#10B981" : "#EF4444" }}
                >{signal.signal}</span>
                <span className="text-muted-foreground/40 text-[11px]">·</span>
                <span className="text-[11px] text-muted-foreground/50 font-mono">{signal.timeframe}</span>
              </div>
            </div>
          </div>

          {/* Circular confidence gauge */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-11 h-11">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                <circle
                  cx="22" cy="22" r="18" fill="none"
                  stroke={confColor}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${circleDash} ${circleCircumference}`}
                  style={{ filter: `drop-shadow(0 0 4px ${confColor}90)` }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-extrabold text-foreground">{conf}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Entry / SL / TP row */}
        <div
          className="grid grid-cols-3 gap-2 mb-3 rounded-[9px] p-2.5"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          {[
            { label: "Entry", value: signal.entry.toFixed(5), color: "text-foreground/80" },
            { label: "Stop Loss", value: signal.stopLoss.toFixed(5), color: "text-red-400" },
            { label: "Take Profit", value: signal.takeProfit.toFixed(5), color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50 mb-1">{label}</div>
              <div className={cn("text-[11px] font-mono font-bold", color)}>{value}</div>
            </div>
          ))}
        </div>

        {/* R:R + copy */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-[5px]"
              style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.2)" }}
            >
              R:R {signal.riskRewardRatio.toFixed(1)}x
            </span>
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground/60 border-border/40 h-5">
              {signal.timeframe}
            </Badge>
          </div>
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-[5px] transition-all",
              copied
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 border"
                : "text-muted-foreground/50 hover:text-muted-foreground border border-transparent hover:border-border/50"
            )}
          >
            {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Detailed mode extras */}
        {detailed && (
          <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2">
              <TrendBadge trend={signal.trend} />
              {signal.structureType !== "NONE" && (
                <Badge variant="secondary" className="bg-primary/8 text-primary border-primary/20 text-[10px]">
                  {signal.structureType === "BOS" ? "Break of Structure" : "Change of Character"}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Collapsible reasons */}
        {allReasons.length > 0 && (
          <div className="mt-2.5">
            <button
              onClick={e => { e.preventDefault(); setShowReasons(v => !v); }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-primary transition-colors"
            >
              {showReasons ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showReasons ? "Hide" : "View"} {allReasons.length} confluence factors
            </button>
            {showReasons && (
              <ul className="mt-2 space-y-1.5">
                {allReasons.map((reason, i) => (
                  <li key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                    <CheckCircle2 className="w-3 h-3 text-primary/70 shrink-0" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!detailed && (
        <div
          className="px-4 py-2.5 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.15)" }}
        >
          <span className="text-[10.5px] text-muted-foreground/40">
            {format(new Date(signal.createdAt), "MMM d, HH:mm")}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.preventDefault(); setShowExecute(true); }}
              className={cn(
                "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-[6px] transition-all",
                isBuy
                  ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20"
                  : "bg-red-500/12 text-red-400 border border-red-500/25 hover:bg-red-500/20"
              )}
            >
              <Zap className="w-2.5 h-2.5" />
              Execute
            </button>
            <Link href={`/signals/${signal.id}`}
              className="text-[11px] font-medium text-primary/70 flex items-center gap-0.5 hover:text-primary transition-colors"
            >
              Analyse <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}

      {showExecute && (
        <ExecuteTradeModal signal={signal} onClose={() => setShowExecute(false)} />
      )}
    </div>
  );
}

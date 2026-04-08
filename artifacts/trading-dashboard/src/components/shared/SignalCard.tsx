import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ChevronRight, CheckCircle2, ShieldAlert, Copy, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Signal } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { TrendBadge } from "./TrendBadge";
import { StatusBadge } from "./StatusBadge";

interface SignalCardProps {
  signal: Signal;
  detailed?: boolean;
  className?: string;
}

export function SignalCard({ signal, detailed = false, className }: SignalCardProps) {
  const isBuy = signal.signal === "BUY";
  const [copied, setCopied] = useState(false);
  const [showReasons, setShowReasons] = useState(false);

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

  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 group overflow-hidden", className)}>
      <div className={cn("h-1 w-full opacity-80", isBuy ? "bg-emerald-500" : "bg-rose-500")} />

      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-bold font-mono tracking-tight">{signal.pair}</h3>
              <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-muted-foreground/30">
                {signal.timeframe}
              </Badge>
              <StatusBadge status={signal.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-bold tracking-wider", isBuy ? "text-emerald-500" : "text-rose-500")}>
                {signal.signal}
              </span>
              <span className="text-xs text-muted-foreground">@ {signal.entry.toFixed(5)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ConfidenceGauge score={signal.confidenceScore} size={detailed ? "lg" : "md"} />
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border transition-all",
                copied
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                  : "bg-secondary/50 border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
              )}
              title="Copy trade details"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {detailed && (
          <div className="flex items-center gap-2 mt-4">
            <TrendBadge trend={signal.trend} />
            {signal.structureType !== "NONE" && (
              <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20">
                {signal.structureType === "BOS" ? "Break of Structure" : "Change of Character"}
              </Badge>
            )}
            <Badge variant="outline" className="font-mono bg-card">
              R:R 1:{signal.riskRewardRatio.toFixed(1)}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Take Profit</div>
            <div className="font-mono text-emerald-500 font-medium">{signal.takeProfit.toFixed(5)}</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Stop Loss</div>
            <div className="font-mono text-rose-500 font-medium">{signal.stopLoss.toFixed(5)}</div>
          </div>
        </div>

        {detailed ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Technical Confluence
              </div>
              <ul className="space-y-2 mt-3">
                {allReasons.map((reason, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : allReasons.length > 0 ? (
          <div>
            <button
              onClick={(e) => { e.preventDefault(); setShowReasons(v => !v); }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              {showReasons ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showReasons ? "Hide" : "View"} {allReasons.length} reasons
            </button>
            {showReasons && (
              <ul className="mt-2 space-y-1.5">
                {allReasons.map((reason, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </CardContent>

      {!detailed && (
        <>
          <Separator className="bg-border/50" />
          <CardFooter className="py-3 px-6 flex justify-between items-center bg-card/30">
            <span className="text-xs text-muted-foreground">
              {format(new Date(signal.createdAt), "MMM d, HH:mm")}
            </span>
            <Link href={`/signals/${signal.id}`} className="text-xs font-medium text-primary flex items-center gap-1 group-hover:underline">
              View Analysis <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

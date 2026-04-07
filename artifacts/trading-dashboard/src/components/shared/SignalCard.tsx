import { Link } from "wouter";
import { format } from "date-fns";
import { ChevronRight, CheckCircle2, ShieldAlert } from "lucide-react";
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
  
  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 group overflow-hidden", className)}>
      <div className={cn(
        "h-1 w-full",
        isBuy ? "bg-emerald-500" : "bg-rose-500",
        "opacity-80"
      )} />
      
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
              <span className={cn(
                "text-sm font-bold tracking-wider",
                isBuy ? "text-emerald-500" : "text-rose-500"
              )}>
                {signal.signal}
              </span>
              <span className="text-xs text-muted-foreground">@ {signal.entry.toFixed(5)}</span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <ConfidenceGauge score={signal.confidenceScore} size={detailed ? "lg" : "md"} />
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

        {detailed && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground border-b border-border/50 pb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Technical Confluence
              </div>
              <ul className="space-y-2 mt-3">
                {signal.hasOrderBlock && (
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Valid Order Block present at entry zone</span>
                  </li>
                )}
                {signal.hasSupportResistance && (
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>Key Support/Resistance level aligned</span>
                  </li>
                )}
                {signal.reasons.map((reason, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
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

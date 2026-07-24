import { useParams, Link } from "wouter";
import { useGetSignal } from "@workspace/api-client-react";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Target, ShieldAlert, BarChart3, Clock, AlertTriangle, Layers, Crosshair } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function SignalDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data: signal, isLoading, error } = useGetSignal(id, { query: { enabled: !!id } });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <div className="text-destructive font-mono uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Signal Not Found
        </div>
        <Link href="/signals">
          <Button variant="outline" className="font-mono text-xs uppercase">Return to Database</Button>
        </Link>
      </div>
    );
  }

  const isBuy = signal.signal === "BUY";
  const pipsSL = Math.abs(signal.entry - signal.stopLoss) * 10000; // rough approximation for display
  const pipsTP = Math.abs(signal.takeProfit - signal.entry) * 10000;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Link href="/signals">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-mono tracking-tight">{signal.pair}</h1>
            <span className={cn(
              "px-3 py-1 text-xs font-bold rounded-sm uppercase tracking-widest",
              isBuy ? "bg-chart-2/20 text-chart-2" : "bg-destructive/20 text-destructive"
            )}>
              {signal.signal}
            </span>
            <span className="px-2 py-1 text-xs bg-secondary text-muted-foreground font-mono rounded-sm">
              {signal.timeframe}
            </span>
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-2 uppercase tracking-widest">
            ID: {signal.id.toString().padStart(6, '0')} // Issued: {format(new Date(signal.createdAt), "MMM dd, yyyy HH:mm 'UTC'")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Levels */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 bg-card/40 border-border/50">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2 mb-6">
              <Crosshair className="w-4 h-4" /> Trade Parameters
            </h2>
            
            <div className="relative pt-8 pb-4 px-4">
              {/* Visual RR Line */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-secondary -translate-y-1/2 rounded-full overflow-hidden flex">
                {isBuy ? (
                  <>
                    <div className="h-full bg-destructive/50" style={{ flex: 1 }} />
                    <div className="h-full bg-chart-2/50" style={{ flex: signal.riskRewardRatio }} />
                  </>
                ) : (
                  <>
                    <div className="h-full bg-chart-2/50" style={{ flex: signal.riskRewardRatio }} />
                    <div className="h-full bg-destructive/50" style={{ flex: 1 }} />
                  </>
                )}
              </div>
              
              <div className="relative flex justify-between items-center z-10 font-mono text-sm">
                <div className="flex flex-col items-center gap-2 bg-background p-2 rounded-sm border border-border shadow-md">
                  <span className="text-[10px] uppercase text-muted-foreground tracking-widest">Stop Loss</span>
                  <span className="text-destructive font-bold">{signal.stopLoss}</span>
                </div>
                
                <div className="flex flex-col items-center gap-2 bg-background p-2 border-2 border-primary rounded-sm shadow-[0_0_15px_var(--primary)] shadow-primary/20">
                  <span className="text-[10px] uppercase text-primary tracking-widest">Entry</span>
                  <span className="font-bold text-lg">{signal.entry}</span>
                </div>
                
                <div className="flex flex-col items-center gap-2 bg-background p-2 rounded-sm border border-border shadow-md">
                  <span className="text-[10px] uppercase text-muted-foreground tracking-widest">Take Profit</span>
                  <span className="text-chart-2 font-bold">{signal.takeProfit}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border/50">
              <div className="text-center font-mono">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Risk / Reward</div>
                <div className="text-xl font-bold text-primary">1 : {signal.riskRewardRatio.toFixed(2)}</div>
              </div>
              <div className="text-center font-mono">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Status</div>
                <div className={cn(
                  "text-xl font-bold",
                  signal.status === "ACTIVE" ? "text-chart-4" : 
                  signal.status === "HIT_TP" ? "text-chart-2" :
                  signal.status === "HIT_SL" ? "text-destructive" :
                  "text-muted-foreground"
                )}>
                  {signal.status.replace('_', ' ')}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/40 border-border/50">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4" /> SMC Logic & Confluence
            </h2>
            <div className="space-y-4 font-mono text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-background border border-border rounded-sm">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Structure</div>
                  <div className="font-bold">{signal.structureType}</div>
                </div>
                <div className="p-3 bg-background border border-border rounded-sm">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">HTF Trend</div>
                  <div className={cn(
                    "font-bold flex items-center gap-2",
                    signal.trend === "BULLISH" ? "text-chart-2" : signal.trend === "BEARISH" ? "text-destructive" : ""
                  )}>
                    {signal.trend}
                    {signal.trend === "BULLISH" && <TrendingUp className="w-4 h-4" />}
                    {signal.trend === "BEARISH" && <TrendingDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <span className={cn(
                  "px-3 py-1.5 rounded-sm text-xs font-bold uppercase",
                  signal.hasOrderBlock ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"
                )}>
                  {signal.hasOrderBlock ? "Order Block Present" : "No OB Confluence"}
                </span>
                <span className={cn(
                  "px-3 py-1.5 rounded-sm text-xs font-bold uppercase",
                  signal.hasSupportResistance ? "bg-chart-4/20 text-chart-4 border border-chart-4/30" : "bg-secondary text-muted-foreground"
                )}>
                  {signal.hasSupportResistance ? "S/R Zone Match" : "No S/R Confluence"}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Data */}
        <div className="space-y-6">
          <Card className="p-6 bg-card/40 border-border/50">
            <div className="text-center mb-6">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Algorithm Confidence</div>
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-secondary" />
                  <circle 
                    cx="64" cy="64" r="56" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="none" 
                    className="text-primary transition-all duration-1000 ease-out"
                    strokeDasharray={351.8}
                    strokeDashoffset={351.8 - (351.8 * signal.confidenceScore) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold font-mono">{signal.confidenceScore}<span className="text-sm">%</span></span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground border-b border-border pb-2 mb-3">Reasoning Nodes</h3>
              <ul className="space-y-2">
                {signal.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-mono text-foreground/80 bg-background/50 p-2 rounded-sm border border-border/30">
                    <span className="text-primary mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

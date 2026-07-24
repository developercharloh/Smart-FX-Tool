import { useState } from "react";
import { useListPairs, useAnalyzeSignal, useCreateSignal } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Cpu, Zap, Activity, Loader2, ArrowRight, ShieldAlert, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Analyze() {
  const [pair, setPair] = useState("");
  const [timeframe, setTimeframe] = useState("1H");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: pairs } = useListPairs();
  const analyzeMut = useAnalyzeSignal();
  const createMut = useCreateSignal();

  const handleAnalyze = () => {
    if (!pair) return;
    analyzeMut.mutate({ data: { pair, timeframe } });
  };

  const handleSaveSignal = () => {
    const res = analyzeMut.data;
    if (!res || res.signal === "NEUTRAL") return;

    createMut.mutate(
      {
        data: {
          pair: res.pair,
          signal: res.signal as "BUY" | "SELL",
          timeframe: res.timeframe,
          entry: res.entry,
          stopLoss: res.stopLoss,
          takeProfit: res.takeProfit,
          confidenceScore: res.confidenceScore,
          reasons: res.reasons,
          structureType: res.structureType,
          trend: res.trend,
          hasOrderBlock: res.hasOrderBlock,
          hasSupportResistance: res.hasSupportResistance,
          riskRewardRatio: res.riskRewardRatio,
        }
      },
      {
        onSuccess: (newSignal) => {
          toast({ title: "Signal Created", description: `Saved signal for ${newSignal.pair}` });
          setLocation(`/signals/${newSignal.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save signal", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-widest uppercase flex items-center gap-2">
          <Cpu className="w-6 h-6 text-primary" />
          Quantum Analysis
        </h1>
        <p className="text-muted-foreground text-sm font-mono mt-1 uppercase">Live Market Structure & Liquidity Scan</p>
      </div>

      <Card className="p-6 bg-card/40 border-border/50">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Select Pair</label>
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger className="font-mono h-12 bg-background border-border">
                <SelectValue placeholder="WAITING FOR INPUT..." />
              </SelectTrigger>
              <SelectContent>
                {pairs?.map(p => (
                  <SelectItem key={p.symbol} value={p.symbol}>{p.symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-48 space-y-2">
            <label className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Timeframe</label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="font-mono h-12 bg-background border-border">
                <SelectValue placeholder="TF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">15m (SCALP)</SelectItem>
                <SelectItem value="1H">1H (INTRADAY)</SelectItem>
                <SelectItem value="4H">4H (SWING)</SelectItem>
                <SelectItem value="1D">1D (POSITION)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleAnalyze} 
            disabled={!pair || analyzeMut.isPending}
            className="h-12 px-8 uppercase tracking-widest font-bold font-mono group"
          >
            {analyzeMut.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Initialize Scan <Zap className="w-4 h-4 ml-2 group-hover:text-chart-4 transition-colors" />
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Analysis Output */}
      {analyzeMut.isPending && (
        <Card className="p-12 bg-background/50 border-border border-dashed flex flex-col items-center justify-center space-y-6">
          <Activity className="w-12 h-12 text-primary animate-pulse" />
          <div className="font-mono text-sm uppercase tracking-widest text-primary animate-pulse text-center space-y-2">
            <div>Calculating Liquidity Voids...</div>
            <div>Identifying Order Blocks...</div>
            <div>Mapping Market Structure...</div>
          </div>
        </Card>
      )}

      {analyzeMut.data && !analyzeMut.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6 bg-card border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.05)]">
              <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold font-mono tracking-tight">{analyzeMut.data.pair}</h2>
                  <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">
                    {analyzeMut.data.timeframe} • Live Analysis Complete
                  </div>
                </div>
                <div className={cn(
                  "px-4 py-2 text-lg font-bold rounded-sm uppercase tracking-widest flex items-center gap-2",
                  analyzeMut.data.signal === "BUY" ? "bg-chart-2/20 text-chart-2 border border-chart-2/30" : 
                  analyzeMut.data.signal === "SELL" ? "bg-destructive/20 text-destructive border border-destructive/30" : 
                  "bg-muted text-muted-foreground border border-border"
                )}>
                  {analyzeMut.data.signal}
                </div>
              </div>

              {analyzeMut.data.signal !== "NEUTRAL" ? (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="p-4 bg-background border border-border rounded-sm text-center">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Entry</div>
                      <div className="font-mono font-bold text-lg">{analyzeMut.data.entry}</div>
                    </div>
                    <div className="p-4 bg-background border border-border rounded-sm text-center relative overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-destructive/50" />
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Stop Loss</div>
                      <div className="font-mono font-bold text-lg text-destructive">{analyzeMut.data.stopLoss}</div>
                    </div>
                    <div className="p-4 bg-background border border-border rounded-sm text-center relative overflow-hidden">
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-chart-2/50" />
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Take Profit</div>
                      <div className="font-mono font-bold text-lg text-chart-2">{analyzeMut.data.takeProfit}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">Key Zones</h3>
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between p-2 bg-secondary/30 rounded-sm">
                          <span className="text-muted-foreground">Resistance:</span>
                          <span>{analyzeMut.data.resistanceZone.high} - {analyzeMut.data.resistanceZone.low}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-secondary/30 rounded-sm">
                          <span className="text-muted-foreground">Support:</span>
                          <span>{analyzeMut.data.supportZone.high} - {analyzeMut.data.supportZone.low}</span>
                        </div>
                        {analyzeMut.data.orderBlockZone && (
                          <div className={cn(
                            "flex justify-between p-2 rounded-sm border",
                            analyzeMut.data.orderBlockZone.type === "BULLISH" ? "bg-chart-2/10 border-chart-2/20 text-chart-2" : "bg-destructive/10 border-destructive/20 text-destructive"
                          )}>
                            <span>OB ({analyzeMut.data.orderBlockZone.type}):</span>
                            <span>{analyzeMut.data.orderBlockZone.high} - {analyzeMut.data.orderBlockZone.low}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">SMC Factors</h3>
                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-muted-foreground w-20">Structure:</span>
                          <span className="font-bold">{analyzeMut.data.structureType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-muted-foreground w-20">Trend:</span>
                          <span className="font-bold">{analyzeMut.data.trend}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-muted-foreground w-20">Risk/Reward:</span>
                          <span className="font-bold">1:{analyzeMut.data.riskRewardRatio.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <ShieldAlert className="w-12 h-12 text-muted-foreground" />
                  <p className="font-mono text-sm text-muted-foreground max-w-md">
                    Market conditions do not meet the strict criteria required for a valid setup. 
                    Price action is chopping or liquidity has not been cleanly swept.
                  </p>
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6 bg-card/40 border-border/50">
              <div className="text-center mb-6">
                <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Setup Confidence</div>
                <div className="text-5xl font-mono font-bold text-primary">
                  {analyzeMut.data.confidenceScore}<span className="text-xl">%</span>
                </div>
              </div>
              
              <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground border-b border-border pb-2 mb-3">Execution Logic</h3>
              <ul className="space-y-2 mb-8">
                {analyzeMut.data.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-mono text-foreground/80">
                    <ArrowRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>

              <Button 
                onClick={handleSaveSignal} 
                disabled={analyzeMut.data.signal === "NEUTRAL" || createMut.isPending}
                className="w-full h-12 uppercase tracking-widest font-bold font-mono"
              >
                {createMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deploy Signal"}
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

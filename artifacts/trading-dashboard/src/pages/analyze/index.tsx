import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAnalyzeSignal, useListPairs, useCreateSignal } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Zap, Activity, ShieldAlert, ArrowRight } from "lucide-react";
import { ConfidenceGauge } from "@/components/shared/ConfidenceGauge";
import { TrendBadge } from "@/components/shared/TrendBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  pair: z.string().min(1, "Please select a pair"),
  timeframe: z.string().min(1, "Please select a timeframe"),
});

export default function Analyze() {
  const { data: pairs } = useListPairs();
  const analyzeMutation = useAnalyzeSignal();
  const createMutation = useCreateSignal();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pair: "",
      timeframe: "H1",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    analyzeMutation.mutate({ data: values }, {
      onError: () => {
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: "Could not complete live analysis. Please try again."
        });
      }
    });
  };

  const handleSave = () => {
    if (!analyzeMutation.data) return;
    
    const result = analyzeMutation.data;
    
    if (result.signal === "NEUTRAL") {
      toast({
        variant: "destructive",
        title: "Cannot save neutral signal",
        description: "Only BUY or SELL signals can be saved."
      });
      return;
    }
    
    createMutation.mutate({
      data: {
        pair: result.pair,
        signal: result.signal as any,
        timeframe: result.timeframe,
        entry: result.entry,
        stopLoss: result.stopLoss,
        takeProfit: result.takeProfit,
        confidenceScore: result.confidenceScore,
        reasons: result.reasons,
        structureType: result.structureType,
        trend: result.trend,
        hasOrderBlock: result.hasOrderBlock,
        hasSupportResistance: result.hasSupportResistance,
        riskRewardRatio: result.riskRewardRatio,
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Signal Saved",
          description: "The analyzed signal has been added to your dashboard."
        });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save signal. Please try again."
        });
      }
    });
  };

  const result = analyzeMutation.data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Live Analyze</h1>
        <p className="text-muted-foreground mt-1">Run institutional-grade technical analysis on any pair instantly.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Parameters
              </CardTitle>
              <CardDescription>Select instrument and timeframe for analysis.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="pair"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Forex Pair</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background border-border/50 font-mono">
                              <SelectValue placeholder="Select pair" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pairs?.map(p => (
                              <SelectItem key={p.symbol} value={p.symbol}>{p.symbol}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeframe"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Timeframe</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background border-border/50 font-mono">
                              <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M15">M15</SelectItem>
                            <SelectItem value="H1">H1</SelectItem>
                            <SelectItem value="H4">H4</SelectItem>
                            <SelectItem value="D1">D1</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full gap-2" disabled={analyzeMutation.isPending}>
                    {analyzeMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Activity className="w-4 h-4 animate-spin" /> Analyzing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Run Analysis
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          {result ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-t-2 border-t-primary shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                <Zap className="w-32 h-32" />
              </div>
              <CardHeader className="pb-4 relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-2xl font-bold font-mono tracking-tight">{result.pair}</h3>
                      <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary bg-primary/5">
                        {result.timeframe} LIVE
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-lg font-bold tracking-wider px-2 py-0.5 rounded",
                        result.signal === "BUY" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : 
                        result.signal === "SELL" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : 
                        "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      )}>
                        {result.signal}
                      </span>
                      {result.signal !== "NEUTRAL" && (
                        <span className="text-sm font-mono text-muted-foreground">ENTRY: <span className="text-foreground">{result.entry.toFixed(5)}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <ConfidenceGauge score={result.confidenceScore} size="lg" />
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <TrendBadge trend={result.trend} />
                  {result.structureType !== "NONE" && (
                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20">
                      {result.structureType === "BOS" ? "Break of Structure" : "Change of Character"}
                    </Badge>
                  )}
                  {result.signal !== "NEUTRAL" && (
                    <Badge variant="outline" className="font-mono bg-card">
                      R:R 1:{result.riskRewardRatio.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10">
                {result.signal !== "NEUTRAL" && (
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500"></div>
                      <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Take Profit Target</div>
                      <div className="font-mono text-xl text-emerald-500 font-bold">{result.takeProfit.toFixed(5)}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        +{(Math.abs(result.takeProfit - result.entry) * 10000).toFixed(1)} pips
                      </div>
                    </div>
                    <div className="bg-rose-500/5 rounded-lg p-4 border border-rose-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-1 h-full bg-rose-500"></div>
                      <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Stop Loss Level</div>
                      <div className="font-mono text-xl text-rose-500 font-bold">{result.stopLoss.toFixed(5)}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        -{(Math.abs(result.entry - result.stopLoss) * 10000).toFixed(1)} pips
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4 border border-border/50 rounded-xl p-4 bg-background/50">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-primary" /> Technical Confluence
                    </h4>
                    <ul className="space-y-3">
                      {result.reasons.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-snug">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="border border-border/50 rounded-xl p-4 bg-background/50">
                      <h4 className="text-sm font-semibold text-foreground mb-3">Key Price Zones</h4>
                      <div className="space-y-3">
                        {result.orderBlockZone && (
                          <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                            <span className="text-muted-foreground font-medium">Order Block ({result.orderBlockZone.type})</span>
                            <span className="font-mono text-xs">{result.orderBlockZone.low.toFixed(5)} - {result.orderBlockZone.high.toFixed(5)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                          <span className="text-rose-500/80 font-medium">Resistance Zone</span>
                          <span className="font-mono text-xs">{result.resistanceZone.low.toFixed(5)} - {result.resistanceZone.high.toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-emerald-500/80 font-medium">Support Zone</span>
                          <span className="font-mono text-xs">{result.supportZone.low.toFixed(5)} - {result.supportZone.high.toFixed(5)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {result.signal !== "NEUTRAL" && (
                      <Button 
                        onClick={handleSave} 
                        className="w-full font-bold shadow-lg" 
                        size="lg"
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? "Saving..." : "Save Signal"} <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-20 bg-card/20 border border-dashed border-border rounded-xl">
              <Zap className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold font-mono text-muted-foreground">Ready for Analysis</h3>
              <p className="text-sm text-muted-foreground mt-1">Select a pair and timeframe to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

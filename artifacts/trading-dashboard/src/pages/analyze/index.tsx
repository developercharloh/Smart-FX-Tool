import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAnalyzeSignal, useListPairs, useCreateSignal } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Zap, Activity, ShieldAlert, ArrowRight, BarChart2 } from "lucide-react";
import { ConfidenceGauge } from "@/components/shared/ConfidenceGauge";
import { TrendBadge } from "@/components/shared/TrendBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { LivePriceTicker } from "@/components/shared/LivePriceTicker";
import { DerivChart } from "@/components/shared/DerivChart";

const SYNTHETIC_SYMBOLS = new Set([
  "R_10","R_25","R_50","R_75","R_100",
  "1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V",
  "BOOM300","BOOM500","BOOM1000","CRASH300","CRASH500","CRASH1000",
  "JD10","JD25","JD50","JD75","JD100","STPIDX10",
]);
const isSynthetic = (sym: string) => SYNTHETIC_SYMBOLS.has(sym);

const PAIR_GROUPS = [
  { label: "Forex Majors", symbols: ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF"] },
  { label: "Forex Crosses", symbols: ["GBPJPY","EURJPY","EURGBP","EURCHF","EURCAD","GBPCAD","AUDCAD","CADJPY"] },
  { label: "Volatility Indices", symbols: ["R_10","R_25","R_50","R_75","R_100"] },
  { label: "Volatility 1s", symbols: ["1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V"] },
  { label: "Boom & Crash", symbols: ["BOOM300","BOOM500","BOOM1000","CRASH300","CRASH500","CRASH1000"] },
  { label: "Jump Indices", symbols: ["JD10","JD25","JD50","JD75","JD100"] },
];

const PAIR_LABELS: Record<string, string> = {
  R_10: "Volatility 10 Index", R_25: "Volatility 25 Index",
  R_50: "Volatility 50 Index", R_75: "Volatility 75 Index", R_100: "Volatility 100 Index",
  "1HZ10V": "Volatility 10 (1s) Index", "1HZ25V": "Volatility 25 (1s) Index",
  "1HZ50V": "Volatility 50 (1s) Index", "1HZ75V": "Volatility 75 (1s) Index",
  "1HZ100V": "Volatility 100 (1s) Index",
  BOOM300: "Boom 300 Index", BOOM500: "Boom 500 Index", BOOM1000: "Boom 1000 Index",
  CRASH300: "Crash 300 Index", CRASH500: "Crash 500 Index", CRASH1000: "Crash 1000 Index",
  JD10: "Jump 10 Index", JD25: "Jump 25 Index", JD50: "Jump 50 Index",
  JD75: "Jump 75 Index", JD100: "Jump 100 Index",
};

const formSchema = z.object({
  pair: z.string().min(1, "Please select a pair"),
  timeframe: z.string().min(1, "Please select a timeframe"),
});

export default function Analyze() {
  const { data: pairs } = useListPairs();
  const analyzeMutation = useAnalyzeSignal();
  const createMutation = useCreateSignal();
  const { toast } = useToast();
  const [chartPair, setChartPair] = useState<string>("");
  const [chartTimeframe, setChartTimeframe] = useState<string>("H1");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { pair: "", timeframe: "H1" },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    analyzeMutation.mutate({ data: values }, {
      onError: () => {
        toast({ variant: "destructive", title: "Analysis Failed", description: "Could not complete live analysis. Please try again." });
      }
    });
  };

  const handleSave = () => {
    if (!analyzeMutation.data) return;
    const result = analyzeMutation.data;
    if (result.signal === "NEUTRAL") {
      toast({ variant: "destructive", title: "Cannot save neutral signal", description: "Only BUY or SELL signals can be saved." });
      return;
    }
    createMutation.mutate({
      data: {
        pair: result.pair, signal: result.signal as any, timeframe: result.timeframe,
        entry: result.entry, stopLoss: result.stopLoss, takeProfit: result.takeProfit,
        confidenceScore: result.confidenceScore, reasons: result.reasons,
        structureType: result.structureType, trend: result.trend,
        hasOrderBlock: result.hasOrderBlock, hasSupportResistance: result.hasSupportResistance,
        riskRewardRatio: result.riskRewardRatio,
      }
    }, {
      onSuccess: () => toast({ title: "Signal Saved", description: "The analyzed signal has been added to your dashboard." }),
      onError: () => toast({ variant: "destructive", title: "Error", description: "Failed to save signal. Please try again." }),
    });
  };

  const result = analyzeMutation.data;

  const groupedPairs = pairs ? PAIR_GROUPS.map(g => ({
    ...g,
    items: pairs.filter(p => g.symbols.includes(p.symbol))
  })).filter(g => g.items.length > 0) : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Live Analyze</h1>
        <p className="text-muted-foreground mt-1">Select a pair to load the live chart, then run institutional-grade analysis.</p>
      </div>

      {/* Top controls row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Parameters
              </CardTitle>
              <CardDescription>Select instrument and timeframe to load chart and run analysis.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="pair"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Instrument</FormLabel>
                        <Select
                          onValueChange={(v) => {
                            field.onChange(v);
                            setChartPair(v);
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background border-border/50 font-mono">
                              <SelectValue placeholder="Select instrument" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-72">
                            {groupedPairs.map(group => (
                              <div key={group.label}>
                                <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 bg-muted/20">
                                  {group.label}
                                </div>
                                {group.items.map(p => (
                                  <SelectItem key={p.symbol} value={p.symbol} className="font-mono text-sm">
                                    <span className="font-bold">{p.symbol}</span>
                                    {PAIR_LABELS[p.symbol] && (
                                      <span className="ml-2 text-xs text-muted-foreground">{PAIR_LABELS[p.symbol]}</span>
                                    )}
                                  </SelectItem>
                                ))}
                              </div>
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
                        <Select
                          onValueChange={(v) => { field.onChange(v); setChartTimeframe(v); }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-background border-border/50 font-mono">
                              <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="M15">M15 — 15 Minutes</SelectItem>
                            <SelectItem value="H1">H1 — 1 Hour</SelectItem>
                            <SelectItem value="H4">H4 — 4 Hours</SelectItem>
                            <SelectItem value="D1">D1 — Daily</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full gap-2 font-bold"
                    disabled={analyzeMutation.isPending || !form.watch("pair")}
                  >
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

        {/* Analysis result panel */}
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
                        <span className="text-sm font-mono text-muted-foreground">
                          ENTRY: <span className="text-foreground">{result.entry.toFixed(5)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <ConfidenceGauge score={result.confidenceScore} size="lg" />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
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

              <CardContent className="relative z-10 space-y-5">
                {result.signal !== "NEUTRAL" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
                      <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Take Profit</div>
                      <div className="font-mono text-xl text-emerald-500 font-bold">{result.takeProfit.toFixed(5)}</div>
                    </div>
                    <div className="bg-rose-500/5 rounded-lg p-4 border border-rose-500/20 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-1 h-full bg-rose-500" />
                      <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Stop Loss</div>
                      <div className="font-mono text-xl text-rose-500 font-bold">{result.stopLoss.toFixed(5)}</div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border border-border/50 rounded-xl p-4 bg-background/50 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-primary" /> Technical Confluence
                    </h4>
                    <ul className="space-y-2">
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
                      <h4 className="text-sm font-semibold mb-3">Key Price Zones</h4>
                      <div className="space-y-2.5">
                        {result.orderBlockZone && (
                          <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                            <span className="text-muted-foreground">Order Block ({result.orderBlockZone.type})</span>
                            <span className="font-mono text-xs">{result.orderBlockZone.low.toFixed(5)} – {result.orderBlockZone.high.toFixed(5)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm border-b border-border/50 pb-2">
                          <span className="text-rose-500/80">Resistance</span>
                          <span className="font-mono text-xs">{result.resistanceZone.low.toFixed(5)} – {result.resistanceZone.high.toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-500/80">Support</span>
                          <span className="font-mono text-xs">{result.supportZone.low.toFixed(5)} – {result.supportZone.high.toFixed(5)}</span>
                        </div>
                      </div>
                    </div>
                    {result.signal !== "NEUTRAL" && (
                      <Button onClick={handleSave} className="w-full font-bold" size="lg" disabled={createMutation.isPending}>
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
              <h3 className="text-lg font-bold font-mono text-muted-foreground">
                {chartPair ? `Ready to analyze ${chartPair}` : "Select an instrument"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {chartPair ? "Click \"Run Analysis\" to get your signal." : "Choose a pair or index to load its live chart."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* TradingView Chart — appears as soon as a pair is selected */}
      {chartPair && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold font-mono tracking-tight">
              {chartPair} <span className="text-muted-foreground font-normal">— {chartTimeframe} Live Chart</span>
            </h2>
            {PAIR_LABELS[chartPair] && (
              <span className="text-sm text-muted-foreground">{PAIR_LABELS[chartPair]}</span>
            )}
          </div>
          <Separator className="opacity-30" />
          {/* Live price ticker — tick-by-tick feed from Deriv WebSocket */}
          <LivePriceTicker symbol={chartPair} />
          {/* All instruments → Deriv WebSocket chart — no login required, all indicators built-in */}
          <DerivChart symbol={chartPair} timeframe={chartTimeframe} height={620} />
          <p className="text-xs text-muted-foreground/50 text-right">
            Live candles via Deriv WebSocket · EMA 20/50 · BB(20) · RSI 14 · MACD 12/26/9 · Countdown bar
          </p>
        </div>
      )}
    </div>
  );
}

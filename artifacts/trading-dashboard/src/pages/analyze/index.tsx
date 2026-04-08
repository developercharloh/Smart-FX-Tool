import { useAnalyzeSignal, useCreateSignal } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Activity, ShieldAlert, ArrowRight, BarChart2,
  Clock, Layers, Target, BarChart, Waves,
} from "lucide-react";
import { ConfidenceGauge } from "@/components/shared/ConfidenceGauge";
import { TrendBadge } from "@/components/shared/TrendBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import TradingViewChart from "@/components/shared/TradingViewChart";
import SyntheticChart from "@/components/shared/SyntheticChart";
import SMCAnalysisChart from "@/components/shared/SMCAnalysisChart";
import { LivePriceTicker } from "@/components/shared/LivePriceTicker";
import { useChart } from "@/contexts/ChartContext";

const SYNTHETIC_SYMBOLS = new Set([
  "R_10","R_25","R_50","R_75","R_100",
  "1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V",
  "BOOM300","BOOM500","BOOM1000","CRASH300","CRASH500","CRASH1000",
  "JD10","JD25","JD50","JD75","JD100","STPIDX10",
]);

const PAIR_LABELS: Record<string, string> = {
  // Crypto
  BTCUSD:    "Bitcoin / US Dollar",
  ETHUSD:    "Ethereum / US Dollar",
  XRPUSD:    "Ripple / US Dollar",
  LTCUSD:    "Litecoin / US Dollar",
  DOGEUSD:   "Dogecoin / US Dollar",
  DOTUSD:    "Polkadot / US Dollar",
  BNBUSDT:   "BNB / Tether",
  SOLUSDT:   "Solana / Tether",
  ADAUSDT:   "Cardano / Tether",
  AVAXUSDT:  "Avalanche / Tether",
  MATICUSDT: "Polygon / Tether",
  LINKUSDT:  "Chainlink / Tether",
  // Commodities
  XAUUSD: "Gold / US Dollar",
  XAGUSD: "Silver / US Dollar",
  XPTUSD: "Platinum / US Dollar",
  USOIL:  "WTI Crude Oil",
  UKOIL:  "Brent Crude Oil",
  NATGAS: "Natural Gas",
  COPPER: "Copper",
  // Deriv Synthetics
  R_10: "Volatility 10 Index",   R_25: "Volatility 25 Index",
  R_50: "Volatility 50 Index",   R_75: "Volatility 75 Index",   R_100: "Volatility 100 Index",
  "1HZ10V": "Volatility 10 (1s) Index","1HZ25V": "Volatility 25 (1s) Index",
  "1HZ50V": "Volatility 50 (1s) Index","1HZ75V": "Volatility 75 (1s) Index","1HZ100V": "Volatility 100 (1s) Index",
  BOOM300: "Boom 300 Index", BOOM500: "Boom 500 Index", BOOM1000: "Boom 1000 Index",
  CRASH300: "Crash 300 Index", CRASH500: "Crash 500 Index", CRASH1000: "Crash 1000 Index",
  JD10: "Jump 10 Index", JD25: "Jump 25 Index", JD50: "Jump 50 Index",
  JD75: "Jump 75 Index", JD100: "Jump 100 Index",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function SessionBadge({ name, quality }: { name: string; quality: string }) {
  const color =
    quality === "OPTIMAL" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
    quality === "GOOD"    ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                            "bg-slate-500/10 text-slate-400 border-slate-500/30";
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border", color)}>
      <Clock className="w-3 h-3" /> {name}
      <span className="ml-1 text-[10px] uppercase tracking-wider opacity-70">{quality}</span>
    </span>
  );
}

function MetricRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function ConfluenceBar({ bull, bear }: { bull: number; bear: number }) {
  const total  = bull + bear || 1;
  const bullPct = Math.round((bull / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className="text-emerald-400 font-semibold">Bull {bullPct}%</span>
        <span className="text-rose-400 font-semibold">Bear {100 - bullPct}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-rose-500/20 flex">
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${bullPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>{bull} signals</span>
        <span>{bear} signals</span>
      </div>
    </div>
  );
}

function PdBadge({ zone }: { zone: string }) {
  if (zone === "PREMIUM")
    return <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-0.5">PREMIUM</span>;
  if (zone === "DISCOUNT")
    return <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">DISCOUNT</span>;
  return <span className="text-xs font-bold text-slate-400 bg-slate-500/10 border border-slate-500/20 rounded px-2 py-0.5">EQUILIBRIUM</span>;
}

function SignalDot({ active, color }: { active: boolean; color: string }) {
  return <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5", active ? color : "bg-muted")} />;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Analyze() {
  const { pair, timeframe } = useChart();
  const analyzeMutation = useAnalyzeSignal();
  const createMutation  = useCreateSignal();
  const { toast }       = useToast();

  const isSynthetic = pair ? SYNTHETIC_SYMBOLS.has(pair) : false;

  function fmtPrice(v: number) {
    if (!v) return "—";
    if (isSynthetic) return v.toFixed(2);
    // Crypto — large prices 2dp, small prices 4dp
    const CRYPTO = ["BTCUSD","ETHUSD","BNBUSDT","SOLUSDT","AVAXUSDT","LTCUSD","DOGEUSD","MATICUSDT","ADAUSDT","LINKUSDT","DOTUSD","XRPUSD"];
    if (CRYPTO.includes(pair ?? "")) return v >= 100 ? v.toFixed(2) : v.toFixed(4);
    // Commodities
    if (["XAUUSD","XAGUSD","XPTUSD","USOIL","UKOIL"].includes(pair ?? "")) return v.toFixed(2);
    if (["NATGAS","COPPER"].includes(pair ?? "")) return v.toFixed(3);
    // JPY pairs
    if (pair?.includes("JPY")) return v.toFixed(2);
    return v.toFixed(5);
  }

  function runAnalysis() {
    if (!pair) {
      toast({ variant: "destructive", title: "No instrument selected", description: "Use the sidebar to choose an instrument first." });
      return;
    }
    analyzeMutation.mutate({ data: { pair, timeframe } }, {
      onError: () => toast({ variant: "destructive", title: "Analysis Failed", description: "Could not complete analysis. Please try again." }),
    });
  }

  function handleSave() {
    const result = analyzeMutation.data;
    if (!result) return;
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
      onSuccess: () => toast({ title: "Signal Saved", description: "Signal added to your dashboard." }),
      onError:   () => toast({ variant: "destructive", title: "Error", description: "Failed to save signal." }),
    });
  }

  const result = analyzeMutation.data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Live Analyze</h1>
          <p className="text-muted-foreground mt-1">
            Select an instrument and timeframe from the menu ( ☰ ) on the right, then run analysis.
          </p>
        </div>
        <Button
          onClick={runAnalysis}
          className="gap-2 font-bold"
          size="lg"
          disabled={analyzeMutation.isPending || !pair}
        >
          {analyzeMutation.isPending
            ? <><Activity className="w-4 h-4 animate-spin" /> Analyzing...</>
            : <><Zap className="w-4 h-4" /> Run Analysis</>}
        </Button>
      </div>

      {/* No pair selected */}
      {!pair && (
        <div className="flex flex-col items-center justify-center py-24 bg-card/20 border border-dashed border-border rounded-xl">
          <Zap className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-bold font-mono text-muted-foreground">No instrument selected</h3>
          <p className="text-sm text-muted-foreground mt-1">Open the menu ( ☰ ) on the right, pick an instrument and timeframe to load the chart.</p>
        </div>
      )}

      {/* ── Chart ────────────────────────────────────────────────────────────── */}
      {pair && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold font-mono tracking-tight">
              {pair} <span className="text-muted-foreground font-normal">— {timeframe} Live Chart</span>
            </h2>
            {PAIR_LABELS[pair] && <span className="text-sm text-muted-foreground">{PAIR_LABELS[pair]}</span>}
          </div>
          <Separator className="opacity-30" />
          <LivePriceTicker symbol={pair} />
          {isSynthetic ? (
            <SyntheticChart key={`${pair}-${timeframe}`} symbol={pair} timeframe={timeframe} height={560} />
          ) : (
            <TradingViewChart key={`${pair}-${timeframe}`} symbol={pair} timeframe={timeframe} height={560} />
          )}
          <p className="text-xs text-muted-foreground/50 text-right">
            {isSynthetic
              ? "Live candles via Deriv (real-time)."
              : "Chart powered by TradingView — OANDA feed (real-time)."}
          </p>
        </div>
      )}

      {/* ── SMC Analysis Chart (auto-drawn levels) ───────────────────────────── */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold font-mono tracking-tight">
              SMC Analysis Chart <span className="text-muted-foreground font-normal text-sm">— auto-marked levels</span>
            </h2>
          </div>
          <Separator className="opacity-30" />
          <SMCAnalysisChart result={result} height={640} />
        </div>
      )}

      {/* ── Analysis Result ───────────────────────────────────────────────────── */}
      {result && (
        <Card className="bg-card/50 border-border/50 border-t-2 border-t-primary shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
            <Zap className="w-32 h-32" />
          </div>

          <CardHeader className="pb-4 relative z-10">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold font-mono tracking-tight">{result.pair}</h3>
                  <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary bg-primary/5">
                    {result.timeframe} LIVE
                  </Badge>
                  <SessionBadge name={result.session} quality={result.sessionQuality} />
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-lg font-bold tracking-wider px-2 py-0.5 rounded",
                    result.signal === "BUY"  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                    result.signal === "SELL" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                                              "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                  )}>
                    {result.signal}
                  </span>
                  {result.signal !== "NEUTRAL" && (
                    <span className="text-sm font-mono text-muted-foreground">
                      ENTRY: <span className="text-foreground">{fmtPrice(result.entry)}</span>
                    </span>
                  )}
                </div>
              </div>
              <ConfidenceGauge score={result.confidenceScore} size="lg" />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <TrendBadge trend={result.trend} />
              {result.structureType !== "NONE" && (
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20">
                  {result.structureType === "BOS" ? "Break of Structure" : "Change of Character"}
                </Badge>
              )}
              {result.signal !== "NEUTRAL" && (
                <Badge variant="outline" className="font-mono bg-card">R:R 1:{result.riskRewardRatio.toFixed(1)}</Badge>
              )}
              <Badge variant="outline" className={cn(
                "font-mono text-xs",
                result.htfBias === "BULLISH" ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20" :
                result.htfBias === "BEARISH" ? "bg-rose-500/5 text-rose-400 border-rose-500/20" :
                "bg-slate-500/5 text-slate-400 border-slate-500/20"
              )}>
                HTF {result.htfBias}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 space-y-5">
            {/* TP / SL */}
            {result.signal !== "NEUTRAL" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/5 rounded-lg p-4 border border-emerald-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
                  <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Take Profit</div>
                  <div className="font-mono text-xl text-emerald-500 font-bold">{fmtPrice(result.takeProfit)}</div>
                </div>
                <div className="bg-rose-500/5 rounded-lg p-4 border border-rose-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-rose-500" />
                  <div className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Stop Loss (ATR)</div>
                  <div className="font-mono text-xl text-rose-500 font-bold">{fmtPrice(result.stopLoss)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">ATR: {result.atr}</div>
                </div>
              </div>
            )}

            {/* Confluence bar */}
            <div className="border border-border/50 rounded-xl p-4 bg-background/50">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart className="w-4 h-4 text-primary" /> Confluence Score
              </h4>
              <ConfluenceBar bull={result.bullScore} bear={result.bearScore} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Analysis Reasons */}
              <div className="border border-border/50 rounded-xl p-4 bg-background/50 space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" /> Analysis Reasons
                </h4>
                <ul className="space-y-2">
                  {result.reasons.map((reason: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-snug">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right column */}
              <div className="space-y-3">
                {/* SMC Signals */}
                <div className="border border-border/50 rounded-xl p-4 bg-background/50">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" /> SMC Signals
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { label: "Order Block",       active: result.hasOrderBlock,       color: "bg-amber-400",  val: result.hasOrderBlock ? result.orderBlockZone?.type || "DETECTED" : "None" },
                      { label: "Fair Value Gap",     active: result.hasFVG,              color: "bg-violet-400", val: result.hasFVG ? result.fvgZone?.type || "DETECTED" : "None" },
                      { label: "Liquidity Sweep",    active: result.hasLiquiditySweep,   color: "bg-cyan-400",   val: result.hasLiquiditySweep ? (result.liquiditySweepType === "SSL" ? "Sell-Side" : "Buy-Side") : "None" },
                      { label: "Fibonacci OTE",      active: result.isInOTE,             color: "bg-yellow-400", val: result.isInOTE ? `${result.oteFibLow} – ${result.oteFibHigh}` : "Not in zone" },
                      { label: "RSI Divergence",     active: result.hasDivergence,       color: "bg-pink-400",   val: result.hasDivergence ? result.divergenceType?.replace(/_/g, " ") : "None" },
                      { label: "Candle Pattern",     active: result.hasCandlePattern,    color: "bg-orange-400", val: result.hasCandlePattern ? result.candlePattern : "None" },
                    ].map(({ label, active, color, val }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center">
                          <SignalDot active={active} color={color} />{label}
                        </span>
                        <span className={active ? `${color.replace("bg-", "text-")} font-semibold` : "text-muted-foreground/40"}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indicators */}
                <div className="border border-border/50 rounded-xl p-4 bg-background/50">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Waves className="w-4 h-4 text-primary" /> Indicators
                  </h4>
                  <MetricRow label="RSI (14)" mono value={
                    <span className={result.rsi < 30 ? "text-emerald-400" : result.rsi > 70 ? "text-rose-400" : "text-foreground"}>{result.rsi}</span>
                  } />
                  <MetricRow label="MACD Histogram" mono value={
                    <span className={result.macdHist > 0 ? "text-emerald-400" : "text-rose-400"}>{result.macdHist > 0 ? "+" : ""}{result.macdHist}</span>
                  } />
                  <MetricRow label="ATR (14)" mono value={result.atr} />
                  <MetricRow label="Premium/Discount" value={<PdBadge zone={result.premiumDiscount} />} />
                  <MetricRow label="DXY Sentiment" value={
                    result.dxySentiment === "BULLISH_USD" ? <span className="text-emerald-400">USD Strong</span> :
                    result.dxySentiment === "BEARISH_USD" ? <span className="text-rose-400">USD Weak</span> :
                    <span className="text-muted-foreground">Neutral</span>
                  } />
                </div>
              </div>
            </div>

            {/* Price Zones */}
            <div className="border border-border/50 rounded-xl p-4 bg-background/50">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Key Price Zones
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {result.orderBlockZone && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                    <div className="text-amber-400 font-semibold mb-1">Order Block ({result.orderBlockZone.type})</div>
                    <div className="font-mono text-muted-foreground">{fmtPrice(result.orderBlockZone.low)}</div>
                    <div className="font-mono text-muted-foreground">– {fmtPrice(result.orderBlockZone.high)}</div>
                  </div>
                )}
                {result.fvgZone && (
                  <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                    <div className="text-violet-400 font-semibold mb-1">FVG ({result.fvgZone.type})</div>
                    <div className="font-mono text-muted-foreground">{fmtPrice(result.fvgZone.low)}</div>
                    <div className="font-mono text-muted-foreground">– {fmtPrice(result.fvgZone.high)}</div>
                  </div>
                )}
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
                  <div className="text-rose-400 font-semibold mb-1">Resistance</div>
                  <div className="font-mono text-muted-foreground">{fmtPrice(result.resistanceZone.low)}</div>
                  <div className="font-mono text-muted-foreground">– {fmtPrice(result.resistanceZone.high)}</div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                  <div className="text-emerald-400 font-semibold mb-1">Support</div>
                  <div className="font-mono text-muted-foreground">{fmtPrice(result.supportZone.low)}</div>
                  <div className="font-mono text-muted-foreground">– {fmtPrice(result.supportZone.high)}</div>
                </div>
              </div>
            </div>

            {/* Save */}
            {result.signal !== "NEUTRAL" && (
              <Button onClick={handleSave} className="w-full font-bold" size="lg" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save Signal"} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

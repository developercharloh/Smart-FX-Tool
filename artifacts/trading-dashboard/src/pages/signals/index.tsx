import { useState } from "react";
import { Link } from "wouter";
import { useListSignals, useListPairs, ListSignalsSignal } from "@workspace/api-client-react";
import { Activity, Search, Filter, Clock, Target, TrendingUp, TrendingDown, Zap, AlertCircle } from "lucide-react";
import { SignalCard } from "@/components/shared/SignalCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m  = Math.floor(ms / 60000);
  const h  = Math.floor(m / 60);
  if (h > 0)  return `${h}h ${m % 60}m ago`;
  if (m > 0)  return `${m}m ago`;
  return "just now";
}

function timeLeft(dateStr: string, hours = 24) {
  const created  = new Date(dateStr).getTime();
  const expiresAt = created + hours * 3_600_000;
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "expiring soon";
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60000);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export default function SignalsList() {
  const [pairFilter, setPairFilter]           = useState<string>("ALL");
  const [typeFilter, setTypeFilter]           = useState<string>("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<string>("ALL");

  const { data: pairs }   = useListPairs();
  const { data: signals, isLoading } = useListSignals({
    ...(pairFilter      !== "ALL" ? { pair:      pairFilter }                      : {}),
    ...(typeFilter      !== "ALL" ? { signal:    typeFilter as ListSignalsSignal }  : {}),
    ...(timeframeFilter !== "ALL" ? { timeframe: timeframeFilter }                 : {}),
  });

  const buyCount  = signals?.filter(s => s.signal === "BUY").length  ?? 0;
  const sellCount = signals?.filter(s => s.signal === "SELL").length ?? 0;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
            <Zap className="w-7 h-7 text-primary" />
            Live Signals
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Active signals waiting for the EA to hit the entry price. Each signal stays live for <strong>24 hours</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1 text-emerald-400 border-emerald-400/40 bg-emerald-400/10 font-mono">
            <TrendingUp className="w-3 h-3" /> {buyCount} BUY
          </Badge>
          <Badge variant="outline" className="gap-1 text-red-400 border-red-400/40 bg-red-400/10 font-mono">
            <TrendingDown className="w-3 h-3" /> {sellCount} SELL
          </Badge>
          <Link href="/analyze">
            <Button className="gap-2">
              <Activity className="w-4 h-4" /> Run Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* ── EA flow explanation ── */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-semibold">How it works: </span>
          The SmartFX EA polls these signals every 10 s. When it finds a new one, it places a
          <span className="text-primary font-semibold"> limit order at the entry price</span>.
          The trade only opens when the market actually hits that price — not before.
          Signals with no fill after 24 h expire automatically.
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-card/50 border border-border/50 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Filters</span>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <Select value={pairFilter} onValueChange={setPairFilter}>
            <SelectTrigger className="w-full bg-background border-border/50">
              <SelectValue placeholder="All Pairs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Pairs</SelectItem>
              {pairs?.map(p => (
                <SelectItem key={p.symbol} value={p.symbol}>{p.symbol}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full bg-background border-border/50">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="BUY">BUY</SelectItem>
              <SelectItem value="SELL">SELL</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
            <SelectTrigger className="w-full bg-background border-border/50">
              <SelectValue placeholder="All Timeframes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Timeframes</SelectItem>
              <SelectItem value="M15">M15</SelectItem>
              <SelectItem value="H1">H1</SelectItem>
              <SelectItem value="H4">H4</SelectItem>
              <SelectItem value="D1">D1</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(pairFilter !== "ALL" || typeFilter !== "ALL" || timeframeFilter !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={() => {
            setPairFilter("ALL"); setTypeFilter("ALL"); setTimeframeFilter("ALL");
          }}>
            Clear
          </Button>
        )}
      </div>

      {/* ── Signal grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[280px] rounded-xl bg-card/50" />
          ))}
        </div>
      ) : signals && signals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {signals.map(signal => (
            <div key={signal.id} className="relative group">
              {/* Pending-EA badge */}
              <div className="absolute -top-2.5 left-4 z-10 flex items-center gap-1.5 bg-background border border-amber-500/40 text-amber-400 text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                PENDING EA ENTRY
              </div>

              {/* Expiry timer */}
              <div className="absolute -top-2.5 right-4 z-10 flex items-center gap-1 bg-background border border-border/50 text-muted-foreground text-xs font-mono px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                {signal.createdAt ? timeLeft(signal.createdAt) : ""}
              </div>

              <SignalCard signal={signal} />

              {/* Entry target callout */}
              <div className="mt-2 mx-1 flex items-center justify-between bg-card/60 border border-border/40 rounded-lg px-3 py-2 text-xs font-mono">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Target className="w-3 h-3" /> Entry target
                </span>
                <span className="text-primary font-semibold">{Number(signal.entry).toFixed(5)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Generated {signal.createdAt ? timeAgo(signal.createdAt) : ""}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center flex flex-col items-center justify-center bg-card/20 rounded-xl border border-dashed border-border">
          <Search className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-bold font-mono">No active signals</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-sm">
            {pairFilter !== "ALL" || typeFilter !== "ALL" || timeframeFilter !== "ALL"
              ? "No signals match these filters. Try clearing them."
              : "The scanner runs every 5 min. Check back shortly or run a manual analysis."}
          </p>
          <div className="flex gap-3 mt-6">
            {(pairFilter !== "ALL" || typeFilter !== "ALL" || timeframeFilter !== "ALL") && (
              <Button variant="outline" onClick={() => {
                setPairFilter("ALL"); setTypeFilter("ALL"); setTimeframeFilter("ALL");
              }}>
                Clear Filters
              </Button>
            )}
            <Link href="/analyze">
              <Button className="gap-2">
                <Activity className="w-4 h-4" /> Run Analysis Now
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

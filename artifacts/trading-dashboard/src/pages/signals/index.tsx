import { useState } from "react";
import { Link } from "wouter";
import { useListSignals, useListPairs, ListSignalsSignal, getListSignalsQueryKey } from "@workspace/api-client-react";
import { Activity, Search, Filter } from "lucide-react";
import { SignalCard } from "@/components/shared/SignalCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignalsList() {
  const [pairFilter, setPairFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<string>("ALL");

  const { data: pairs } = useListPairs();
  const { data: signals, isLoading } = useListSignals({
    ...(pairFilter !== "ALL" ? { pair: pairFilter } : {}),
    ...(typeFilter !== "ALL" ? { signal: typeFilter as ListSignalsSignal } : {}),
    ...(timeframeFilter !== "ALL" ? { timeframe: timeframeFilter } : {}),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">All Signals</h1>
          <p className="text-muted-foreground mt-1">Browse and filter trading opportunities.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/signals/new">
            <Button className="gap-2">
              <Activity className="w-4 h-4" /> Manual Signal
            </Button>
          </Link>
        </div>
      </div>

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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[250px] rounded-xl bg-card/50" />
          ))
        ) : signals && signals.length > 0 ? (
          signals.map(signal => (
            <SignalCard key={signal.id} signal={signal} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center bg-card/20 rounded-xl border border-dashed border-border">
            <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-bold font-mono">No signals found</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-md">
              Try adjusting your filters or run a live analysis to generate new opportunities.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => {
              setPairFilter("ALL");
              setTypeFilter("ALL");
              setTimeframeFilter("ALL");
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

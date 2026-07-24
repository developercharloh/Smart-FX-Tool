import { useState } from "react";
import { useListSignals, useDeleteSignal, getListSignalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Filter, Trash2, ArrowUpRight, ArrowDownRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function SignalsList() {
  const [pairFilter, setPairFilter] = useState("");
  const [signalFilter, setSignalFilter] = useState<"BUY" | "SELL" | "ALL">("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState("ALL");
  
  const queryParams = {
    ...(pairFilter ? { pair: pairFilter.toUpperCase() } : {}),
    ...(signalFilter !== "ALL" ? { signal: signalFilter } : {}),
    ...(timeframeFilter !== "ALL" ? { timeframe: timeframeFilter } : {}),
  };

  const { data: signals, isLoading } = useListSignals(queryParams);
  const deleteMutation = useDeleteSignal();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm("Delete this signal? This action cannot be undone.")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Signal Deleted", description: "The signal has been removed from the database." });
            queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey(queryParams) });
          },
          onError: () => {
            toast({ title: "Error", description: "Failed to delete signal.", variant: "destructive" });
          }
        }
      );
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase flex items-center gap-2">
            <Filter className="w-6 h-6 text-primary" />
            Signal Database
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1 uppercase">Search & Filter Active Setups</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-card/40 p-4 border border-border/50 rounded-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search pair (e.g. EURUSD)" 
            className="pl-9 font-mono uppercase bg-background"
            value={pairFilter}
            onChange={(e) => setPairFilter(e.target.value)}
          />
        </div>
        
        <Select value={signalFilter} onValueChange={(val: any) => setSignalFilter(val)}>
          <SelectTrigger className="font-mono bg-background">
            <SelectValue placeholder="Direction" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ALL DIRECTIONS</SelectItem>
            <SelectItem value="BUY">BUY</SelectItem>
            <SelectItem value="SELL">SELL</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
          <SelectTrigger className="font-mono bg-background">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">ALL TIMEFRAMES</SelectItem>
            <SelectItem value="15m">15m</SelectItem>
            <SelectItem value="1H">1H</SelectItem>
            <SelectItem value="4H">4H</SelectItem>
            <SelectItem value="1D">1D</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="font-mono" onClick={() => {
          setPairFilter("");
          setSignalFilter("ALL");
          setTimeframeFilter("ALL");
        }}>
          RESET FILTERS
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border/50 rounded-sm bg-card/30 overflow-x-auto">
        <table className="w-full text-sm text-left font-mono">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/50">
            <tr>
              <th className="px-4 py-3 font-normal">Date / ID</th>
              <th className="px-4 py-3 font-normal">Pair</th>
              <th className="px-4 py-3 font-normal">Direction</th>
              <th className="px-4 py-3 font-normal">Entry</th>
              <th className="px-4 py-3 font-normal">Targets</th>
              <th className="px-4 py-3 font-normal">Confidence</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                </td>
              </tr>
            ) : signals?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground uppercase tracking-widest text-xs">
                  No signals found matching criteria
                </td>
              </tr>
            ) : (
              signals?.map((signal) => (
                <tr key={signal.id} className="hover:bg-card/80 transition-colors group">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-muted-foreground">{format(new Date(signal.createdAt), "MMM dd, HH:mm")}</div>
                    <div className="text-[10px] text-muted-foreground/50">#{signal.id.toString().padStart(5, '0')}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-bold text-base">
                    {signal.pair}
                    <span className="ml-2 text-xs font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
                      {signal.timeframe}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn(
                      "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-sm w-fit",
                      signal.signal === "BUY" ? "bg-chart-2/10 text-chart-2" : "bg-destructive/10 text-destructive"
                    )}>
                      {signal.signal === "BUY" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {signal.signal}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{signal.entry}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                    <div>SL: <span className="text-destructive">{signal.stopLoss}</span></div>
                    <div>TP: <span className="text-chart-2">{signal.takeProfit}</span></div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${signal.confidenceScore}%` }} 
                        />
                      </div>
                      <span className="text-xs">{signal.confidenceScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider",
                      signal.status === "ACTIVE" ? "bg-chart-4/10 text-chart-4 border border-chart-4/20" : 
                      signal.status === "HIT_TP" ? "bg-chart-2/10 text-chart-2 border border-chart-2/20" :
                      signal.status === "HIT_SL" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                      "bg-muted text-muted-foreground border border-muted-foreground/20"
                    )}>
                      {signal.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/signals/${signal.id}`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDelete(signal.id, e)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

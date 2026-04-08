import { useEffect } from "react";
import { useGetDashboardSummary, useListSignals, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignalCard } from "@/components/shared/SignalCard";
import { Activity, Target, Zap, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: signals, isLoading: isLoadingSignals } = useListSignals({ timeframe: "H1" });
  const queryClient = useQueryClient();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/signals/resolve-pending`, { method: "POST" })
      .then(() => queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Dashboard</h1>
          <p className="text-muted-foreground mt-1">SmartFX market overview and active signals.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/analyze">
            <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/10">
              <Zap className="w-4 h-4" /> Live Analysis
            </Button>
          </Link>
          <Link href="/signals/new">
            <Button className="gap-2">
              <Activity className="w-4 h-4" /> New Signal
            </Button>
          </Link>
        </div>
      </div>

      {isLoadingSummary || !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Signals</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{summary.totalSignals}</div>
              <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                <span className="text-emerald-500 font-bold">{summary.buySignals} BUY</span>
                <span>•</span>
                <span className="text-rose-500 font-bold">{summary.sellSignals} SELL</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Signals</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-primary">{summary.activeSignals}</div>
              <p className="text-xs text-muted-foreground mt-2">Currently open positions</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Win Rate</CardTitle>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-emerald-500">{(summary.winRate * 100).toFixed(1)}%</div>
              <Progress value={summary.winRate * 100} className="h-1 mt-2 bg-secondary" indicatorClassName="bg-emerald-500" />
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Confidence</CardTitle>
              <Zap className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{summary.avgConfidence.toFixed(0)}/100</div>
              <Progress value={summary.avgConfidence} className="h-1 mt-2 bg-secondary" indicatorClassName="bg-chart-4" />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-mono uppercase tracking-wider">Recent Signals</h2>
            <Link href="/signals" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoadingSignals ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl bg-card/50" />
              ))
            ) : signals && signals.length > 0 ? (
              signals.slice(0, 4).map((signal) => (
                <SignalCard key={signal.id} signal={signal} />
              ))
            ) : (
              <div className="col-span-2 text-center py-12 text-muted-foreground border border-dashed rounded-xl border-border bg-card/20">
                No recent signals found.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold font-mono uppercase tracking-wider">Top Pairs</h2>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-0">
              {isLoadingSummary || !summary ? (
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {summary.topPairs.map((pair, index) => (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold font-mono">{pair.pair}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-emerald-500 font-bold font-mono">{(pair.winRate * 100).toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground uppercase">{pair.count} trades</div>
                      </div>
                    </div>
                  ))}
                  {summary.topPairs.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      Not enough data.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

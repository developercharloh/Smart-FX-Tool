import { useEffect } from "react";
import { useGetDashboardSummary, useListSignals, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignalCard } from "@/components/shared/SignalCard";
import { Activity, Target, Zap, ShieldCheck, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
import { SessionClock } from "@/components/shared/SessionClock";
import { cn } from "@/lib/utils";

function computeStreak(recentActivity: any[]): { count: number; type: "WIN" | "LOSS" | null } {
  const resolved = recentActivity.filter(s => s.status === "HIT_TP" || s.status === "HIT_SL");
  if (!resolved.length) return { count: 0, type: null };
  const first = resolved[0].status;
  let count = 0;
  for (const s of resolved) {
    if (s.status === first) count++;
    else break;
  }
  return { count, type: first === "HIT_TP" ? "WIN" : "LOSS" };
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: signals, isLoading: isLoadingSignals } = useListSignals({});
  const queryClient = useQueryClient();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/signals/resolve-pending`, { method: "POST" })
      .then(() => queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }))
      .catch(() => {});
  }, []);

  const streak = summary?.recentActivity ? computeStreak(summary.recentActivity) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Dashboard</h1>
          <p className="text-muted-foreground mt-1">SmartFX market overview and active signals.</p>
        </div>
        <Link href="/analyze">
          <Button className="gap-2">
            <Zap className="w-4 h-4" /> Run Analysis
          </Button>
        </Link>
      </div>

      {/* Session Clock */}
      <SessionClock />

      {/* Stats Cards */}
      {isLoadingSummary || !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent><Skeleton className="h-8 w-[60px]" /></CardContent>
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
              <Progress value={summary.winRate * 100} className="h-1.5 mt-2 bg-secondary" indicatorClassName="bg-emerald-500" />
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Confidence</CardTitle>
              <Zap className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{summary.avgConfidence.toFixed(0)}/100</div>
              <Progress value={summary.avgConfidence} className="h-1.5 mt-2 bg-secondary" indicatorClassName="bg-chart-4" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Streak Banner */}
      {streak && streak.count >= 2 && (
        <div className={cn(
          "rounded-xl border px-5 py-3 flex items-center gap-3",
          streak.type === "WIN"
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-rose-500/10 border-rose-500/30",
        )}>
          {streak.type === "WIN"
            ? <TrendingUp className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            : <TrendingDown className="w-5 h-5 text-rose-400 flex-shrink-0" />}
          <div>
            <span className={cn("font-bold text-sm", streak.type === "WIN" ? "text-emerald-400" : "text-rose-400")}>
              {streak.count} {streak.type === "WIN" ? "Win" : "Loss"} Streak
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {streak.type === "WIN"
                ? "Strategy is performing well — stay disciplined."
                : "Consider reducing position sizes until the streak breaks."}
            </span>
          </div>
        </div>
      )}

      {/* Main content */}
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
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl bg-card/50" />)
            ) : signals && signals.length > 0 ? (
              signals.slice(0, 4).map(signal => <SignalCard key={signal.id} signal={signal} />)
            ) : (
              <div className="col-span-2 text-center py-12 text-muted-foreground border border-dashed rounded-xl border-border bg-card/20">
                No signals yet — run your first analysis to get started.
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
                      <Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {summary.topPairs.map((pair: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                      <span className="text-sm font-bold font-mono">{pair.pair}</span>
                      <div className="text-right">
                        <div className="text-sm text-emerald-500 font-bold font-mono">{(pair.winRate * 100).toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground uppercase">{pair.count} trades</div>
                      </div>
                    </div>
                  ))}
                  {summary.topPairs.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm">No data yet.</div>
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

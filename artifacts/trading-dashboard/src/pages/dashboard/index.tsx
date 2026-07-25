import { useGetDashboardSummary } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Loader2, Activity, ArrowUpRight, ArrowDownRight, Target, BarChart, Zap, History } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { DerivBalanceWidget } from "@/components/shared/DerivBalanceWidget";

export default function Dashboard() {
  const { data: summary, isLoading, error } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="h-full flex items-center justify-center text-destructive font-mono uppercase tracking-widest">
        Error loading telemetry
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Market Telemetry
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1 uppercase">Live Performance & Metrics</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
          <span className="uppercase tracking-widest text-primary">Live Data</span>
        </div>
      </div>

      {/* ── MT5 Live Account Balances ──────────────────────────────────── */}
      <DerivBalanceWidget />

      {/* ── KPI Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Active Signals" value={summary.activeSignals} icon={Zap} valueClass="text-primary" />
        <KpiCard title="Total Signals" value={summary.totalSignals} icon={BarChart} />
        <KpiCard title="System Win Rate" value={`${summary.winRate.toFixed(1)}%`} icon={Target} valueClass={summary.winRate > 50 ? "text-chart-2" : "text-destructive"} />
        <KpiCard title="Avg Confidence" value={`${summary.avgConfidence.toFixed(0)}%`} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Top Pairs Leaderboard */}
        <div className="col-span-1 space-y-4">
          <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Top Performing Pairs
          </h2>
          <div className="flex flex-col gap-3">
            {summary.topPairs.map((tp, idx) => (
              <Card key={tp.pair} className="p-4 bg-card/50 hover:bg-card transition-colors border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-mono text-xs w-4">{idx + 1}</span>
                    <span className="font-bold font-mono text-lg">{tp.pair}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-chart-2">{tp.winRate.toFixed(1)}% WR</div>
                    <div className="text-xs text-muted-foreground font-mono">{tp.count} signals</div>
                  </div>
                </div>
              </Card>
            ))}
            {summary.topPairs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground font-mono text-xs uppercase">No pair data available</div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="col-span-1 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-sm font-bold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
              <History className="w-4 h-4" />
              Recent Activity Feed
            </h2>
            <Link href="/signals" className="text-xs font-mono text-primary hover:underline uppercase">View All</Link>
          </div>

          <div className="bg-card/30 rounded-sm border border-border/50 divide-y divide-border/50 overflow-hidden">
            {summary.recentActivity.map((signal) => (
              <Link key={signal.id} href={`/signals/${signal.id}`}>
                <div className="group flex items-center justify-between p-4 hover:bg-card/80 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-sm flex items-center justify-center",
                      signal.signal === "BUY" ? "bg-chart-2/10 text-chart-2" : "bg-destructive/10 text-destructive"
                    )}>
                      {signal.signal === "BUY" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base">{signal.pair}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-secondary text-muted-foreground">
                          {signal.timeframe}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-1 uppercase">
                        {signal.structureType !== "NONE" && `${signal.structureType} • `}
                        {signal.trend} TREND
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-sm">
                      Entry: <span className="text-foreground">{signal.entry}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${signal.confidenceScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{signal.confidenceScore}%</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {summary.recentActivity.length === 0 && (
              <div className="text-center py-12 text-muted-foreground font-mono text-xs uppercase">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, valueClass }: { title: string; value: string | number; icon: any; valueClass?: string }) {
  return (
    <Card className="p-4 bg-card/40 border-border/50 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</p>
        <Icon className="w-4 h-4 text-muted-foreground/50" />
      </div>
      <p className={cn("text-3xl font-mono font-bold mt-2", valueClass)}>{value}</p>
    </Card>
  );
}

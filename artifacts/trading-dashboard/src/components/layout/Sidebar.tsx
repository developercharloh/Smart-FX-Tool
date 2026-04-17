import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart2, LayoutDashboard, Activity, Zap, Newspaper, Plus,
  ChevronDown, LogOut, Key, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChart } from "@/contexts/ChartContext";
import { useAuth, Plan } from "@/hooks/useAuth";

const NAV_LINKS = [
  { href: "/",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/signals",     label: "All Signals",   icon: Activity },
  { href: "/analyze",     label: "Live Analyze",  icon: Zap },
  { href: "/news",        label: "Market News",   icon: Newspaper },
  { href: "/signals/new", label: "Manual Signal", icon: Plus },
  { href: "/settings",    label: "Settings",      icon: Settings },
];

const PAIR_GROUPS = [
  { label: "Forex Majors",       symbols: ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF"] },
  { label: "Forex Crosses",      symbols: ["GBPJPY","EURJPY","EURGBP","EURCHF","EURCAD","GBPCAD","AUDCAD","CADJPY","AUDNZD","AUDCHF","GBPCHF","NZDJPY"] },
  { label: "Cryptocurrency",     symbols: ["BTCUSD","ETHUSD","XRPUSD","BNBUSDT","SOLUSDT","ADAUSDT","DOTUSD","AVAXUSDT","DOGEUSD","MATICUSDT","LINKUSDT","LTCUSD"] },
  { label: "Commodities",        symbols: ["XAUUSD","XAGUSD","XPTUSD","USOIL","UKOIL","NATGAS","COPPER"] },
  { label: "Volatility Indices", symbols: ["R_10","R_25","R_50","R_75","R_100"] },
  { label: "Volatility 1s",      symbols: ["1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V"] },
  { label: "Boom & Crash",       symbols: ["BOOM300","BOOM500","BOOM1000","CRASH300","CRASH500","CRASH1000"] },
  { label: "Jump Indices",       symbols: ["JD10","JD25","JD50","JD75","JD100"] },
];

const TIMEFRAMES = [
  { value: "M15", label: "M15 — 15 min" },
  { value: "H1",  label: "H1 — 1 hour"  },
  { value: "H4",  label: "H4 — 4 hours" },
  { value: "D1",  label: "D1 — Daily"   },
];

const PLAN_BADGE: Record<Plan, { label: string; cls: string }> = {
  monthly:   { label: "Monthly",  cls: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  quarterly: { label: "3-Month",  cls: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
  yearly:    { label: "1-Year",   cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  lifetime:  { label: "Lifetime", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
};

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { pair, timeframe, setPair, setTimeframe } = useChart();
  const { plan, logout } = useAuth();

  function handleLoadChart() {
    navigate("/analyze");
  }

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col h-full shrink-0 overflow-y-auto">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-border/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/30 transition-colors shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">SmartFX</p>
            <p className="text-[10px] text-muted-foreground">Trading Dashboard</p>
          </div>
        </Link>
        {plan && (
          <div className={cn("mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold", PLAN_BADGE[plan].cls)}>
            <Key className="w-2.5 h-2.5" />
            {PLAN_BADGE[plan].label}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2 mb-2">Navigation</p>
        {NAV_LINKS.map(link => {
          const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <link.icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Chart Controls */}
      <div className="px-3 py-3 border-t border-border/50 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-1">Chart Controls</p>

        {/* Instrument */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground px-1">Instrument</label>
          <div className="relative">
            <select
              value={pair}
              onChange={e => setPair(e.target.value)}
              className="w-full appearance-none bg-background border border-border/60 rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/60 cursor-pointer pr-7"
            >
              <option value="" disabled>Select instrument</option>
              {PAIR_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.symbols.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Timeframe */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground px-1">Timeframe</label>
          <div className="relative">
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className="w-full appearance-none bg-background border border-border/60 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/60 cursor-pointer pr-7"
            >
              {TIMEFRAMES.map(tf => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Load Chart */}
        <button
          onClick={handleLoadChart}
          disabled={!pair}
          className="w-full py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {pair ? `Analyze ${pair} / ${timeframe}` : "Select instrument first"}
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border/50">
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

import { useState } from "react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, Plus, Zap, LayoutDashboard,
  Newspaper, Menu, X, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { useChart } from "@/contexts/ChartContext";

const NAV_LINKS = [
  { href: "/",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/signals",     label: "All Signals",   icon: Activity },
  { href: "/analyze",     label: "Live Analyze",  icon: Zap },
  { href: "/news",        label: "Market News",   icon: Newspaper },
  { href: "/signals/new", label: "Manual Signal", icon: Plus },
];

const PAIR_GROUPS = [
  { label: "Cryptocurrency",     symbols: ["BTCUSD","ETHUSD","XRPUSD","BNBUSDT","SOLUSDT","ADAUSDT","DOTUSD","AVAXUSDT","DOGEUSD","MATICUSDT","LINKUSDT","LTCUSD"] },
  { label: "Commodities",        symbols: ["XAUUSD","XAGUSD","XPTUSD","USOIL","UKOIL","NATGAS","COPPER"] },
  { label: "Forex Majors",       symbols: ["EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF"] },
  { label: "Forex Crosses",      symbols: ["GBPJPY","EURJPY","EURGBP","EURCHF","EURCAD","GBPCAD","AUDCAD","CADJPY"] },
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

function RightNav() {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { pair, timeframe, setPair, setTimeframe } = useChart();

  function handlePairChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPair(e.target.value);
  }

  function handleTimeframeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setTimeframe(e.target.value);
  }

  function handleLoadChart() {
    navigate("/analyze");
    setOpen(false);
  }

  return (
    <div className="relative flex flex-col items-center w-12 border-l border-border bg-card shrink-0">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-4 w-8 h-8 flex items-center justify-center rounded-md border border-border/60 hover:bg-secondary transition-colors"
        aria-label="Toggle navigation"
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Dropdown panel — slides in from the right */}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-12 z-40 w-60 bg-card border border-border/60 rounded-l-xl shadow-2xl overflow-hidden">

            {/* Navigation links */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Menu</p>
            </div>
            <nav className="px-2 pb-2">
              {NAV_LINKS.map((link) => {
                const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full",
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

            {/* Divider */}
            <div className="mx-3 border-t border-border/50" />

            {/* Chart Controls */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Chart Controls</p>
            </div>
            <div className="px-3 pb-4 space-y-3">
              {/* Instrument */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Instrument</label>
                <div className="relative">
                  <select
                    value={pair}
                    onChange={handlePairChange}
                    className="w-full appearance-none bg-background border border-border/60 rounded-md px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/60 cursor-pointer pr-7"
                  >
                    <option value="" disabled>Select instrument</option>
                    {PAIR_GROUPS.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.symbols.map((s) => (
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
                <label className="text-xs font-semibold text-muted-foreground">Timeframe</label>
                <div className="relative">
                  <select
                    value={timeframe}
                    onChange={handleTimeframeChange}
                    className="w-full appearance-none bg-background border border-border/60 rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/60 cursor-pointer pr-7"
                  >
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf.value} value={tf.value}>{tf.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Load Chart button */}
              <button
                onClick={handleLoadChart}
                disabled={!pair}
                className="w-full mt-1 py-2 rounded-md text-xs font-bold bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {pair ? `Load ${pair} / ${timeframe}` : "Select instrument first"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen min-w-[1280px] bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,255,255,0.03),rgba(0,0,0,0))] pointer-events-none" />
        <div className="flex-1 overflow-y-auto z-10 relative">
          <div className="container mx-auto p-6 md:p-8 max-w-[1400px]">
            {children}
          </div>
        </div>
      </main>
      <RightNav />
    </div>
  );
}

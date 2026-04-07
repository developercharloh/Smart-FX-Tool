import { Link, useLocation } from "wouter";
import {
  BarChart2, Plus, Zap, LayoutDashboard,
  Settings, Newspaper, Activity, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChart } from "@/contexts/ChartContext";

const PAIR_GROUPS = [
  { label: "Commodities",        symbols: ["XAUUSD"] },
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

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { pair, timeframe, setPair, setTimeframe } = useChart();

  function handlePairChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPair(e.target.value);
    if (location !== "/analyze") navigate("/analyze");
  }

  function handleTimeframeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setTimeframe(e.target.value);
    if (location !== "/analyze") navigate("/analyze");
  }

  return (
    <aside className="w-60 border-r border-border bg-card flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
            <BarChart2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">SmartFX</span>
        </Link>
      </div>

      {/* Chart Controls */}
      <div className="px-4 py-4 flex-1 space-y-4 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
          Chart Controls
        </p>

        {/* Pair */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground px-1">Instrument</label>
          <div className="relative">
            <select
              value={pair}
              onChange={handlePairChange}
              className="w-full appearance-none bg-background border border-border/60 rounded-md px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/60 cursor-pointer pr-8"
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
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Timeframe */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground px-1">Timeframe</label>
          <div className="relative">
            <select
              value={timeframe}
              onChange={handleTimeframeChange}
              className="w-full appearance-none bg-background border border-border/60 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 cursor-pointer pr-8"
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf.value} value={tf.value}>{tf.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Active indicator */}
        {pair && (
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-xs text-muted-foreground">Active:</span>
            <span className="text-xs font-mono font-bold text-primary">{pair} / {timeframe}</span>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
          <Settings className="w-4 h-4" />
          <span className="font-medium">Settings</span>
        </div>
      </div>
    </aside>
  );
}

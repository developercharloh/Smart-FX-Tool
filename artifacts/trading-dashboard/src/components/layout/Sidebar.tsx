import { Link, useLocation } from "wouter";
import {
  BarChart2, LayoutDashboard, Zap, Newspaper, Calculator,
  CalendarDays, CreditCard, Settings, Bell, BellOff,
  ChevronDown, ChevronRight, TrendingUp, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChart } from "@/contexts/ChartContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/",           label: "Dashboard",   icon: LayoutDashboard },
  { href: "/signals",    label: "AI Scanner",  icon: Zap },
  { href: "/news",       label: "Market News", icon: Newspaper },
  { href: "/calculator", label: "Risk Calc",   icon: Calculator },
  { href: "/calendar",   label: "Econ Calendar", icon: CalendarDays },
  { href: "/trades",     label: "Transactions", icon: CreditCard },
  { href: "/setup",      label: "MT5 Setup",   icon: Settings },
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

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { pair, timeframe, setPair, setTimeframe } = useChart();
  const { permission, requestPermission } = usePushNotifications();
  const [chartOpen, setChartOpen] = useState(true);

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col h-full overflow-y-auto"
      style={{
        background: "hsl(var(--sidebar))",
        borderRight: "1px solid rgba(255,255,255,0.055)",
      }}
    >
      {/* ── Logo ── */}
      <div
        className="px-5 py-5 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <Link href="/" className="flex items-center gap-3 group select-none">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-shadow duration-300"
            style={{
              background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
              boxShadow: "0 4px 18px rgba(59,130,246,0.35)",
            }}
          >
            <BarChart2 className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold text-foreground tracking-tight leading-none">SmartFX</p>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] mt-0.5" style={{ color: "rgba(59,130,246,0.65)" }}>
              AI Trading
            </p>
          </div>
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav className="px-3 pt-4 pb-2 flex-shrink-0">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] px-3 mb-2.5" style={{ color: "rgba(148,163,184,0.4)" }}>
          Navigation
        </p>
        <div className="space-y-0.5">
          {NAV_LINKS.map(link => {
            const active = link.href === "/" ? location === "/" : location.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-[9px] rounded-[9px] text-[13px] font-medium transition-all duration-150 cursor-pointer select-none group",
                    active
                      ? "nav-active-bar bg-primary/10 text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  )}
                >
                  <link.icon
                    className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span>{link.label}</span>
                  {active && <ChevronRight className="w-3 h-3 ml-auto text-primary/60" />}
                </div>
              </Link>
            );
          })}

          {/* Push notification toggle */}
          {permission !== "unsupported" && permission !== "denied" && (
            <button
              onClick={permission !== "granted" ? requestPermission : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-[9px] rounded-[9px] text-[13px] font-medium w-full transition-all duration-150",
                permission === "granted"
                  ? "text-emerald-400 bg-emerald-500/[0.07]"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              )}
            >
              {permission === "granted"
                ? <Bell className="w-4 h-4 shrink-0 text-emerald-400" strokeWidth={1.8} />
                : <BellOff className="w-4 h-4 shrink-0" strokeWidth={1.8} />}
              {permission === "granted" ? "Alerts On" : "Enable Alerts"}
              {permission === "granted" && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
              )}
            </button>
          )}
        </div>
      </nav>

      {/* ── Chart Controls ── */}
      <div
        className="mx-3 my-2 rounded-[11px] overflow-hidden shrink-0"
        style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
      >
        <button
          onClick={() => setChartOpen(v => !v)}
          className="flex items-center justify-between w-full px-3 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary/70" strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(148,163,184,0.5)" }}>
              Chart Controls
            </span>
          </div>
          <ChevronDown className={cn("w-3 h-3 text-muted-foreground/50 transition-transform duration-200", !chartOpen && "-rotate-90")} />
        </button>

        {chartOpen && (
          <div className="px-3 pb-3 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="pt-2.5 space-y-1">
              <label className="text-[10.5px] font-semibold text-muted-foreground/70 px-0.5">Instrument</label>
              <div className="relative">
                <select
                  value={pair}
                  onChange={e => setPair(e.target.value)}
                  className="w-full appearance-none rounded-[7px] px-3 py-2 text-xs font-mono text-foreground focus:outline-none cursor-pointer pr-6"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <option value="" disabled>Select instrument</option>
                  {PAIR_GROUPS.map(g => (
                    <optgroup key={g.label} label={g.label}>
                      {g.symbols.map(s => <option key={s} value={s}>{s}</option>)}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10.5px] font-semibold text-muted-foreground/70 px-0.5">Timeframe</label>
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={e => setTimeframe(e.target.value)}
                  className="w-full appearance-none rounded-[7px] px-3 py-2 text-xs text-foreground focus:outline-none cursor-pointer pr-6"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {TIMEFRAMES.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={() => navigate("/analyze")}
              disabled={!pair}
              className="w-full py-2 rounded-[7px] text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: pair ? "linear-gradient(135deg, #3B82F6, #1D4ED8)" : undefined,
                color: "white",
                boxShadow: pair ? "0 3px 12px rgba(59,130,246,0.3)" : undefined,
              }}
            >
              {pair ? `Analyze ${pair}` : "Select instrument"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* ── EA Status pill ── */}
      <div
        className="mx-3 mb-3 px-3 py-2.5 rounded-[10px] shrink-0"
        style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.14)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
            style={{ boxShadow: "0 0 7px rgba(52,211,153,0.85)" }}
          />
          <span className="text-[11px] font-bold text-emerald-400">EA Active</span>
        </div>
        <p className="text-[10.5px] text-muted-foreground/60 leading-snug">
          Polling every 60s · Kill switch on dashboard
        </p>
      </div>

      {/* ── User footer ── */}
      <div
        className="px-4 py-3 shrink-0 flex items-center gap-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[13px] font-extrabold text-white shrink-0"
          style={{ background: "linear-gradient(135deg, #3B82F6, #7C3AED)" }}
        >C</div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold text-foreground leading-none">Charles</p>
          <p className="text-[10px] mt-0.5 font-medium" style={{ color: "rgba(59,130,246,0.7)" }}>Premium Plan</p>
        </div>
        <Link href="/settings">
          <Settings className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer shrink-0" />
        </Link>
      </div>
    </aside>
  );
}

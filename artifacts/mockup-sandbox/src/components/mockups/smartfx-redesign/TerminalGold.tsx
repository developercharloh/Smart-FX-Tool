import { useState } from "react";
import { BarChart2, TrendingUp, TrendingDown, Activity, Zap, Newspaper, Calculator, CalendarDays, CreditCard, Settings, Bell, Search, ChevronRight, ArrowUpRight, ArrowDownRight } from "lucide-react";

const NAV = [
  { label: "Dashboard",   icon: BarChart2 },
  { label: "AI Scanner",  icon: Zap, active: true },
  { label: "News",        icon: Newspaper },
  { label: "Risk Calc",   icon: Calculator },
  { label: "Calendar",    icon: CalendarDays },
  { label: "Trades",      icon: CreditCard },
  { label: "MT5 Setup",   icon: Settings },
];

const SIGNALS = [
  { pair: "EURUSD", dir: "BUY",  entry: "1.0842", sl: "1.0798", tp: "1.0930", conf: 87, tf: "M15", rr: "2.1" },
  { pair: "XAUUSD", dir: "SELL", entry: "2341.0", sl: "2355.0", tp: "2310.0", conf: 79, tf: "M15", rr: "2.2" },
  { pair: "GBPUSD", dir: "BUY",  entry: "1.2694", sl: "1.2651", tp: "1.2780", conf: 74, tf: "M15", rr: "2.0" },
  { pair: "USDJPY", dir: "SELL", entry: "153.42", sl: "154.10", tp: "152.10", conf: 68, tf: "M15", rr: "1.9" },
];

const STATS = [
  { label: "ACTIVE SIGNALS", value: "15", delta: "+3", up: true },
  { label: "WIN RATE",        value: "72%", delta: "+4%", up: true },
  { label: "TODAY P/L",       value: "+$241", delta: "+$58", up: true },
  { label: "OPEN TRADES",     value: "3",  delta: "—", up: true },
];

export function TerminalGold() {
  const [active, setActive] = useState("AI Scanner");

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#07070E", color: "#E8E8EE", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* TOP NAV */}
      <header style={{ background: "#0B0B14", borderBottom: "1px solid rgba(212,168,67,0.18)", height: 60, display: "flex", alignItems: "center", padding: "0 28px", gap: 32, flexShrink: 0 }}>
        
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, #D4A843 0%, #92661B 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(212,168,67,0.35)" }}>
            <BarChart2 size={16} color="#0B0B14" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#F5F5F5", letterSpacing: "-0.02em", lineHeight: 1.1 }}>SmartFX</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "#D4A843", letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7 }}>AI Trading</div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
          {NAV.map(n => {
            const isActive = n.label === active;
            return (
              <button key={n.label} onClick={() => setActive(n.label)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#D4A843" : "rgba(200,200,210,0.55)",
                  background: isActive ? "rgba(212,168,67,0.08)" : "transparent",
                  borderBottom: isActive ? "2px solid #D4A843" : "2px solid transparent",
                  transition: "all 0.15s",
                  letterSpacing: "0.01em",
                }}>
                <n.icon size={13} />
                {n.label}
              </button>
            );
          })}
        </nav>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.15)", borderRadius: 7, padding: "5px 12px" }}>
            <Search size={13} color="#D4A843" />
            <span style={{ fontSize: 12, color: "rgba(200,200,210,0.4)" }}>Search…</span>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Bell size={14} color="rgba(200,200,210,0.6)" />
            </div>
            <div style={{ position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: "50%", background: "#D4A843", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#0B0B14" }}>3</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 4px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,168,67,0.12)", cursor: "pointer" }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg,#D4A843,#92661B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#0B0B14" }}>C</div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#F0F0F0", lineHeight: 1.1 }}>Charles</div>
              <div style={{ fontSize: 9.5, color: "#D4A843", opacity: 0.75 }}>Premium</div>
            </div>
          </div>
        </div>
      </header>

      {/* TICKER STRIP */}
      <div style={{ background: "#0B0B14", borderBottom: "1px solid rgba(212,168,67,0.1)", padding: "6px 28px", display: "flex", gap: 28, overflowX: "auto" }}>
        {[["EUR/USD","1.0842","+0.12%",true],["GBP/USD","1.2694","+0.08%",true],["USD/JPY","153.42","-0.21%",false],["XAU/USD","2341.0","+0.55%",true],["BTC/USD","63,450","+1.2%",true],["EUR/GBP","0.8556","-0.04%",false]].map(([p,v,ch,up]) => (
          <div key={String(p)} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#D4A843", letterSpacing: "0.06em", fontFamily: "monospace" }}>{p}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#E8E8EE", fontFamily: "monospace" }}>{v}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: up ? "#34D399" : "#F87171" }}>{String(ch)}</span>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 20, background: "#D4A843", borderRadius: 2 }} />
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F5F5F5", letterSpacing: "-0.02em", margin: 0 }}>AI Scanner</h1>
            </div>
            <p style={{ fontSize: 12, color: "rgba(200,200,210,0.45)", margin: "3px 0 0 11px" }}>M15 signals · MTF confirmation active · 15 pairs monitored</p>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 8, background: "linear-gradient(135deg,#D4A843,#B8861E)", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#0B0B14", boxShadow: "0 4px 20px rgba(212,168,67,0.3)", letterSpacing: "0.01em" }}>
            <Zap size={13} />
            Run Analysis
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: "#0E0E1A", border: "1px solid rgba(212,168,67,0.12)", borderRadius: 10, padding: "16px 18px", borderTop: "2px solid #D4A843" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(212,168,67,0.6)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#F5F5F5", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10.5, color: s.up ? "#34D399" : "#F87171", marginTop: 5, fontWeight: 600 }}>{s.delta} today</div>
            </div>
          ))}
        </div>

        {/* Signals grid */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(200,200,210,0.45)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Entry Hit — EA Executing</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#0B0B14", background: "#D4A843", padding: "1px 7px", borderRadius: 10 }}>15</span>
            </div>
            <button style={{ fontSize: 11, color: "#D4A843", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>View all →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {SIGNALS.map(s => (
              <div key={s.pair} style={{ background: "#0E0E1A", border: `1px solid ${s.dir === "BUY" ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#F5F5F5", fontFamily: "monospace" }}>{s.pair}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 5, fontSize: 10.5, fontWeight: 800, background: s.dir === "BUY" ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", color: s.dir === "BUY" ? "#34D399" : "#F87171", display: "flex", alignItems: "center", gap: 3 }}>
                      {s.dir === "BUY" ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {s.dir}
                    </span>
                    <span style={{ fontSize: 10, color: "rgba(200,200,210,0.35)", background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>{s.tf}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 48, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <div style={{ width: `${s.conf}%`, height: "100%", background: s.conf >= 80 ? "#D4A843" : s.conf >= 65 ? "#F59E0B" : "#92661B", borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#D4A843" }}>{s.conf}%</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11.5 }}>
                  <div><span style={{ color: "rgba(200,200,210,0.4)" }}>Entry </span><span style={{ fontFamily: "monospace", fontWeight: 600, color: "#E8E8EE" }}>{s.entry}</span></div>
                  <div><span style={{ color: "rgba(200,200,210,0.4)" }}>SL </span><span style={{ fontFamily: "monospace", fontWeight: 600, color: "#F87171" }}>{s.sl}</span></div>
                  <div><span style={{ color: "rgba(200,200,210,0.4)" }}>TP </span><span style={{ fontFamily: "monospace", fontWeight: 600, color: "#34D399" }}>{s.tp}</span></div>
                  <div style={{ marginLeft: "auto" }}><span style={{ color: "rgba(200,200,210,0.4)" }}>R:R </span><span style={{ fontWeight: 700, color: "#D4A843" }}>{s.rr}x</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

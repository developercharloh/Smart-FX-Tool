import { useState } from "react";
import { BarChart2, Zap, Newspaper, Calculator, CalendarDays, CreditCard, Settings, Bell, Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Activity, Shield, LayoutDashboard, ChevronRight } from "lucide-react";

const SIDEBAR_NAV = [
  { label: "Dashboard",  icon: LayoutDashboard },
  { label: "AI Scanner", icon: Zap, active: true },
  { label: "News",       icon: Newspaper },
  { label: "Risk Calc",  icon: Calculator },
  { label: "Calendar",   icon: CalendarDays },
  { label: "Trades",     icon: CreditCard },
  { label: "MT5 Setup",  icon: Settings },
];

const SIGNALS = [
  { pair: "EUR/USD", dir: "BUY",  conf: 87, tf: "M15", entry: "1.0842", sl: "1.0798", tp: "1.0930", rr: "2.1", active: true },
  { pair: "XAU/USD", dir: "SELL", conf: 79, tf: "M15", entry: "2341.0", sl: "2355.0", tp: "2310.0", rr: "2.2", active: true },
  { pair: "GBP/USD", dir: "BUY",  conf: 74, tf: "M15", entry: "1.2694", sl: "1.2651", tp: "1.2780", rr: "2.0", active: false },
  { pair: "USD/JPY", dir: "SELL", conf: 68, tf: "M15", entry: "153.42", sl: "154.10", tp: "152.10", rr: "1.9", active: false },
];

export function DeepSpacePro() {
  const [active, setActive] = useState("AI Scanner");

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#0D1117", color: "#CDD5DF", minHeight: "100vh", display: "flex" }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: 220, background: "#0A0F19", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        
        {/* Logo */}
        <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}>
              <BarChart2 size={17} color="white" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#F0F6FF", letterSpacing: "-0.02em" }}>SmartFX</div>
              <div style={{ fontSize: 9.5, color: "rgba(59,130,246,0.7)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>AI Trading</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "12px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(200,210,220,0.3)", letterSpacing: "0.14em", textTransform: "uppercase", padding: "0 8px", marginBottom: 6 }}>Navigation</div>
          {SIDEBAR_NAV.map(n => {
            const isActive = n.label === active;
            return (
              <button key={n.label} onClick={() => setActive(n.label)}
                style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", width: "100%",
                  borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#F0F6FF" : "rgba(190,200,215,0.5)",
                  background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
                  transition: "all 0.15s", textAlign: "left",
                  boxShadow: isActive ? "inset 3px 0 0 #3B82F6" : "none",
                }}>
                <n.icon size={15} color={isActive ? "#3B82F6" : "rgba(190,200,215,0.4)"} />
                {n.label}
                {isActive && <ChevronRight size={12} color="#3B82F6" style={{ marginLeft: "auto" }} />}
              </button>
            );
          })}
        </nav>

        {/* EA Status card */}
        <div style={{ margin: "0 10px 14px", padding: "12px", borderRadius: 10, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 8px rgba(16,185,129,0.8)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#10B981" }}>EA Active</span>
          </div>
          <div style={{ fontSize: 10.5, color: "rgba(190,200,215,0.5)", lineHeight: 1.4 }}>3 trades open · $10,015 balance</div>
        </div>

        {/* User */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#3B82F6,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white" }}>C</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#F0F6FF" }}>Charles</div>
            <div style={{ fontSize: 10, color: "rgba(59,130,246,0.7)", fontWeight: 500 }}>Premium Plan</div>
          </div>
          <Settings size={13} color="rgba(190,200,215,0.35)" style={{ cursor: "pointer" }} />
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar */}
        <div style={{ height: 58, background: "#0D1117", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 24px", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "7px 13px", maxWidth: 320 }}>
            <Search size={13} color="rgba(190,200,215,0.35)" />
            <span style={{ fontSize: 12.5, color: "rgba(190,200,215,0.3)" }}>Search pairs, signals…</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            {/* Live ticker pills */}
            {[["EUR/USD","1.0842",true],["BTC/USD","63,450",true],["XAU/USD","2341",true]].map(([p,v,up]) => (
              <div key={String(p)} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, padding: "4px 10px" }}>
                <span style={{ fontSize: 10.5, color: "rgba(190,200,215,0.5)", fontWeight: 600 }}>{p}</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#F0F6FF" }}>{v}</span>
                <span style={{ fontSize: 9.5, color: up ? "#10B981" : "#EF4444" }}>{up ? "▲" : "▼"}</span>
              </div>
            ))}
            <div style={{ position: "relative" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Bell size={14} color="rgba(190,200,215,0.55)" />
              </div>
              <div style={{ position: "absolute", top: -3, right: -3, width: 15, height: 15, borderRadius: "50%", background: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "white" }}>3</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>

          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F0F6FF", letterSpacing: "-0.025em", margin: "0 0 4px" }}>AI Scanner</h1>
              <p style={{ fontSize: 12, color: "rgba(190,200,215,0.45)", margin: 0 }}>M15 signals · MTF confirmation · 15 pairs monitored</p>
            </div>
            <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, background: "linear-gradient(135deg,#3B82F6,#2563EB)", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "white", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}>
              <Zap size={13} />
              Run Analysis
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Active Signals", value: "15", sub: "+3 new",  color: "#3B82F6", bg: "rgba(59,130,246,0.08)" },
              { label: "Win Rate",       value: "72%", sub: "+4% vs last week", color: "#10B981", bg: "rgba(16,185,129,0.08)" },
              { label: "Today P/L",      value: "+$241", sub: "3 closed trades", color: "#10B981", bg: "rgba(16,185,129,0.08)" },
              { label: "Open Trades",    value: "3",  sub: "max 3 allowed", color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 11, color: "rgba(190,200,215,0.5)", fontWeight: 600, marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10.5, color: "rgba(190,200,215,0.35)", marginTop: 5 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Signal tabs */}
          <div style={{ marginBottom: 14, display: "flex", gap: 6 }}>
            {[{ label: "Entry Hit — EA Executing", count: 15, color: "#10B981" }, { label: "Watching for Entry", count: 5, color: "#F59E0B" }].map((tab, i) => (
              <div key={tab.label} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: i === 0 ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 0 ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)"}`, cursor: "pointer" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#10B981" : "rgba(190,200,215,0.5)" }}>{tab.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, background: i === 0 ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", color: tab.color, padding: "1px 7px", borderRadius: 8 }}>{tab.count}</span>
              </div>
            ))}
          </div>

          {/* Signals list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SIGNALS.map(s => (
              <div key={s.pair} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${s.active ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 140 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: s.dir === "BUY" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${s.dir === "BUY" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {s.dir === "BUY" ? <TrendingUp size={16} color="#10B981" /> : <TrendingDown size={16} color="#EF4444" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#F0F6FF", letterSpacing: "-0.01em", fontFamily: "monospace" }}>{s.pair}</div>
                    <div style={{ fontSize: 10.5, color: s.dir === "BUY" ? "#10B981" : "#EF4444", fontWeight: 700 }}>{s.dir} · {s.tf}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 20, flex: 1, fontSize: 12 }}>
                  <div><div style={{ fontSize: 9.5, color: "rgba(190,200,215,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Entry</div><div style={{ fontFamily: "monospace", fontWeight: 700, color: "#F0F6FF" }}>{s.entry}</div></div>
                  <div><div style={{ fontSize: 9.5, color: "rgba(190,200,215,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Stop Loss</div><div style={{ fontFamily: "monospace", fontWeight: 700, color: "#EF4444" }}>{s.sl}</div></div>
                  <div><div style={{ fontSize: 9.5, color: "rgba(190,200,215,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Take Profit</div><div style={{ fontFamily: "monospace", fontWeight: 700, color: "#10B981" }}>{s.tp}</div></div>
                  <div><div style={{ fontSize: 9.5, color: "rgba(190,200,215,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>R:R</div><div style={{ fontFamily: "monospace", fontWeight: 700, color: "#3B82F6" }}>{s.rr}x</div></div>
                </div>
                <div>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: `conic-gradient(${s.conf >= 80 ? "#3B82F6" : s.conf >= 65 ? "#10B981" : "#F59E0B"} ${s.conf * 3.6}deg, rgba(255,255,255,0.06) 0)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0D1117", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#F0F6FF" }}>{s.conf}%</div>
                  </div>
                </div>
                <div style={{ padding: "3px 10px", borderRadius: 7, background: s.active ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${s.active ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`, fontSize: 10.5, fontWeight: 700, color: s.active ? "#10B981" : "#F59E0B" }}>
                  {s.active ? "● ACTIVE" : "◉ PENDING"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

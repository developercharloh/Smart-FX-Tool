import { useState } from "react";
import { BarChart2, TrendingUp, TrendingDown, Zap, Newspaper, Calculator, CalendarDays, CreditCard, Settings, Bell, Search, ArrowUpRight, ArrowDownRight, Shield, Activity } from "lucide-react";

const NAV = [
  { label: "Dashboard",  icon: BarChart2 },
  { label: "AI Scanner", icon: Zap, active: true },
  { label: "News",       icon: Newspaper },
  { label: "Risk Calc",  icon: Calculator },
  { label: "Calendar",   icon: CalendarDays },
  { label: "Trades",     icon: CreditCard },
  { label: "MT5 Setup",  icon: Settings },
];

const SIGNALS = [
  { pair: "EUR/USD", dir: "BUY",  entry: "1.0842", sl: "1.0798", tp: "1.0930", conf: 87, tf: "M15", rr: "2.1", status: "ACTIVE" },
  { pair: "XAU/USD", dir: "SELL", entry: "2341.0", sl: "2355.0", tp: "2310.0", conf: 79, tf: "M15", rr: "2.2", status: "ACTIVE" },
  { pair: "GBP/USD", dir: "BUY",  entry: "1.2694", sl: "1.2651", tp: "1.2780", conf: 74, tf: "M15", rr: "2.0", status: "PENDING" },
  { pair: "USD/JPY", dir: "SELL", entry: "153.42", sl: "154.10", tp: "152.10", conf: 68, tf: "M15", rr: "1.9", status: "PENDING" },
];

export function NeonMatrix() {
  const [active, setActive] = useState("AI Scanner");

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#04040D", color: "#E0E0F0", minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      
      {/* Background grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,255,140,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,140,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
      
      {/* Glow orbs */}
      <div style={{ position: "absolute", top: -100, left: "20%", width: 400, height: 400, borderRadius: "50%", background: "rgba(0,255,136,0.04)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 200, right: "10%", width: 300, height: 300, borderRadius: "50%", background: "rgba(124,58,237,0.05)", filter: "blur(60px)", pointerEvents: "none" }} />

      {/* TOP NAV */}
      <header style={{ background: "rgba(6,6,16,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,255,136,0.12)", height: 62, display: "flex", alignItems: "center", padding: "0 24px", gap: 0, flexShrink: 0, position: "relative", zIndex: 10 }}>
        
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.3)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(0,255,136,0.15), inset 0 0 12px rgba(0,255,136,0.05)" }}>
            <BarChart2 size={16} color="#00FF88" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#F0F0FF", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Smart<span style={{ color: "#00FF88" }}>FX</span></div>
            <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(0,255,136,0.5)", letterSpacing: "0.2em", textTransform: "uppercase" }}>AI SYSTEM</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 1, flex: 1, justifyContent: "center" }}>
          {NAV.map(n => {
            const isActive = n.label === active;
            return (
              <button key={n.label} onClick={() => setActive(n.label)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
                  borderRadius: 8, border: isActive ? "1px solid rgba(0,255,136,0.25)" : "1px solid transparent",
                  cursor: "pointer", fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#00FF88" : "rgba(180,180,200,0.5)",
                  background: isActive ? "rgba(0,255,136,0.07)" : "transparent",
                  boxShadow: isActive ? "0 0 16px rgba(0,255,136,0.1)" : "none",
                  transition: "all 0.15s",
                  position: "relative",
                }}>
                <n.icon size={13} />
                {n.label}
                {isActive && <span style={{ position: "absolute", bottom: -1, left: "20%", right: "20%", height: 2, background: "#00FF88", borderRadius: 2, boxShadow: "0 0 8px #00FF88" }} />}
              </button>
            );
          })}
        </nav>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.12)", borderRadius: 8, padding: "5px 11px" }}>
            <Search size={12} color="rgba(0,255,136,0.5)" />
            <span style={{ fontSize: 11.5, color: "rgba(180,180,200,0.35)" }}>Search…</span>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={14} color="rgba(180,180,200,0.55)" />
            </div>
            <div style={{ position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 10px rgba(0,255,136,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#04040D" }}>3</div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,rgba(0,255,136,0.2),rgba(124,58,237,0.2))", border: "1px solid rgba(0,255,136,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800, color: "#00FF88", boxShadow: "0 0 14px rgba(0,255,136,0.12)" }}>C</div>
        </div>
      </header>

      {/* Live prices ticker */}
      <div style={{ background: "rgba(0,255,136,0.03)", borderBottom: "1px solid rgba(0,255,136,0.07)", padding: "5px 24px", display: "flex", gap: 24, position: "relative", zIndex: 10 }}>
        {[["EUR/USD","1.0842","+0.12%",true],["GBP/USD","1.2694","+0.08%",true],["USD/JPY","153.42","-0.21%",false],["XAU/USD","2341.0","+0.55%",true],["BTC/USD","63,450","+1.2%",true]].map(([p,v,ch,up]) => (
          <div key={String(p)} style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 6px #00FF88", flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,255,136,0.7)", fontFamily: "monospace" }}>{p}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#E0E0F0", fontFamily: "monospace" }}>{v}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: up ? "#00FF88" : "#FF4D6D" }}>{String(ch)}</span>
          </div>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18, position: "relative", zIndex: 10 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF88", boxShadow: "0 0 8px #00FF88", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#00FF88", letterSpacing: "0.1em" }}>LIVE SCANNING</span>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#F0F0FF", letterSpacing: "-0.02em", margin: 0 }}>AI Scanner</h1>
            </div>
            <p style={{ fontSize: 11.5, color: "rgba(180,180,200,0.4)", margin: "4px 0 0" }}>M15 signals · H1/H4 trend confirmation · 15 pairs</p>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#00FF88", boxShadow: "0 0 20px rgba(0,255,136,0.12)", letterSpacing: "0.02em" }}>
            <Zap size={13} />
            Run Analysis
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "ACTIVE SIGNALS", value: "15", color: "#00FF88" },
            { label: "WIN RATE",       value: "72%", color: "#00FF88" },
            { label: "TODAY P/L",      value: "+$241", color: "#00FF88" },
            { label: "OPEN TRADES",    value: "3",   color: "#8B5CF6" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 16px", backdropFilter: "blur(8px)" }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(180,180,200,0.4)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: "-0.02em", lineHeight: 1, textShadow: `0 0 20px ${s.color}60` }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* 2-col layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Active signals */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: 14, padding: "16px", backdropFilter: "blur(8px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Activity size={14} color="#00FF88" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F0F0FF" }}>Entry Hit — EA Executing</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(0,255,136,0.15)", color: "#00FF88", padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(0,255,136,0.25)" }}>15</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SIGNALS.filter(s => s.status === "ACTIVE").map(s => (
                <div key={s.pair} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${s.dir === "BUY" ? "rgba(0,255,136,0.15)" : "rgba(255,77,109,0.15)"}`, borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: "#F0F0FF" }}>{s.pair}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: s.dir === "BUY" ? "#00FF88" : "#FF4D6D", background: s.dir === "BUY" ? "rgba(0,255,136,0.1)" : "rgba(255,77,109,0.1)", padding: "1px 7px", borderRadius: 5 }}>{s.dir}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#00FF88" }}>{s.conf}%</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
                    <span style={{ color: "rgba(180,180,200,0.4)" }}>Entry <span style={{ fontFamily: "monospace", color: "#E0E0F0", fontWeight: 600 }}>{s.entry}</span></span>
                    <span style={{ color: "rgba(180,180,200,0.4)" }}>SL <span style={{ fontFamily: "monospace", color: "#FF4D6D", fontWeight: 600 }}>{s.sl}</span></span>
                    <span style={{ color: "rgba(180,180,200,0.4)" }}>TP <span style={{ fontFamily: "monospace", color: "#00FF88", fontWeight: 600 }}>{s.tp}</span></span>
                    <span style={{ marginLeft: "auto", color: "#8B5CF6", fontWeight: 700 }}>R:R {s.rr}x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 14, padding: "16px", backdropFilter: "blur(8px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Shield size={14} color="#8B5CF6" />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#F0F0FF" }}>Watching for Entry</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(124,58,237,0.15)", color: "#8B5CF6", padding: "2px 8px", borderRadius: 10, border: "1px solid rgba(124,58,237,0.25)" }}>5</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SIGNALS.filter(s => s.status === "PENDING").map(s => (
                <div key={s.pair} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(124,58,237,0.12)", borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: "#F0F0FF" }}>{s.pair}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: s.dir === "BUY" ? "#00FF88" : "#FF4D6D", background: s.dir === "BUY" ? "rgba(0,255,136,0.1)" : "rgba(255,77,109,0.1)", padding: "1px 7px", borderRadius: 5 }}>{s.dir}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#8B5CF6", background: "rgba(124,58,237,0.1)", padding: "1px 6px", borderRadius: 4, border: "1px solid rgba(124,58,237,0.2)" }}>PENDING</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#8B5CF6" }}>{s.conf}%</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
                    <span style={{ color: "rgba(180,180,200,0.4)" }}>Entry <span style={{ fontFamily: "monospace", color: "#E0E0F0", fontWeight: 600 }}>{s.entry}</span></span>
                    <span style={{ color: "rgba(180,180,200,0.4)" }}>SL <span style={{ fontFamily: "monospace", color: "#FF4D6D", fontWeight: 600 }}>{s.sl}</span></span>
                    <span style={{ color: "rgba(180,180,200,0.4)" }}>TP <span style={{ fontFamily: "monospace", color: "#00FF88", fontWeight: 600 }}>{s.tp}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

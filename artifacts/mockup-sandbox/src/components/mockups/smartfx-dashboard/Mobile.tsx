import { useState, useEffect } from "react";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer } from "recharts";
import {
  Bell, TrendingUp, Share2, BarChart2, Activity,
  Home, Zap, Wrench, User, Clock,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   DESIGN TOKENS — exact match to reference image
───────────────────────────────────────────────────────────────── */
const BG        = "#080B18";      // page background
const CARD      = "#0F1229";      // card background
const CARD2     = "#131627";      // slightly lighter card (inner cells)
const BORDER    = "rgba(255,255,255,0.07)";
const PURPLE    = "#6C5CE7";
const PURPLE_LT = "#A29BFE";
const GREEN     = "#00CFA1";
const RED       = "#FF3D57";
const GOLD      = "#FF9F43";
const BLUE      = "#4FC3F7";
const MUTED     = "#636E82";
const TEXT      = "#FFFFFF";
const TEXT2     = "#A0AEC0";

/* ─────────────────────────────────────────────────────────────────
   FLAG IMAGES — real circular country flags via flagcdn.com
   (served as HTTPS public CDN, no auth needed)
───────────────────────────────────────────────────────────────── */
const FLAGS: Record<string, { code: string; label: string }> = {
  "EUR/USD": { code: "eu",   label: "EU" },
  "GBP/USD": { code: "gb",   label: "GB" },
  "XAU/USD": { code: "xau",  label: "XAU" },  // gold — custom below
  "USD/JPY": { code: "us",   label: "US" },
  "EUR/GBP": { code: "eu",   label: "EU" },
  "AUD/USD": { code: "au",   label: "AU" },
};

function FlagCircle({ pair, size = 48 }: { pair: string; size?: number }) {
  const info = FLAGS[pair];
  if (!info) return <div style={{ width: size, height: size, borderRadius: "50%", background: CARD2 }} />;

  if (info.code === "xau") {
    // Gold coin icon
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg, #f7971e, #ffd200)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.52, boxShadow: `0 0 0 2px #FF9F4333`,
      }}>
        🥇
      </div>
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      overflow: "hidden", flexShrink: 0,
      boxShadow: `0 0 0 2px ${BORDER}`,
      background: CARD2,
    }}>
      <img
        src={`https://flagcdn.com/${size >= 40 ? "64x48" : "32x24"}/${info.code}.png`}
        alt={pair}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MOCK DATA
───────────────────────────────────────────────────────────────── */
const STATS = [
  { label: "Total Signals",   value: "1,248",      sub: "This Month", icon: BarChart2,   color: PURPLE,  spark: [30,45,28,60,52,78,65,90,72,95,80,100] },
  { label: "Win Rate",        value: "87.6%",       sub: "This Month", icon: Activity,    color: GREEN,   spark: [50,60,55,70,65,80,75,85,78,90,85,88] },
  { label: "Total Profit",    value: "+$3,482.21",  sub: "This Month", icon: TrendingUp,  color: BLUE,    spark: [100,180,120,250,200,310,280,380,320,420,390,480] },
  { label: "Profit Accuracy", value: "92.3%",       sub: "This Month", icon: Activity,    color: GOLD,    spark: [60,72,68,80,75,88,82,90,87,93,90,92] },
];

const LIVE = {
  pair: "EUR/USD", desc: "Euro / US Dollar", cat: "MAJOR",
  dir: "BUY", conf: 92, tf: "M15",
  entry: 1.08234, tp1: 1.08560, tp2: 1.08890, sl: 1.07900,
  trend: "BULLISH", vol: "MEDIUM", time: "11:30 AM",
};

const RECENT = [
  { pair: "GBP/USD", date: "28 May • 10:45 AM", dir: "SELL", entry: "1.27450", tp: "1.27000", sl: "1.27950", result: "WIN"  },
  { pair: "XAU/USD", date: "28 May • 09:32 AM", dir: "BUY",  entry: "2336.45", tp: "2345.00", sl: "2328.00", result: "WIN"  },
  { pair: "USD/JPY", date: "28 May • 08:15 AM", dir: "BUY",  entry: "156.234", tp: "156.900", sl: "155.700", result: "LOSS" },
];

/* ─────────────────────────────────────────────────────────────────
   CANDLESTICK SVG
───────────────────────────────────────────────────────────────── */
const RAW_CANDLES = [
  {o:1.0785,h:1.0800,l:1.0780,c:1.0795},{o:1.0795,h:1.0810,l:1.0790,c:1.0802},
  {o:1.0802,h:1.0812,l:1.0796,c:1.0807},{o:1.0807,h:1.0820,l:1.0800,c:1.0815},
  {o:1.0815,h:1.0825,l:1.0808,c:1.0810},{o:1.0810,h:1.0818,l:1.0803,c:1.0816},
  {o:1.0816,h:1.0828,l:1.0810,c:1.0822},{o:1.0822,h:1.0835,l:1.0815,c:1.0830},
  {o:1.0830,h:1.0842,l:1.0824,c:1.0826},{o:1.0826,h:1.0834,l:1.0818,c:1.0831},
  {o:1.0831,h:1.0845,l:1.0825,c:1.0840},{o:1.0840,h:1.0852,l:1.0833,c:1.0847},
  {o:1.0847,h:1.0858,l:1.0840,c:1.0852},{o:1.0852,h:1.0864,l:1.0844,c:1.0860},
  {o:1.0860,h:1.0870,l:1.0852,c:1.0856},{o:1.0856,h:1.0865,l:1.0848,c:1.0862},
  {o:1.0862,h:1.0875,l:1.0855,c:1.0868},{o:1.0868,h:1.0878,l:1.0860,c:1.08234},
  {o:1.08234,h:1.0875,l:1.0818,c:1.0840},
];

const TIME_LABELS = ["18:00","21:00","28","03:00","06:00","09:00","12:00"];

function CandleChart({ width = 344, height = 118 }: { width?: number; height?: number }) {
  const ps = RAW_CANDLES.flatMap(c => [c.l, c.h]);
  const lo = Math.min(...ps) - 0.0004;
  const hi = Math.max(...ps) + 0.0004;
  const sy = (p: number) => height - ((p - lo) / (hi - lo)) * height;
  const cw = width / RAW_CANDLES.length;
  const curY = sy(1.08234);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="maGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={PURPLE} stopOpacity="0.2" />
          <stop offset="100%" stopColor={PURPLE_LT} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {/* MA line */}
      <polyline
        points={RAW_CANDLES.map((c, i) => `${i * cw + cw / 2},${sy((c.o + c.c) / 2)}`).join(" ")}
        fill="none" stroke={PURPLE} strokeWidth="1.8" opacity="0.9"
      />
      {/* Candles */}
      {RAW_CANDLES.map((c, i) => {
        const bull = c.c >= c.o;
        const col  = bull ? GREEN : RED;
        const top  = sy(Math.max(c.o, c.c));
        const bot  = sy(Math.min(c.o, c.c));
        const ht   = Math.max(bot - top, 1.2);
        const cx   = i * cw + cw / 2;
        return (
          <g key={i}>
            <line x1={cx} y1={sy(c.h)} x2={cx} y2={sy(c.l)} stroke={col} strokeWidth="0.8" />
            <rect x={i * cw + cw * 0.15} y={top} width={cw * 0.7} height={ht}
              fill={col} opacity="0.88" rx="0.6" />
          </g>
        );
      })}
      {/* Current price dashed line + tag */}
      <line x1="0" y1={curY} x2={width} y2={curY}
        stroke={GOLD} strokeWidth="0.8" strokeDasharray="3,3" opacity="0.75" />
      <rect x={width - 56} y={curY - 9} width={56} height={18} rx="4" fill={GOLD} />
      <text x={width - 28} y={curY + 5} textAnchor="middle"
        fontSize="7.5" fill="#000" fontWeight="700">1.08234</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COUNTDOWN RING
───────────────────────────────────────────────────────────────── */
function CountdownRing({ size = 68 }: { size?: number }) {
  const [s, setS] = useState(28);
  useEffect(() => {
    const t = setInterval(() => setS(p => (p <= 0 ? 899 : p - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const pct  = s / 900;
  const mm   = String(Math.floor(s / 60)).padStart(2, "0");
  const ss   = String(s % 60).padStart(2, "0");

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1A1E38" strokeWidth="3.5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={PURPLE} strokeWidth="3.5"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 8, color: MUTED, fontWeight: 600, lineHeight: 1, letterSpacing: "0.04em" }}>NEXT UPDATE</span>
        <span style={{ fontSize: 13, color: TEXT, fontWeight: 900, marginTop: 2 }}>{mm}:{ss}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SENTIMENT GAUGE
───────────────────────────────────────────────────────────────── */
function Gauge() {
  const W = 58, H = 34, r = 22, cx = W / 2, cy = 34;
  const arc = (start: number, end: number, col: string) => {
    const s = (start * Math.PI) / 180, e = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s - Math.PI), y1 = cy + r * Math.sin(s - Math.PI);
    const x2 = cx + r * Math.cos(e - Math.PI), y2 = cy + r * Math.sin(e - Math.PI);
    const lg = end - start > 180 ? 1 : 0;
    return <path d={`M${x1},${y1} A${r},${r},0,${lg},1,${x2},${y2}`}
      fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" />;
  };
  const nAngle = -15; // ~75% positive
  const nx = cx + (r - 2) * Math.cos((nAngle * Math.PI) / 180);
  const ny = cy + (r - 2) * Math.sin((nAngle * Math.PI) / 180);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {arc(0, 60, RED)}
      {arc(60, 120, GOLD)}
      {arc(120, 180, GREEN)}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={TEXT} strokeWidth="2" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="3" fill={TEXT} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, color, spark }: typeof STATS[0]) {
  const gradId = `g_${label.replace(/\s+/g, "")}`;
  return (
    <div style={{
      background: CARD, borderRadius: 20, padding: "14px 14px 10px",
      border: `1px solid ${BORDER}`, position: "relative", overflow: "hidden",
    }}>
      {/* bg glow */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 80, height: 80,
        borderRadius: "50%", background: color, opacity: 0.07,
        transform: "translate(20px,-20px)",
      }} />
      <div style={{
        width: 36, height: 36, borderRadius: 12,
        background: `${color}1A`, display: "flex", alignItems: "center",
        justifyContent: "center", marginBottom: 10,
        boxShadow: `0 0 12px ${color}33`,
      }}>
        <Icon size={15} color={color} />
      </div>
      <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 900, color: TEXT, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{sub}</div>
      <div style={{ marginTop: 8, height: 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark.map((v, i) => ({ i, v }))}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8}
              fill={`url(#${gradId})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   BOTTOM NAV
───────────────────────────────────────────────────────────────── */
const NAV = [
  { icon: Home,     label: "Dashboard" },
  { icon: Zap,      label: "Signals"   },
  { icon: BarChart2,label: "Analysis"  },
  { icon: Wrench,   label: "Tools"     },
  { icon: User,     label: "Account"   },
];

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export function Mobile() {
  const [nav,  setNav]  = useState(0);
  const [tf,   setTF]   = useState("M15");
  const TFS = ["M5","M15","H1","H4","D1"];

  const cell = (lbl: string, val: string, col: string) => (
    <div style={{ background: "#0D1024", borderRadius: 10, padding: "6px 8px" }}>
      <div style={{ fontSize: 7.5, color: MUTED, marginBottom: 3, lineHeight: 1 }}>{lbl}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: col }}>{val}</div>
    </div>
  );

  return (
    <div style={{
      width: 390, minHeight: "100vh", background: BG,
      fontFamily: "'Inter', -apple-system, sans-serif", color: TEXT,
      overflowX: "hidden", overflowY: "auto",
    }}>
      {/* ── STATUS BAR ───────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 18px 4px", fontSize: 11, color: TEXT2, fontWeight: 600 }}>
        <span>9:41</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ letterSpacing: 1 }}>▪▪▪</span><span>WiFi</span><span>🔋</span>
        </div>
      </div>

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 18px 12px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #6C5CE7 0%, #4FC3F7 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: "#fff",
            boxShadow: "0 4px 16px rgba(108,92,231,0.45)",
          }}>S</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.04em", lineHeight: 1.2 }}>
              <span style={{ color: PURPLE }}>SMART </span>
              <span style={{ color: TEXT }}>FX</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 900, color: TEXT, lineHeight: 1.1 }}>TOOL</div>
            <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>Smart Signals. Smarter Trades.</div>
          </div>
        </div>

        {/* Right: bell + user */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <Bell size={19} color={TEXT2} />
            <div style={{
              position: "absolute", top: -4, right: -4,
              width: 15, height: 15, borderRadius: "50%",
              background: PURPLE, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff",
            }}>3</div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: CARD, borderRadius: 14, padding: "6px 10px",
            border: `1px solid ${BORDER}`,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg,#6C5CE7,#4FC3F7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, overflow: "hidden",
            }}>
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Charloh&backgroundColor=6C5CE7"
                width={30} height={30} alt="avatar"
                style={{ borderRadius: "50%", objectFit: "cover" }}
                onError={(e: any) => { e.target.style.display = "none"; }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, lineHeight: 1 }}>Trader Charloh</div>
              <div style={{ marginTop: 3 }}>
                <span style={{
                  fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
                  background: "linear-gradient(90deg,#6C5CE7,#A29BFE)", color: "#fff",
                  letterSpacing: "0.06em",
                }}>PREMIUM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WALLETS ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, padding: "0 18px 14px" }}>
        {[
          { lbl: "Demo Wallet", val: "$10,000.00", col: BLUE },
          { lbl: "Real Wallet",  val: "$0.00",     col: GREEN },
        ].map(w => (
          <div key={w.lbl} style={{
            flex: 1, background: CARD, borderRadius: 14, padding: "10px 12px",
            border: `1px solid ${w.col}22`, display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.col,
              boxShadow: `0 0 6px ${w.col}` }} />
            <div>
              <div style={{ fontSize: 9, color: MUTED }}>{w.lbl}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: w.col, marginTop: 1 }}>{w.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── STATS GRID ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 18px 14px" }}>
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── LIVE SIGNAL ──────────────────────────────────────────── */}
      <div style={{ margin: "0 18px 14px" }}>
        <div style={{
          background: CARD, borderRadius: 20, overflow: "hidden",
          border: `1px solid ${BORDER}`,
          boxShadow: `0 0 30px rgba(108,92,231,0.08)`,
        }}>
          {/* header row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 12px",
            borderBottom: `1px solid ${BORDER}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", background: RED,
                boxShadow: `0 0 6px ${RED}`,
                animation: "pulse 1.2s infinite",
              }} />
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em" }}>🔥 LIVE SIGNAL</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN }} />
              <span style={{ fontSize: 10, color: GREEN, fontWeight: 600 }}>Market Open</span>
            </div>
          </div>

          {/* body */}
          <div style={{ padding: "14px 16px" }}>
            {/* Pair + Timer */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <FlagCircle pair={LIVE.pair} size={52} />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: TEXT }}>{LIVE.pair}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{LIVE.desc}</div>
                  <div style={{
                    display: "inline-block", marginTop: 5,
                    fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                    background: `${PURPLE}1A`, color: PURPLE_LT,
                    border: `1px solid ${PURPLE}44`,
                  }}>{LIVE.cat}</div>
                </div>
              </div>
              <CountdownRing size={66} />
            </div>

            {/* Direction + Confidence */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div style={{ background: CARD2, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, color: MUTED, marginBottom: 5, fontWeight: 600 }}>DIRECTION</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: GREEN }}>{LIVE.dir}</span>
                  <ArrowUpRight size={18} color={GREEN} />
                </div>
              </div>
              <div style={{ background: CARD2, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, color: MUTED, marginBottom: 5, fontWeight: 600 }}>CONFIDENCE</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: PURPLE }}>{LIVE.conf}%</div>
              </div>
            </div>

            {/* Price grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5, marginBottom: 10 }}>
              {cell("ENTRY PRICE",   LIVE.entry.toFixed(5), TEXT2)}
              {cell("TAKE PROFIT 1", LIVE.tp1.toFixed(5),   GREEN)}
              {cell("TAKE PROFIT 2", LIVE.tp2.toFixed(5),   GREEN)}
              {cell("STOP LOSS",     LIVE.sl.toFixed(5),    RED)}
              {cell("TIMEFRAME",     LIVE.tf,               PURPLE_LT)}
            </div>

            {/* Trend / Vol / Time */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
              {[
                { icon: TrendingUp, lbl: "TREND",      val: LIVE.trend, col: GREEN },
                { icon: Activity,   lbl: "VOLATILITY", val: LIVE.vol,   col: GOLD  },
                { icon: Clock,      lbl: "TIME",       val: LIVE.time,  col: BLUE  },
              ].map(r => (
                <div key={r.lbl} style={{
                  background: CARD2, borderRadius: 12, padding: "8px 10px",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <r.icon size={13} color={r.col} />
                  <div>
                    <div style={{ fontSize: 7.5, color: MUTED }}>{r.lbl}</div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: r.col }}>{r.val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{
                flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                background: "linear-gradient(90deg,#6C5CE7,#A29BFE)",
                color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <BarChart2 size={13} /> View Full Analysis ↗
              </button>
              <button style={{
                padding: "11px 16px", borderRadius: 12,
                background: CARD2, border: `1px solid ${BORDER}`,
                color: TEXT2, fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Share2 size={13} /> Share Signal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MARKET OVERVIEW ──────────────────────────────────────── */}
      <div style={{ margin: "0 18px 14px" }}>
        <div style={{ background: CARD, borderRadius: 20, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          {/* header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px 10px",
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em" }}>MARKET OVERVIEW</span>
            <div style={{ display: "flex", gap: 4 }}>
              {TFS.map(t => (
                <button key={t} onClick={() => setTF(t)} style={{
                  fontSize: 9, fontWeight: 700, padding: "4px 8px", borderRadius: 7, border: "none",
                  background: tf === t ? PURPLE : CARD2,
                  color: tf === t ? "#fff" : MUTED, cursor: "pointer",
                }}>{t}</button>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 14px 4px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TEXT }}>EUR/USD • {tf}</div>
            <div style={{ fontSize: 10, color: GREEN }}>1.08234 +0.00124 (+0.11%)</div>
          </div>

          <div style={{ padding: "6px 12px 4px" }}><CandleChart /></div>

          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "2px 16px 8px",
          }}>
            {TIME_LABELS.map(t => (
              <span key={t} style={{ fontSize: 8, color: MUTED }}>{t}</span>
            ))}
          </div>

          {/* Indicators */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10,
            padding: "10px 16px 14px",
            borderTop: `1px solid ${BORDER}`,
          }}>
            {[
              { lbl: "RSI (14)", val: "61.45",   d: [45,52,48,58,55,61,59,65,62,61], col: PURPLE },
              { lbl: "MACD",     val: "0.00045", d: [-2,-1,0,1,2,3,4,5,4,5],         col: BLUE   },
            ].map(ind => (
              <div key={ind.lbl}>
                <div style={{ fontSize: 8, color: MUTED, marginBottom: 2 }}>{ind.lbl}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT }}>{ind.val}</div>
                <div style={{ height: 22, marginTop: 3 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ind.d.map((v,i)=>({i,v}))}>
                      <Line type="monotone" dataKey="v" stroke={ind.col} strokeWidth={1.2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 8, color: MUTED, marginBottom: 2 }}>TREND</div>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: GREEN }}>BULLISH</span>
                <ArrowUpRight size={10} color={GREEN} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: MUTED, marginBottom: 2 }}>SENTIMENT</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: GREEN }}>POSITIVE</div>
              <Gauge />
            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT SIGNALS ───────────────────────────────────────── */}
      <div style={{ margin: "0 18px 110px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em" }}>RECENT SIGNALS</span>
          <span style={{ fontSize: 10, color: PURPLE, fontWeight: 700 }}>View All</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {RECENT.map((sig, i) => (
            <div key={i} style={{
              background: CARD, borderRadius: 16, padding: "12px 14px",
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FlagCircle pair={sig.pair} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{sig.pair}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 7,
                      background: sig.result === "WIN" ? `${GREEN}18` : `${RED}18`,
                      color: sig.result === "WIN" ? GREEN : RED,
                      border: `1px solid ${sig.result === "WIN" ? GREEN : RED}44`,
                    }}>{sig.result}</span>
                  </div>
                  <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{sig.date}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      {sig.dir === "BUY"
                        ? <ArrowUpRight size={12} color={GREEN} />
                        : <ArrowDownRight size={12} color={RED} />}
                      <span style={{ fontSize: 10, fontWeight: 700,
                        color: sig.dir === "BUY" ? GREEN : RED }}>{sig.dir}</span>
                    </div>
                    {[
                      { l: "Entry Price", v: sig.entry },
                      { l: "Take Profit", v: sig.tp },
                      { l: "Stop Loss",   v: sig.sl },
                    ].map(p => (
                      <div key={p.l}>
                        <div style={{ fontSize: 7.5, color: MUTED }}>{p.l}</div>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: TEXT }}>{p.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM NAV ───────────────────────────────────────────── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: 390, padding: "6px 12px 18px",
        background: `linear-gradient(to top, ${BG} 70%, transparent)`,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-around",
          background: CARD, borderRadius: 20, padding: "8px 4px",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
        }}>
          {NAV.map((n, i) => (
            <button key={n.label} onClick={() => setNav(i)} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, padding: "6px 14px", borderRadius: 12, border: "none",
              background: nav === i ? `${PURPLE}18` : "transparent",
              cursor: "pointer",
            }}>
              <n.icon size={19} color={nav === i ? PURPLE : MUTED} />
              <span style={{
                fontSize: 9, fontWeight: 700,
                color: nav === i ? PURPLE : MUTED,
              }}>{n.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

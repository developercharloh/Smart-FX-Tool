import { useState, useEffect } from "react";
import {
  AreaChart, Area, LineChart, Line, ResponsiveContainer,
  ComposedChart, Bar, XAxis, YAxis, Tooltip
} from "recharts";
import {
  Bell, TrendingUp, TrendingDown, ChevronRight, Share2,
  BarChart2, Activity, Home, Zap, BookOpen, Wrench, User,
  Clock, AlertCircle, CheckCircle2, ArrowUpRight, ArrowDownRight,
  RefreshCw
} from "lucide-react";

// ── Mock data (mirrors real API shape) ────────────────────────────
const STATS = [
  { label: "Total Signals", value: "1,248", sub: "This Month", icon: BarChart2, color: "#7C6FF7", sparkColor: "#7C6FF7", spark: [30,45,28,60,52,78,65,90,72,95,80,100] },
  { label: "Win Rate",       value: "87.6%", sub: "This Month", icon: CheckCircle2, color: "#00C896", sparkColor: "#00C896", spark: [50,60,55,70,65,80,75,85,78,90,85,88] },
  { label: "Total Profit",   value: "+$3,482.21", sub: "This Month", icon: TrendingUp, color: "#4FC3F7", sparkColor: "#4FC3F7", spark: [100,180,120,250,200,310,280,380,320,420,390,480] },
  { label: "Profit Accuracy",value: "92.3%", sub: "This Month", icon: Activity, color: "#FF9F43", sparkColor: "#FF9F43", spark: [60,72,68,80,75,88,82,90,87,93,90,92] },
];

const LIVE_SIGNAL = {
  pair: "EUR/USD", desc: "Euro / US Dollar", category: "MAJOR",
  direction: "BUY", confidence: 92, tf: "M15",
  entry: 1.08234, tp1: 1.08560, tp2: 1.08890,
  sl: 1.07900, trend: "BULLISH", volatility: "MEDIUM", time: "11:30 AM",
};

const RECENT_SIGNALS = [
  { pair: "GBP/USD", date: "28 May • 10:45 AM", dir: "SELL", entry: 1.27450, tp: 1.27000, sl: 1.27950, result: "WIN" },
  { pair: "XAU/USD", date: "28 May • 09:32 AM", dir: "BUY",  entry: 2336.45, tp: 2345.00, sl: 2328.00, result: "WIN" },
  { pair: "USD/JPY", date: "28 May • 08:15 AM", dir: "BUY",  entry: 156.234, tp: 156.900, sl: 155.700, result: "LOSS" },
];

// ── Candlestick chart data ─────────────────────────────────────────
const CANDLES = [
  { t:"18:00",o:1.0785,h:1.0800,l:1.0780,c:1.0795 },
  { t:"19:00",o:1.0795,h:1.0810,l:1.0790,c:1.0805 },
  { t:"20:00",o:1.0805,h:1.0815,l:1.0798,c:1.0800 },
  { t:"21:00",o:1.0800,h:1.0812,l:1.0792,c:1.0808 },
  { t:"22:00",o:1.0808,h:1.0820,l:1.0802,c:1.0815 },
  { t:"23:00",o:1.0815,h:1.0825,l:1.0808,c:1.0812 },
  { t:"00:00",o:1.0812,h:1.0820,l:1.0805,c:1.0818 },
  { t:"01:00",o:1.0818,h:1.0830,l:1.0812,c:1.0825 },
  { t:"02:00",o:1.0825,h:1.0835,l:1.0818,c:1.0820 },
  { t:"03:00",o:1.0820,h:1.0828,l:1.0810,c:1.0823 },
  { t:"04:00",o:1.0823,h:1.0832,l:1.0818,c:1.0828 },
  { t:"05:00",o:1.0828,h:1.0840,l:1.0822,c:1.0835 },
  { t:"06:00",o:1.0835,h:1.0845,l:1.0828,c:1.0840 },
  { t:"07:00",o:1.0840,h:1.0850,l:1.0832,c:1.0845 },
  { t:"08:00",o:1.0845,h:1.0855,l:1.0838,c:1.0848 },
  { t:"09:00",o:1.0848,h:1.0858,l:1.0840,c:1.0852 },
  { t:"10:00",o:1.0852,h:1.0862,l:1.0845,c:1.0858 },
  { t:"11:00",o:1.0858,h:1.0868,l:1.0850,c:1.08234 },
  { t:"12:00",o:1.08234,h:1.0872,l:1.0818,c:1.0840 },
];

// ── Pair flags ────────────────────────────────────────────────────
const FLAG: Record<string, string> = {
  "EUR/USD": "🇪🇺",
  "GBP/USD": "🇬🇧",
  "XAU/USD": "🥇",
  "USD/JPY": "🇺🇸",
};

// ── SVG Candlestick chart ─────────────────────────────────────────
function CandlestickChart() {
  const W = 340, H = 120;
  const prices = CANDLES.map(c => [c.l, c.h]).flat();
  const minP = Math.min(...prices) - 0.0005;
  const maxP = Math.max(...prices) + 0.0005;
  const scaleY = (p: number) => H - ((p - minP) / (maxP - minP)) * H;
  const candleW = W / CANDLES.length;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* MA line */}
      <polyline
        points={CANDLES.map((c, i) => `${i * candleW + candleW/2},${scaleY((c.o+c.c)/2)}`).join(" ")}
        fill="none" stroke="#7C6FF7" strokeWidth="1.5" opacity="0.8"
      />
      {CANDLES.map((c, i) => {
        const x = i * candleW + candleW * 0.2;
        const bull = c.c >= c.o;
        const top = scaleY(Math.max(c.o, c.c));
        const bot = scaleY(Math.min(c.o, c.c));
        const ht = Math.max(bot - top, 1);
        return (
          <g key={i}>
            <line x1={i * candleW + candleW/2} y1={scaleY(c.h)} x2={i * candleW + candleW/2} y2={scaleY(c.l)}
              stroke={bull ? "#00C896" : "#FF4757"} strokeWidth="0.8" />
            <rect x={x} y={top} width={candleW * 0.6} height={ht}
              fill={bull ? "#00C896" : "#FF4757"} opacity="0.9" rx="0.5" />
          </g>
        );
      })}
      {/* Current price line */}
      <line x1="0" y1={scaleY(1.08234)} x2={W} y2={scaleY(1.08234)}
        stroke="#FF9F43" strokeWidth="0.8" strokeDasharray="3,3" opacity="0.8" />
      <rect x={W - 52} y={scaleY(1.08234) - 8} width={52} height={16} rx="3" fill="#FF9F43" />
      <text x={W - 26} y={scaleY(1.08234) + 5} textAnchor="middle" fontSize="7" fill="#000" fontWeight="bold">1.08234</text>
    </svg>
  );
}

// ── Countdown timer ──────────────────────────────────────────────
function Countdown() {
  const [secs, setSecs] = useState(28);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s <= 0 ? 899 : s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  const pct = (secs / 900) * 100;
  const r = 22, circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center justify-center relative w-16 h-16">
      <svg className="absolute inset-0" width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#1E2240" strokeWidth="3" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#7C6FF7" strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" transform="rotate(-90 32 32)" />
      </svg>
      <div className="relative text-center">
        <div className="text-[9px] text-[#8892A4] font-medium leading-none">NEXT UPDATE</div>
        <div className="text-[11px] font-bold text-white mt-0.5">{m}:{s}</div>
      </div>
    </div>
  );
}

// ── Sentiment gauge ──────────────────────────────────────────────
function SentimentGauge({ value = 75 }) {
  const angle = -90 + (value / 100) * 180;
  return (
    <svg width="56" height="32" viewBox="0 0 56 32">
      <path d="M4 28 A24 24 0 0 1 52 28" fill="none" stroke="#FF4757" strokeWidth="6" strokeLinecap="round" />
      <path d="M4 28 A24 24 0 0 1 52 28" fill="none" stroke="#FF9F43" strokeWidth="6"
        strokeLinecap="round" strokeDasharray="75 100" />
      <path d="M4 28 A24 24 0 0 1 52 28" fill="none" stroke="#00C896" strokeWidth="6"
        strokeLinecap="round" strokeDasharray="37 100" />
      <line
        x1="28" y1="28"
        x2={28 + 18 * Math.cos((angle * Math.PI) / 180)}
        y2={28 + 18 * Math.sin((angle * Math.PI) / 180)}
        stroke="white" strokeWidth="2" strokeLinecap="round"
      />
      <circle cx="28" cy="28" r="3" fill="white" />
    </svg>
  );
}

// ── Nav tabs ─────────────────────────────────────────────────────
const NAV = [
  { icon: Home,     label: "Dashboard" },
  { icon: Zap,      label: "Signals" },
  { icon: BarChart2,label: "Analysis" },
  { icon: Wrench,   label: "Tools" },
  { icon: User,     label: "Account" },
];

export function Mobile() {
  const [activeNav, setActiveNav] = useState(0);
  const [activeTF, setActiveTF] = useState("M15");
  const TFS = ["M5","M15","H1","H4","D1"];

  return (
    <div className="w-[390px] min-h-screen font-sans overflow-y-auto"
      style={{ background: "#0A0C1A", fontFamily: "'Inter', sans-serif", color: "#fff" }}>

      {/* Status bar */}
      <div className="flex justify-between items-center px-4 pt-3 pb-1 text-[11px] font-medium" style={{ color: "#A0AEC0" }}>
        <span>9:41</span>
        <div className="flex gap-1 items-center">
          <span>▪▪▪</span><span>WiFi</span><span>🔋</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-lg"
            style={{ background: "linear-gradient(135deg, #7C6FF7, #4FC3F7)" }}>S</div>
          <div>
            <div className="text-[15px] font-black tracking-wide">
              <span style={{ color: "#7C6FF7" }}>SMART</span>{" "}
              <span className="text-white">FX</span>{" "}
              <span className="text-white">TOOL</span>
            </div>
            <div className="text-[9px]" style={{ color: "#636E82" }}>Smart Signals. Smarter Trades.</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={18} style={{ color: "#A0AEC0" }} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: "#7C6FF7" }}>3</span>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl"
            style={{ background: "#141628", border: "1px solid rgba(124,111,247,0.2)" }}>
            <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #7C6FF7, #4FC3F7)" }}>👤</div>
            <div>
              <div className="text-[11px] font-semibold text-white leading-none">Trader Charloh</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "linear-gradient(90deg, #7C6FF7, #A29BFE)", color: "#fff" }}>PREMIUM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet row */}
      <div className="px-4 mb-3 flex gap-2">
        {[
          { label: "Demo Wallet", val: "$10,000.00", color: "#4FC3F7" },
          { label: "Real Wallet",  val: "$0.00",     color: "#00C896" },
        ].map(w => (
          <div key={w.label} className="flex-1 rounded-xl px-3 py-2 flex items-center gap-2"
            style={{ background: "#141628", border: `1px solid ${w.color}22` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: w.color }} />
            <div>
              <div className="text-[9px]" style={{ color: "#636E82" }}>{w.label}</div>
              <div className="text-[13px] font-bold" style={{ color: w.color }}>{w.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-2.5 px-4 mb-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl p-3 relative overflow-hidden"
            style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="absolute inset-0 opacity-5 rounded-2xl"
              style={{ background: `radial-gradient(circle at top right, ${s.color}, transparent)` }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${s.color}18` }}>
                  <s.icon size={14} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-[9px] mb-0.5" style={{ color: "#636E82" }}>{s.label}</div>
              <div className="text-[16px] font-black leading-tight text-white">{s.value}</div>
              <div className="text-[9px] mt-0.5" style={{ color: "#636E82" }}>{s.sub}</div>
              <div className="mt-2 h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.spark.map((v, i) => ({ i, v }))}>
                    <defs>
                      <linearGradient id={`g${s.label.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.sparkColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={s.sparkColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={s.sparkColor} strokeWidth={1.5}
                      fill={`url(#g${s.label.replace(/\s/g,"")})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Signal */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#FF4757" }} />
              <span className="text-[13px] font-bold text-white tracking-wide">LIVE SIGNAL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00C896" }} />
              <span className="text-[10px]" style={{ color: "#00C896" }}>Market Open</span>
            </div>
          </div>

          {/* Pair + Direction + Confidence + Timer */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ background: "#1E2240" }}>
                  {FLAG[LIVE_SIGNAL.pair]}
                </div>
                <div>
                  <div className="text-[18px] font-black text-white">{LIVE_SIGNAL.pair}</div>
                  <div className="text-[10px]" style={{ color: "#636E82" }}>{LIVE_SIGNAL.desc}</div>
                  <div className="text-[9px] font-bold px-2 py-0.5 rounded mt-1 inline-block"
                    style={{ background: "#7C6FF722", color: "#7C6FF7", border: "1px solid #7C6FF733" }}>
                    {LIVE_SIGNAL.category}
                  </div>
                </div>
              </div>
              <Countdown />
            </div>

            {/* Direction / Confidence */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl p-2.5" style={{ background: "#1E2240" }}>
                <div className="text-[9px] mb-1" style={{ color: "#636E82" }}>DIRECTION</div>
                <div className="flex items-center gap-1">
                  <span className="text-[18px] font-black" style={{ color: "#00C896" }}>
                    {LIVE_SIGNAL.direction}
                  </span>
                  <ArrowUpRight size={16} style={{ color: "#00C896" }} />
                </div>
              </div>
              <div className="rounded-xl p-2.5" style={{ background: "#1E2240" }}>
                <div className="text-[9px] mb-1" style={{ color: "#636E82" }}>CONFIDENCE</div>
                <div className="text-[18px] font-black" style={{ color: "#7C6FF7" }}>
                  {LIVE_SIGNAL.confidence}%
                </div>
              </div>
            </div>

            {/* Price grid */}
            <div className="grid grid-cols-5 gap-1 mt-3">
              {[
                { label: "ENTRY PRICE", val: LIVE_SIGNAL.entry.toFixed(5), color: "#A0AEC0" },
                { label: "TAKE PROFIT 1", val: LIVE_SIGNAL.tp1.toFixed(5), color: "#00C896" },
                { label: "TAKE PROFIT 2", val: LIVE_SIGNAL.tp2.toFixed(5), color: "#00C896" },
                { label: "STOP LOSS", val: LIVE_SIGNAL.sl.toFixed(5), color: "#FF4757" },
                { label: "TIMEFRAME", val: LIVE_SIGNAL.tf, color: "#7C6FF7" },
              ].map(p => (
                <div key={p.label} className="rounded-lg p-1.5" style={{ background: "#1A1D35" }}>
                  <div className="text-[7px] leading-tight mb-1" style={{ color: "#636E82" }}>{p.label}</div>
                  <div className="text-[9px] font-bold" style={{ color: p.color }}>{p.val}</div>
                </div>
              ))}
            </div>

            {/* Trend / Volatility / Time */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="rounded-xl p-2 flex items-center gap-1.5" style={{ background: "#1A1D35" }}>
                <TrendingUp size={12} style={{ color: "#00C896" }} />
                <div>
                  <div className="text-[7px]" style={{ color: "#636E82" }}>TREND</div>
                  <div className="text-[9px] font-bold" style={{ color: "#00C896" }}>{LIVE_SIGNAL.trend}</div>
                </div>
              </div>
              <div className="rounded-xl p-2 flex items-center gap-1.5" style={{ background: "#1A1D35" }}>
                <Activity size={12} style={{ color: "#FF9F43" }} />
                <div>
                  <div className="text-[7px]" style={{ color: "#636E82" }}>VOLATILITY</div>
                  <div className="text-[9px] font-bold" style={{ color: "#FF9F43" }}>{LIVE_SIGNAL.volatility}</div>
                </div>
              </div>
              <div className="rounded-xl p-2 flex items-center gap-1.5" style={{ background: "#1A1D35" }}>
                <Clock size={12} style={{ color: "#4FC3F7" }} />
                <div>
                  <div className="text-[7px]" style={{ color: "#636E82" }}>TIME</div>
                  <div className="text-[9px] font-bold" style={{ color: "#4FC3F7" }}>{LIVE_SIGNAL.time}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5"
                style={{ background: "linear-gradient(90deg, #7C6FF7, #A29BFE)", color: "#fff" }}>
                <BarChart2 size={12} /> View Full Analysis
              </button>
              <button className="px-4 py-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5"
                style={{ background: "#1E2240", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Share2 size={12} /> Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Market Overview */}
      <div className="px-4 mb-4">
        <div className="rounded-2xl overflow-hidden" style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-[12px] font-bold text-white tracking-wide">MARKET OVERVIEW</span>
            <div className="flex gap-1">
              {TFS.map(tf => (
                <button key={tf} onClick={() => setActiveTF(tf)}
                  className="text-[9px] font-bold px-2 py-1 rounded-lg transition-all"
                  style={activeTF === tf
                    ? { background: "#7C6FF7", color: "#fff" }
                    : { background: "#1E2240", color: "#636E82" }}>
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-1">
            <div className="text-[11px] font-bold text-white">EUR/USD • {activeTF}</div>
            <div className="text-[10px]" style={{ color: "#00C896" }}>1.08234 +0.00124 (+0.11%)</div>
          </div>

          <div className="px-3 py-2">
            <CandlestickChart />
          </div>

          {/* Time labels */}
          <div className="flex justify-between px-4 pb-2">
            {["18:00","21:00","28","03:00","06:00","09:00","12:00"].map(t => (
              <span key={t} className="text-[8px]" style={{ color: "#636E82" }}>{t}</span>
            ))}
          </div>

          {/* Indicators */}
          <div className="grid grid-cols-4 gap-2 px-4 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="pt-3">
              <div className="text-[8px] mb-0.5" style={{ color: "#636E82" }}>RSI (14)</div>
              <div className="text-[11px] font-bold text-white">61.45</div>
              <div className="mt-1 h-5">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[45,52,48,58,55,61,59,65,62,61].map((v,i)=>({i,v}))}>
                    <Line type="monotone" dataKey="v" stroke="#7C6FF7" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="pt-3">
              <div className="text-[8px] mb-0.5" style={{ color: "#636E82" }}>MACD</div>
              <div className="text-[11px] font-bold text-white">0.00045</div>
              <div className="mt-1 h-5">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[-2,-1,0,1,2,3,4,5,4,5].map((v,i)=>({i,v}))}>
                    <Line type="monotone" dataKey="v" stroke="#4FC3F7" strokeWidth={1} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="pt-3">
              <div className="text-[8px] mb-0.5" style={{ color: "#636E82" }}>TREND</div>
              <div className="flex items-center gap-0.5">
                <span className="text-[11px] font-bold" style={{ color: "#00C896" }}>BULLISH</span>
                <ArrowUpRight size={10} style={{ color: "#00C896" }} />
              </div>
            </div>
            <div className="pt-3">
              <div className="text-[8px] mb-0.5" style={{ color: "#636E82" }}>SENTIMENT</div>
              <div className="text-[10px] font-bold" style={{ color: "#00C896" }}>POSITIVE</div>
              <SentimentGauge value={75} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Signals */}
      <div className="px-4 mb-24">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-bold text-white tracking-wide">RECENT SIGNALS</span>
          <button className="text-[10px] font-bold" style={{ color: "#7C6FF7" }}>View All</button>
        </div>
        <div className="flex flex-col gap-2">
          {RECENT_SIGNALS.map((sig, i) => (
            <div key={i} className="rounded-2xl px-4 py-3"
              style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: "#1E2240" }}>
                  {FLAG[sig.pair]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-white">{sig.pair}</span>
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg`}
                      style={sig.result === "WIN"
                        ? { background: "#00C89618", color: "#00C896", border: "1px solid #00C89633" }
                        : { background: "#FF475718", color: "#FF4757", border: "1px solid #FF475733" }}>
                      {sig.result}
                    </span>
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: "#636E82" }}>{sig.date}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-0.5">
                      {sig.dir === "BUY"
                        ? <ArrowUpRight size={11} style={{ color: "#00C896" }} />
                        : <ArrowDownRight size={11} style={{ color: "#FF4757" }} />}
                      <span className="text-[10px] font-bold"
                        style={{ color: sig.dir === "BUY" ? "#00C896" : "#FF4757" }}>{sig.dir}</span>
                    </div>
                    <div className="flex gap-3">
                      {[
                        { l: "Entry Price", v: sig.entry.toFixed(sig.pair === "XAU/USD" ? 2 : 5) },
                        { l: "Take Profit", v: sig.tp.toFixed(sig.pair === "XAU/USD" ? 2 : 5) },
                        { l: "Stop Loss",   v: sig.sl.toFixed(sig.pair === "XAU/USD" ? 2 : 5) },
                      ].map(p => (
                        <div key={p.l}>
                          <div className="text-[7px]" style={{ color: "#636E82" }}>{p.l}</div>
                          <div className="text-[9px] font-semibold text-white">{p.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[390px] px-2 pb-4 pt-2"
        style={{ background: "linear-gradient(to top, #0A0C1A 80%, transparent)" }}>
        <div className="flex justify-around items-center rounded-2xl px-2 py-2"
          style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.08)" }}>
          {NAV.map((n, i) => (
            <button key={n.label} onClick={() => setActiveNav(i)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              style={activeNav === i ? { background: "#7C6FF718" } : {}}>
              <n.icon size={18}
                style={{ color: activeNav === i ? "#7C6FF7" : "#636E82" }} />
              <span className="text-[9px] font-semibold"
                style={{ color: activeNav === i ? "#7C6FF7" : "#636E82" }}>{n.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

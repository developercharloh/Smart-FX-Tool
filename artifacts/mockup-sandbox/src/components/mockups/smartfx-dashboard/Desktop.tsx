import { useState, useEffect } from "react";
import {
  AreaChart, Area, LineChart, Line, ResponsiveContainer, BarChart, Bar
} from "recharts";
import {
  Bell, TrendingUp, TrendingDown, Share2, BarChart2, Activity,
  Home, Zap, BookOpen, Wrench, User, Clock, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Settings, ChevronRight,
  RefreshCw, Wallet, AlertTriangle
} from "lucide-react";

const STATS = [
  { label: "Total Signals",  value: "1,248",     sub: "+12% vs last month", icon: BarChart2,    color: "#7C6FF7", spark: [30,45,28,60,52,78,65,90,72,95,80,100] },
  { label: "Win Rate",        value: "87.6%",     sub: "Above average",      icon: CheckCircle2, color: "#00C896", spark: [50,60,55,70,65,80,75,85,78,90,85,88] },
  { label: "Total Profit",    value: "+$3,482.21",sub: "This month",         icon: TrendingUp,   color: "#4FC3F7", spark: [100,180,120,250,200,310,280,380,320,420,390,480] },
  { label: "Profit Accuracy", value: "92.3%",     sub: "Top 5% traders",     icon: Activity,     color: "#FF9F43", spark: [60,72,68,80,75,88,82,90,87,93,90,92] },
];

const LIVE_SIGNAL = {
  pair: "EUR/USD", desc: "Euro / US Dollar", category: "MAJOR",
  direction: "BUY", confidence: 92, tf: "M15",
  entry: 1.08234, tp1: 1.08560, tp2: 1.08890, sl: 1.07900,
  trend: "BULLISH", volatility: "MEDIUM", time: "11:30 AM",
};

const RECENT_SIGNALS = [
  { pair: "GBP/USD", date: "28 May • 10:45 AM", dir: "SELL", entry: 1.27450, tp: 1.27000, sl: 1.27950, result: "WIN",  pnl: "+$42.50" },
  { pair: "XAU/USD", date: "28 May • 09:32 AM", dir: "BUY",  entry: 2336.45, tp: 2345.00, sl: 2328.00, result: "WIN",  pnl: "+$85.00" },
  { pair: "USD/JPY", date: "28 May • 08:15 AM", dir: "BUY",  entry: 156.234, tp: 156.900, sl: 155.700, result: "LOSS", pnl: "-$21.00" },
  { pair: "EUR/GBP", date: "27 May • 16:20 PM", dir: "SELL", entry: 0.85420, tp: 0.85100, sl: 0.85700, result: "WIN",  pnl: "+$32.00" },
  { pair: "AUD/USD", date: "27 May • 14:05 PM", dir: "BUY",  entry: 0.64320, tp: 0.64800, sl: 0.63900, result: "WIN",  pnl: "+$48.00" },
];

const FLAG: Record<string, string> = {
  "EUR/USD": "🇪🇺", "GBP/USD": "🇬🇧", "XAU/USD": "🥇",
  "USD/JPY": "🇺🇸", "EUR/GBP": "🇪🇺", "AUD/USD": "🇦🇺",
};

const CANDLES = Array.from({ length: 40 }, (_, i) => {
  const base = 1.0780 + Math.sin(i * 0.3) * 0.003 + i * 0.00015;
  const vol = 0.0008;
  const o = base + (Math.random() - 0.5) * vol;
  const c = base + (Math.random() - 0.5) * vol;
  return { t: `${String(Math.floor(i/4)).padStart(2,"0")}:${String((i%4)*15).padStart(2,"0")}`, o, h: Math.max(o,c)+Math.random()*vol/2, l: Math.min(o,c)-Math.random()*vol/2, c };
});

function CandlestickSVG() {
  const W = 580, H = 160;
  const prices = CANDLES.map(c => [c.l, c.h]).flat();
  const minP = Math.min(...prices) - 0.0003;
  const maxP = Math.max(...prices) + 0.0003;
  const scaleY = (p: number) => H - ((p - minP) / (maxP - minP)) * H;
  const cw = W / CANDLES.length;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">
      <polyline
        points={CANDLES.map((c, i) => `${i * cw + cw/2},${scaleY((c.o+c.c)/2)}`).join(" ")}
        fill="none" stroke="#7C6FF7" strokeWidth="1.5" opacity="0.6"
      />
      {CANDLES.map((c, i) => {
        const bull = c.c >= c.o;
        const top = scaleY(Math.max(c.o, c.c));
        const bot = scaleY(Math.min(c.o, c.c));
        return (
          <g key={i}>
            <line x1={i*cw+cw/2} y1={scaleY(c.h)} x2={i*cw+cw/2} y2={scaleY(c.l)}
              stroke={bull ? "#00C896" : "#FF4757"} strokeWidth="0.7" />
            <rect x={i*cw+cw*0.15} y={top} width={cw*0.7} height={Math.max(bot-top,1)}
              fill={bull ? "#00C896" : "#FF4757"} opacity="0.85" rx="0.5" />
          </g>
        );
      })}
      <line x1="0" y1={scaleY(1.08234)} x2={W} y2={scaleY(1.08234)}
        stroke="#FF9F43" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.7" />
    </svg>
  );
}

function Countdown() {
  const [secs, setSecs] = useState(28);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s <= 0 ? 899 : s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = String(Math.floor(secs/60)).padStart(2,"0");
  const s = String(secs%60).padStart(2,"0");
  const pct = secs / 900;
  const r = 28, circ = 2*Math.PI*r;
  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="absolute inset-0" width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1E2240" strokeWidth="4" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="#7C6FF7" strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
          strokeLinecap="round" transform="rotate(-90 40 40)" />
      </svg>
      <div className="relative text-center z-10">
        <div className="text-[9px] text-[#636E82] font-medium leading-none">NEXT UPDATE</div>
        <div className="text-[14px] font-black text-white mt-0.5">{m}:{s}</div>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { icon: Home,     label: "Dashboard", active: true },
  { icon: Zap,      label: "Signals",   active: false },
  { icon: BarChart2,label: "Analysis",  active: false },
  { icon: Wrench,   label: "Tools",     active: false },
  { icon: User,     label: "Account",   active: false },
];

export function Desktop() {
  const [activeTF, setActiveTF] = useState("M15");
  const [activeNav, setActiveNav] = useState(0);
  const TFS = ["M5","M15","H1","H4","D1"];

  return (
    <div className="flex w-[1280px] min-h-screen" style={{ background: "#0A0C1A", fontFamily: "'Inter', sans-serif", color: "#fff" }}>

      {/* Sidebar */}
      <div className="w-[220px] flex-shrink-0 flex flex-col py-6 px-4"
        style={{ background: "#0D0F1E", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xl"
            style={{ background: "linear-gradient(135deg, #7C6FF7, #4FC3F7)" }}>S</div>
          <div>
            <div className="text-[14px] font-black">
              <span style={{ color: "#7C6FF7" }}>SMART</span> <span className="text-white">FX</span>
            </div>
            <div className="text-[8px]" style={{ color: "#636E82" }}>Smart Signals. Smarter Trades.</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((n, i) => (
            <button key={n.label} onClick={() => setActiveNav(i)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
              style={activeNav === i
                ? { background: "linear-gradient(90deg, #7C6FF720, #7C6FF708)", color: "#7C6FF7", borderLeft: "2px solid #7C6FF7" }
                : { color: "#636E82" }}>
              <n.icon size={16} />
              <span className="text-[12px] font-semibold">{n.label}</span>
            </button>
          ))}
        </nav>

        {/* Wallets */}
        <div className="space-y-2 mb-4">
          <div className="text-[9px] font-bold mb-2 tracking-wider" style={{ color: "#636E82" }}>WALLETS</div>
          {[
            { label: "Demo Account", val: "$10,000.00", color: "#4FC3F7", icon: "📊" },
            { label: "Real Account",  val: "$0.00",     color: "#00C896", icon: "💰" },
          ].map(w => (
            <div key={w.label} className="rounded-xl p-3"
              style={{ background: "#141628", border: `1px solid ${w.color}22` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{w.icon}</span>
                <span className="text-[10px]" style={{ color: "#636E82" }}>{w.label}</span>
              </div>
              <div className="text-[14px] font-black" style={{ color: w.color }}>{w.val}</div>
            </div>
          ))}
        </div>

        {/* User */}
        <div className="rounded-xl p-3" style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #7C6FF7, #4FC3F7)" }}>👤</div>
            <div>
              <div className="text-[11px] font-bold text-white">Trader Charloh</div>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "linear-gradient(90deg, #7C6FF7, #A29BFE)", color: "#fff" }}>PREMIUM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <h1 className="text-[18px] font-black text-white">Dashboard</h1>
            <p className="text-[11px]" style={{ color: "#636E82" }}>Welcome back, Trader Charloh 👋</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
              style={{ background: "#141628", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00C896" }} />
              Market Open
            </div>
            <div className="relative">
              <Bell size={18} style={{ color: "#A0AEC0" }} />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: "#7C6FF7" }}>3</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-4">
            {STATS.map(s => (
              <div key={s.label} className="rounded-2xl p-4 relative overflow-hidden"
                style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute inset-0 opacity-5"
                  style={{ background: `radial-gradient(circle at top right, ${s.color}, transparent)` }} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${s.color}18` }}>
                      <s.icon size={16} style={{ color: s.color }} />
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${s.color}15`, color: s.color }}>Monthly</span>
                  </div>
                  <div className="text-[11px] mb-0.5" style={{ color: "#636E82" }}>{s.label}</div>
                  <div className="text-[22px] font-black text-white leading-tight">{s.value}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#636E82" }}>{s.sub}</div>
                  <div className="mt-3 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={s.spark.map((v,i)=>({i,v}))}>
                        <defs>
                          <linearGradient id={`dg${s.label.replace(/\s/g,"")}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={s.color} strokeWidth={2}
                          fill={`url(#dg${s.label.replace(/\s/g,"")})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Middle row: Live Signal + Market Chart */}
          <div className="grid grid-cols-[420px_1fr] gap-4">
            {/* Live Signal */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#FF4757" }} />
                  <span className="text-[13px] font-bold tracking-wide">LIVE SIGNAL</span>
                </div>
                <Countdown />
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                    style={{ background: "#1E2240" }}>🇪🇺</div>
                  <div>
                    <div className="text-[22px] font-black text-white">{LIVE_SIGNAL.pair}</div>
                    <div className="text-[11px]" style={{ color: "#636E82" }}>{LIVE_SIGNAL.desc}</div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded mt-1 inline-block"
                      style={{ background: "#7C6FF722", color: "#7C6FF7", border: "1px solid #7C6FF733" }}>
                      {LIVE_SIGNAL.category}
                    </span>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[11px] mb-0.5" style={{ color: "#636E82" }}>DIRECTION</div>
                    <div className="flex items-center gap-1">
                      <span className="text-[24px] font-black" style={{ color: "#00C896" }}>{LIVE_SIGNAL.direction}</span>
                      <ArrowUpRight size={20} style={{ color: "#00C896" }} />
                    </div>
                    <div className="text-[11px] mt-1" style={{ color: "#636E82" }}>CONFIDENCE</div>
                    <div className="text-[20px] font-black" style={{ color: "#7C6FF7" }}>{LIVE_SIGNAL.confidence}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {[
                    { l: "ENTRY", v: LIVE_SIGNAL.entry.toFixed(5), c: "#A0AEC0" },
                    { l: "TP 1", v: LIVE_SIGNAL.tp1.toFixed(5), c: "#00C896" },
                    { l: "TP 2", v: LIVE_SIGNAL.tp2.toFixed(5), c: "#00C896" },
                    { l: "STOP LOSS", v: LIVE_SIGNAL.sl.toFixed(5), c: "#FF4757" },
                    { l: "TF", v: LIVE_SIGNAL.tf, c: "#7C6FF7" },
                  ].map(p => (
                    <div key={p.l} className="rounded-xl p-2.5" style={{ background: "#1A1D35" }}>
                      <div className="text-[8px] mb-1" style={{ color: "#636E82" }}>{p.l}</div>
                      <div className="text-[11px] font-bold" style={{ color: p.c }}>{p.v}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { icon: TrendingUp, label: "TREND", val: "BULLISH", color: "#00C896" },
                    { icon: Activity,   label: "VOLATILITY", val: "MEDIUM", color: "#FF9F43" },
                    { icon: Clock,      label: "TIME", val: "11:30 AM", color: "#4FC3F7" },
                  ].map(i => (
                    <div key={i.label} className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: "#1A1D35" }}>
                      <i.icon size={14} style={{ color: i.color }} />
                      <div>
                        <div className="text-[8px]" style={{ color: "#636E82" }}>{i.label}</div>
                        <div className="text-[11px] font-bold" style={{ color: i.color }}>{i.val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(90deg, #7C6FF7, #A29BFE)" }}>
                    <BarChart2 size={14} /> View Full Analysis
                  </button>
                  <button className="px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2"
                    style={{ background: "#1E2240", color: "#A0AEC0", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Share2 size={14} /> Share
                  </button>
                </div>
              </div>
            </div>

            {/* Market Overview */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <span className="text-[13px] font-bold tracking-wide">MARKET OVERVIEW</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-[12px] font-bold text-white">EUR/USD</span>
                    <span className="text-[11px]" style={{ color: "#00C896" }}>1.08234 +0.00124 (+0.11%)</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {TFS.map(tf => (
                    <button key={tf} onClick={() => setActiveTF(tf)}
                      className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                      style={activeTF === tf
                        ? { background: "#7C6FF7", color: "#fff" }
                        : { background: "#1E2240", color: "#636E82" }}>
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div className="px-5 py-4">
                <CandlestickSVG />
                <div className="flex justify-between mt-1">
                  {["18:00","21:00","00:00","03:00","06:00","09:00","12:00"].map(t => (
                    <span key={t} className="text-[9px]" style={{ color: "#636E82" }}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 px-5 pb-4 pt-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {[
                  { label: "RSI (14)", val: "61.45", data: [45,52,48,58,55,61,59,65,62,61].map((v,i)=>({i,v})), color: "#7C6FF7" },
                  { label: "MACD (12,26)", val: "0.00045", data: [-2,-1,0,1,2,3,4,5,4,5].map((v,i)=>({i,v})), color: "#4FC3F7" },
                ].map(ind => (
                  <div key={ind.label}>
                    <div className="text-[9px] mb-0.5" style={{ color: "#636E82" }}>{ind.label}</div>
                    <div className="text-[13px] font-bold text-white">{ind.val}</div>
                    <div className="mt-1 h-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ind.data}>
                          <Line type="monotone" dataKey="v" stroke={ind.color} strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
                <div>
                  <div className="text-[9px] mb-0.5" style={{ color: "#636E82" }}>TREND</div>
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] font-bold" style={{ color: "#00C896" }}>BULLISH</span>
                    <ArrowUpRight size={14} style={{ color: "#00C896" }} />
                  </div>
                  <div className="mt-2 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[1,2,3,4,5,6,7,8,7,8,9,10].map((v,i)=>({i,v}))}>
                        <defs>
                          <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00C896" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00C896" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="#00C896" strokeWidth={1.5} fill="url(#tg)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="text-[9px] mb-0.5" style={{ color: "#636E82" }}>SENTIMENT</div>
                  <div className="text-[13px] font-bold" style={{ color: "#00C896" }}>POSITIVE</div>
                  <svg width="70" height="40" viewBox="0 0 70 40" className="mt-1">
                    <path d="M5 35 A30 30 0 0 1 65 35" fill="none" stroke="#FF4757" strokeWidth="6" strokeLinecap="round" />
                    <path d="M5 35 A30 30 0 0 1 65 35" fill="none" stroke="#00C896" strokeWidth="6"
                      strokeLinecap="round" strokeDasharray="60 100" />
                    <line x1="35" y1="35" x2={35+22*Math.cos(-0.4)} y2={35+22*Math.sin(-0.4)}
                      stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="35" cy="35" r="3.5" fill="white" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Signals */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#141628", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-[13px] font-bold tracking-wide">RECENT SIGNALS</span>
              <button className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#7C6FF7" }}>
                View All <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {RECENT_SIGNALS.map((sig, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: "#1E2240" }}>{FLAG[sig.pair]}</div>
                  <div className="w-24">
                    <div className="text-[13px] font-bold text-white">{sig.pair}</div>
                    <div className="text-[10px]" style={{ color: "#636E82" }}>{sig.date}</div>
                  </div>
                  <div className="flex items-center gap-1 w-16">
                    {sig.dir === "BUY"
                      ? <ArrowUpRight size={14} style={{ color: "#00C896" }} />
                      : <ArrowDownRight size={14} style={{ color: "#FF4757" }} />}
                    <span className="text-[12px] font-bold"
                      style={{ color: sig.dir === "BUY" ? "#00C896" : "#FF4757" }}>{sig.dir}</span>
                  </div>
                  {[
                    { l: "Entry Price", v: sig.entry.toFixed(sig.pair === "XAU/USD" ? 2 : 5) },
                    { l: "Take Profit", v: sig.tp.toFixed(sig.pair === "XAU/USD" ? 2 : 5) },
                    { l: "Stop Loss",   v: sig.sl.toFixed(sig.pair === "XAU/USD" ? 2 : 5) },
                  ].map(p => (
                    <div key={p.l} className="flex-1">
                      <div className="text-[9px]" style={{ color: "#636E82" }}>{p.l}</div>
                      <div className="text-[12px] font-semibold text-white">{p.v}</div>
                    </div>
                  ))}
                  <div className="text-right">
                    <div className="text-[12px] font-bold"
                      style={{ color: sig.pnl.startsWith("+") ? "#00C896" : "#FF4757" }}>{sig.pnl}</div>
                  </div>
                  <span className="text-[11px] font-black px-3 py-1.5 rounded-lg ml-2"
                    style={sig.result === "WIN"
                      ? { background: "#00C89618", color: "#00C896", border: "1px solid #00C89633" }
                      : { background: "#FF475718", color: "#FF4757", border: "1px solid #FF475733" }}>
                    {sig.result}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

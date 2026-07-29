import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetDashboardSummary, useListSignals } from "@workspace/api-client-react";
import { AreaChart, Area, LineChart, Line, ResponsiveContainer } from "recharts";
import {
  Bell, TrendingUp, TrendingDown, Share2, BarChart2, Activity,
  Home, Zap, Wrench, User, Clock, ArrowUpRight, ArrowDownRight,
  ChevronRight, RefreshCw,
} from "lucide-react";
import { Link } from "wouter";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const BG     = "#080B18";
const CARD   = "#0F1229";
const CARD2  = "#131627";
const BORDER = "rgba(255,255,255,0.07)";
const PURPLE = "#6C5CE7";
const PURPLT = "#A29BFE";
const GREEN  = "#00CFA1";
const RED    = "#FF3D57";
const GOLD   = "#FF9F43";
const BLUE   = "#4FC3F7";
const MUTED  = "#636E82";
const TEXT   = "#FFFFFF";
const TEXT2  = "#A0AEC0";

const BASE = import.meta.env.BASE_URL;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmt(pair: string) {
  // "EURUSD" → "EUR/USD"
  if (!pair) return "";
  if (pair.includes("/")) return pair;
  if (pair === "XAUUSD") return "XAU/USD";
  if (pair === "XAGUSD") return "XAG/USD";
  return pair.slice(0, 3) + "/" + pair.slice(3);
}

function pairCode(pair: string): string {
  const map: Record<string, string> = {
    EURUSD:"eu", GBPUSD:"gb", USDJPY:"us", AUDUSD:"au",
    NZDUSD:"nz", USDCAD:"ca", USDCHF:"ch", GBPJPY:"gb",
    EURJPY:"eu", EURGBP:"eu", AUDJPY:"au", CADJPY:"ca",
    GBPCAD:"gb", AUDCAD:"au", GBPCHF:"gb", XAUUSD:"xau",
    XAGUSD:"xau", BTCUSD:"btc", ETHUSD:"eth",
  };
  return map[pair] ?? "eu";
}

function FlagCircle({ pair, size = 44 }: { pair: string; size?: number }) {
  const code = pairCode(pair.replace("/", ""));
  if (code === "xau" || code === "btc" || code === "eth") {
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: code === "xau" ? "linear-gradient(135deg,#f7971e,#ffd200)"
          : code === "btc" ? "linear-gradient(135deg,#f7931a,#ffb347)"
          : "linear-gradient(135deg,#627eea,#a5b4fc)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.48, flexShrink: 0,
        boxShadow: `0 0 0 2px ${BORDER}`,
      }}>
        {code === "xau" ? "🥇" : code === "btc" ? "₿" : "Ξ"}
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
        src={`https://flagcdn.com/64x48/${code}.png`}
        alt={pair}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={(e: any) => { e.target.style.opacity = "0"; }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTDOWN RING
// ─────────────────────────────────────────────────────────────────────────────
function CountdownRing({ onZero }: { onZero?: () => void }) {
  const TOTAL = 120;
  const [s, setS] = useState(TOTAL);
  const cbRef = useRef(onZero);
  cbRef.current = onZero;

  useEffect(() => {
    const t = setInterval(() => {
      setS(p => {
        if (p <= 1) { cbRef.current?.(); return TOTAL; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const r = 30, circ = 2 * Math.PI * r;
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");

  return (
    <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
      <svg width={80} height={80} style={{ position: "absolute", inset: 0 }}>
        <circle cx={40} cy={40} r={r} fill="none" stroke="#1A1E38" strokeWidth={4} />
        <circle cx={40} cy={40} r={r} fill="none" stroke={PURPLE} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - s / TOTAL)}
          strokeLinecap="round" transform="rotate(-90 40 40)" />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 8, color: MUTED, fontWeight: 600, letterSpacing: "0.04em", lineHeight: 1 }}>NEXT UPDATE</span>
        <span style={{ fontSize: 15, color: TEXT, fontWeight: 900, marginTop: 2 }}>{mm}:{ss}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SENTIMENT GAUGE
// ─────────────────────────────────────────────────────────────────────────────
function Gauge({ sentiment }: { sentiment?: string | null }) {
  const W = 68, H = 36, r = 26, cx = W / 2, cy = 36;
  // angle: BEARISH ≈ -45°, NEUTRAL ≈ 0°, BULLISH ≈ +30°, POSITIVE ≈ +20°
  const nA = sentiment === "POSITIVE" || sentiment === "BULLISH" ? -20
    : sentiment === "NEGATIVE" || sentiment === "BEARISH" ? 20 : 0;
  const nx = cx + (r - 4) * Math.cos((nA * Math.PI) / 180);
  const ny = cy + (r - 4) * Math.sin((nA * Math.PI) / 180);
  const arc = (s: number, e: number, col: string) => {
    const sr = (s * Math.PI) / 180, er = (e * Math.PI) / 180;
    const x1 = cx + r * Math.cos(sr - Math.PI), y1 = cy + r * Math.sin(sr - Math.PI);
    const x2 = cx + r * Math.cos(er - Math.PI), y2 = cy + r * Math.sin(er - Math.PI);
    return <path d={`M${x1},${y1} A${r},${r},0,0,1,${x2},${y2}`}
      fill="none" stroke={col} strokeWidth={5.5} strokeLinecap="round" />;
  };
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block", marginTop: 6 }}>
      {arc(0, 60, RED)}{arc(60, 120, GOLD)}{arc(120, 180, GREEN)}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={TEXT} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4} fill={TEXT} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG CANDLESTICK CHART
// ─────────────────────────────────────────────────────────────────────────────
interface Candle { t: number; o: number; h: number; l: number; c: number }

function CandleChart({ candles, height = 155 }: { candles: Candle[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(e => setWidth(e[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!candles.length) {
    return (
      <div ref={containerRef} style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: MUTED, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} /> Loading chart data…
        </div>
      </div>
    );
  }

  const ps = candles.flatMap(c => [c.l, c.h]);
  const lo = Math.min(...ps) - (Math.max(...ps) - Math.min(...ps)) * 0.04;
  const hi = Math.max(...ps) + (Math.max(...ps) - Math.min(...ps)) * 0.04;
  const sy = (p: number) => height - ((p - lo) / (hi - lo)) * height;
  const cw = width / candles.length;
  const last = candles[candles.length - 1];

  // MA line (20-period)
  const ma20 = candles.map((_, i) => {
    if (i < 19) return null;
    const slice = candles.slice(i - 19, i + 1);
    return slice.reduce((a, c) => a + (c.o + c.c) / 2, 0) / 20;
  });

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
        {/* MA line */}
        <polyline
          points={ma20
            .map((v, i) => v !== null ? `${i * cw + cw / 2},${sy(v)}` : null)
            .filter(Boolean).join(" ")}
          fill="none" stroke={PURPLE} strokeWidth={2} opacity={0.85}
        />
        {/* Candles */}
        {candles.map((c, i) => {
          const bull = c.c >= c.o;
          const col  = bull ? GREEN : RED;
          const top  = sy(Math.max(c.o, c.c));
          const bot  = sy(Math.min(c.o, c.c));
          const ht   = Math.max(bot - top, 1.5);
          const cx2  = i * cw + cw / 2;
          return (
            <g key={i}>
              <line x1={cx2} y1={sy(c.h)} x2={cx2} y2={sy(c.l)} stroke={col} strokeWidth={0.9} />
              <rect x={i * cw + cw * 0.15} y={top} width={Math.max(cw * 0.7, 2)} height={ht}
                fill={col} opacity={0.9} rx={0.7} />
            </g>
          );
        })}
        {/* Current price line */}
        {last && (
          <>
            <line x1={0} y1={sy(last.c)} x2={width} y2={sy(last.c)}
              stroke={GOLD} strokeWidth={0.9} strokeDasharray="4,4" opacity={0.75} />
            <rect x={width - 64} y={sy(last.c) - 10} width={64} height={20} rx={4} fill={GOLD} />
            <text x={width - 32} y={sy(last.c) + 5} textAnchor="middle"
              fontSize={8.5} fill="#000" fontWeight={700}>
              {last.c.toFixed(last.c > 100 ? 3 : 5)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color, spark,
}: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<any>; color: string; spark: number[];
}) {
  const gid = `sg_${label.replace(/\s+/g, "")}`;
  return (
    <div style={{
      background: CARD, borderRadius: 20, padding: "14px",
      border: `1px solid ${BORDER}`, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0, width: 80, height: 80,
        borderRadius: "50%", background: color, opacity: 0.07,
        transform: "translate(24px,-24px)",
      }} />
      <div style={{
        width: 38, height: 38, borderRadius: 12, background: `${color}1A`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 10, boxShadow: `0 0 14px ${color}33`,
      }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: TEXT, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{sub}</div>
      <div style={{ marginTop: 10, height: 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark.map((v, i) => ({ i, v }))}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
              fill={`url(#${gid})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR (desktop)
// ─────────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/",          label: "Dashboard", icon: Home      },
  { href: "/signals",   label: "Signals",   icon: Zap       },
  { href: "/analyze",   label: "Analysis",  icon: BarChart2 },
  { href: "/trades",    label: "Trades",    icon: Activity  },
  { href: "/settings",  label: "Account",   icon: User      },
];

function Sidebar({ demo, real }: { demo: number; real: number }) {
  return (
    <div style={{
      width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
      padding: "24px 14px", background: "#0A0C1E",
      borderRight: `1px solid ${BORDER}`,
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: "linear-gradient(135deg,#6C5CE7,#4FC3F7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 900, color: "#fff",
          boxShadow: "0 4px 16px rgba(108,92,231,0.45)", flexShrink: 0,
        }}>S</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.2 }}>
            <span style={{ color: PURPLE }}>SMART </span><span style={{ color: TEXT }}>FX</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: TEXT }}>TOOL</div>
          <div style={{ fontSize: 8, color: MUTED, marginTop: 1 }}>Smart Signals. Smarter Trades.</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
        {NAV_ITEMS.map(n => (
          <Link key={n.href} href={n.href}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 12, cursor: "pointer",
              background: n.href === "/" ? `${PURPLE}18` : "transparent",
              color: n.href === "/" ? PURPLE : MUTED,
              borderLeft: n.href === "/" ? `2px solid ${PURPLE}` : "2px solid transparent",
            }}>
              <n.icon size={16} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{n.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      {/* Wallets */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: MUTED, marginBottom: 8, letterSpacing: "0.08em" }}>WALLETS</div>
        {[
          { lbl: "Demo Account", val: demo  > 0 ? `$${demo.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00", col: BLUE  },
          { lbl: "Real Account", val: real  > 0 ? `$${real.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00", col: GREEN },
        ].map(w => (
          <div key={w.lbl} style={{
            background: CARD, borderRadius: 12, padding: "10px 12px", marginBottom: 8,
            border: `1px solid ${w.col}22`,
          }}>
            <div style={{ fontSize: 9, color: MUTED, marginBottom: 4 }}>{w.lbl}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: w.col }}>{w.val}</div>
          </div>
        ))}
      </div>

      {/* User */}
      <div style={{ background: CARD, borderRadius: 12, padding: "10px 12px", border: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg,#6C5CE7,#4FC3F7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: 16, flexShrink: 0,
          }}>C</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>Trader Charloh</div>
            <span style={{
              fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 5,
              background: `linear-gradient(90deg,${PURPLE},${PURPLT})`, color: "#fff",
            }}>PREMIUM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE BOTTOM NAV
// ─────────────────────────────────────────────────────────────────────────────
function BottomNav({ active, setActive }: { active: number; setActive: (i: number) => void }) {
  const TABS = [
    { href: "/",         label: "Dashboard", icon: Home      },
    { href: "/signals",  label: "Signals",   icon: Zap       },
    { href: "/analyze",  label: "Analysis",  icon: BarChart2 },
    { href: "/trades",   label: "Trades",    icon: Wrench    },
    { href: "/settings", label: "Account",   icon: User      },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      padding: "6px 12px 18px",
      background: `linear-gradient(to top, ${BG} 70%, transparent)`,
      zIndex: 50,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-around",
        background: CARD, borderRadius: 20, padding: "8px 4px",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
      }}>
        {TABS.map((n, i) => (
          <Link key={n.href} href={n.href}>
            <button onClick={() => setActive(i)} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, padding: "6px 14px", borderRadius: 12, border: "none",
              background: active === i ? `${PURPLE}18` : "transparent", cursor: "pointer",
            }}>
              <n.icon size={19} color={active === i ? PURPLE : MUTED} />
              <span style={{ fontSize: 9, fontWeight: 700, color: active === i ? PURPLE : MUTED }}>
                {n.label}
              </span>
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const queryClient = useQueryClient();
  const [mobileNav, setMobileNav] = useState(0);
  const [tf, setTF] = useState("M15");
  const TFS = ["M5", "M15", "H1", "H4", "D1"];

  // ── Data fetching ───────────────────────────────────────────────────────────
  const { data: summary } = useGetDashboardSummary();
  const { data: allSignals } = useListSignals({});
  const liveSignal = allSignals?.find(s => s.status === "ACTIVE") ?? allSignals?.[0] ?? null;
  const chartPair  = liveSignal?.pair ?? "EURUSD";

  const { data: balances = [] } = useQuery<any[]>({
    queryKey: ["ea-balance"],
    queryFn: () => fetch(`${BASE}api/ea/balance`).then(r => r.json()),
    refetchInterval: 30_000,
  });

  const { data: history = [] } = useQuery<any[]>({
    queryKey: ["signals-history"],
    queryFn: () => fetch(`${BASE}api/signals/history`).then(r => r.json()),
    refetchInterval: 60_000,
  });

  const { data: chartData, refetch: refetchChart } = useQuery<{
    candles: Candle[]; rsi: number | null; macd: number | null;
    macdSignal: number | null; trend: string; sentiment: string;
  }>({
    queryKey: ["chart", chartPair, tf],
    queryFn: () => fetch(`${BASE}api/signals/chart/${chartPair}/${tf}`).then(r => r.json()),
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  });

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["ea-balance"] });
    queryClient.invalidateQueries({ queryKey: ["chart"] });
    refetchChart();
  }, [queryClient, refetchChart]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const demoAcc = balances.find((b: any) => b.accountType === "demo");
  const realAcc = balances.find((b: any) => b.accountType === "real");
  const demoBalance = demoAcc?.balance ?? 0;
  const realBalance = realAcc?.balance ?? 0;

  const winRate   = summary?.winRate  ?? 0;
  const totalSigs = summary?.totalSignals ?? 0;
  const profitPct = Math.round((summary?.winRate ?? 0) * 100 * 0.92 * 10) / 10;

  // Sparkline data (12 points trending toward current value)
  function genSpark(target: number, lo: number, hi: number): number[] {
    const pts: number[] = [];
    let v = lo + Math.random() * (hi - lo) * 0.4;
    for (let i = 0; i < 11; i++) {
      v += (target - v) * 0.2 + (Math.random() - 0.4) * (hi - lo) * 0.1;
      pts.push(Math.max(lo, Math.min(hi, v)));
    }
    pts.push(target);
    return pts;
  }
  const stats = [
    {
      label: "Total Signals",  sub: "This Month",
      value: totalSigs.toLocaleString(),
      icon: BarChart2, color: PURPLE,
      spark: genSpark(totalSigs, 0, Math.max(totalSigs * 1.3, 100)),
    },
    {
      label: "Win Rate", sub: "This Month",
      value: `${(winRate * 100).toFixed(1)}%`,
      icon: Activity, color: GREEN,
      spark: genSpark(winRate * 100, 50, 100),
    },
    {
      label: "Total Profit", sub: "This Month",
      value: demoBalance > 0 ? `+$${((demoBalance - 10000) > 0 ? demoBalance - 10000 : 0).toFixed(2)}` : "$0.00",
      icon: TrendingUp, color: BLUE,
      spark: genSpark(demoBalance > 10000 ? demoBalance - 10000 : 0, 0, Math.max(demoBalance * 0.1, 100)),
    },
    {
      label: "Profit Accuracy", sub: "This Month",
      value: `${profitPct.toFixed(1)}%`,
      icon: Activity, color: GOLD,
      spark: genSpark(profitPct, 50, 100),
    },
  ];

  // ── Signal display values ───────────────────────────────────────────────────
  const sig = liveSignal;
  const sigPair  = sig ? fmt(sig.pair) : "—";
  const sigCode  = sig?.pair ?? "EURUSD";
  const sigDir   = sig?.signal ?? "—";
  const sigConf  = sig?.confidenceScore ?? 0;
  const sigEntry = sig?.entry ?? 0;
  const sigTp    = sig?.takeProfit ?? 0;
  const sigSl    = sig?.stopLoss ?? 0;
  const sigTf    = sig?.timeframe ?? "—";

  // Compute tp1 / tp2 (50% / 100% of TP distance)
  const tpDist = Math.abs(sigTp - sigEntry);
  const sigTp1 = sigEntry + (sigDir === "BUY" ? tpDist * 0.5 : -tpDist * 0.5);
  const sigTp2 = sigTp;

  const candles   = chartData?.candles ?? [];
  const lastClose = candles[candles.length - 1]?.c ?? sigEntry;
  const prevClose = candles[candles.length - 2]?.c ?? lastClose;
  const priceChg  = lastClose - prevClose;
  const priceChgPct = prevClose ? (priceChg / prevClose) * 100 : 0;

  // Time labels for chart x-axis (approximate 7 labels)
  const timeLabels = candles.length >= 7
    ? [0, Math.floor(candles.length / 6), Math.floor(candles.length / 3),
        Math.floor(candles.length / 2), Math.floor(2 * candles.length / 3),
        Math.floor(5 * candles.length / 6), candles.length - 1]
      .map(i => {
        const d = new Date((candles[i]?.t ?? 0) * 1000);
        return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
      })
    : ["", "", "", "", "", "", ""];

  // Recent signals from history
  const recentHistory = history.slice(0, 5);

  // ── Price cell helper ───────────────────────────────────────────────────────
  function PriceCell({ lbl, val, col }: { lbl: string; val: string; col: string }) {
    return (
      <div style={{ background: "#0D1024", borderRadius: 10, padding: "6px 8px" }}>
        <div style={{ fontSize: 7.5, color: MUTED, marginBottom: 3, fontWeight: 600, lineHeight: 1 }}>{lbl}</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: col }}>{val}</div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", width: "100%", height: "100vh", background: BG,
      fontFamily: "'Inter',-apple-system,sans-serif", color: TEXT, overflow: "hidden",
    }}>

      {/* ── SIDEBAR (desktop only) ─────────────────────────────────────────── */}
      <div className="hidden lg:flex" style={{ flexDirection: "column" }}>
        <Sidebar demo={demoBalance} real={realBalance} />
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: `1px solid ${BORDER}`,
          position: "sticky", top: 0, background: BG, zIndex: 20,
        }}>
          {/* Mobile: logo */}
          <div className="flex lg:hidden" style={{ alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg,#6C5CE7,#4FC3F7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 900, color: "#fff",
            }}>S</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900 }}>
                <span style={{ color: PURPLE }}>SMART </span><span>FX TOOL</span>
              </div>
              <div style={{ fontSize: 8, color: MUTED }}>Smart Signals. Smarter Trades.</div>
            </div>
          </div>
          {/* Desktop: title */}
          <div className="hidden lg:block">
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Dashboard</h1>
            <p style={{ fontSize: 11, color: MUTED, margin: "3px 0 0" }}>Welcome back, Trader Charloh 👋</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 10,
              background: CARD, border: `1px solid ${BORDER}`,
              fontSize: 11, color: TEXT2,
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN, boxShadow: `0 0 5px ${GREEN}` }} />
              <span className="hidden sm:inline">Market Open</span>
            </div>
            <div style={{ position: "relative" }}>
              <Bell size={19} color={TEXT2} />
              <div style={{
                position: "absolute", top: -4, right: -4, width: 15, height: 15,
                borderRadius: "50%", background: PURPLE,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: "#fff",
              }}>3</div>
            </div>
            {/* Mobile: user avatar */}
            <div className="flex lg:hidden" style={{
              display: "flex", alignItems: "center", gap: 8,
              background: CARD, borderRadius: 12, padding: "6px 10px",
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg,#6C5CE7,#4FC3F7)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 900, fontSize: 13, flexShrink: 0,
              }}>C</div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: TEXT, lineHeight: 1 }}>Trader Charloh</div>
                <span style={{
                  fontSize: 7.5, fontWeight: 800, padding: "1px 6px", borderRadius: 4,
                  background: `linear-gradient(90deg,${PURPLE},${PURPLT})`, color: "#fff",
                }}>PREMIUM</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── PAGE BODY ───────────────────────────────────────────────────── */}
        <div style={{ padding: "16px 20px", paddingBottom: 100 }}>

          {/* ── MOBILE: wallet cards ──────────────────────────────────────── */}
          <div className="flex lg:hidden" style={{ gap: 10, marginBottom: 14 }}>
            {[
              { lbl: "Demo Wallet", val: demoBalance > 0 ? `$${demoBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "$0.00", col: BLUE  },
              { lbl: "Real Wallet", val: realBalance > 0 ? `$${realBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "$0.00", col: GREEN },
            ].map(w => (
              <div key={w.lbl} style={{
                flex: 1, background: CARD, borderRadius: 14, padding: "10px 12px",
                border: `1px solid ${w.col}22`, display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.col, boxShadow: `0 0 6px ${w.col}` }} />
                <div>
                  <div style={{ fontSize: 9, color: MUTED }}>{w.lbl}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: w.col, marginTop: 1 }}>{w.val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── STATS GRID ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 12, marginBottom: 14 }}>
            {stats.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* ── LIVE SIGNAL + MARKET OVERVIEW ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr]" style={{ gap: 14, marginBottom: 14 }}>

            {/* Live Signal */}
            <div style={{
              background: CARD, borderRadius: 20, overflow: "hidden",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 0 30px rgba(108,92,231,0.07)",
            }}>
              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px 12px", borderBottom: `1px solid ${BORDER}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: RED,
                    boxShadow: `0 0 6px ${RED}`,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em" }}>🔥 LIVE SIGNAL</span>
                </div>
                <CountdownRing onZero={refetchAll} />
              </div>

              {/* Body */}
              <div style={{ padding: "16px 18px" }}>
                {!sig ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: MUTED, fontSize: 13 }}>
                    <RefreshCw size={24} style={{ margin: "0 auto 8px" }} />
                    Scanner is running — signal will appear here
                  </div>
                ) : (
                  <>
                    {/* Pair + timer */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <FlagCircle pair={sigCode} size={56} />
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: TEXT }}>{sigPair}</div>
                          <div style={{ fontSize: 10, color: MUTED }}>
                            {sigCode.includes("USD") && !sigCode.includes("XAU") ? "US Dollar pair" : "Currency pair"}
                          </div>
                          <span style={{
                            display: "inline-block", marginTop: 5, fontSize: 9, fontWeight: 700,
                            padding: "2px 9px", borderRadius: 5,
                            background: `${PURPLE}1A`, color: PURPLT, border: `1px solid ${PURPLE}44`,
                          }}>MAJOR</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>DIRECTION</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: sigDir === "BUY" ? GREEN : RED }}>{sigDir}</span>
                          {sigDir === "BUY"
                            ? <ArrowUpRight size={20} color={GREEN} />
                            : <ArrowDownRight size={20} color={RED} />}
                        </div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 6, marginBottom: 3 }}>CONFIDENCE</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: PURPLE }}>{sigConf}%</div>
                      </div>
                    </div>

                    {/* Price grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 10 }}>
                      <PriceCell lbl="ENTRY"    val={sigEntry.toFixed(sigEntry > 100 ? 3 : 5)} col={TEXT2} />
                      <PriceCell lbl="TP 1"     val={sigTp1.toFixed(sigTp1 > 100 ? 3 : 5)}    col={GREEN} />
                      <PriceCell lbl="TP 2"     val={sigTp2.toFixed(sigTp2 > 100 ? 3 : 5)}    col={GREEN} />
                      <PriceCell lbl="STOP LOSS" val={sigSl.toFixed(sigSl > 100 ? 3 : 5)}     col={RED}   />
                      <PriceCell lbl="TF"       val={sigTf}                                    col={PURPLT} />
                    </div>

                    {/* Trend / Vol / Time */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
                      {[
                        { icon: TrendingUp, lbl: "TREND",      val: chartData?.trend ?? "BULLISH",           col: GREEN },
                        { icon: Activity,   lbl: "VOLATILITY", val: "MEDIUM",                                col: GOLD  },
                        { icon: Clock,      lbl: "TIME",       val: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), col: BLUE },
                      ].map(r => (
                        <div key={r.lbl} style={{
                          background: CARD2, borderRadius: 12, padding: "10px 12px",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <r.icon size={14} color={r.col} />
                          <div>
                            <div style={{ fontSize: 8, color: MUTED }}>{r.lbl}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: r.col }}>{r.val}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <Link href="/signals">
                        <button style={{
                          flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
                          background: "linear-gradient(90deg,#6C5CE7,#A29BFE)",
                          color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                          width: "100%",
                        }}>
                          <BarChart2 size={13} /> View Full Analysis ↗
                        </button>
                      </Link>
                      <button style={{
                        padding: "12px 14px", borderRadius: 12,
                        background: CARD2, border: `1px solid ${BORDER}`,
                        color: TEXT2, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <Share2 size={13} />
                        <span className="hidden sm:inline">Share</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Market Overview */}
            <div style={{ background: CARD, borderRadius: 20, overflow: "hidden", border: `1px solid ${BORDER}` }}>
              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px 10px", borderBottom: `1px solid ${BORDER}`, flexWrap: "wrap", gap: 8,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em" }}>MARKET OVERVIEW</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(chartPair)} • {tf}</span>
                    <span style={{ fontSize: 11, color: priceChg >= 0 ? GREEN : RED }}>
                      {lastClose.toFixed(lastClose > 100 ? 3 : 5)}{" "}
                      {priceChg >= 0 ? "+" : ""}{priceChg.toFixed(lastClose > 100 ? 3 : 5)}{" "}
                      ({priceChgPct >= 0 ? "+" : ""}{priceChgPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {TFS.map(t => (
                    <button key={t} onClick={() => setTF(t)} style={{
                      fontSize: 10, fontWeight: 700, padding: "5px 10px", borderRadius: 8, border: "none",
                      background: tf === t ? PURPLE : CARD2, color: tf === t ? "#fff" : MUTED, cursor: "pointer",
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div style={{ padding: "12px 16px 4px" }}>
                <CandleChart candles={candles} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 18px 8px" }}>
                {timeLabels.map((t, i) => (
                  <span key={i} style={{ fontSize: 9, color: MUTED }}>{t}</span>
                ))}
              </div>

              {/* Indicators */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14,
                padding: "12px 18px 16px", borderTop: `1px solid ${BORDER}`,
              }}>
                {/* RSI */}
                <div>
                  <div style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>RSI (14)</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                    {chartData?.rsi != null ? chartData.rsi.toFixed(2) : "—"}
                  </div>
                  <div style={{ height: 28, marginTop: 4 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[45,52,48,58,55,61,59,65,62, chartData?.rsi ?? 61].map((v,i)=>({i,v}))}>
                        <Line type="monotone" dataKey="v" stroke={PURPLE} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* MACD */}
                <div>
                  <div style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>MACD</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                    {chartData?.macd != null ? chartData.macd.toFixed(5) : "—"}
                  </div>
                  <div style={{ height: 28, marginTop: 4 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[-2,-1,0,1,2,3,4,5,4, chartData?.macd ?? 4].map((v,i)=>({i,v}))}>
                        <Line type="monotone" dataKey="v" stroke={BLUE} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Trend */}
                <div>
                  <div style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>TREND</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: chartData?.trend === "BULLISH" ? GREEN : chartData?.trend === "BEARISH" ? RED : TEXT2,
                    }}>
                      {chartData?.trend ?? "—"}
                    </span>
                    {chartData?.trend === "BULLISH" && <ArrowUpRight size={13} color={GREEN} />}
                    {chartData?.trend === "BEARISH" && <ArrowDownRight size={13} color={RED} />}
                  </div>
                  <div style={{ height: 28, marginTop: 4 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[1,2,3,4,5,6,7,8,7,8,9,10].map((v,i)=>({i,v}))}>
                        <defs>
                          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={GREEN} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={GREEN} strokeWidth={1.5} fill="url(#trendGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Sentiment */}
                <div>
                  <div style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>SENTIMENT</div>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    color: chartData?.sentiment === "POSITIVE" ? GREEN : chartData?.sentiment === "NEGATIVE" ? RED : TEXT2,
                  }}>
                    {chartData?.sentiment ?? "—"}
                  </div>
                  <Gauge sentiment={chartData?.sentiment} />
                </div>
              </div>
            </div>
          </div>

          {/* ── RECENT SIGNALS ────────────────────────────────────────────── */}
          <div style={{ background: CARD, borderRadius: 20, overflow: "hidden", border: `1px solid ${BORDER}` }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: `1px solid ${BORDER}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em" }}>RECENT SIGNALS</span>
              <Link href="/signals">
                <button style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 700, color: PURPLE,
                }}>View All <ChevronRight size={13} /></button>
              </Link>
            </div>

            {recentHistory.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: MUTED, fontSize: 12 }}>
                No completed trades yet — signals will appear here after closing
              </div>
            ) : (
              recentHistory.map((sig: any, i: number) => {
                const isWin  = sig.status === "HIT_TP";
                const pnl    = isWin
                  ? `+$${Math.abs((sig.takeProfit - sig.entry) * 1000).toFixed(2)}`
                  : `-$${Math.abs((sig.entry - sig.stopLoss) * 1000).toFixed(2)}`;
                const sigDate = sig.updatedAt
                  ? new Date(sig.updatedAt).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                  : "—";

                return (
                  <div key={sig.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                    borderBottom: i < recentHistory.length - 1 ? `1px solid ${BORDER}` : "none",
                    flexWrap: "wrap",
                  }}>
                    <FlagCircle pair={sig.pair} size={40} />
                    <div style={{ minWidth: 90 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: TEXT }}>{fmt(sig.pair)}</div>
                      <div style={{ fontSize: 9, color: MUTED, marginTop: 2 }}>{sigDate}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 56 }}>
                      {sig.signal === "BUY"
                        ? <ArrowUpRight size={14} color={GREEN} />
                        : <ArrowDownRight size={14} color={RED} />}
                      <span style={{ fontSize: 12, fontWeight: 700, color: sig.signal === "BUY" ? GREEN : RED }}>
                        {sig.signal}
                      </span>
                    </div>
                    {[
                      { l: "Entry Price", v: Number(sig.entry).toFixed(sig.entry > 100 ? 3 : 5) },
                      { l: "Take Profit", v: Number(sig.takeProfit).toFixed(sig.takeProfit > 100 ? 3 : 5) },
                      { l: "Stop Loss",   v: Number(sig.stopLoss).toFixed(sig.stopLoss > 100 ? 3 : 5) },
                    ].map(p => (
                      <div key={p.l} style={{ flex: 1, minWidth: 70 }}>
                        <div style={{ fontSize: 9, color: MUTED }}>{p.l}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginTop: 2 }}>{p.v}</div>
                      </div>
                    ))}
                    <div style={{
                      fontSize: 12, fontWeight: 700, minWidth: 60, textAlign: "right",
                      color: isWin ? GREEN : RED,
                    }}>{pnl}</div>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 8,
                      background: isWin ? `${GREEN}18` : `${RED}18`,
                      color: isWin ? GREEN : RED,
                      border: `1px solid ${isWin ? GREEN : RED}44`,
                      minWidth: 48, textAlign: "center",
                    }}>{isWin ? "WIN" : "LOSS"}</span>
                  </div>
                );
              })
            )}
          </div>

        </div>{/* end page body */}
      </div>{/* end main */}

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <BottomNav active={mobileNav} setActive={setMobileNav} />
      </div>

    </div>
  );
}

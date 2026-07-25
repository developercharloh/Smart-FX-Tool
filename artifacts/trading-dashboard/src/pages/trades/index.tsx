/**
 * EA Trades — shows every position opened by the SmartFX Expert Advisor on MT5.
 * Data comes from POST /api/ea/trade (reported by the EA in real time).
 */

import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Circle, CheckCircle2, XCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface EATrade {
  id:          string;
  ticket:      string;
  login:       string;
  symbol:      string;
  direction:   "BUY" | "SELL";
  lots:        number;
  openPrice:   number;
  sl:          number;
  tp:          number;
  signalId:    string;
  confidence:  number;
  timeframe:   string;
  status:      "OPEN" | "CLOSED";
  closePrice?: number;
  profit?:     number;
  openedAt:    number;
  closedAt?:   number;
}

function fmt(n: number, d = 5) {
  return n?.toFixed(d) ?? "—";
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function TradesPage() {
  const [trades,  setTrades]  = useState<EATrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function fetchTrades() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${BASE}/api/ea/trades`);
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const data = await r.json();
      setTrades(Array.isArray(data) ? data : []);
      setLastFetch(new Date());
    } catch (e: any) {
      setError(e.message ?? "Failed to load trades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrades();
    const id = setInterval(fetchTrades, 10_000);
    return () => clearInterval(id);
  }, []);

  const open   = trades.filter(t => t.status === "OPEN");
  const closed = trades.filter(t => t.status === "CLOSED");
  const totalProfit = closed.reduce((s, t) => s + (t.profit ?? 0), 0);
  const wins  = closed.filter(t => (t.profit ?? 0) > 0).length;
  const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">EA Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real trades opened by SmartFX Expert Advisor on MT5
          </p>
        </div>
        <button
          onClick={fetchTrades}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400/10 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open Positions", value: open.length,   color: "text-cyan-400"   },
          { label: "Closed Trades",  value: closed.length, color: "text-slate-300"  },
          { label: "Win Rate",       value: `${winRate}%`, color: winRate >= 50 ? "text-emerald-400" : "text-rose-400" },
          { label: "Total Profit",   value: `${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`,
            color: totalProfit >= 0 ? "text-emerald-400" : "text-rose-400" },
        ].map(s => (
          <div key={s.label}
            style={{ background: "rgba(11,15,25,0.7)", border: "1px solid rgba(0,255,255,0.08)" }}
            className="rounded-2xl p-4"
          >
            <p className="text-xs text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}
          className="rounded-xl px-4 py-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* No trades yet */}
      {!loading && !error && trades.length === 0 && (
        <div style={{ background: "rgba(11,15,25,0.7)", border: "1px solid rgba(0,255,255,0.08)" }}
          className="rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 flex items-center justify-center mx-auto">
            <TrendingUp className="w-7 h-7 text-cyan-400" />
          </div>
          <p className="text-white font-semibold text-lg">No trades yet</p>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Attach the SmartFX EA to a chart in MT5 and enable Algo Trading.
            Every trade it opens will appear here in real time.
          </p>
        </div>
      )}

      {/* Open Positions */}
      {open.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Open Positions ({open.length})
          </h2>
          <div className="space-y-2">
            {open.map(t => <TradeRow key={t.id} trade={t} />)}
          </div>
        </section>
      )}

      {/* Closed Trades */}
      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">
            Closed Trades ({closed.length})
          </h2>
          <div className="space-y-2">
            {closed.map(t => <TradeRow key={t.id} trade={t} />)}
          </div>
        </section>
      )}

      {lastFetch && (
        <p className="text-xs text-slate-600 text-right">
          Auto-refreshes every 10s · Last updated {lastFetch.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function TradeRow({ trade: t }: { trade: EATrade }) {
  const isBuy    = t.direction === "BUY";
  const isOpen   = t.status === "OPEN";
  const profit   = t.profit ?? null;
  const isWin    = profit !== null && profit > 0;
  const decimals = t.symbol.includes("JPY") || t.symbol.includes("XAU") ? 2 : 5;

  return (
    <div
      style={{
        background: "rgba(11,15,25,0.7)",
        border: isOpen
          ? "1px solid rgba(0,255,255,0.12)"
          : isWin
            ? "1px solid rgba(52,211,153,0.15)"
            : profit !== null
              ? "1px solid rgba(248,113,113,0.15)"
              : "1px solid rgba(100,116,139,0.15)",
      }}
      className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-4"
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isOpen
          ? <Circle className="w-4 h-4 text-cyan-400 animate-pulse" />
          : isWin
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            : <XCircle className="w-4 h-4 text-rose-400" />}
      </div>

      {/* Direction + Symbol */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <span style={isBuy
          ? { background: "rgba(52,211,153,0.1)", color: "#34d399" }
          : { background: "rgba(248,113,113,0.1)", color: "#f87171" }}
          className="text-xs font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1"
        >
          {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {t.direction}
        </span>
        <span className="text-white font-bold text-sm">{t.symbol}</span>
        {t.timeframe && (
          <span className="text-[10px] text-slate-500">{t.timeframe}</span>
        )}
      </div>

      {/* Prices */}
      <div className="flex gap-4 text-xs text-slate-400 flex-1">
        <span>Entry <span className="text-white font-mono">{fmt(t.openPrice, decimals)}</span></span>
        <span>SL <span className="text-rose-400 font-mono">{fmt(t.sl, decimals)}</span></span>
        <span>TP <span className="text-emerald-400 font-mono">{fmt(t.tp, decimals)}</span></span>
        {t.closePrice != null && (
          <span>Close <span className="text-white font-mono">{fmt(t.closePrice, decimals)}</span></span>
        )}
      </div>

      {/* Lot + confidence */}
      <div className="flex gap-3 text-xs text-slate-500">
        <span>{t.lots} lot</span>
        {t.confidence > 0 && <span>{t.confidence}% conf</span>}
        {t.signalId && <span className="font-mono">#{t.signalId}</span>}
      </div>

      {/* Profit / Open badge */}
      <div className="ml-auto text-right">
        {isOpen ? (
          <span style={{ background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.2)" }}
            className="text-[10px] font-bold text-cyan-400 px-2 py-0.5 rounded-full uppercase">
            Live
          </span>
        ) : profit !== null ? (
          <span className={`text-sm font-bold font-mono ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
            {profit >= 0 ? "+" : ""}{profit.toFixed(2)}
          </span>
        ) : null}
      </div>

      {/* Timestamp */}
      <div className="w-full text-[10px] text-slate-600 mt-1">
        Opened {fmtTime(t.openedAt)}
        {t.closedAt && ` · Closed ${fmtTime(t.closedAt)}`}
        {t.login && ` · Account #${t.login}`}
      </div>
    </div>
  );
}

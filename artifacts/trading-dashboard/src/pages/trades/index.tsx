/**
 * Transactions — two sections:
 *  1. EA Trades     — real positions opened by the SmartFX Expert Advisor on MT5 (live, in-memory)
 *  2. Signal History — signals saved to DB that resolved as HIT_TP or HIT_SL (permanent record)
 */

import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Circle, CheckCircle2, XCircle, History, Activity } from "lucide-react";

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

interface SignalRecord {
  id:              number;
  pair:            string;
  signal:          "BUY" | "SELL";
  timeframe:       string;
  entry:           number;
  stopLoss:        number;
  takeProfit:      number;
  confidenceScore: number;
  status:          "HIT_TP" | "HIT_SL";
  riskRewardRatio: number;
  createdAt:       string;
}

function fmt(n: number, d = 5) { return n?.toFixed(d) ?? "—"; }
function fmtTime(ts: number | string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function TradesPage() {
  const [trades,   setTrades]   = useState<EATrade[]>([]);
  const [history,  setHistory]  = useState<SignalRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [tradesRes, histRes] = await Promise.all([
        fetch(`${BASE}/api/ea/trades`),
        fetch(`${BASE}/api/signals/history?limit=200`),
      ]);
      if (tradesRes.ok) {
        const d = await tradesRes.json();
        setTrades(Array.isArray(d) ? d : []);
      }
      if (histRes.ok) {
        const d = await histRes.json();
        setHistory(Array.isArray(d) ? d : []);
      }
      setLastFetch(new Date());
    } catch (e: any) {
      setError(e.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 15_000);
    return () => clearInterval(id);
  }, []);

  const open        = trades.filter(t => t.status === "OPEN");
  const closed      = trades.filter(t => t.status === "CLOSED");
  const totalProfit = closed.reduce((s, t) => s + (t.profit ?? 0), 0);
  const wins        = closed.filter(t => (t.profit ?? 0) > 0).length;
  const eaWinRate   = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;

  const sigWins   = history.filter(s => s.status === "HIT_TP").length;
  const sigLosses = history.filter(s => s.status === "HIT_SL").length;
  const sigTotal  = history.length;
  const sigWinRate = sigTotal > 0 ? Math.round((sigWins / sigTotal) * 100) : 0;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            EA live trades + all resolved signal history
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400/10 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}
          className="rounded-xl px-4 py-3 text-sm text-rose-400">{error}</div>
      )}

      {/* ─── SECTION 1: EA Live Trades ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-base font-bold text-white">EA Live Trades</h2>
          <span className="text-xs text-slate-500">— positions opened by MT5 Expert Advisor</span>
        </div>

        {/* EA stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Open Positions", value: open.length,   color: "text-cyan-400"   },
            { label: "Closed Trades",  value: closed.length, color: "text-slate-300"  },
            { label: "Win Rate",       value: `${eaWinRate}%`, color: eaWinRate >= 50 ? "text-emerald-400" : "text-rose-400" },
            { label: "Total P/L",      value: `${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`,
              color: totalProfit >= 0 ? "text-emerald-400" : "text-rose-400" },
          ].map(s => (
            <div key={s.label}
              style={{ background: "rgba(11,15,25,0.7)", border: "1px solid rgba(0,255,255,0.08)" }}
              className="rounded-2xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {!loading && trades.length === 0 && (
          <div style={{ background: "rgba(11,15,25,0.7)", border: "1px solid rgba(0,255,255,0.08)" }}
            className="rounded-2xl p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-white font-semibold">No EA trades yet</p>
            <p className="text-slate-500 text-sm">Attach SmartFX EA to a chart in MT5 and enable Algo Trading.</p>
          </div>
        )}

        {open.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Open ({open.length})</p>
            {open.map(t => <EATradeRow key={t.id} trade={t} />)}
          </div>
        )}
        {closed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Closed ({closed.length})</p>
            {closed.map(t => <EATradeRow key={t.id} trade={t} />)}
          </div>
        )}
      </section>

      {/* ─── SECTION 2: Signal History ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-violet-400" />
          <h2 className="text-base font-bold text-white">Signal History</h2>
          <span className="text-xs text-slate-500">— all resolved signals (profit/loss record)</span>
        </div>

        {/* Signal stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Signals",  value: sigTotal,       color: "text-slate-300"  },
            { label: "TP Hit (Win)",   value: sigWins,        color: "text-emerald-400" },
            { label: "SL Hit (Loss)",  value: sigLosses,      color: "text-rose-400"   },
            { label: "Win Rate",       value: `${sigWinRate}%`, color: sigWinRate >= 50 ? "text-emerald-400" : "text-rose-400" },
          ].map(s => (
            <div key={s.label}
              style={{ background: "rgba(11,15,25,0.7)", border: "1px solid rgba(139,92,246,0.08)" }}
              className="rounded-2xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {!loading && history.length === 0 && (
          <div style={{ background: "rgba(11,15,25,0.7)", border: "1px solid rgba(139,92,246,0.08)" }}
            className="rounded-2xl p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-violet-400/10 flex items-center justify-center mx-auto">
              <History className="w-6 h-6 text-violet-400" />
            </div>
            <p className="text-white font-semibold">No resolved signals yet</p>
            <p className="text-slate-500 text-sm">Signals that hit TP or SL will appear here permanently.</p>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            {history.map(s => <SignalHistoryRow key={s.id} signal={s} />)}
          </div>
        )}
      </section>

      {lastFetch && (
        <p className="text-xs text-slate-600 text-right">
          Auto-refreshes every 15s · Last updated {lastFetch.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

function EATradeRow({ trade: t }: { trade: EATrade }) {
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
          : isWin ? "1px solid rgba(52,211,153,0.15)" : profit !== null
            ? "1px solid rgba(248,113,113,0.15)" : "1px solid rgba(100,116,139,0.15)",
      }}
      className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-4"
    >
      <div className="shrink-0">
        {isOpen ? <Circle className="w-4 h-4 text-cyan-400 animate-pulse" />
          : isWin ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          : <XCircle className="w-4 h-4 text-rose-400" />}
      </div>
      <div className="flex items-center gap-2 min-w-[120px]">
        <span style={isBuy
          ? { background: "rgba(52,211,153,0.1)", color: "#34d399" }
          : { background: "rgba(248,113,113,0.1)", color: "#f87171" }}
          className="text-xs font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
          {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {t.direction}
        </span>
        <span className="text-white font-bold text-sm">{t.symbol}</span>
        {t.timeframe && <span className="text-[10px] text-slate-500">{t.timeframe}</span>}
      </div>
      <div className="flex gap-4 text-xs text-slate-400 flex-1">
        <span>Entry <span className="text-white font-mono">{fmt(t.openPrice, decimals)}</span></span>
        <span>SL <span className="text-rose-400 font-mono">{fmt(t.sl, decimals)}</span></span>
        <span>TP <span className="text-emerald-400 font-mono">{fmt(t.tp, decimals)}</span></span>
        {t.closePrice != null && <span>Close <span className="text-white font-mono">{fmt(t.closePrice, decimals)}</span></span>}
      </div>
      <div className="flex gap-3 text-xs text-slate-500">
        <span>{t.lots} lot</span>
        {t.confidence > 0 && <span>{t.confidence}% conf</span>}
        {t.signalId && <span className="font-mono">#{t.signalId}</span>}
      </div>
      <div className="ml-auto text-right">
        {isOpen ? (
          <span style={{ background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.2)" }}
            className="text-[10px] font-bold text-cyan-400 px-2 py-0.5 rounded-full uppercase">Live</span>
        ) : profit !== null ? (
          <span className={`text-sm font-bold font-mono ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
            {profit >= 0 ? "+" : ""}{profit.toFixed(2)}
          </span>
        ) : null}
      </div>
      <div className="w-full text-[10px] text-slate-600 mt-1">
        Opened {fmtTime(t.openedAt)}
        {t.closedAt && ` · Closed ${fmtTime(t.closedAt)}`}
        {t.login && ` · Account #${t.login}`}
      </div>
    </div>
  );
}

function SignalHistoryRow({ signal: s }: { signal: SignalRecord }) {
  const isBuy   = s.signal === "BUY";
  const isWin   = s.status === "HIT_TP";
  const decimals = s.pair.includes("JPY") || s.pair.includes("XAU") ? 2
    : s.pair.startsWith("BTC") || s.pair.startsWith("ETH") ? 2 : 5;

  return (
    <div
      style={{
        background: "rgba(11,15,25,0.7)",
        border: isWin ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(248,113,113,0.15)",
      }}
      className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-4"
    >
      <div className="shrink-0">
        {isWin ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
      </div>

      {/* Direction + Pair */}
      <div className="flex items-center gap-2 min-w-[130px]">
        <span style={isBuy
          ? { background: "rgba(52,211,153,0.1)", color: "#34d399" }
          : { background: "rgba(248,113,113,0.1)", color: "#f87171" }}
          className="text-xs font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
          {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {s.signal}
        </span>
        <span className="text-white font-bold text-sm">{s.pair}</span>
        <span className="text-[10px] text-slate-500">{s.timeframe}</span>
      </div>

      {/* Prices */}
      <div className="flex gap-4 text-xs text-slate-400 flex-1">
        <span>Entry <span className="text-white font-mono">{fmt(s.entry, decimals)}</span></span>
        <span>SL <span className="text-rose-400 font-mono">{fmt(s.stopLoss, decimals)}</span></span>
        <span>TP <span className="text-emerald-400 font-mono">{fmt(s.takeProfit, decimals)}</span></span>
      </div>

      {/* Confidence + R:R */}
      <div className="flex gap-3 text-xs text-slate-500">
        <span>{s.confidenceScore}% conf</span>
        <span>R:R {s.riskRewardRatio?.toFixed(1)}x</span>
      </div>

      {/* Outcome badge */}
      <div className="ml-auto">
        <span style={isWin
          ? { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }
          : { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}
          className={`text-xs font-bold px-3 py-1 rounded-full ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
          {isWin ? "✓ TP HIT" : "✗ SL HIT"}
        </span>
      </div>

      <div className="w-full text-[10px] text-slate-600 mt-1">
        Signal #{s.id} · {fmtTime(s.createdAt)}
      </div>
    </div>
  );
}

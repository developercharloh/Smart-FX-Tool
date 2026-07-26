/**
 * LivePositionsWidget — shows all open MT5 positions reported by the SmartFX EA.
 * EA posts to /api/ea/positions every 10s with current price + P&L.
 */

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw, Activity } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Position {
  ticket:       string;
  login:        string;
  symbol:       string;
  direction:    "BUY" | "SELL";
  lots:         number;
  openPrice:    number;
  currentPrice: number;
  sl:           number;
  tp:           number;
  profit:       number;
  signalId:     string;
  reportedAt:   number;
}

export function LivePositionsWidget() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function fetchPositions() {
    try {
      const r = await fetch(`${BASE}/api/ea/positions`);
      if (r.ok) {
        const data = await r.json();
        setPositions(Array.isArray(data) ? data : []);
        setLastFetch(new Date());
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPositions();
    const id = setInterval(fetchPositions, 8_000);
    return () => clearInterval(id);
  }, []);

  const totalPnL    = positions.reduce((s, p) => s + p.profit, 0);
  const staleMs     = lastFetch ? Date.now() - lastFetch.getTime() : Infinity;
  const isStale     = staleMs > 60_000;

  return (
    <div
      style={{ background: "rgba(11,15,25,0.75)", border: "1px solid rgba(0,255,255,0.12)", backdropFilter: "blur(16px)" }}
      className="rounded-[16px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div style={{ background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.15)" }}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Live Positions</span>
            {positions.length > 0 && (
              <span style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}
                className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full">
                {positions.length} open
              </span>
            )}
            {isStale && !loading && (
              <span className="text-[10px] text-amber-400">EA disconnected</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">Real-time from MT5 · refreshes every 8s</p>
        </div>
        <button onClick={fetchPositions} disabled={loading}
          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 transition-all disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="px-5 pb-5 space-y-3">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-3">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-sm text-slate-400">Loading positions…</span>
          </div>
        )}

        {/* No positions */}
        {!loading && positions.length === 0 && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
            className="rounded-[10px] px-4 py-4 text-center">
            <p className="text-xs text-slate-500">No open positions — EA is waiting for next signal</p>
          </div>
        )}

        {/* Position rows */}
        {positions.map(pos => (
          <PositionRow key={pos.ticket} pos={pos} />
        ))}

        {/* Total P&L footer */}
        {positions.length > 1 && (
          <div className="flex justify-between items-center pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-[11px] text-slate-500 font-medium">Total floating P&L</span>
            <span className={`text-sm font-bold font-mono ${totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {totalPnL >= 0 ? "+" : ""}{totalPnL.toFixed(2)} USD
            </span>
          </div>
        )}

        {lastFetch && (
          <p className="text-[10px] text-slate-600 text-right">
            Updated {lastFetch.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}

function PositionRow({ pos }: { pos: Position }) {
  const isBuy    = pos.direction === "BUY";
  const inProfit = pos.profit >= 0;

  const priceDiff = isBuy
    ? pos.currentPrice - pos.openPrice
    : pos.openPrice - pos.currentPrice;

  return (
    <div
      style={{
        background: inProfit ? "rgba(52,211,153,0.04)" : "rgba(244,63,94,0.04)",
        border:     inProfit ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(244,63,94,0.15)",
      }}
      className="rounded-[10px] px-4 py-3 space-y-2"
    >
      {/* Top row: symbol + direction + P&L */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isBuy
            ? <TrendingUp className="w-4 h-4 text-emerald-400" />
            : <TrendingDown className="w-4 h-4 text-rose-400" />}
          <span className="text-sm font-bold text-white font-mono">{pos.symbol}</span>
          <span style={isBuy
            ? { background: "rgba(52,211,153,0.1)", color: "#34d399" }
            : { background: "rgba(244,63,94,0.1)", color: "#f43f5e" }
          } className="text-[10px] font-bold px-2 py-0.5 rounded uppercase">
            {pos.direction}
          </span>
          <span className="text-[10px] text-slate-500">{pos.lots} lots</span>
        </div>
        <div className="text-right">
          <span className={`text-base font-bold font-mono ${inProfit ? "text-emerald-400" : "text-rose-400"}`}>
            {inProfit ? "+" : ""}{pos.profit.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-500 ml-1">USD</span>
        </div>
      </div>

      {/* Price row */}
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <p className="text-slate-600">Entry</p>
          <p className="text-white font-mono">{pos.openPrice.toFixed(5)}</p>
        </div>
        <div>
          <p className="text-slate-600">Current</p>
          <p className={`font-mono font-bold ${priceDiff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {pos.currentPrice.toFixed(5)}
          </p>
        </div>
        <div>
          <p className="text-slate-600">SL / TP</p>
          <p className="text-slate-400 font-mono text-[10px]">
            {pos.sl > 0 ? pos.sl.toFixed(pos.sl > 100 ? 2 : 5) : "—"} / {pos.tp > 0 ? pos.tp.toFixed(pos.tp > 100 ? 2 : 5) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

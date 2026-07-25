/**
 * DerivTradePanel
 * Server-side token — no input needed. Shows balance, settings, positions.
 */

import { useState, useEffect } from "react";
import {
  Zap, X, Settings2, RefreshCw, TrendingUp, TrendingDown,
  CheckCircle2, AlertCircle, Wallet, ChevronDown, ChevronUp,
  WifiOff, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDerivTradeCtx } from "@/contexts/DerivTradeContext";
import type { OpenPosition } from "@/hooks/useDerivTrade";

const MULTIPLIERS = [10, 50, 100, 200, 500];
const STAKES      = [1, 2, 5, 10, 20, 50];

function relTime(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function PositionCard({ pos, onClose }: { pos: OpenPosition; onClose: () => void }) {
  const isBuy    = pos.direction === "BUY";
  const isProfit = pos.profit >= 0;

  return (
    <div
      style={isBuy
        ? { background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.15)" }
        : { background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.15)" }
      }
      className="rounded-[10px] p-3 flex items-center gap-3"
    >
      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0",
        isBuy ? "bg-emerald-500/15" : "bg-rose-500/15")}>
        {isBuy
          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white font-mono">
            {pos.symbol.replace("frx","").replace("cry","")}
          </span>
          <span className={cn("text-[10px] font-bold", isBuy ? "text-emerald-400" : "text-rose-400")}>
            {pos.direction}
          </span>
          <span className="text-[10px] text-slate-600">#{pos.contractId}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-slate-500">Stake ${pos.stake.toFixed(2)}</span>
          <span className={cn("text-[10px] font-bold font-mono", isProfit ? "text-emerald-400" : "text-rose-400")}>
            {isProfit ? "+" : ""}{pos.profit.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-600">{relTime(pos.openedAt)}</span>
        </div>
      </div>
      <button
        onClick={onClose}
        style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}
        className="px-2 py-1 rounded-[6px] text-[10px] font-bold text-rose-400 hover:bg-rose-500/20 transition-all whitespace-nowrap"
      >Close</button>
    </div>
  );
}

export function DerivTradePanel() {
  const {
    connected, balance, refreshBalance,
    settings, saveSettings,
    status, lastResult,
    positions, refreshPositions, closePos,
  } = useDerivTradeCtx();

  const [expanded,     setExpanded]     = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refreshBalance(), refreshPositions()]);
    setRefreshing(false);
  }

  return (
    <div
      style={{ background: "rgba(8,12,22,0.7)", border: "1px solid rgba(0,255,255,0.08)", backdropFilter: "blur(20px)" }}
      className="rounded-[18px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Zap className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-wide">Deriv Trade</span>

          {/* Connection status */}
          {connected ? (
            <span style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}
              className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full">
              Connected
            </span>
          ) : (
            <span style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
              className="flex items-center gap-1 text-[10px] font-bold text-rose-400 px-2 py-0.5 rounded-full">
              <WifiOff className="w-2.5 h-2.5" /> Disconnected
            </span>
          )}

          {/* Live balance */}
          {connected && balance ? (
            <span style={{ background: "rgba(0,255,255,0.06)", border: "1px solid rgba(0,255,255,0.18)" }}
              className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 px-2.5 py-0.5 rounded-full font-mono">
              <Wallet className="w-3 h-3" />
              {balance.currency} {balance.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          ) : connected ? (
            <span className="text-[10px] text-slate-600 animate-pulse">Loading…</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(v => !v)}
            style={{ background: showSettings ? "rgba(0,255,255,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleRefresh}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-slate-500 hover:text-white transition-all">
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          </button>
          <button onClick={() => setExpanded(v => !v)} className="text-slate-500 hover:text-white transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">

          {/* Not connected warning */}
          {!connected && (
            <div style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.15)" }}
              className="rounded-[10px] px-4 py-3 text-xs text-rose-400">
              Cannot reach Deriv API. Check that <strong>DERIV_API_TOKEN</strong> is set on the server and the token has <strong>Trade</strong> scope.
            </div>
          )}

          {/* Settings panel */}
          {showSettings && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
              className="rounded-[12px] p-4 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Trade Settings</p>

              <div>
                <p className="text-xs text-slate-400 mb-2">Stake per trade (USD)</p>
                <div className="flex gap-2 flex-wrap">
                  {STAKES.map(s => (
                    <button key={s} onClick={() => saveSettings({ stake: s })}
                      style={settings.stake === s
                        ? { background: "rgba(0,255,255,0.12)", border: "1px solid rgba(0,255,255,0.3)", color: "#00e5e5" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }
                      }
                      className="px-3 py-1.5 rounded-[7px] text-xs font-bold transition-all hover:border-cyan-400/30">
                      ${s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-2">Multiplier</p>
                <div className="flex gap-2 flex-wrap">
                  {MULTIPLIERS.map(m => (
                    <button key={m} onClick={() => saveSettings({ multiplier: m })}
                      style={settings.multiplier === m
                        ? { background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }
                        : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }
                      }
                      className="px-3 py-1.5 rounded-[7px] text-xs font-bold transition-all hover:border-purple-400/30">
                      x{m}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}
                className="rounded-[8px] px-3 py-2 text-[10px] text-amber-400 leading-relaxed">
                Current: <strong>${settings.stake} stake</strong> at <strong>x{settings.multiplier} multiplier</strong>
              </div>
            </div>
          )}

          {/* Last trade result */}
          {lastResult && (
            <div style={lastResult.ok
              ? { background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }
              : { background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }
            } className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px]">
              {lastResult.ok
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                : <AlertCircle  className="w-4 h-4 text-rose-400 shrink-0" />
              }
              <span className={cn("text-xs font-semibold", lastResult.ok ? "text-emerald-400" : "text-rose-400")}>
                {lastResult.message}
              </span>
            </div>
          )}

          {/* Open positions */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Open Positions {positions.length > 0 && `(${positions.length})`}
            </p>
            {positions.length === 0 ? (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.07)" }}
                className="rounded-[10px] py-4 text-center">
                <Wallet className="w-4 h-4 text-slate-600 mx-auto mb-1" />
                <p className="text-xs text-slate-600">No open positions</p>
                <p className="text-[10px] text-slate-700 mt-0.5">Execute a signal from the AI Scanner</p>
              </div>
            ) : (
              <div className="space-y-2">
                {positions.map(pos => (
                  <PositionCard key={pos.contractId} pos={pos}
                    onClose={() => closePos(pos.contractId)} />
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

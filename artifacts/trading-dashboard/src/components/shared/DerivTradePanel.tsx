/**
 * DerivTradePanel
 * Token setup + trade settings + open positions.
 * Reads from DerivTradeContext so any component can trigger trades.
 */

import { useState, useEffect } from "react";
import {
  Zap, X, Eye, EyeOff, ExternalLink, Settings2,
  RefreshCw, TrendingUp, TrendingDown, CheckCircle2,
  AlertCircle, Wallet, ChevronDown, ChevronUp,
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

// ─── Token setup ──────────────────────────────────────────────────────────────

function TokenSetup({ onSave }: { onSave: (t: string) => void }) {
  const [val, setVal]   = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-400 space-y-1">
        <p>Create a token with <strong className="text-white">Read + Trade</strong> scope:</p>
        <a href="https://app.deriv.com/account/api-token" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-all text-[11px]">
          app.deriv.com/account/api-token <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="Paste your Deriv API token…"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            className="w-full rounded-[8px] px-3 py-2.5 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-400/50 pr-10"
          />
          <button onClick={() => setShow(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button
          onClick={() => val.trim() && onSave(val.trim())}
          disabled={!val.trim()}
          style={{ background: "rgba(0,255,255,0.12)", border: "1px solid rgba(0,255,255,0.3)" }}
          className="px-4 py-2 rounded-[8px] text-sm font-bold text-cyan-400 disabled:opacity-40 hover:bg-cyan-400/20 transition-all whitespace-nowrap"
        >Connect</button>
      </div>
    </div>
  );
}

// ─── Position card ────────────────────────────────────────────────────────────

function PositionCard({ pos, onClose }: { pos: OpenPosition; onClose: () => void }) {
  const isBuy    = pos.direction === "BUY";
  const profit   = pos.profit;
  const isProfit = profit >= 0;

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
          <span className="text-xs font-bold text-white font-mono">{pos.symbol.replace("frx","").replace("cry","")}</span>
          <span className={cn("text-[10px] font-bold", isBuy ? "text-emerald-400" : "text-rose-400")}>{pos.direction}</span>
          <span className="text-[10px] text-slate-600">#{pos.contractId}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-slate-500">Stake ${pos.stake.toFixed(2)}</span>
          <span className={cn("text-[10px] font-bold font-mono", isProfit ? "text-emerald-400" : "text-rose-400")}>
            {isProfit ? "+" : ""}{profit.toFixed(2)}
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

// ─── Main panel ───────────────────────────────────────────────────────────────

export function DerivTradePanel() {
  const {
    token, saveToken, removeToken,
    settings, saveSettings,
    status, lastResult,
    positions, refreshPositions, closePos,
  } = useDerivTradeCtx();

  const [expanded,     setExpanded]     = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (token) refreshPositions();
  }, [token]);

  const statusColor =
    status === "done"  ? "text-emerald-400" :
    status === "error" ? "text-rose-400"    :
    "text-amber-400";

  return (
    <div
      style={{ background: "rgba(8,12,22,0.7)", border: "1px solid rgba(0,255,255,0.08)", backdropFilter: "blur(20px)" }}
      className="rounded-[18px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-wide">Deriv Trade</span>
          {token && (
            <span style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}
              className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full">
              Connected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {token && (
            <>
              <button onClick={() => setShowSettings(v => !v)}
                style={{ background: showSettings ? "rgba(0,255,255,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                className="w-7 h-7 rounded-[7px] flex items-center justify-center text-slate-500 hover:text-white transition-all">
                <Settings2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={refreshPositions}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                className="w-7 h-7 rounded-[7px] flex items-center justify-center text-slate-500 hover:text-white transition-all">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={removeToken}
                style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold text-rose-400 hover:bg-rose-500/15 transition-all">
                <X className="w-3 h-3" /> Disconnect
              </button>
            </>
          )}
          <button onClick={() => setExpanded(v => !v)} className="text-slate-500 hover:text-white transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">

          {/* Token setup */}
          {!token && <TokenSetup onSave={saveToken} />}

          {/* Settings panel */}
          {token && showSettings && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
              className="rounded-[12px] p-4 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Trade Settings</p>

              {/* Stake */}
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

              {/* Multiplier */}
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
                Current: <strong>${settings.stake} stake</strong> at <strong>x{settings.multiplier} multiplier</strong> — 
                max loss ${settings.stake}, potential profit is unlimited while trade is open.
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
          {token && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Open Positions {positions.length > 0 && `(${positions.length})`}
                </p>
              </div>
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
          )}

        </div>
      )}
    </div>
  );
}

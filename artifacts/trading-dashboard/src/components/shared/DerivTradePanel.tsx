/**
 * DerivTradePanel — deep-link mode.
 * Shows stake/multiplier settings. Execute opens Deriv DTrader pre-filled.
 */

import { useState } from "react";
import {
  Zap, Settings2, ExternalLink, CheckCircle2,
  AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDerivTradeCtx } from "@/contexts/DerivTradeContext";
import { buildDerivTradeUrl } from "@/hooks/useDerivTrade";

const MULTIPLIERS = [10, 50, 100, 200, 500];
const STAKES      = [1, 2, 5, 10, 20, 50];

export function DerivTradePanel() {
  const {
    settings, saveSettings,
    lastResult,
  } = useDerivTradeCtx();

  const [expanded,     setExpanded]     = useState(true);
  const [showSettings, setShowSettings] = useState(true);

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
          <span
            style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}
            className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full"
          >
            Ready
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(v => !v)}
            style={{ background: showSettings ? "rgba(0,255,255,0.08)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-slate-500 hover:text-white transition-all"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setExpanded(v => !v)} className="text-slate-500 hover:text-white transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">

          {/* How it works */}
          <div
            style={{ background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.1)" }}
            className="rounded-[10px] px-4 py-3 text-[11px] text-slate-400 leading-relaxed flex gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-0.5" />
            <span>
              Tap <strong className="text-white">Execute</strong> on any scanner signal — Deriv opens on your phone pre-filled with the pair, direction, stake & multiplier. Just tap <strong className="text-white">Buy</strong> to confirm.
            </span>
          </div>

          {/* Settings */}
          {showSettings && (
            <div
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
              className="rounded-[12px] p-4 space-y-4"
            >
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
                      className="px-3 py-1.5 rounded-[7px] text-xs font-bold transition-all hover:border-cyan-400/30"
                    >
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
                      className="px-3 py-1.5 rounded-[7px] text-xs font-bold transition-all hover:border-purple-400/30"
                    >
                      x{m}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}
                className="rounded-[8px] px-3 py-2 text-[10px] text-amber-400 leading-relaxed"
              >
                Each trade: <strong>${settings.stake} stake</strong> · <strong>x{settings.multiplier} multiplier</strong>
                <span className="text-slate-600"> — max loss ${settings.stake}, gains are unlimited while open</span>
              </div>
            </div>
          )}

          {/* Last trade result */}
          {lastResult && (
            <div
              style={lastResult.ok
                ? { background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }
                : { background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }
              }
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px]"
            >
              {lastResult.ok
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                : <AlertCircle  className="w-4 h-4 text-rose-400 shrink-0" />
              }
              <span className={cn("text-xs font-semibold", lastResult.ok ? "text-emerald-400" : "text-rose-400")}>
                {lastResult.message}
              </span>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

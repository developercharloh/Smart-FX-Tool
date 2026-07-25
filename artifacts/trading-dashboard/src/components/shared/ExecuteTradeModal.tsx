/**
 * ExecuteTradeModal — one-click execution, everything pre-filled.
 * Entry, SL, TP come from the signal automatically.
 * Lot size defaults to 0.01 (smallest). No manual input required.
 */
import { useState, useEffect } from "react";
import { Zap, X, TrendingUp, TrendingDown, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Signal } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const LOT_PRESETS = ["0.01", "0.05", "0.10", "0.20"];

interface Props {
  signal: Signal;
  onClose: () => void;
}

type Step = "confirm" | "sending" | "queued" | "error";

export function ExecuteTradeModal({ signal, onClose }: Props) {
  const [lotSize, setLotSize] = useState("0.01");   // smallest by default
  const [step,    setStep]    = useState<Step>("confirm");
  const [errMsg,  setErrMsg]  = useState("");
  const [eaOnline, setEaOnline] = useState<boolean | null>(null);

  const isBuy = signal.signal === "BUY";
  const decimals = signal.entry > 100 ? 2 : 5;
  const fmt = (v: number) => v.toFixed(decimals);

  // Check EA heartbeat (balance reported in last 3 min)
  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/mt5/balances`),
      fetch(`${BASE}/api/ea/balance`),
    ])
      .then(async ([r1, r2]) => {
        const d1 = r1.ok ? await r1.json() : [];
        const d2 = r2.ok ? await r2.json() : [];
        const all = [...d1, ...d2];
        setEaOnline(all.some((b: any) => Date.now() - b.reportedAt < 3 * 60 * 1000));
      })
      .catch(() => setEaOnline(false));
  }, []);

  async function execute() {
    setStep("sending");
    try {
      const res = await fetch(`${BASE}/api/ea/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId: signal.id, lotSize: parseFloat(lotSize) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Server error");
      setStep("queued");
    } catch (e: any) {
      setErrMsg(e.message ?? "Failed to queue trade");
      setStep("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0d1117", border: "1px solid rgba(0,255,255,0.12)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Execute Trade</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* ── Signal details (all pre-filled, read-only) ── */}
          <div className="rounded-xl overflow-hidden"
            style={{ border: isBuy ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(248,113,113,0.25)" }}>

            {/* Direction banner */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ background: isBuy ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)" }}>
              <div className="flex items-center gap-2">
                {isBuy
                  ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                  : <TrendingDown className="w-4 h-4 text-rose-400" />}
                <span className="text-base font-bold font-mono text-white">{signal.pair}</span>
                <span className="text-xs text-slate-500 font-mono">{signal.timeframe}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>
                  {signal.signal}
                </span>
                <span className="text-xs font-bold text-cyan-400">{signal.confidenceScore}%</span>
              </div>
            </div>

            {/* Entry / SL / TP — auto-filled */}
            <div className="grid grid-cols-3 divide-x"
              style={{ divideColor: "rgba(255,255,255,0.06)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { label: "Entry",       value: fmt(signal.entry),      color: "text-white" },
                { label: "Stop Loss",   value: fmt(signal.stopLoss),   color: "text-rose-400" },
                { label: "Take Profit", value: fmt(signal.takeProfit), color: "text-emerald-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center py-3 px-2"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  <span className="text-[9px] uppercase tracking-widest text-slate-600 font-semibold mb-1">{label}</span>
                  <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
                  <span className="text-[9px] text-slate-700 mt-0.5">auto</span>
                </div>
              ))}
            </div>

            {/* R:R */}
            <div className="px-4 py-2 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
              <span className="text-[11px] text-slate-600">Risk:Reward</span>
              <span className="text-[11px] font-mono font-bold text-slate-400">
                1:{signal.riskRewardRatio.toFixed(1)}
              </span>
            </div>
          </div>

          {/* ── Lot size — smallest default, tap to change ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Lot Size</span>
              <span className="text-xs font-mono font-bold text-cyan-400">{lotSize} lots</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {LOT_PRESETS.map(preset => (
                <button
                  key={preset}
                  onClick={() => setLotSize(preset)}
                  className="py-2 rounded-lg text-xs font-mono font-bold transition-all"
                  style={lotSize === preset
                    ? { background: "rgba(0,229,255,0.15)", border: "1px solid rgba(0,229,255,0.5)", color: "#00e5ff" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}
                >
                  {preset}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-700 mt-1.5">0.01 = minimum lot (recommended for demo)</p>
          </div>

          {/* ── EA connection status ── */}
          <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${
              eaOnline === null ? "bg-slate-500" :
              eaOnline          ? "bg-emerald-400" : "bg-amber-400"
            }`} />
            <span className="text-slate-500">
              {eaOnline === null ? "Checking EA…" :
               eaOnline ? "MT5 EA connected — executes within 10s" :
               "EA not seen recently — make sure SmartFX_EA is running in MT5"}
            </span>
          </div>

          {/* ── Error ── */}
          {step === "error" && (
            <div className="flex items-center gap-2 text-xs text-rose-400 rounded-lg px-3 py-2"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {errMsg}
            </div>
          )}

          {/* ── Action buttons ── */}
          {(step === "confirm" || step === "error") && (
            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Cancel
              </button>
              <button onClick={execute}
                className="flex-2 flex-grow-[2] py-3 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg,#00e5ff,#0090ff)" }}>
                <Zap className="w-4 h-4" />
                Execute Trade
              </button>
            </div>
          )}

          {/* ── Sending ── */}
          {step === "sending" && (
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-sm text-slate-400">Sending to EA…</span>
            </div>
          )}

          {/* ── Success ── */}
          {step === "queued" && (
            <div className="flex flex-col items-center py-4 gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-white">Queued ✓</p>
                <p className="text-xs text-slate-400">
                  {signal.pair} {signal.signal} · {lotSize} lots<br />
                  EA will place the trade in MT5 within 10s
                </p>
              </div>
              <button onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-bold text-black mt-1"
                style={{ background: "linear-gradient(135deg,#00e5ff,#0090ff)" }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ExecuteTradeModal — sends a signal to the EA force-execute queue.
 * Opens when user clicks "Execute Trade" on any signal card.
 */
import { useState, useEffect } from "react";
import { Zap, X, TrendingUp, TrendingDown, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Signal } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Props {
  signal: Signal;
  onClose: () => void;
}

type Step = "form" | "sending" | "queued" | "error";

export function ExecuteTradeModal({ signal, onClose }: Props) {
  const [lotSize, setLotSize] = useState("0.01");
  const [step, setStep]       = useState<Step>("form");
  const [errMsg, setErrMsg]   = useState("");
  const [eaOnline, setEaOnline] = useState<boolean | null>(null);

  const isBuy = signal.signal === "BUY";

  // Check if EA is connected (has a balance report in last 3 min)
  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/mt5/balances`),
      fetch(`${BASE}/api/ea/balance`),
    ])
      .then(async ([r1, r2]) => {
        const d1 = r1.ok ? await r1.json() : [];
        const d2 = r2.ok ? await r2.json() : [];
        const all = [...d1, ...d2];
        const recent = all.some((b: any) => Date.now() - b.reportedAt < 3 * 60 * 1000);
        setEaOnline(recent);
      })
      .catch(() => setEaOnline(false));
  }, []);

  async function handleExecute() {
    const lots = parseFloat(lotSize);
    if (isNaN(lots) || lots <= 0) {
      setErrMsg("Enter a valid lot size (e.g. 0.01)");
      return;
    }
    setStep("sending");
    try {
      const res = await fetch(`${BASE}/api/ea/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId: signal.id, lotSize: lots }),
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0b0f19", border: "1px solid rgba(0,255,255,0.15)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Execute Trade</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* Signal summary */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: isBuy ? "rgba(52,211,153,0.06)" : "rgba(248,113,113,0.06)",
                     border: isBuy ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(248,113,113,0.2)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isBuy
                  ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                  : <TrendingDown className="w-4 h-4 text-rose-400" />}
                <span className="text-base font-bold font-mono text-white">{signal.pair}</span>
                <span className="text-xs text-slate-500 font-mono">{signal.timeframe}</span>
              </div>
              <span className={`text-sm font-bold ${isBuy ? "text-emerald-400" : "text-rose-400"}`}>
                {signal.signal}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Entry", val: signal.entry.toFixed(signal.entry > 100 ? 2 : 5), color: "text-white" },
                { label: "Stop Loss", val: signal.stopLoss.toFixed(signal.stopLoss > 100 ? 2 : 5), color: "text-rose-400" },
                { label: "Take Profit", val: signal.takeProfit.toFixed(signal.takeProfit > 100 ? 2 : 5), color: "text-emerald-400" },
              ].map(({ label, val, color }) => (
                <div key={label} className="rounded-lg py-2 px-1"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
                  <div className={`text-xs font-mono font-bold ${color}`}>{val}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>R:R 1:{signal.riskRewardRatio.toFixed(1)}</span>
              <span className="text-cyan-400 font-bold">{signal.confidenceScore}% confidence</span>
            </div>
          </div>

          {/* EA status */}
          <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              eaOnline === null ? "bg-slate-500 animate-pulse" :
              eaOnline ? "bg-emerald-400" : "bg-amber-400"
            }`} />
            <span className="text-slate-400">
              {eaOnline === null ? "Checking EA connection…" :
               eaOnline ? "MT5 EA connected — trade will execute within 10s" :
               "EA not recently seen — ensure SmartFX_EA is running in MT5"}
            </span>
          </div>

          {/* Form */}
          {(step === "form" || step === "error") && (
            <>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">
                  Lot Size
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={lotSize}
                  onChange={e => { setLotSize(e.target.value); setErrMsg(""); }}
                  className="w-full rounded-lg px-3 py-2.5 text-sm font-mono text-white outline-none focus:ring-1 focus:ring-cyan-500"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder="0.01"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[10px] text-slate-600">Recommended: 0.01 for demo</p>
                  <div className="flex gap-2">
                    {["0.01","0.05","0.10"].map(v => (
                      <button key={v} onClick={() => setLotSize(v)}
                        className="text-[10px] text-cyan-500 hover:text-cyan-300 font-mono transition-colors">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {errMsg && (
                <div className="flex items-center gap-2 text-xs text-rose-400 rounded-lg px-3 py-2"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errMsg}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Cancel
                </button>
                <button onClick={handleExecute}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#00e5ff,#0090ff)" }}>
                  <Zap className="w-4 h-4" />
                  Send to EA
                </button>
              </div>

              <div className="flex items-start gap-2 text-[10px] text-slate-600 leading-relaxed">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                Trade is queued on the server. The MT5 EA picks it up within 10 seconds and places the order automatically. You will see it appear in MT5 and on this dashboard.
              </div>
            </>
          )}

          {/* Sending */}
          {step === "sending" && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm text-slate-400">Sending to EA queue…</p>
            </div>
          )}

          {/* Queued success */}
          {step === "queued" && (
            <div className="flex flex-col items-center py-4 gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }}>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white mb-1">Trade Queued ✓</p>
                <p className="text-xs text-slate-400">
                  {signal.pair} {signal.signal} {lotSize} lots<br />
                  EA will execute within 10 seconds
                </p>
              </div>
              <button onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl text-sm font-bold text-black"
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

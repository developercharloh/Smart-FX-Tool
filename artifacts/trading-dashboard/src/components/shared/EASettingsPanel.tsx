/**
 * EASettingsPanel — full production risk controls + kill switch.
 * Settings stored in DB. EA picks up changes within 60 seconds.
 */

import { useEffect, useState, useCallback } from "react";
import {
  Settings, Save, CheckCircle2, RefreshCw,
  ShieldAlert, ShieldCheck, Zap, AlertTriangle,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface EASettings {
  // Core
  dailyProfitTarget: number;
  dailyLossLimit:    number;
  minConfidence:     number;
  minProfitClose:    number;
  // Risk sizing
  riskPercent:       number;
  lotSize:           number;   // fallback if balance not available
  maxOpenTrades:     number;
  maxSpreadPips:     number;
  // State
  halted:            boolean;
}

const DEFAULTS: EASettings = {
  dailyProfitTarget: 0,
  dailyLossLimit:    0,
  minConfidence:     80,
  minProfitClose:    0,
  riskPercent:       1.0,
  lotSize:           0.01,
  maxOpenTrades:     1,
  maxSpreadPips:     3.0,
  halted:            false,
};

export function EASettingsPanel() {
  const [settings, setSettings] = useState<EASettings>(DEFAULTS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [halting,  setHalting]  = useState(false);
  const [open,     setOpen]     = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/ea/settings`);
      if (r.ok) {
        const d = await r.json();
        setSettings({
          dailyProfitTarget: d.dailyProfitTarget ?? 0,
          dailyLossLimit:    d.dailyLossLimit    ?? 0,
          minConfidence:     d.minConfidence      ?? 80,
          minProfitClose:    d.minProfitClose     ?? 0,
          riskPercent:       d.riskPercent        ?? 1.0,
          lotSize:           d.lotSize            ?? 0.01,
          maxOpenTrades:     d.maxOpenTrades       ?? 1,
          maxSpreadPips:     d.maxSpreadPips       ?? 3.0,
          halted:            d.halted             ?? false,
        });
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/ea/settings`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(settings),
      });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch { /* silent */ } finally { setSaving(false); }
  }

  async function toggleHalt() {
    setHalting(true);
    const newHalted = !settings.halted;
    try {
      const r = await fetch(`${BASE}/api/ea/halt`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ halted: newHalted }),
      });
      if (r.ok) {
        setSettings(s => ({ ...s, halted: newHalted }));
      }
    } catch { /* silent */ } finally { setHalting(false); }
  }

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  function update(key: keyof EASettings, val: string | boolean) {
    setSettings(s => ({ ...s, [key]: typeof val === "boolean" ? val : Number(val) }));
    setSaved(false);
  }

  const isHalted = settings.halted;

  return (
    <div
      style={{ background: "rgba(11,15,25,0.75)", border: `1px solid ${isHalted ? "rgba(248,113,113,0.3)" : "rgba(0,255,255,0.12)"}`, backdropFilter: "blur(16px)" }}
      className="rounded-[16px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div style={{ background: isHalted ? "rgba(248,113,113,0.12)" : "rgba(139,92,246,0.08)", border: `1px solid ${isHalted ? "rgba(248,113,113,0.3)" : "rgba(139,92,246,0.2)"}` }}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0">
          <Settings className={`w-4 h-4 ${isHalted ? "text-rose-400" : "text-violet-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-white">EA Settings</span>
          <p className="text-[11px] text-slate-500">EA picks up changes within 60 seconds</p>
        </div>
        <button onClick={() => setOpen(v => !v)}
          className="text-[11px] text-slate-500 hover:text-white px-2 py-1 rounded transition-all">
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-400">Loading settings…</span>
            </div>
          ) : (
            <>
              {/* ── Kill Switch ───────────────────────────────────────────── */}
              <div style={{
                background: isHalted ? "rgba(248,113,113,0.08)" : "rgba(52,211,153,0.06)",
                border: `1px solid ${isHalted ? "rgba(248,113,113,0.25)" : "rgba(52,211,153,0.2)"}`,
              }} className="rounded-[12px] p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isHalted ? "bg-rose-500/15" : "bg-emerald-500/10"}`}>
                  {isHalted
                    ? <ShieldAlert className="w-5 h-5 text-rose-400" />
                    : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${isHalted ? "text-rose-300" : "text-emerald-300"}`}>
                    {isHalted ? "EA HALTED — No new trades" : "EA ACTIVE — Trading normally"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {isHalted
                      ? "Kill switch is ON. EA ignores all new signals until resumed."
                      : "Kill switch is OFF. EA picks up signals as they arrive."}
                  </p>
                </div>
                <button
                  onClick={toggleHalt}
                  disabled={halting}
                  style={{
                    background: isHalted ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                    border: `1px solid ${isHalted ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-sm font-bold transition-all disabled:opacity-50 shrink-0"
                >
                  {halting
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    : isHalted
                      ? <><Zap className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-300">Resume</span></>
                      : <><ShieldAlert className="w-3.5 h-3.5 text-rose-400" /><span className="text-rose-300">Halt EA</span></>}
                </button>
              </div>

              {/* ── Risk Warning (shown when not halted) ──────────────────── */}
              {!isHalted && (
                <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}
                  className="rounded-[10px] px-4 py-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    For real money: set Risk % to 1–2%, Daily Loss Limit to 3–5% of balance,
                    Max Spread to 2–3 pips. Test on demo first.
                  </p>
                </div>
              )}

              {/* ── Risk & Sizing ─────────────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Risk & Position Sizing</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SettingField
                    label="Risk Per Trade (%)"
                    hint="% of balance risked per trade. Lot size is auto-calculated. 0 = use fixed lot size below."
                    value={settings.riskPercent}
                    onChange={v => update("riskPercent", v)}
                    min={0} max={10} step={0.1} placeholder="e.g. 1.0"
                    accent="cyan"
                  />
                  {/* Lot Size dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                      Fallback Lot Size
                    </label>
                    <select
                      value={settings.lotSize}
                      onChange={e => update("lotSize", e.target.value)}
                      className="w-full rounded-[10px] px-3 py-2.5 text-sm font-semibold text-white outline-none transition-all duration-200 appearance-none cursor-pointer"
                      style={{
                        background: "rgba(6,12,22,0.9)",
                        border: "1px solid rgba(6,182,212,0.2)",
                        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                        paddingRight: "36px",
                      }}
                    >
                      {[0.01, 0.02, 0.03, 0.05, 0.10, 0.20, 0.50, 1.00, 2.00].map(v => (
                        <option key={v} value={v} style={{ background: "#0a0f1e" }}>
                          {v.toFixed(2)} lots{v === 0.01 ? " (default)" : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Used when balance is unavailable or Risk % is 0.
                    </p>
                  </div>
                  <SettingField
                    label="Max Open Trades"
                    hint="EA stops taking new signals when this many positions are open."
                    value={settings.maxOpenTrades}
                    onChange={v => update("maxOpenTrades", v)}
                    min={1} max={20} step={1} placeholder="e.g. 3"
                    accent="violet"
                  />
                  <SettingField
                    label="Max Spread (pips)"
                    hint="Skip signal if spread is wider than this. 0 = no filter."
                    value={settings.maxSpreadPips}
                    onChange={v => update("maxSpreadPips", v)}
                    min={0} max={20} step={0.5} placeholder="e.g. 3.0"
                    accent="violet"
                  />
                </div>
              </div>

              {/* ── Safety Limits ─────────────────────────────────────────── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Daily Safety Limits</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SettingField
                    label="Daily Profit Target (USD)"
                    hint="EA stops all trading when today's profit hits this. 0 = disabled."
                    value={settings.dailyProfitTarget}
                    onChange={v => update("dailyProfitTarget", v)}
                    min={0} step={1} placeholder="e.g. 20"
                    accent="emerald"
                  />
                  <SettingField
                    label="Daily Loss Limit (USD)"
                    hint="Auto-halts EA when today's loss hits this. 0 = disabled."
                    value={settings.dailyLossLimit}
                    onChange={v => update("dailyLossLimit", v)}
                    min={0} step={1} placeholder="e.g. 10"
                    accent="rose"
                  />
                  <SettingField
                    label="Min Confidence (%)"
                    hint="EA only trades signals at or above this confidence score."
                    value={settings.minConfidence}
                    onChange={v => update("minConfidence", v)}
                    min={50} max={100} step={1} placeholder="e.g. 80"
                    accent="violet"
                  />
                  <SettingField
                    label="Min Profit Close (USD)"
                    hint="Close position when floating profit reaches this. 0 = wait for TP."
                    value={settings.minProfitClose}
                    onChange={v => update("minProfitClose", v)}
                    min={0} step={0.5} placeholder="e.g. 1"
                    accent="emerald"
                  />
                </div>
              </div>

              {/* ── Save button ───────────────────────────────────────────── */}
              <button
                onClick={saveSettings}
                disabled={saving}
                style={{
                  background: saved ? "rgba(52,211,153,0.15)" : "rgba(139,92,246,0.15)",
                  border:     saved ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(139,92,246,0.3)",
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-bold transition-all disabled:opacity-50"
              >
                {saving ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" /><span className="text-violet-300">Saving…</span></>
                ) : saved ? (
                  <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-300">Saved — EA will apply within 60s</span></>
                ) : (
                  <><Save className="w-3.5 h-3.5 text-violet-400" /><span className="text-violet-300">Save & Send to EA</span></>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SettingField({
  label, hint, value, onChange, min, max, step, placeholder, accent,
}: {
  label: string; hint: string; value: number;
  onChange: (v: string) => void;
  min?: number; max?: number; step?: number; placeholder?: string;
  accent: "emerald" | "rose" | "cyan" | "violet";
}) {
  const colors = {
    emerald: { border: "rgba(52,211,153,0.2)",  focus: "#34d399" },
    rose:    { border: "rgba(244,63,94,0.2)",   focus: "#f43f5e" },
    cyan:    { border: "rgba(0,255,255,0.2)",   focus: "#22d3ee" },
    violet:  { border: "rgba(139,92,246,0.2)",  focus: "#a78bfa" },
  }[accent];

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        type="number" value={value || ""} onChange={e => onChange(e.target.value)}
        min={min} max={max} step={step} placeholder={placeholder}
        style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${colors.border}`, color: "white", outline: "none" }}
        className="w-full px-3 py-2 rounded-[8px] text-sm font-mono focus:ring-1"
        onFocus={e => (e.target.style.borderColor = colors.focus)}
        onBlur={e  => (e.target.style.borderColor = colors.border)}
      />
      <p className="text-[10px] text-slate-600 leading-relaxed">{hint}</p>
    </div>
  );
}

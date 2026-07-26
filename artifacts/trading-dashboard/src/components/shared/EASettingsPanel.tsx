/**
 * EASettingsPanel — set daily profit target, loss limit, lot size, min confidence.
 * Settings are stored in the DB. EA polls /api/ea/settings every 60s and applies them live.
 */

import { useEffect, useState } from "react";
import { Settings, Save, CheckCircle2, RefreshCw } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface EASettings {
  dailyProfitTarget: number;
  dailyLossLimit:    number;
  lotSize:           number;
  minConfidence:     number;
  minProfitClose:    number;
}

export function EASettingsPanel() {
  const [settings,  setSettings]  = useState<EASettings>({
    dailyProfitTarget: 0,
    dailyLossLimit:    0,
    lotSize:           0.01,
    minConfidence:     80,
    minProfitClose:    0,
  });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [open,     setOpen]     = useState(true);

  async function fetchSettings() {
    try {
      const r = await fetch(`${BASE}/api/ea/settings`);
      if (r.ok) {
        const d = await r.json();
        setSettings({
          dailyProfitTarget: d.dailyProfitTarget ?? 0,
          dailyLossLimit:    d.dailyLossLimit    ?? 0,
          lotSize:           d.lotSize           ?? 0.01,
          minConfidence:     d.minConfidence      ?? 80,
          minProfitClose:    d.minProfitClose     ?? 0,
        });
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/ea/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* silent */ } finally {
      setSaving(false);
    }
  }

  useEffect(() => { fetchSettings(); }, []);

  function update(key: keyof EASettings, val: string) {
    setSettings(s => ({ ...s, [key]: Number(val) }));
    setSaved(false);
  }

  return (
    <div
      style={{ background: "rgba(11,15,25,0.75)", border: "1px solid rgba(0,255,255,0.12)", backdropFilter: "blur(16px)" }}
      className="rounded-[16px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4 text-violet-400" />
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
        <div className="px-5 pb-5 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-400">Loading settings…</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Daily Profit Target */}
                <SettingField
                  label="Daily Profit Target (USD)"
                  hint="EA stops all trading when profit hits this. 0 = disabled."
                  value={settings.dailyProfitTarget}
                  onChange={v => update("dailyProfitTarget", v)}
                  min={0} step={1} placeholder="e.g. 20"
                  accent="emerald"
                />

                {/* Daily Loss Limit */}
                <SettingField
                  label="Daily Loss Limit (USD)"
                  hint="EA stops all trading when loss hits this. 0 = disabled."
                  value={settings.dailyLossLimit}
                  onChange={v => update("dailyLossLimit", v)}
                  min={0} step={1} placeholder="e.g. 10"
                  accent="rose"
                />

                {/* Lot Size */}
                <SettingField
                  label="Lot Size"
                  hint="Volume per trade for auto-signals."
                  value={settings.lotSize}
                  onChange={v => update("lotSize", v)}
                  min={0.01} step={0.01} placeholder="e.g. 0.05"
                  accent="cyan"
                />

                {/* Min Confidence */}
                <SettingField
                  label="Min Confidence (%)"
                  hint="EA only trades signals at or above this confidence."
                  value={settings.minConfidence}
                  onChange={v => update("minConfidence", v)}
                  min={50} max={100} step={1} placeholder="e.g. 80"
                  accent="violet"
                />

                {/* Min Profit Close */}
                <SettingField
                  label="Min Profit Close (USD)"
                  hint="Close position immediately when floating profit reaches this amount. 0 = wait for TP."
                  value={settings.minProfitClose}
                  onChange={v => update("minProfitClose", v)}
                  min={0} step={0.5} placeholder="e.g. 1"
                  accent="emerald"
                />
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                style={{
                  background: saved ? "rgba(52,211,153,0.15)" : "rgba(139,92,246,0.15)",
                  border: saved ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(139,92,246,0.3)",
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
        type="number"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        min={min} max={max} step={step}
        placeholder={placeholder}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${colors.border}`,
          color: "white",
          outline: "none",
        }}
        className="w-full px-3 py-2 rounded-[8px] text-sm font-mono focus:ring-1"
        onFocus={e => (e.target.style.borderColor = colors.focus)}
        onBlur={e => (e.target.style.borderColor = colors.border)}
      />
      <p className="text-[10px] text-slate-600 leading-relaxed">{hint}</p>
    </div>
  );
}

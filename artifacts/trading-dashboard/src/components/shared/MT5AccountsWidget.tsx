/**
 * MT5AccountsWidget — shows Real & Demo MT5 STD balances from Deriv API.
 * Fetches from /api/deriv/mt5-accounts via the SmartFX API server.
 */

import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, Wifi, WifiOff, ChevronDown, ChevronUp } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface MT5Account {
  login: string;
  balance: number;
  currency: string;
  accountType: "real" | "demo";
  name: string;
  server: string;
}

export function MT5AccountsWidget() {
  const [accounts, setAccounts]   = useState<MT5Account[] | null>(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<string | null>(null);
  const [open,     setOpen]       = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function fetchAccounts() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${BASE}/api/deriv/mt5-accounts`);
      const text = await r.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(text); }
      if (!r.ok || data.error) {
        const msg: string = data.error ?? text;
        // Surface a friendlier hint for the most common auth failure
        if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("token")) {
          throw new Error("API token rejected — regenerate it with Admin permission on Deriv (see below)");
        }
        throw new Error(msg);
      }
      setAccounts(data);
      setLastFetch(new Date());
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch MT5 accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
    // Refresh every 60s
    const id = setInterval(fetchAccounts, 60_000);
    return () => clearInterval(id);
  }, []);

  const real = accounts?.filter(a => a.accountType === "real") ?? [];
  const demo = accounts?.filter(a => a.accountType === "demo") ?? [];

  return (
    <div
      style={{ background: "rgba(11,15,25,0.75)", border: "1px solid rgba(0,255,255,0.12)", backdropFilter: "blur(16px)" }}
      className="rounded-[16px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div style={{ background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.15)" }}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
        >
          <TrendingUp className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Deriv MT5</span>
            {!loading && !error && accounts !== null && (
              <span style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full">
                <Wifi className="w-2.5 h-2.5" /> Connected
              </span>
            )}
            {error && (
              <span style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
                className="flex items-center gap-1 text-[10px] font-bold text-rose-400 px-2 py-0.5 rounded-full">
                <WifiOff className="w-2.5 h-2.5" /> Error
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">Standard CFD Accounts</p>
        </div>
        <button
          onClick={fetchAccounts}
          disabled={loading}
          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={() => setOpen(v => !v)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-all"
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 py-3">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-sm text-slate-400">Fetching MT5 accounts…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}
              className="rounded-[10px] px-4 py-3 text-sm text-rose-400 space-y-1"
            >
              <p className="font-semibold">Cannot connect to Deriv API</p>
              <p className="text-xs text-slate-500">{error}</p>
              <button onClick={fetchAccounts}
                className="text-xs text-cyan-400 hover:underline mt-1">Retry</button>
            </div>
          )}

          {/* Accounts */}
          {!loading && !error && accounts !== null && (
            <>
              {accounts.length === 0 && (
                <p className="text-sm text-slate-500 py-2">No MT5 accounts found on this token.</p>
              )}

              {/* Real accounts */}
              {real.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Real</p>
                  {real.map(acc => (
                    <AccountRow key={acc.login} acc={acc} />
                  ))}
                </div>
              )}

              {/* Demo accounts */}
              {demo.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Demo</p>
                  {demo.map(acc => (
                    <AccountRow key={acc.login} acc={acc} />
                  ))}
                </div>
              )}

              {/* Trade note */}
              <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)" }}
                className="rounded-[8px] px-3 py-2 text-[11px] text-amber-400/80 leading-relaxed"
              >
                To execute trades on MT5 CFDs, open the <strong>Deriv MT5 app</strong> and place the order manually, or tap the signal's <strong>Open in MT5</strong> button.
              </div>

              {lastFetch && (
                <p className="text-[10px] text-slate-600 text-right">
                  Updated {lastFetch.toLocaleTimeString()}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AccountRow({ acc }: { acc: MT5Account }) {
  const isReal = acc.accountType === "real";
  return (
    <div
      style={{
        background: isReal ? "rgba(52,211,153,0.04)" : "rgba(139,92,246,0.04)",
        border: isReal ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(139,92,246,0.15)",
      }}
      className="rounded-[10px] px-4 py-3 flex items-center justify-between gap-3"
    >
      <div>
        <div className="flex items-center gap-2">
          <span style={isReal
            ? { background: "rgba(52,211,153,0.1)", color: "#34d399" }
            : { background: "rgba(139,92,246,0.1)", color: "#a78bfa" }
          } className="text-[10px] font-bold px-2 py-0.5 rounded uppercase">
            {isReal ? "Real" : "Demo"}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">{acc.login}</span>
        </div>
        <p className="text-[10px] text-slate-600 mt-0.5">{acc.server || "Standard CFD"}</p>
      </div>
      <div className="text-right">
        <p className="text-base font-bold font-mono text-white">
          {acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-[10px] text-slate-500">{acc.currency}</p>
      </div>
    </div>
  );
}

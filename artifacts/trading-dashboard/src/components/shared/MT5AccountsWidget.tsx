/**
 * MT5AccountsWidget — shows live MT5 balance reported by the SmartFX EA.
 * Reads from /api/ea/balance and /api/mt5/balances (DB-persisted, survives restarts).
 */

import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, Wifi, WifiOff, ChevronDown, ChevronUp } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface MT5Account {
  login:       string;
  balance:     number;
  equity:      number;
  currency:    string;
  accountType: "real" | "demo";
  server:      string;
  reportedAt:  number;
}

export function MT5AccountsWidget() {
  const [accounts,  setAccounts]  = useState<MT5Account[] | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [open,      setOpen]      = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${BASE}/api/ea/balance`),
        fetch(`${BASE}/api/mt5/balances`),
      ]);
      const d1: any[] = r1.ok ? await r1.json() : [];
      const d2: any[] = r2.ok ? await r2.json() : [];

      // Merge and deduplicate by login
      const seen = new Set<string>();
      const merged = [...d1, ...d2].filter(b => {
        if (seen.has(b.login)) return false;
        seen.add(b.login);
        return true;
      });

      const mapped: MT5Account[] = merged.map((b: any) => ({
        login:       String(b.login),
        balance:     Number(b.balance)  || 0,
        equity:      Number(b.equity)   || 0,
        currency:    String(b.currency  || "USD"),
        accountType: b.accountType === "real" ? "real" : "demo",
        server:      String(b.server    || "Deriv-Server"),
        reportedAt:  Number(b.reportedAt) || 0,
      }));

      setAccounts(mapped);
      setLastFetch(new Date());
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
    const id = setInterval(fetchAccounts, 30_000);
    return () => clearInterval(id);
  }, []);

  const connected = accounts !== null && accounts.length > 0;
  const real = accounts?.filter(a => a.accountType === "real")  ?? [];
  const demo = accounts?.filter(a => a.accountType === "demo")  ?? [];

  return (
    <div
      style={{ background: "rgba(11,15,25,0.75)", border: "1px solid rgba(0,255,255,0.12)", backdropFilter: "blur(16px)" }}
      className="rounded-[16px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div style={{ background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.15)" }}
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Deriv MT5</span>
            {!loading && connected && (
              <span style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)" }}
                className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full">
                <Wifi className="w-2.5 h-2.5" /> Connected
              </span>
            )}
            {!loading && !connected && (
              <span style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
                className="flex items-center gap-1 text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full">
                <WifiOff className="w-2.5 h-2.5" /> Waiting for EA
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">Live MT5 Balance</p>
        </div>
        <button onClick={fetchAccounts} disabled={loading}
          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 transition-all disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={() => setOpen(v => !v)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-all">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-3">

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 py-3">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="text-sm text-slate-400">Loading balance…</span>
            </div>
          )}

          {/* No data yet */}
          {!loading && !connected && (
            <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)" }}
              className="rounded-[10px] px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-amber-400">Waiting for MT5 EA</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The SmartFX EA is connecting. Balance will appear automatically once MT5 reports it — usually within 15 seconds of attaching the EA to a chart.
              </p>
              <button onClick={fetchAccounts}
                className="text-xs text-cyan-400 hover:underline mt-1">Check now</button>
            </div>
          )}

          {/* Accounts */}
          {!loading && connected && (
            <>
              {real.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Real</p>
                  {real.map(acc => <AccountRow key={acc.login} acc={acc} />)}
                </div>
              )}
              {demo.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Demo</p>
                  {demo.map(acc => <AccountRow key={acc.login} acc={acc} />)}
                </div>
              )}
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
  const ageMs  = Date.now() - acc.reportedAt;
  const fresh  = ageMs < 5 * 60 * 1000; // green dot if reported in last 5 min

  return (
    <div
      style={{
        background: isReal ? "rgba(52,211,153,0.04)" : "rgba(139,92,246,0.04)",
        border:     isReal ? "1px solid rgba(52,211,153,0.15)" : "1px solid rgba(139,92,246,0.15)",
      }}
      className="rounded-[10px] px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span style={isReal
              ? { background: "rgba(52,211,153,0.1)", color: "#34d399" }
              : { background: "rgba(139,92,246,0.1)", color: "#a78bfa" }
            } className="text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              {isReal ? "Real" : "Demo"}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">#{acc.login}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${fresh ? "bg-emerald-400" : "bg-slate-600"}`} />
          </div>
          <p className="text-[10px] text-slate-600 mt-0.5">{acc.server || "Deriv-Server"}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold font-mono text-white">
            {acc.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500">{acc.currency}</p>
        </div>
      </div>
      {acc.equity !== acc.balance && (
        <div className="mt-2 pt-2 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[10px] text-slate-600">Equity</span>
          <span className={`text-[11px] font-mono font-bold ${acc.equity >= acc.balance ? "text-emerald-400" : "text-rose-400"}`}>
            {acc.equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {acc.currency}
          </span>
        </div>
      )}
    </div>
  );
}

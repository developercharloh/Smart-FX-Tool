/**
 * DerivBalanceWidget
 * Shows live MT5 account balances from the EA heartbeat only.
 * EA calls POST /api/mt5/balance-report every ~15s automatically.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, Wifi, WifiOff, Eye, EyeOff, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

interface EAAccount {
  accountType: "REAL" | "DEMO";
  balance:     number;
  equity:      number;
  freeMargin:  number;
  currency:    string;
  login:       number;
  name:        string;
  broker:      string;
  reportedAt:  number;
}

function useEABalance() {
  const [real, setReal] = useState<EAAccount | null>(null);
  const [demo, setDemo] = useState<EAAccount | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const resp = await fetch(`${BASE}/api/mt5/balance`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.real) setReal(data.real);
      if (data.demo) setDemo(data.demo);
      setLastFetch(Date.now());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 10_000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { real, demo, lastFetch };
}

function fmtBalance(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: currency || "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

function relTime(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function AccountCard({ type, balance, equity, freeMargin, currency, loginId, broker, reportedAt, hidden }: {
  type: "REAL" | "DEMO";
  balance: number; equity?: number; freeMargin?: number;
  currency: string; loginId?: number; broker?: string;
  reportedAt?: number; hidden: boolean;
}) {
  const isReal = type === "REAL";
  return (
    <div
      style={isReal
        ? { background: "linear-gradient(135deg,rgba(0,255,255,0.05),rgba(6,182,212,0.03))", border: "1px solid rgba(0,255,255,0.2)", boxShadow: "0 4px 24px rgba(0,255,255,0.06)" }
        : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }
      }
      className="rounded-[14px] p-4 flex flex-col gap-3 flex-1 min-w-[180px]"
    >
      <div className="flex items-center justify-between">
        <span
          style={isReal
            ? { background: "rgba(0,255,255,0.1)", border: "1px solid rgba(0,255,255,0.25)", color: "#00e5e5" }
            : { background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)", color: "#94a3b8" }
          }
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
        >{type}</span>
        {reportedAt && (
          <span className="text-[10px] text-slate-600 font-mono">{relTime(reportedAt)}</span>
        )}
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">Balance</div>
        <div className={cn("text-2xl font-mono font-bold tracking-tight leading-none", isReal ? "text-white" : "text-slate-400")}>
          {hidden ? "••••••" : fmtBalance(balance, currency)}
        </div>
      </div>

      {(equity != null || freeMargin != null) && (
        <div className="grid grid-cols-2 gap-2">
          {equity != null && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }} className="rounded-[8px] px-2.5 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Equity</div>
              <div className="font-mono text-xs font-bold text-emerald-400">{hidden ? "••••••" : fmtBalance(equity, currency)}</div>
            </div>
          )}
          {freeMargin != null && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }} className="rounded-[8px] px-2.5 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Free Margin</div>
              <div className="font-mono text-xs font-bold text-blue-400">{hidden ? "••••••" : fmtBalance(freeMargin, currency)}</div>
            </div>
          )}
        </div>
      )}

      {(loginId || broker) && (
        <div className="text-[10px] text-slate-600 font-mono space-y-0.5 border-t border-white/5 pt-2">
          {loginId && <div>Login: {loginId}</div>}
          {broker  && <div>{broker}</div>}
        </div>
      )}
    </div>
  );
}

export function DerivBalanceWidget() {
  const [hideBalances, setHide] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const ea = useEABalance();

  const connected = !!(ea.real || ea.demo);

  return (
    <div
      style={{ background: "rgba(8,12,22,0.7)", border: "1px solid rgba(0,255,255,0.08)", backdropFilter: "blur(20px)" }}
      className="rounded-[18px] overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Wallet className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-wide">MT5 Live Accounts</span>
          <div className="flex items-center gap-1.5">
            {connected
              ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              : <WifiOff className="w-3.5 h-3.5 text-slate-600" />
            }
            <span className="text-[10px] font-mono text-slate-500">
              {connected ? "EA connected" : "Waiting for EA…"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setHide(v => !v)}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-slate-500 hover:text-white transition-all"
          >
            {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setExpanded(v => !v)} className="text-slate-500 hover:text-white transition-all">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5">
          {connected ? (
            <div className="flex flex-wrap gap-3">
              {ea.real && (
                <AccountCard type="REAL" balance={ea.real.balance} equity={ea.real.equity} freeMargin={ea.real.freeMargin}
                  currency={ea.real.currency} loginId={ea.real.login} broker={ea.real.broker}
                  reportedAt={ea.real.reportedAt} hidden={hideBalances} />
              )}
              {ea.demo && (
                <AccountCard type="DEMO" balance={ea.demo.balance} equity={ea.demo.equity} freeMargin={ea.demo.freeMargin}
                  currency={ea.demo.currency} loginId={ea.demo.login} broker={ea.demo.broker}
                  reportedAt={ea.demo.reportedAt} hidden={hideBalances} />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}
                className="w-12 h-12 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-400">Waiting for EA</p>
              <p className="text-xs text-slate-600 max-w-xs">
                Attach SmartFX_EA to any chart in MT5 — balance appears here within 5 seconds.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

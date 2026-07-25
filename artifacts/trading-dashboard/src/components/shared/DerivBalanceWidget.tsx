/**
 * DerivBalanceWidget
 *
 * Shows live MT5 account balances — real + demo — with two data sources:
 *  1. Deriv WebSocket API  (user pastes their API token once; token lives in localStorage)
 *  2. EA heartbeat          (EA calls POST /api/mt5/balance-report on every poll; no extra setup)
 *
 * Whichever source has fresher data is preferred; both can be shown.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Wallet, Wifi, WifiOff, RefreshCw, X, Eye, EyeOff,
  ExternalLink, CheckCircle, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const TOKEN_KEY = "smartfx_deriv_token";
const DERIV_APP_ID = 1089; // generic Deriv app ID for personal use

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface DerivAccount {
  loginid:     string;
  accountType: "real" | "demo"; // derived
  currency:    string;
  balance:     number;
  isVirtual:   boolean;
}

// ─── Deriv WebSocket hook ─────────────────────────────────────────────────────

function useDerivWS(token: string | null) {
  const [accounts, setAccounts] = useState<DerivAccount[]>([]);
  const [status, setStatus]     = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError]       = useState<string | null>(null);
  const wsRef                   = useRef<WebSocket | null>(null);
  const accountListRef          = useRef<any[]>([]);

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current) wsRef.current.close();

    setStatus("connecting");
    setError(null);

    const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);

        if (msg.error) {
          setStatus("error");
          setError(msg.error.message ?? "Deriv API error");
          return;
        }

        if (msg.msg_type === "authorize") {
          setStatus("connected");
          accountListRef.current = msg.authorize?.account_list ?? [];
          // Subscribe to all-account balance updates
          ws.send(JSON.stringify({ balance: 1, account: "all", subscribe: 1 }));
        }

        if (msg.msg_type === "balance") {
          const b = msg.balance;
          const acctMeta = accountListRef.current.find(a => a.loginid === b?.loginid);
          const isVirtual = acctMeta ? Boolean(acctMeta.is_virtual) : b?.loginid?.startsWith("VR");

          // Use totals if available (all-account subscribe)
          const realTotal = b?.total?.deriv?.amount;
          const demoTotal = b?.total?.deriv_demo?.amount;

          if (realTotal != null || demoTotal != null) {
            const updated: DerivAccount[] = [];
            if (realTotal != null) updated.push({ loginid: b.loginid, accountType: "real", currency: b.total.deriv.currency ?? b.currency, balance: realTotal, isVirtual: false });
            if (demoTotal != null) updated.push({ loginid: "DEMO", accountType: "demo", currency: b.total.deriv_demo.currency ?? b.currency, balance: demoTotal, isVirtual: true });
            setAccounts(updated);
          } else {
            // Per-account update
            setAccounts(prev => {
              const filtered = prev.filter(a => a.loginid !== b.loginid);
              return [...filtered, {
                loginid:     b.loginid,
                accountType: isVirtual ? "demo" : "real",
                currency:    b.currency,
                balance:     b.balance,
                isVirtual,
              }];
            });
          }
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => {
      setStatus("error");
      setError("WebSocket connection failed");
    };

    ws.onclose = () => {
      if (status !== "error") setStatus("idle");
    };
  }, [token]);

  useEffect(() => {
    if (token) connect();
    return () => wsRef.current?.close();
  }, [token, connect]);

  return { accounts, status, error, reconnect: connect };
}

// ─── EA heartbeat hook ────────────────────────────────────────────────────────

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
    } catch { /* network error - silently ignore */ }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 10_000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { real, demo, lastFetch };
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtBalance(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style:    "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function relTime(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ─── Single account card ──────────────────────────────────────────────────────

function AccountCard({
  type, balance, equity, freeMargin, currency, loginId, name, broker, reportedAt, source, hidden,
}: {
  type: "REAL" | "DEMO";
  balance: number; equity?: number; freeMargin?: number;
  currency: string; loginId?: string | number; name?: string; broker?: string;
  reportedAt?: number; source: "deriv" | "ea";
  hidden: boolean;
}) {
  const isReal = type === "REAL";
  const displayBalance = hidden ? "••••••" : fmtBalance(balance, currency);
  const displayEquity  = equity  != null && !hidden ? fmtBalance(equity,     currency) : hidden ? "••••••" : null;
  const displayMargin  = freeMargin != null && !hidden ? fmtBalance(freeMargin, currency) : hidden ? "••••••" : null;

  return (
    <div
      style={isReal
        ? { background: "linear-gradient(135deg,rgba(0,255,255,0.05),rgba(6,182,212,0.03))", border: "1px solid rgba(0,255,255,0.2)", boxShadow: "0 4px 24px rgba(0,255,255,0.06)" }
        : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }
      }
      className="rounded-[14px] p-4 flex flex-col gap-3 flex-1 min-w-[180px]"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            style={isReal
              ? { background: "rgba(0,255,255,0.1)", border: "1px solid rgba(0,255,255,0.25)", color: "#00e5e5" }
              : { background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)", color: "#94a3b8" }
            }
            className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          >
            {type}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {source === "deriv" ? "via Deriv API" : "via EA"}
          </span>
        </div>
        {reportedAt && (
          <span className="text-[10px] text-slate-600 font-mono">{relTime(reportedAt)}</span>
        )}
      </div>

      {/* Balance — hero number */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">Balance</div>
        <div className={cn("text-2xl font-mono font-bold tracking-tight leading-none", isReal ? "text-white" : "text-slate-400")}>
          {displayBalance}
        </div>
      </div>

      {/* Equity + Free Margin */}
      {(displayEquity || displayMargin) && (
        <div className="grid grid-cols-2 gap-2">
          {displayEquity != null && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
              className="rounded-[8px] px-2.5 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Equity</div>
              <div className="font-mono text-xs font-bold text-emerald-400">{displayEquity}</div>
            </div>
          )}
          {displayMargin != null && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
              className="rounded-[8px] px-2.5 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Free Margin</div>
              <div className="font-mono text-xs font-bold text-blue-400">{displayMargin}</div>
            </div>
          )}
        </div>
      )}

      {/* Account meta */}
      {(loginId || name || broker) && (
        <div className="text-[10px] text-slate-600 font-mono space-y-0.5 border-t border-white/5 pt-2">
          {loginId && <div>Login: {loginId}</div>}
          {broker  && <div>{broker}</div>}
          {name    && <div className="text-slate-700 truncate">{name}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Token setup panel ────────────────────────────────────────────────────────

function TokenSetup({ onSave, onClose }: { onSave: (t: string) => void; onClose: () => void }) {
  const [val, setVal]     = useState("");
  const [show, setShow]   = useState(false);

  return (
    <div style={{ background: "rgba(11,15,25,0.95)", border: "1px solid rgba(0,255,255,0.15)", backdropFilter: "blur(20px)" }}
      className="rounded-[14px] p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-white">Connect Deriv Account</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xs text-slate-400 space-y-1 leading-relaxed">
        <p>Create a <strong className="text-white">Read</strong> token in your Deriv account:</p>
        <a
          href="https://app.deriv.com/account/api-token"
          target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-all"
        >
          app.deriv.com/account/api-token <ExternalLink className="w-3 h-3" />
        </a>
        <p className="text-slate-500 text-[11px]">Only needs "Read" scope — we never write or trade with this token.</p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type={show ? "text" : "password"}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="Paste your Deriv API token…"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            className="w-full rounded-[8px] px-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-400/50 pr-10"
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
        >
          Connect
        </button>
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function DerivBalanceWidget() {
  const [token, setToken]           = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [showSetup, setShowSetup]   = useState(false);
  const [hideBalances, setHide]     = useState(false);
  const [expanded, setExpanded]     = useState(true);

  const { accounts, status, error: wsError, reconnect } = useDerivWS(token);
  const ea = useEABalance();

  function saveToken(t: string) {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setShowSetup(false);
  }

  function disconnect() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  // Build account cards — prefer Deriv API data, fall back to EA data
  const derivReal = accounts.find(a => a.accountType === "real");
  const derivDemo = accounts.find(a => a.accountType === "demo");
  const hasAnyData = derivReal || derivDemo || ea.real || ea.demo;

  const statusIcon =
    status === "connected"   ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> :
    status === "connecting"  ? <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" /> :
    token && status === "error" ? <WifiOff className="w-3.5 h-3.5 text-rose-400" /> :
    ea.lastFetch ? <Wifi className="w-3.5 h-3.5 text-blue-400" /> :
    <WifiOff className="w-3.5 h-3.5 text-slate-600" />;

  return (
    <div
      style={{ background: "rgba(8,12,22,0.7)", border: "1px solid rgba(0,255,255,0.08)", backdropFilter: "blur(20px)" }}
      className="rounded-[18px] overflow-hidden"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Wallet className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-white tracking-wide">MT5 Live Accounts</span>
          <div className="flex items-center gap-1.5">
            {statusIcon}
            <span className="text-[10px] font-mono text-slate-500">
              {status === "connected"  ? "Deriv API live"  :
               status === "connecting" ? "Connecting…"     :
               token && status === "error" ? "Deriv API error" :
               ea.lastFetch ? "via EA heartbeat" : "Not connected"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hide/show balances */}
          <button onClick={() => setHide(v => !v)}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            className="w-7 h-7 rounded-[7px] flex items-center justify-center text-slate-500 hover:text-white transition-all"
            title={hideBalances ? "Show balances" : "Hide balances"}
          >
            {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          {/* Reconnect (Deriv) */}
          {token && status === "error" && (
            <button onClick={reconnect}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              className="w-7 h-7 rounded-[7px] flex items-center justify-center text-amber-400 hover:text-amber-300 transition-all"
              title="Reconnect"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Connect / Disconnect Deriv */}
          {token ? (
            <button onClick={disconnect}
              style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold text-rose-400 hover:bg-rose-500/15 transition-all"
            >
              <X className="w-3 h-3" /> Disconnect
            </button>
          ) : (
            <button onClick={() => setShowSetup(v => !v)}
              style={{ background: "rgba(0,255,255,0.07)", border: "1px solid rgba(0,255,255,0.2)" }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[11px] font-bold text-cyan-400 hover:bg-cyan-500/15 transition-all"
            >
              <Wallet className="w-3 h-3" /> Connect Deriv
            </button>
          )}

          {/* Collapse */}
          <button onClick={() => setExpanded(v => !v)}
            className="text-slate-500 hover:text-white transition-all"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4">

          {/* Token setup panel */}
          {showSetup && (
            <TokenSetup onSave={saveToken} onClose={() => setShowSetup(false)} />
          )}

          {/* Error banner */}
          {wsError && (
            <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[10px]"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs text-rose-400">{wsError}</span>
              {wsError.toLowerCase().includes("invalid") && (
                <button onClick={() => { disconnect(); setShowSetup(true); }}
                  className="ml-auto text-[11px] text-rose-300 underline">Re-enter token</button>
              )}
            </div>
          )}

          {/* Account cards */}
          {hasAnyData ? (
            <div className="flex flex-wrap gap-3">
              {/* REAL account */}
              {(derivReal || ea.real) && (
                <AccountCard
                  type="REAL"
                  balance={   derivReal ? derivReal.balance   : ea.real!.balance}
                  equity={    derivReal ? undefined            : ea.real!.equity}
                  freeMargin={derivReal ? undefined            : ea.real!.freeMargin}
                  currency={  derivReal ? derivReal.currency   : ea.real!.currency}
                  loginId={   derivReal ? derivReal.loginid    : ea.real!.login}
                  broker={    ea.real?.broker}
                  name={      ea.real?.name}
                  reportedAt={derivReal ? Date.now()           : ea.real!.reportedAt}
                  source={    derivReal ? "deriv"              : "ea"}
                  hidden={hideBalances}
                />
              )}

              {/* DEMO account */}
              {(derivDemo || ea.demo) && (
                <AccountCard
                  type="DEMO"
                  balance={   derivDemo ? derivDemo.balance   : ea.demo!.balance}
                  equity={    derivDemo ? undefined            : ea.demo!.equity}
                  freeMargin={derivDemo ? undefined            : ea.demo!.freeMargin}
                  currency={  derivDemo ? derivDemo.currency   : ea.demo!.currency}
                  loginId={   derivDemo ? derivDemo.loginid    : ea.demo!.login}
                  broker={    ea.demo?.broker}
                  name={      ea.demo?.name}
                  reportedAt={derivDemo ? Date.now()           : ea.demo!.reportedAt}
                  source={    derivDemo ? "deriv"              : "ea"}
                  hidden={hideBalances}
                />
              )}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}
                className="w-12 h-12 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-slate-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-400">No account data yet</p>
                <p className="text-xs text-slate-600 max-w-xs">
                  Connect your Deriv API token for instant balance, or attach the SmartFX EA to any chart —
                  it will push your balance automatically.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-500/50" />
                  <span>EA running → balance appears within 5s</span>
                </div>
                <span className="text-slate-700">or</span>
                <button onClick={() => setShowSetup(true)} className="text-cyan-400 hover:text-cyan-300 underline transition-all">
                  Connect Deriv API token
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

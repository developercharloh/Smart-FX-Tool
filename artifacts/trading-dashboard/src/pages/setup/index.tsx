/**
 * MT5 Setup Page
 * Step-by-step guide to connect SmartFX EA to Charles's Deriv MT5 accounts.
 * Polls /api/mt5/balance in real-time to confirm live EA connection.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Download, Copy, CheckCircle2, Circle, Wifi, WifiOff,
  RefreshCw, ExternalLink, Terminal, AlertTriangle, ChevronRight,
  Monitor, Zap, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const WEBREQUEST_URL = "https://smart-fx-tool.replit.app";
const EA_KEY         = "smartfx-ea-2025";

// ─── Account config ───────────────────────────────────────────────────────────

const ACCOUNTS = [
  {
    label:  "Demo Account",
    type:   "DEMO",
    login:  "32335021",
    server: "Deriv-Demo",
    broker: "Deriv.com Limited",
    badge:  "bg-slate-700 text-slate-300",
    tip:    "Start here — test everything safely with $10,000 demo balance.",
  },
  {
    label:  "Real Account",
    type:   "REAL",
    login:  "140682649",
    server: "DerivBVI-Server-03",
    broker: "Deriv (BVI) Ltd.",
    badge:  "bg-cyan-900/60 text-cyan-300",
    tip:    "Use after testing on demo. Fund your account first via the Deriv app.",
  },
];

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy"
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-mono font-semibold transition-all",
        copied
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          : "bg-white/[0.05] text-slate-300 border border-white/[0.1] hover:border-cyan-400/30 hover:text-cyan-300",
      )}
    >
      {label ?? value}
      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-60" />}
    </button>
  );
}

// ─── Live connection badge ────────────────────────────────────────────────────

interface EAData {
  real?: { login: number; balance: number; currency: string; broker: string; reportedAt: number };
  demo?: { login: number; balance: number; currency: string; broker: string; reportedAt: number };
}

function useEAStatus() {
  const [data, setData]   = useState<EAData | null>(null);
  const [loading, setLoading] = useState(true);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/mt5/balance`);
      if (r.ok) setData(await r.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 8_000);
    return () => clearInterval(id);
  }, [poll]);

  return { data, loading, refresh: poll };
}

function ConnectionBadge({ data, loading }: { data: EAData | null; loading: boolean }) {
  const hasDemo = !!data?.demo;
  const hasReal = !!data?.real;
  const connected = hasDemo || hasReal;

  if (loading) return (
    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking…
    </div>
  );

  if (!connected) return (
    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
      <WifiOff className="w-3.5 h-3.5" /> EA not connected yet
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
        <Wifi className="w-3.5 h-3.5" /> EA Connected
      </div>
      {hasDemo && (
        <span style={{ background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)" }}
          className="text-[10px] font-mono px-2 py-0.5 rounded-full text-slate-300">
          DEMO #{data!.demo!.login} · ${data!.demo!.balance.toFixed(2)}
        </span>
      )}
      {hasReal && (
        <span style={{ background: "rgba(0,255,255,0.08)", border: "1px solid rgba(0,255,255,0.2)" }}
          className="text-[10px] font-mono px-2 py-0.5 rounded-full text-cyan-300">
          REAL #{data!.real!.login} · ${data!.real!.balance.toFixed(2)}
        </span>
      )}
    </div>
  );
}

// ─── Step component ───────────────────────────────────────────────────────────

function Step({
  n, title, done, children,
}: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      {/* Number / check */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div
          style={done
            ? { background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }
            : { background: "rgba(0,255,255,0.07)", border: "1px solid rgba(0,255,255,0.2)" }
          }
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
        >
          {done
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            : <span style={{ color: "rgba(0,220,220,0.9)" }}>{n}</span>
          }
        </div>
        <div className="w-px flex-1 bg-white/[0.05]" />
      </div>
      {/* Content */}
      <div className="pb-8 flex-1 min-w-0">
        <h3 className="text-sm font-bold text-white mb-3 leading-snug">{title}</h3>
        <div className="space-y-2 text-sm text-slate-400 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// ─── Account selector ─────────────────────────────────────────────────────────

function AccountRow({ acct, active, onSelect }: {
  acct: typeof ACCOUNTS[0];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={active
        ? { background: "rgba(0,255,255,0.06)", border: "1px solid rgba(0,255,255,0.25)" }
        : { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }
      }
      className="w-full rounded-[12px] p-4 text-left transition-all hover:border-cyan-400/20 group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full", acct.badge)}>
            {acct.type}
          </span>
          <span className="text-sm font-semibold text-white">{acct.label}</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-slate-600 transition-all", active && "text-cyan-400 rotate-90")} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
        <div>
          <div className="text-slate-600 mb-0.5">Login</div>
          <div className="text-slate-300 font-semibold">{acct.login}</div>
        </div>
        <div>
          <div className="text-slate-600 mb-0.5">Server</div>
          <div className="text-slate-300 font-semibold">{acct.server}</div>
        </div>
        <div>
          <div className="text-slate-600 mb-0.5">Broker</div>
          <div className="text-slate-300 font-semibold truncate">{acct.broker}</div>
        </div>
      </div>
      {active && (
        <div style={{ background: "rgba(0,255,255,0.05)", border: "1px solid rgba(0,255,255,0.1)" }}
          className="mt-3 px-3 py-2 rounded-[8px] text-[11px] text-cyan-300 flex items-center gap-1.5">
          <Zap className="w-3 h-3 shrink-0" /> {acct.tip}
        </div>
      )}
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function MT5SetupPage() {
  const [activeAcct, setActiveAcct] = useState(0);
  const { data, loading, refresh } = useEAStatus();
  const acct = ACCOUNTS[activeAcct];

  const demoConnected = !!data?.demo;
  const realConnected = !!data?.real;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div style={{ background: "linear-gradient(135deg,rgba(0,255,255,0.12),rgba(139,92,246,0.12))", border: "1px solid rgba(0,255,255,0.2)" }}
            className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0">
            <Terminal className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">MT5 Setup Guide</h1>
            <p className="text-sm text-slate-400">Connect your Deriv MT5 to SmartFX in 5 steps</p>
          </div>
        </div>

        {/* Live status bar */}
        <div style={{ background: "rgba(8,12,22,0.8)", border: "1px solid rgba(0,255,255,0.08)" }}
          className="mt-4 rounded-[12px] px-4 py-3 flex items-center justify-between">
          <ConnectionBadge data={data} loading={loading} />
          <button onClick={refresh}
            className="text-slate-600 hover:text-slate-400 transition-all"
            title="Refresh status">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Account picker ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5" /> Your Deriv MT5 Accounts
        </h2>
        <div className="space-y-2">
          {ACCOUNTS.map((a, i) => (
            <AccountRow key={a.login} acct={a} active={activeAcct === i} onSelect={() => setActiveAcct(i)} />
          ))}
        </div>
        {activeAcct === 1 && (
          <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)" }}
            className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-[10px]">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              Your real account has <strong>$0.00 balance</strong>. Fund it via the Deriv app before attaching the EA.
              The EA will not execute trades without available margin.
            </p>
          </div>
        )}
        {activeAcct === 0 && (
          <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.2)" }}
            className="mt-3 flex items-start gap-2.5 px-4 py-3 rounded-[10px]">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 leading-relaxed">
              Your demo balance is <strong>$2.67</strong> — too low to trade. In the Deriv app tap your demo MT5 account → <strong>Reset Balance</strong> to restore $10,000.
            </p>
          </div>
        )}
      </section>

      {/* ── Steps ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" /> Setup Steps — {acct.label}
        </h2>

        {/* Step 1 */}
        <Step n={1} title="Download the SmartFX EA file">
          <p>Click below to download the Expert Advisor file to your laptop.</p>
          <a
            href={`${BASE}/SmartFX_EA.mq5`}
            download="SmartFX_EA.mq5"
            style={{ background: "rgba(0,255,255,0.1)", border: "1px solid rgba(0,255,255,0.3)" }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-bold text-cyan-400 hover:bg-cyan-400/20 transition-all mt-1"
          >
            <Download className="w-4 h-4" />
            Download SmartFX_EA.mq5
          </a>
          <p className="text-[11px] text-slate-500 mt-1">File size ~10KB · no install needed · just one .mq5 file</p>
        </Step>

        {/* Step 2 */}
        <Step n={2} title="Open MetaEditor 5 and install the EA">
          <ol className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Open <strong className="text-white">MetaEditor 5</strong> on your laptop
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Click <strong className="text-white">File → Open Data Folder</strong>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Navigate to <code className="text-cyan-300 bg-white/[0.05] px-1.5 py-0.5 rounded text-[11px]">MQL5 → Experts</code> folder
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Paste the downloaded <code className="text-cyan-300 bg-white/[0.05] px-1.5 py-0.5 rounded text-[11px]">SmartFX_EA.mq5</code> file there
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Back in MetaEditor, open the file and press <kbd className="text-white bg-white/[0.08] border border-white/[0.12] px-1.5 py-0.5 rounded text-[11px] font-mono">F7</kbd> to compile
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-1" />
              Confirm the bottom bar shows <span className="text-emerald-400 font-semibold">"0 errors, 0 warnings"</span>
            </li>
          </ol>
        </Step>

        {/* Step 3 */}
        <Step n={3} title="Open MT5 and log in with your Deriv account">
          <p>Open <strong className="text-white">Headway MT5 Terminal</strong> on your laptop.</p>
          <p>Go to <strong className="text-white">File → Open an Account</strong> and search for:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            {[
              { label: "Server",   value: acct.server },
              { label: "Login ID", value: acct.login  },
              { label: "Broker",   value: acct.broker },
            ].map(({ label, value }) => (
              <div key={label}
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                className="rounded-[10px] px-3 py-2.5">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">{label}</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-mono text-white font-semibold truncate">{value}</span>
                  <CopyBtn value={value} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Password: find it in the Deriv app → your MT5 account → tap the password eye icon
          </p>
        </Step>

        {/* Step 4 */}
        <Step n={4} title="Allow WebRequest in MT5 Options (critical)">
          <p>The EA must be allowed to contact the SmartFX server. Without this it cannot send or receive signals.</p>
          <ol className="space-y-2 list-none mt-2">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              In MT5: <strong className="text-white">Tools → Options → Expert Advisors</strong>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-1" />
              Enable <strong className="text-white">Allow automated trading</strong>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-1" />
              Enable <strong className="text-white">Allow WebRequest for listed URLs</strong>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Click <strong className="text-white">+</strong> and add this URL exactly:
            </li>
          </ol>
          <div style={{ background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.15)" }}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-[10px] mt-1">
            <code className="text-cyan-300 text-sm font-mono font-semibold">{WEBREQUEST_URL}</code>
            <CopyBtn value={WEBREQUEST_URL} label="Copy" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Click OK to save. MT5 may ask you to restart — do it.</p>
        </Step>

        {/* Step 5 */}
        <Step n={5} title={`Attach SmartFX EA to a chart — ${acct.type === "DEMO" ? "demo" : "real"} account`} done={acct.type === "DEMO" ? demoConnected : realConnected}>
          <ol className="space-y-2 list-none">
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Open any chart in MT5 — <strong className="text-white">EURUSD H1</strong> works great
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Press <kbd className="text-white bg-white/[0.08] border border-white/[0.12] px-1.5 py-0.5 rounded text-[11px] font-mono">Ctrl+N</kbd> to open the Navigator panel
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Expand <strong className="text-white">Expert Advisors</strong> → find <strong className="text-white">SmartFX_EA</strong>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              Double-click or drag it onto the chart
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-500 shrink-0 mt-1" />
              In the popup, check <strong className="text-white">✓ Allow live trading</strong> and <strong className="text-white">✓ Allow WebRequest</strong> → click OK
            </li>
          </ol>

          {/* EA inputs reference */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
            className="mt-3 rounded-[10px] p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">EA Input Values (defaults are fine)</div>
            <div className="space-y-1 text-[11px] font-mono">
              {[
                ["SERVER_URL",  WEBREQUEST_URL, "API server"],
                ["EA_KEY",      EA_KEY,         "Must match dashboard"],
                ["RISK_PERCENT","1.0",           "% of balance per trade"],
                ["POLL_SECONDS","5",             "Check for signals every 5s"],
              ].map(([key, val, desc]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-slate-500 w-28 shrink-0">{key}</span>
                  <span className="text-cyan-300 flex-1">{val}</span>
                  <span className="text-slate-600 text-[10px]">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Connection result */}
          {(acct.type === "DEMO" ? demoConnected : realConnected) ? (
            <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}
              className="mt-3 flex items-center gap-2.5 px-4 py-3 rounded-[10px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-400">EA is connected! 🎉</p>
                <p className="text-[11px] text-emerald-600 mt-0.5">
                  Balance is reporting to the dashboard. The AI Scanner can now auto-feed signals.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}
              className="mt-3 flex items-center gap-2.5 px-4 py-3 rounded-[10px]">
              <Circle className="w-4 h-4 text-slate-600 shrink-0" />
              <p className="text-xs text-slate-500">Waiting for EA to connect… (appears within 5–10 seconds of attaching)</p>
            </div>
          )}
        </Step>
      </section>

      {/* ── After connection ─────────────────────────────────────────────── */}
      <section style={{ background: "rgba(8,12,22,0.7)", border: "1px solid rgba(0,255,255,0.08)" }}
        className="rounded-[18px] p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" /> After the EA connects
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { icon: "🏠", title: "Dashboard", desc: "Your live balance and account stats appear automatically" },
            { icon: "🤖", title: "AI Scanner", desc: "Enable Auto-Feed to send high-confidence signals to MT5" },
            { icon: "📈", title: "Live Signals", desc: "Executed trades appear here with ticket numbers and P&L" },
          ].map(({ icon, title, desc }) => (
            <div key={title}
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              className="rounded-[12px] p-3">
              <div className="text-xl mb-2">{icon}</div>
              <div className="font-semibold text-white text-sm mb-1">{title}</div>
              <div className="text-[11px] text-slate-500 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 text-[11px] text-slate-500 pt-1 border-t border-white/[0.05]">
          <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
          EA polls for signals every 5 seconds · reports balance every 15 seconds · auto-executes trades with 1% risk per trade
        </div>
      </section>

    </div>
  );
}

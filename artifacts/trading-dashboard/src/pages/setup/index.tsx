/**
 * MT5 EA Setup Page — step-by-step guide + live connection check
 */
import { useState, useEffect } from "react";
import {
  Download, CheckCircle2, Circle, AlertCircle, Wifi, WifiOff,
  ExternalLink, Copy, Check, ChevronRight, Terminal, Settings2,
  ShieldCheck, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const API  = BASE; // same origin proxy

const API_URL = "https://smart-fx-tool.site";

// ── helpers ──────────────────────────────────────────────────────────────────

function useCopy(text: string, ms = 1800) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), ms);
    });
  };
  return { copied, copy };
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono
                 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20
                 transition-all"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {label ?? text}
    </button>
  );
}

// ── step card ────────────────────────────────────────────────────────────────

function Step({
  n, title, done, children,
}: {
  n: number; title: string; done?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border
            ${done
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
              : "bg-cyan-500/10 border-cyan-500/25 text-cyan-400"
            }`}
        >
          {done ? <CheckCircle2 className="w-4 h-4" /> : n}
        </div>
        <div className="flex-1 w-px bg-white/5 min-h-[20px]" />
      </div>
      <div className="pb-6 flex-1">
        <h3 className="font-semibold text-sm text-white mb-2">{title}</h3>
        <div className="text-sm text-slate-400 space-y-2">{children}</div>
      </div>
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const [serverOk,   setServerOk]   = useState<boolean | null>(null);
  const [checking,   setChecking]   = useState(false);

  async function checkServer() {
    setChecking(true);
    try {
      const r = await fetch(`${API}/api/ea/status`, { signal: AbortSignal.timeout(6000) });
      setServerOk(r.ok);
    } catch {
      setServerOk(false);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => { checkServer(); }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">MT5 Expert Advisor Setup</h1>
        <p className="text-slate-400 text-sm mt-1">
          The SmartFX EA runs inside Deriv MT5 and automatically places trades
          when the AI generates a high-confidence signal.
        </p>
      </div>

      {/* Server status card */}
      <Card style={{ background: "rgba(11,15,25,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {serverOk === null || checking ? (
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                <Wifi className="w-4 h-4 text-slate-500" />
              </div>
            ) : serverOk ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-emerald-400" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-rose-400" />
              </div>
            )}
            <div>
              <div className="text-sm font-semibold text-white">
                {checking ? "Checking server…" : serverOk ? "SmartFX API Server Online" : "Server Unreachable"}
              </div>
              <div className="text-xs text-slate-500">
                {serverOk === true
                  ? "EA can connect. Your API URL is working."
                  : serverOk === false
                  ? "The API server did not respond. Check your internet connection."
                  : "Verifying…"}
              </div>
            </div>
          </div>
          <button
            onClick={checkServer}
            disabled={checking}
            className="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-1.5
                       rounded-lg bg-white/[0.03] transition-all hover:bg-white/[0.06]"
          >
            Recheck
          </button>
        </CardContent>
      </Card>

      {/* Download */}
      <Card style={{ background: "rgba(0,255,255,0.03)", border: "1px solid rgba(0,255,255,0.12)" }}>
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm">SmartFX_EA.mq5</div>
              <div className="text-xs text-slate-400">Expert Advisor — MQL5 source file</div>
            </div>
          </div>
          <a
            href={`${BASE}/SmartFX_EA.mq5`}
            download="SmartFX_EA.mq5"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                       bg-cyan-500 text-black hover:bg-cyan-400 transition-all"
          >
            <Download className="w-4 h-4" /> Download EA
          </a>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card style={{ background: "rgba(11,15,25,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <CardHeader className="pb-2 px-5 pt-5">
          <CardTitle className="text-base">Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-0 mt-2">

            <Step n={1} title="Download Deriv MT5 Desktop App">
              <p>
                You need the Deriv MT5 desktop app (Windows/Mac/Linux).
              </p>
              <a
                href="https://app.deriv.com/dmt5"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
              >
                Open Deriv MT5 <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-xs text-slate-500">
                Log in with your Deriv account and connect your MT5 Standard account.
              </p>
            </Step>

            <Step n={2} title="Open MetaEditor and create the EA file">
              <p>
                Inside MT5, press <span className="text-white font-semibold">F4</span> (or go to
                Tools → MetaQuotes Language Editor) to open MetaEditor.
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click <strong className="text-white">File → New → Expert Advisor (template)</strong></li>
                <li>Name it <CopyBtn text="SmartFX_EA" /> → Next → Finish</li>
                <li>Select all the generated code and <strong className="text-white">delete it</strong></li>
                <li>Paste the contents of the downloaded <code className="text-cyan-300">SmartFX_EA.mq5</code> file</li>
                <li>Press <strong className="text-white">F7</strong> to compile — should show 0 errors</li>
              </ol>
            </Step>

            <Step n={3} title="Allow WebRequests to the SmartFX server">
              <p>
                MT5 blocks external HTTP calls by default. You must whitelist the SmartFX URL.
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to <strong className="text-white">Tools → Options → Expert Advisors</strong></li>
                <li>Tick <strong className="text-white">Allow WebRequest for listed URL</strong></li>
                <li>Click <strong className="text-white">+</strong> and add:</li>
              </ol>
              <div className="mt-2 flex items-center gap-2">
                <code className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-cyan-300 font-mono">
                  {API_URL}
                </code>
                <CopyBtn text={API_URL} label="Copy" />
              </div>
              <li className="list-none mt-1">4. Click <strong className="text-white">OK</strong> to save</li>
            </Step>

            <Step n={4} title="Attach the EA to a chart and configure it">
              <ol className="list-decimal list-inside space-y-1">
                <li>In MT5, open any chart (e.g. EURUSD H1)</li>
                <li>In the Navigator panel, find <strong className="text-white">Expert Advisors → SmartFX_EA</strong></li>
                <li>Drag it onto the chart</li>
                <li>In the Inputs tab, set:</li>
              </ol>
              <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/[0.04] text-slate-400">
                      <th className="text-left px-3 py-2">Parameter</th>
                      <th className="text-left px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      ["SmartFX API Base URL", API_URL],
                      ["Lot Size",             "0.01  (start small)"],
                      ["Min Signal Confidence","80  (%)"],
                      ["Max Spread (points)",  "30"],
                      ["Poll Interval (s)",    "10"],
                    ].map(([k, v]) => (
                      <tr key={k} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-slate-300 font-medium">{k}</td>
                        <td className="px-3 py-2 font-mono text-cyan-300">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <li className="list-none mt-2">5. Tick <strong className="text-white">Allow live trading</strong> → OK</li>
            </Step>

            <Step n={5} title="Verify the EA is running">
              <p>
                Once attached, you should see a smiley face (🙂) in the top-right of the chart.
                The EA will show a comment like:
              </p>
              <div className="font-mono text-xs bg-white/5 rounded-lg px-3 py-2 text-emerald-300 border border-white/10">
                SmartFX v2.0 | Last poll: 19:42 | Trades: 0 | No new signal
              </div>
              <p className="mt-1 text-xs text-slate-500">
                If you see a sad face (☹️), check the Journal tab for errors.
                The most common cause is WebRequest not being allowed — redo Step 3.
              </p>
            </Step>

          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            icon: <Zap className="w-5 h-5 text-cyan-400" />,
            title: "AI Generates Signal",
            desc: "Run a Full Scan on the AI Scanner page. High-confidence signals (≥80%) are saved to the queue.",
          },
          {
            icon: <Terminal className="w-5 h-5 text-violet-400" />,
            title: "EA Polls Every 10s",
            desc: "The EA calls /api/ea/signal. If a new signal exists, it extracts pair, direction, entry, SL & TP.",
          },
          {
            icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
            title: "Trade Placed on MT5",
            desc: "The EA opens a market order with your configured lot size. SL & TP are set automatically from the signal.",
          },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            style={{ background: "rgba(11,15,25,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}
            className="rounded-2xl p-4 flex flex-col gap-2"
          >
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center">
              {icon}
            </div>
            <div className="font-semibold text-sm text-white">{title}</div>
            <div className="text-xs text-slate-400">{desc}</div>
          </div>
        ))}
      </div>

      {/* Important notes */}
      <div
        style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)" }}
        className="rounded-2xl p-4 flex gap-3"
      >
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-amber-300">Important</p>
          <p>• Start with a <strong>Demo MT5 account</strong> and small lot sizes (0.01) until you're confident in the signals.</p>
          <p>• The EA skips a signal if you already have an open position on that symbol (no doubling down).</p>
          <p>• Signals are only valid while status is <code className="text-cyan-300">ACTIVE</code>. Use <strong>Risk Calc</strong> to size correctly.</p>
          <p>• <strong>Fund your account</strong> before live trading — your Real MT5 balance is currently $0.</p>
        </div>
      </div>

    </div>
  );
}

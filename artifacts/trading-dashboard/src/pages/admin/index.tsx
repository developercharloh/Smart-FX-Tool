import { useState, useCallback, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Shield, Key, Plus, Trash2, Ban, CheckCircle2, Copy, Check,
  Loader2, Lock, RefreshCw, LogOut, Settings, Link2,
  LayoutDashboard, BarChart2, Clock, CalendarPlus, Send, Webhook,
  ChevronDown, ChevronUp, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const SESSION_KEY = "sfx_admin_secret";
const DEV_SECRET = "smartfx-admin-2024";

type Plan = "monthly" | "quarterly" | "yearly" | "lifetime";
type Tab  = "overview" | "settings";

interface AccessKey {
  id: number;
  key: string;
  plan: Plan;
  label: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

const PLAN_COLORS: Record<Plan, string> = {
  monthly:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
  quarterly: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  yearly:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  lifetime:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const PLAN_LABELS: Record<Plan, string> = {
  monthly: "Monthly", quarterly: "3-Month", yearly: "1-Year", lifetime: "Lifetime",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0",
        copied ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
               : "bg-secondary border border-border/60 text-muted-foreground hover:text-foreground"
      )}>
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function AdminLogin({ onLogin }: { onLogin: (secret: string) => void }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, { headers: { "x-admin-secret": pwd } });
      if (res.ok) { sessionStorage.setItem(SESSION_KEY, pwd); onLogin(pwd); }
      else setErr("Incorrect admin password.");
    } catch { setErr("Cannot connect to server."); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-mono">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Enter admin password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Admin password"
              className="w-full bg-card border border-border/60 rounded-lg pl-9 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/60" />
          </div>
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <button type="submit" disabled={loading || !pwd}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {loading ? "Verifying..." : "Access Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ExtendModal({ keyRecord, secret, onDone }: { keyRecord: AccessKey; secret: string; onDone: () => void }) {
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);

  async function extend() {
    setLoading(true);
    await fetch(`${API_BASE}/api/admin/keys/${keyRecord.id}/extend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ days: Number(days) }),
    });
    setLoading(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onDone}>
      <div className="bg-card border border-border/60 rounded-xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-primary" /> Extend Expiry</h3>
        <p className="text-xs text-muted-foreground">Adding days to: <code className="font-mono">{keyRecord.key}</code></p>
        <div className="grid grid-cols-4 gap-2">
          {["7","14","30","90"].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={cn("py-2 rounded-lg border text-xs font-bold transition-all",
                days === d ? "bg-primary/15 border-primary/40 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/40")}>
              +{d}d
            </button>
          ))}
        </div>
        <div className="relative">
          <input type="number" value={days} onChange={e => setDays(e.target.value)} min="1"
            className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary/60" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">days</span>
        </div>
        <div className="flex gap-2">
          <button onClick={extend} disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
            {loading ? "Extending..." : `Add ${days} Days`}
          </button>
          <button onClick={onDone} className="px-4 py-2.5 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [secret, setSecret]     = useState<string | null>(() =>
    import.meta.env.DEV ? DEV_SECRET : sessionStorage.getItem(SESSION_KEY)
  );
  const [tab, setTab]           = useState<Tab>("overview");
  const [keys, setKeys]         = useState<AccessKey[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [genPlan, setGenPlan]   = useState<Plan>("monthly");
  const [genLabel, setGenLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey]     = useState<AccessKey | null>(null);
  const [extendKey, setExtendKey] = useState<AccessKey | null>(null);

  // Telegram / Webhook config (stored in sessionStorage for the session)
  const [tgToken, setTgToken]   = useState(() => sessionStorage.getItem("sfx_tg_token") ?? "");
  const [tgChat,  setTgChat]    = useState(() => sessionStorage.getItem("sfx_tg_chat")  ?? "");
  const [webhook, setWebhook]   = useState(() => sessionStorage.getItem("sfx_webhook")  ?? "");
  const [showTgToken, setShowTgToken] = useState(false);
  const [savedConfig, setSavedConfig] = useState(false);

  const subscriberLink = typeof window !== "undefined"
    ? window.location.origin + (import.meta.env.BASE_URL !== "/" ? import.meta.env.BASE_URL.replace(/\/$/, "") : "")
    : "";

  const headers = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    "x-admin-secret": secret ?? "",
  }), [secret]);

  const loadKeys = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, { headers: headers() });
      if (res.ok) { setKeys(await res.json()); setLoaded(true); }
    } finally { setLoading(false); }
  }, [secret, headers]);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function generate() {
    setGenerating(true); setNewKey(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ plan: genPlan, label: genLabel || null }),
      });
      if (res.ok) { setNewKey(await res.json()); setGenLabel(""); await loadKeys(); }
    } finally { setGenerating(false); }
  }

  async function revoke(id: number)   { await fetch(`${API_BASE}/api/admin/keys/${id}/revoke`,   { method: "PATCH",  headers: headers() }); loadKeys(); }
  async function activate(id: number) { await fetch(`${API_BASE}/api/admin/keys/${id}/activate`, { method: "PATCH",  headers: headers() }); loadKeys(); }
  async function deleteKey(id: number) {
    if (!confirm("Delete this key permanently?")) return;
    await fetch(`${API_BASE}/api/admin/keys/${id}`, { method: "DELETE", headers: headers() });
    loadKeys();
  }

  function saveConfig() {
    sessionStorage.setItem("sfx_tg_token", tgToken);
    sessionStorage.setItem("sfx_tg_chat",  tgChat);
    sessionStorage.setItem("sfx_webhook",  webhook);
    setSavedConfig(true);
    setTimeout(() => setSavedConfig(false), 2000);
  }

  if (!secret) return <AdminLogin onLogin={s => setSecret(s)} />;
  if (!loaded) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  const activeCount  = keys.filter(k => k.isActive && (!k.expiresAt || new Date(k.expiresAt) > new Date())).length;
  const expiredCount = keys.filter(k => k.expiresAt && new Date(k.expiresAt) <= new Date()).length;
  const revokedCount = keys.filter(k => !k.isActive).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono">SmartFX Admin</h1>
              <p className="text-xs text-muted-foreground">Key Management & Subscriptions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {import.meta.env.DEV && (
              <a href="/signals" className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary font-semibold hover:bg-primary/20 transition-colors">
                <BarChart2 className="w-3.5 h-3.5" /> View Dashboard
              </a>
            )}
            <button onClick={loadKeys} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
            </button>
            <button onClick={() => { sessionStorage.removeItem(SESSION_KEY); setSecret(null); setLoaded(false); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-rose-400 hover:border-rose-500/40 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border/40">
          {([
            { id: "overview", label: "Overview",  icon: LayoutDashboard },
            { id: "settings", label: "Settings",  icon: Settings },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors",
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Active Keys", value: activeCount,  color: "text-emerald-400" },
                { label: "Expired",     value: expiredCount, color: "text-amber-400"   },
                { label: "Revoked",     value: revokedCount, color: "text-rose-400"    },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border/40 bg-card/30 p-4 text-center">
                  <p className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
              <div className="px-5 py-3 border-b border-border/40">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" /> All Access Keys ({keys.length})
                </h2>
              </div>
              {keys.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No keys yet. Go to <button onClick={() => setTab("settings")} className="text-primary underline">Settings</button> to generate one.
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {keys.map(k => {
                    const expired = k.expiresAt ? new Date(k.expiresAt) <= new Date() : false;
                    const status  = !k.isActive ? "revoked" : expired ? "expired" : "active";
                    return (
                      <div key={k.id} className={cn("px-5 py-3.5 flex items-start gap-4", !k.isActive && "opacity-50")}>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <code className="font-mono text-sm text-foreground">{k.key}</code>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", PLAN_COLORS[k.plan])}>{PLAN_LABELS[k.plan]}</span>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              status === "active"  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              status === "expired" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                     "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            )}>{status}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            <span className="text-[11px] text-muted-foreground">Created {format(new Date(k.createdAt), "MMM d, yyyy")}</span>
                            {k.expiresAt && <span className="text-[11px] text-muted-foreground">· Expires {format(new Date(k.expiresAt), "MMM d, yyyy")}</span>}
                            {k.label && <span className="text-[11px] text-foreground/70">· {k.label}</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-muted-foreground/50" />
                            <span className="text-[11px] text-muted-foreground/60">
                              {k.lastUsedAt
                                ? `Last seen ${formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true })}`
                                : "Never used"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          {k.expiresAt && (
                            <button onClick={() => setExtendKey(k)} title="Extend expiry"
                              className="p-1.5 rounded hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors">
                              <CalendarPlus className="w-4 h-4" />
                            </button>
                          )}
                          {k.isActive && !expired ? (
                            <button onClick={() => revoke(k.id)} title="Revoke"
                              className="p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors"><Ban className="w-4 h-4" /></button>
                          ) : !k.isActive ? (
                            <button onClick={() => activate(k.id)} title="Activate"
                              className="p-1.5 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                          ) : null}
                          <button onClick={() => deleteKey(k.id)} title="Delete"
                            className="p-1.5 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ─────────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="space-y-6">

            {/* Subscriber Link */}
            <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> Subscriber Access Link</h2>
              <p className="text-xs text-muted-foreground">Share this with subscribers. They'll see a clean key-entry screen — no plan info visible.</p>
              <div className="flex items-center gap-2 bg-background rounded-lg border border-border/60 px-3 py-2.5">
                <span className="flex-1 text-sm font-mono text-foreground/80 break-all">{subscriberLink}</span>
                <CopyButton text={subscriberLink} label="Copy Link" />
              </div>
            </div>

            {/* Generate Key */}
            <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-4">
              <h2 className="text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Generate Access Key</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Subscription Plan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["monthly","quarterly","yearly","lifetime"] as Plan[]).map(p => (
                      <button key={p} onClick={() => setGenPlan(p)}
                        className={cn("rounded-lg border py-2 text-center text-xs font-bold transition-all",
                          genPlan === p ? `${PLAN_COLORS[p]} border-current` : "border-border/40 text-muted-foreground hover:border-primary/40")}>
                        {PLAN_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Label / Note (optional)</label>
                  <input type="text" value={genLabel} onChange={e => setGenLabel(e.target.value)}
                    placeholder="e.g. John Doe, Telegram user"
                    className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60" />
                  <button onClick={generate} disabled={generating}
                    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 mt-1 hover:opacity-90 transition-opacity">
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {generating ? "Generating..." : `Generate ${PLAN_LABELS[genPlan]} Key`}
                  </button>
                </div>
              </div>

              {newKey && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
                  <p className="text-xs text-emerald-400 font-semibold">Key generated — copy and send:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-sm text-emerald-300 bg-black/30 rounded px-3 py-2 break-all">{newKey.key}</code>
                    <CopyButton text={newKey.key} label="Copy Key" />
                  </div>
                  {newKey.expiresAt && <p className="text-[11px] text-muted-foreground">Expires: {format(new Date(newKey.expiresAt), "MMM d, yyyy")}</p>}
                  <div className="pt-1 border-t border-emerald-500/20">
                    <p className="text-[11px] text-muted-foreground mb-1">Ready-to-send message:</p>
                    <div className="flex items-start gap-2 bg-black/20 rounded px-3 py-2">
                      <p className="flex-1 text-xs text-foreground/70 whitespace-pre-wrap">{`Your SmartFX access key: ${newKey.key}\nActivate at: ${subscriberLink}`}</p>
                      <CopyButton text={`Your SmartFX access key: ${newKey.key}\nActivate at: ${subscriberLink}`} label="Copy Message" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Telegram Bot */}
            <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Telegram Notifications</h2>
                <p className="text-xs text-muted-foreground mt-1">New signals will be automatically sent to your Telegram channel or group.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Bot Token</label>
                  <div className="relative">
                    <input type={showTgToken ? "text" : "password"} value={tgToken} onChange={e => setTgToken(e.target.value)}
                      placeholder="123456789:AABBCCxxx..."
                      className="w-full bg-background border border-border/60 rounded-lg pl-3 pr-10 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary/60" />
                    <button type="button" onClick={() => setShowTgToken(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showTgToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">Create a bot via @BotFather on Telegram</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Chat / Channel ID</label>
                  <input type="text" value={tgChat} onChange={e => setTgChat(e.target.value)}
                    placeholder="-1001234567890 or @channelname"
                    className="w-full bg-background border border-border/60 rounded-lg px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary/60" />
                  <p className="text-[10px] text-muted-foreground/60">Use @userinfobot in Telegram to get your chat ID</p>
                </div>
              </div>
            </div>

            {/* Webhook */}
            <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2"><Webhook className="w-4 h-4 text-primary" /> Signal Webhook</h2>
                <p className="text-xs text-muted-foreground mt-1">POST request with signal data when a new signal is created. Use for Discord, Zapier, custom integrations.</p>
              </div>
              <input type="url" value={webhook} onChange={e => setWebhook(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="w-full bg-background border border-border/60 rounded-lg px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary/60" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={saveConfig}
                className={cn("flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all",
                  savedConfig ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                              : "bg-primary text-primary-foreground hover:opacity-90")}>
                {savedConfig ? <><Check className="w-4 h-4" /> Saved!</> : "Save Config"}
              </button>
              <p className="text-[11px] text-muted-foreground/60">
                Note: To make Telegram & webhook work in production, set <code className="font-mono">TELEGRAM_BOT_TOKEN</code>, <code className="font-mono">TELEGRAM_CHAT_ID</code>, and <code className="font-mono">SIGNAL_WEBHOOK_URL</code> as environment variables on the server.
              </p>
            </div>
          </div>
        )}

      </div>

      {extendKey && (
        <ExtendModal keyRecord={extendKey} secret={secret!}
          onDone={() => { setExtendKey(null); loadKeys(); }} />
      )}
    </div>
  );
}

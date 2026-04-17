import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Shield, Key, Plus, Trash2, Ban, CheckCircle2, Copy, Check,
  Loader2, Lock, RefreshCw, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const SESSION_KEY = "sfx_admin_secret";

type Plan = "monthly" | "quarterly" | "yearly" | "lifetime";

interface AccessKey {
  id: number;
  key: string;
  plan: Plan;
  label: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const PLAN_COLORS: Record<Plan, string> = {
  monthly:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
  quarterly: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  yearly:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  lifetime:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

const PLAN_LABELS: Record<Plan, string> = {
  monthly:   "Monthly",
  quarterly: "3-Month",
  yearly:    "1-Year",
  lifetime:  "Lifetime",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-white/10 transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
    </button>
  );
}

function AdminLogin({ onLogin }: { onLogin: (secret: string) => void }) {
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, {
        headers: { "x-admin-secret": pwd },
      });
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, pwd);
        onLogin(pwd);
      } else {
        setErr("Incorrect admin password.");
      }
    } catch {
      setErr("Cannot connect to server.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold font-mono text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Enter admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              placeholder="Admin password"
              className="w-full bg-card border border-border/60 rounded-lg pl-9 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/60"
            />
          </div>
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <button
            type="submit"
            disabled={loading || !pwd}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {loading ? "Verifying..." : "Access Admin Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [secret, setSecret] = useState<string | null>(() => sessionStorage.getItem(SESSION_KEY));
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [genPlan, setGenPlan] = useState<Plan>("monthly");
  const [genLabel, setGenLabel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<AccessKey | null>(null);

  const headers = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    "x-admin-secret": secret ?? "",
  }), [secret]);

  const loadKeys = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
        setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  }, [secret, headers]);

  function handleLogin(s: string) {
    setSecret(s);
  }

  async function generate() {
    setGenerating(true);
    setNewKey(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ plan: genPlan, label: genLabel || null }),
      });
      if (res.ok) {
        const key = await res.json();
        setNewKey(key);
        setGenLabel("");
        await loadKeys();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(id: number) {
    await fetch(`${API_BASE}/api/admin/keys/${id}/revoke`, { method: "PATCH", headers: headers() });
    await loadKeys();
  }

  async function activate(id: number) {
    await fetch(`${API_BASE}/api/admin/keys/${id}/activate`, { method: "PATCH", headers: headers() });
    await loadKeys();
  }

  async function deleteKey(id: number) {
    if (!confirm("Delete this key permanently?")) return;
    await fetch(`${API_BASE}/api/admin/keys/${id}`, { method: "DELETE", headers: headers() });
    await loadKeys();
  }

  if (!secret) return <AdminLogin onLogin={handleLogin} />;

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <button
          onClick={loadKeys}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold"
        >
          <Shield className="w-4 h-4" /> Load Admin Panel
        </button>
      </div>
    );
  }

  const activeCount   = keys.filter(k => k.isActive && (!k.expiresAt || new Date(k.expiresAt) > new Date())).length;
  const expiredCount  = keys.filter(k => k.expiresAt && new Date(k.expiresAt) <= new Date()).length;
  const revokedCount  = keys.filter(k => !k.isActive).length;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto space-y-6">

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
          <button
            onClick={loadKeys}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => { sessionStorage.removeItem(SESSION_KEY); setSecret(null); setLoaded(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-rose-400 hover:border-rose-500/40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Keys",   value: activeCount,  color: "text-emerald-400" },
          { label: "Expired",       value: expiredCount, color: "text-amber-400" },
          { label: "Revoked",       value: revokedCount, color: "text-rose-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border/40 bg-card/30 p-4 text-center">
            <p className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Generate Key */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-4">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Generate New Access Key
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Subscription Plan</label>
            <div className="grid grid-cols-2 gap-2">
              {(["monthly","quarterly","yearly","lifetime"] as Plan[]).map(p => (
                <button
                  key={p}
                  onClick={() => setGenPlan(p)}
                  className={cn(
                    "rounded-lg border py-2 text-center text-xs font-bold transition-all",
                    genPlan === p ? `${PLAN_COLORS[p]} border-current` : "border-border/40 text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {PLAN_LABELS[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Label / Note (optional)</label>
            <input
              type="text"
              value={genLabel}
              onChange={e => setGenLabel(e.target.value)}
              placeholder="e.g. John Doe, Telegram user"
              className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
            />
            <button
              onClick={generate}
              disabled={generating}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 mt-1 hover:opacity-90 transition-opacity"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              {generating ? "Generating..." : `Generate ${PLAN_LABELS[genPlan]} Key`}
            </button>
          </div>
        </div>

        {newKey && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-1">
            <p className="text-xs text-emerald-400 font-semibold">Key generated — copy it now:</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 font-mono text-sm text-emerald-300 bg-black/30 rounded px-3 py-2">{newKey.key}</code>
              <CopyButton text={newKey.key} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Plan: <span className="font-semibold">{PLAN_LABELS[newKey.plan]}</span>
              {newKey.expiresAt && <> · Expires: <span className="font-semibold">{format(new Date(newKey.expiresAt), "MMM d, yyyy")}</span></>}
              {newKey.label && <> · Label: <span className="font-semibold">{newKey.label}</span></>}
            </p>
          </div>
        )}
      </div>

      {/* Keys List */}
      <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
        <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" /> All Access Keys ({keys.length})
          </h2>
        </div>

        {keys.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No keys generated yet.</div>
        ) : (
          <div className="divide-y divide-border/30">
            {keys.map(k => {
              const expired = k.expiresAt ? new Date(k.expiresAt) <= new Date() : false;
              const status = !k.isActive ? "revoked" : expired ? "expired" : "active";
              return (
                <div key={k.id} className={cn("px-5 py-3.5 flex items-center gap-4", !k.isActive && "opacity-50")}>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-sm text-foreground">{k.key}</code>
                      <CopyButton text={k.key} />
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", PLAN_COLORS[k.plan])}>{PLAN_LABELS[k.plan]}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        status === "active"  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        status === "expired" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                              "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>{status}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Created {format(new Date(k.createdAt), "MMM d, yyyy")}
                      {k.expiresAt && <> · Expires {format(new Date(k.expiresAt), "MMM d, yyyy")}</>}
                      {k.label && <> · <span className="text-foreground/70">{k.label}</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {k.isActive && !expired ? (
                      <button onClick={() => revoke(k.id)} title="Revoke" className="p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-400 transition-colors">
                        <Ban className="w-4 h-4" />
                      </button>
                    ) : !k.isActive ? (
                      <button onClick={() => activate(k.id)} title="Re-activate" className="p-1.5 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    ) : null}
                    <button onClick={() => deleteKey(k.id)} title="Delete" className="p-1.5 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

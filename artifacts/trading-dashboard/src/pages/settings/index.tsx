import { useState, useCallback, useEffect } from "react";
import {
  Key, Shield, LogOut, RefreshCw, CheckCircle2, Eye, EyeOff,
  Loader2, Lock, Plus, Copy, Check, Link2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, Plan } from "@/hooks/useAuth";
import { format } from "date-fns";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ADMIN_SESSION_KEY = "sfx_admin_secret";

const PLAN_INFO: Record<Plan, { label: string; color: string; border: string; bg: string }> = {
  monthly:   { label: "Monthly",  color: "text-blue-400",    border: "border-blue-500/30",   bg: "bg-blue-500/10" },
  quarterly: { label: "3-Month",  color: "text-violet-400",  border: "border-violet-500/30", bg: "bg-violet-500/10" },
  yearly:    { label: "1-Year",   color: "text-amber-400",   border: "border-amber-500/30",  bg: "bg-amber-500/10" },
  lifetime:  { label: "Lifetime", color: "text-emerald-400", border: "border-emerald-500/30",bg: "bg-emerald-500/10" },
};

const PLAN_COLORS: Record<Plan, string> = {
  monthly:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
  quarterly: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  yearly:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  lifetime:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

interface GeneratedKey {
  id: number;
  key: string;
  plan: Plan;
  label: string | null;
  expiresAt: string | null;
}

function maskKey(key: string) {
  const parts = key.split("-");
  return parts.map((p, i) => (i === 0 ? p : "••••••")).join("-");
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0",
        copied
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          : "bg-secondary border border-border/60 text-muted-foreground hover:text-foreground"
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function AdminTools() {
  const [secret, setSecret]       = useState<string | null>(() =>
    import.meta.env.DEV ? "smartfx-admin-2024" : sessionStorage.getItem(ADMIN_SESSION_KEY)
  );
  const [unlockPwd, setUnlockPwd] = useState("");
  const [unlockErr, setUnlockErr] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [expanded, setExpanded]   = useState(!!secret);

  const [genPlan, setGenPlan]     = useState<Plan>("monthly");
  const [genLabel, setGenLabel]   = useState("");
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey]       = useState<GeneratedKey | null>(null);

  const subscriberLink = typeof window !== "undefined"
    ? window.location.origin + (import.meta.env.BASE_URL !== "/" ? import.meta.env.BASE_URL.replace(/\/$/, "") : "")
    : "";

  const adminHeaders = useCallback((): HeadersInit => ({
    "Content-Type": "application/json",
    "x-admin-secret": secret ?? "",
  }), [secret]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    setUnlockErr("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, {
        headers: { "x-admin-secret": unlockPwd },
      });
      if (res.ok) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, unlockPwd);
        setSecret(unlockPwd);
        setExpanded(true);
      } else {
        setUnlockErr("Incorrect admin password.");
      }
    } catch {
      setUnlockErr("Cannot reach server.");
    }
    setUnlocking(false);
  }

  async function generate() {
    setGenerating(true);
    setNewKey(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/keys`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ plan: genPlan, label: genLabel || null }),
      });
      if (res.ok) {
        setNewKey(await res.json());
        setGenLabel("");
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">Admin Tools</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-border/30 pt-5">
          {!secret ? (
            /* Unlock form */
            <form onSubmit={unlock} className="space-y-3">
              <p className="text-xs text-muted-foreground">Enter your admin password to access key management.</p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="password"
                  value={unlockPwd}
                  onChange={e => setUnlockPwd(e.target.value)}
                  placeholder="Admin password"
                  className="w-full bg-background border border-border/60 rounded-lg pl-9 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60"
                />
              </div>
              {unlockErr && <p className="text-xs text-rose-400">{unlockErr}</p>}
              <button type="submit" disabled={unlocking || !unlockPwd}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {unlocking ? "Verifying..." : "Unlock"}
              </button>
            </form>
          ) : (
            <div className="space-y-5">

              {/* Subscriber Access Link */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-primary" /> Subscriber Access Link
                </p>
                <p className="text-[11px] text-muted-foreground/70">Share this link — subscribers will be prompted to enter their key only, no plan info shown.</p>
                <div className="flex items-center gap-2 bg-background rounded-lg border border-border/60 px-3 py-2.5">
                  <span className="flex-1 text-xs font-mono text-foreground/80 break-all">{subscriberLink}</span>
                  <CopyButton text={subscriberLink} label="Copy" />
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/30" />

              {/* Generate Key */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" /> Generate Access Key
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {(["monthly","quarterly","yearly","lifetime"] as Plan[]).map(p => (
                    <button key={p} onClick={() => setGenPlan(p)}
                      className={cn(
                        "rounded-lg border py-2 text-center text-xs font-bold transition-all",
                        genPlan === p ? `${PLAN_COLORS[p]} border-current` : "border-border/40 text-muted-foreground hover:border-primary/40"
                      )}>
                      {PLAN_INFO[p].label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={genLabel}
                  onChange={e => setGenLabel(e.target.value)}
                  placeholder="Label (e.g. John Doe) — optional"
                  className="w-full bg-background border border-border/60 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60"
                />

                <button onClick={generate} disabled={generating}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {generating ? "Generating..." : `Generate ${PLAN_INFO[genPlan].label} Key`}
                </button>

                {newKey && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-3">
                    <p className="text-xs text-emerald-400 font-semibold">Key generated — send to subscriber:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 font-mono text-sm text-emerald-300 bg-black/30 rounded px-3 py-2 break-all">{newKey.key}</code>
                      <CopyButton text={newKey.key} label="Copy" />
                    </div>
                    {newKey.expiresAt && (
                      <p className="text-[11px] text-muted-foreground">
                        Expires: <span className="font-semibold">{format(new Date(newKey.expiresAt), "MMM d, yyyy")}</span>
                      </p>
                    )}
                    <div className="border-t border-emerald-500/20 pt-3 space-y-1.5">
                      <p className="text-[11px] text-muted-foreground">Ready-to-send message:</p>
                      <div className="flex items-start gap-2 bg-black/20 rounded px-3 py-2">
                        <p className="flex-1 text-xs text-foreground/70 whitespace-pre-wrap">{`Your SmartFX access key: ${newKey.key}\nActivate at: ${subscriberLink}`}</p>
                        <CopyButton
                          text={`Your SmartFX access key: ${newKey.key}\nActivate at: ${subscriberLink}`}
                          label="Copy"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { key, plan, expiresAt, label, validate, logout, error } = useAuth();
  const [showKey, setShowKey]   = useState(false);
  const [newKey, setNewKey]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);

  const planInfo  = plan ? PLAN_INFO[plan] : null;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const daysLeft  = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000))
    : null;

  async function handleRenew(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSubmitting(true);
    setSuccess(false);
    const ok = await validate(newKey.trim());
    setSubmitting(false);
    if (ok) { setSuccess(true); setNewKey(""); setShowForm(false); }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and access keys.</p>
      </div>

      {/* Current Plan */}
      {plan && planInfo && (
        <div className={cn("rounded-xl border p-5 space-y-4", planInfo.border, planInfo.bg)}>
          <div className="flex items-center gap-3">
            <Shield className={cn("w-5 h-5", planInfo.color)} />
            <div>
              <p className={cn("text-sm font-bold", planInfo.color)}>{planInfo.label} Plan</p>
              {label && <p className="text-xs text-muted-foreground">{label}</p>}
            </div>
            <div className="ml-auto">
              {plan === "lifetime" ? (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Never expires</span>
              ) : isExpired ? (
                <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">Expired</span>
              ) : (
                <span className="text-xs font-bold text-foreground/70">{daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>
              )}
            </div>
          </div>

          {expiresAt && (
            <p className="text-xs text-muted-foreground">
              Expires on <span className="font-semibold text-foreground/80">{format(new Date(expiresAt), "MMMM d, yyyy")}</span>
            </p>
          )}

          {key && (
            <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2.5 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <code className="flex-1 font-mono text-xs text-foreground/80 tracking-wider">
                {showKey ? key : maskKey(key)}
              </code>
              <button onClick={() => setShowKey(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm font-semibold">
          <CheckCircle2 className="w-4 h-4" /> Key updated successfully.
        </div>
      )}

      {/* Renew / Change Key */}
      <div className="rounded-xl border border-border/40 bg-card/30 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" /> Renew or Change Key
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter a new access key to update your subscription.</p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="text-xs font-bold text-primary hover:opacity-80 transition-opacity">
              Enter key
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleRenew} className="space-y-3">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={newKey}
                onChange={e => setNewKey(e.target.value.toUpperCase())}
                placeholder="SFX-XXXXXX-XXXXXX-XXXXXX"
                className={cn(
                  "w-full bg-background border rounded-lg pl-9 pr-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors",
                  error ? "border-rose-500/50" : "border-border/60"
                )}
                autoComplete="off" spellCheck={false}
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={submitting || !newKey.trim()}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</> : "Activate New Key"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setNewKey(""); }}
                className="px-4 py-2.5 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Admin Tools */}
      <AdminTools />

      {/* Sign Out */}
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Sign Out</p>
          <p className="text-xs text-muted-foreground mt-0.5">Remove your key from this device.</p>
        </div>
        <button onClick={logout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-500/30 text-rose-400 text-sm font-bold hover:bg-rose-500/10 transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Key, Shield, LogOut, RefreshCw, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, Plan } from "@/hooks/useAuth";
import { format } from "date-fns";

const PLAN_INFO: Record<Plan, { label: string; color: string; border: string; bg: string }> = {
  monthly:   { label: "Monthly",  color: "text-blue-400",    border: "border-blue-500/30",   bg: "bg-blue-500/10" },
  quarterly: { label: "3-Month",  color: "text-violet-400",  border: "border-violet-500/30", bg: "bg-violet-500/10" },
  yearly:    { label: "1-Year",   color: "text-amber-400",   border: "border-amber-500/30",  bg: "bg-amber-500/10" },
  lifetime:  { label: "Lifetime", color: "text-emerald-400", border: "border-emerald-500/30",bg: "bg-emerald-500/10" },
};

function maskKey(key: string) {
  const parts = key.split("-");
  return parts.map((p, i) => (i === 0 ? p : "••••••")).join("-");
}

export default function Settings() {
  const { key, plan, expiresAt, label, validate, logout, loading, error } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const planInfo = plan ? PLAN_INFO[plan] : null;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const daysLeft = expiresAt
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
        <h1 className="text-2xl font-bold">Subscription Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your access key and plan details.</p>
      </div>

      {/* Current Plan Card */}
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

          {/* Key display */}
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
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter a new access key to update your subscription.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs font-bold text-primary hover:opacity-80 transition-opacity"
            >
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
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !newKey.trim()}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</> : "Activate New Key"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewKey(""); }}
                className="px-4 py-2.5 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sign Out */}
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Sign Out</p>
          <p className="text-xs text-muted-foreground mt-0.5">Remove your key from this device.</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-500/30 text-rose-400 text-sm font-bold hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

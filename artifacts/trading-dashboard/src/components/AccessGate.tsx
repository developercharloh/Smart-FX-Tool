import { useState } from "react";
import { Key, Lock, Loader2, Eye, EyeOff, BarChart2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function AccessGate() {
  const { validate, loading, error, authenticated } = useAuth();
  const [input, setInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitting(true);
    await validate(input.trim());
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <p className="text-foreground font-bold text-lg">Access Granted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto border border-primary/30">
            <BarChart2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">SmartFX</h1>
            <p className="text-sm text-muted-foreground mt-1">Professional Forex Analysis Tool</p>
          </div>
        </div>

        {/* Key Entry Form */}
        <div className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Enter Your Access Key</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Contact the provider to get your access key.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showKey ? "text" : "password"}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="SFX-XXXXXX-XXXXXX-XXXXXX"
                className={cn(
                  "w-full bg-background/60 border rounded-lg pl-9 pr-10 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors",
                  error ? "border-rose-500/50" : "border-border/60"
                )}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !input.trim()}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Validating...</>
                : <><CheckCircle2 className="w-4 h-4" /> Activate Access</>}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50">
          Your key is stored locally and never shared.
        </p>
      </div>
    </div>
  );
}

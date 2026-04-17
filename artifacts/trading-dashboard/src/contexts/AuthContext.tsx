import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const KEY_STORE   = "sfx_access_key";
const CACHE_STORE = "sfx_auth_cache";
const REVALIDATE_AFTER_MS = 12 * 60 * 60 * 1000; // 12 hours

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type Plan = "monthly" | "quarterly" | "yearly" | "lifetime";

interface CachedAuth {
  key:         string;
  plan:        Plan;
  expiresAt:   string | null;
  label:       string | null;
  validatedAt: number;
}

export interface AuthState {
  authenticated: boolean;
  key:        string | null;
  plan:       Plan | null;
  expiresAt:  string | null;
  label:      string | null;
  loading:    boolean;
  error:      string | null;
  validate:   (key: string) => Promise<boolean>;
  logout:     () => void;
}

// ── Sync helpers (run before first render) ──────────────────────────────────

function readCache(): CachedAuth | null {
  try {
    const raw = localStorage.getItem(CACHE_STORE);
    return raw ? (JSON.parse(raw) as CachedAuth) : null;
  } catch { return null; }
}

function writeCache(c: CachedAuth) {
  localStorage.setItem(CACHE_STORE, JSON.stringify(c));
  localStorage.setItem(KEY_STORE, c.key);
}

function clearCache() {
  localStorage.removeItem(CACHE_STORE);
  localStorage.removeItem(KEY_STORE);
}

function cacheIsExpired(c: CachedAuth): boolean {
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return true;
  return false;
}

function cacheNeedsRevalidation(c: CachedAuth): boolean {
  return Date.now() - c.validatedAt > REVALIDATE_AFTER_MS;
}

// ── Derive initial state from cache so there is zero loading delay ──────────

const cached = readCache();
const initialAuthenticated = !!cached && !cacheIsExpired(cached);

// ── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [key,       setKey]       = useState<string | null>(cached?.key       ?? null);
  const [plan,      setPlan]      = useState<Plan | null>(cached?.plan       ?? null);
  const [expiresAt, setExpiresAt] = useState<string | null>(cached?.expiresAt ?? null);
  const [label,     setLabel]     = useState<string | null>(cached?.label     ?? null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // ── Network validation ────────────────────────────────────────────────────

  const callValidate = useCallback(async (inputKey: string): Promise<{ valid: boolean; plan?: Plan; expiresAt?: string | null; label?: string | null; reason?: string }> => {
    const res = await fetch(`${API_BASE}/api/auth/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: inputKey }),
    });
    return res.json();
  }, []);

  // ── Public validate (called from the gate form) ───────────────────────────

  const validate = useCallback(async (inputKey: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const data = await callValidate(inputKey.trim().toUpperCase());
      if (data.valid) {
        const norm = inputKey.trim().toUpperCase();
        const cache: CachedAuth = {
          key: norm,
          plan: data.plan!,
          expiresAt: data.expiresAt ?? null,
          label: data.label ?? null,
          validatedAt: Date.now(),
        };
        writeCache(cache);
        setAuthenticated(true);
        setKey(norm);
        setPlan(data.plan!);
        setExpiresAt(data.expiresAt ?? null);
        setLabel(data.label ?? null);
        setLoading(false);
        return true;
      } else {
        clearCache();
        setAuthenticated(false);
        setKey(null);
        setPlan(null);
        setError(data.reason ?? "Invalid key");
        setLoading(false);
        return false;
      }
    } catch {
      setError("Cannot reach server. Please try again.");
      setLoading(false);
      return false;
    }
  }, [callValidate]);

  // ── Silent background revalidation ───────────────────────────────────────

  useEffect(() => {
    if (!initialAuthenticated) return;
    const c = readCache();
    if (!c || !cacheNeedsRevalidation(c)) return;

    callValidate(c.key).then(data => {
      if (data.valid) {
        const updated: CachedAuth = {
          key: c.key,
          plan: data.plan!,
          expiresAt: data.expiresAt ?? null,
          label: data.label ?? null,
          validatedAt: Date.now(),
        };
        writeCache(updated);
        setPlan(data.plan!);
        setExpiresAt(data.expiresAt ?? null);
        setLabel(data.label ?? null);
      } else {
        clearCache();
        setAuthenticated(false);
        setKey(null);
        setPlan(null);
      }
    }).catch(() => { /* network error — keep showing the cached state */ });
  }, [callValidate]);

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    clearCache();
    setAuthenticated(false);
    setKey(null);
    setPlan(null);
    setExpiresAt(null);
    setLabel(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, key, plan, expiresAt, label, loading, error, validate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

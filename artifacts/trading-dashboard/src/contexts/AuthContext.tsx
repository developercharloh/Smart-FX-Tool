import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const STORAGE_KEY = "sfx_access_key";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export type Plan = "monthly" | "quarterly" | "yearly" | "lifetime";

export interface AuthState {
  authenticated: boolean;
  key: string | null;
  plan: Plan | null;
  expiresAt: string | null;
  label: string | null;
  loading: boolean;
  error: string | null;
  validate: (key: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [key, setKey]     = useState<string | null>(null);
  const [plan, setPlan]   = useState<Plan | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (inputKey: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: inputKey }),
      });
      const data = await res.json();
      if (data.valid) {
        const normalised = inputKey.trim().toUpperCase();
        localStorage.setItem(STORAGE_KEY, normalised);
        setAuthenticated(true);
        setKey(normalised);
        setPlan(data.plan);
        setExpiresAt(data.expiresAt ?? null);
        setLabel(data.label ?? null);
        setError(null);
        setLoading(false);
        return true;
      } else {
        localStorage.removeItem(STORAGE_KEY);
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
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthenticated(false);
    setKey(null);
    setPlan(null);
    setExpiresAt(null);
    setLabel(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      validate(saved).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [validate]);

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

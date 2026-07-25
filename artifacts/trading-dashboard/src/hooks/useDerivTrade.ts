/**
 * useDerivTrade — calls server-side /api/deriv/* endpoints.
 * Token lives in DERIV_API_TOKEN env var on the server; never touches the browser.
 */

import { useState, useCallback, useRef, useEffect } from "react";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const SETTINGS_KEY = "smartfx_deriv_trade_settings";

export interface TradeSettings {
  stake:      number;
  multiplier: number;
}

export interface OpenPosition {
  contractId:   number;
  symbol:       string;
  type:         "MULTUP" | "MULTDOWN";
  direction:    "BUY" | "SELL";
  stake:        number;
  currentValue: number;
  profit:       number;
  entrySpot:    number;
  openedAt:     number;
}

export interface DerivBalance {
  balance:  number;
  currency: string;
  loginid:  string;
}

export type TradeStatus = "idle" | "connecting" | "proposing" | "buying" | "done" | "error";

export interface TradeResult {
  ok:          boolean;
  contractId?: number;
  message:     string;
}

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return res.json();
}

export function useDerivTrade() {
  const [connected, setConnected] = useState(false);
  const [balance,   setBalance]   = useState<DerivBalance | null>(null);
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [status,    setStatus]    = useState<TradeStatus>("idle");
  const [lastResult, setResult]   = useState<TradeResult | null>(null);
  const [settings, setSettings]   = useState<TradeSettings>(() => {
    try { return { stake: 1, multiplier: 10, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") }; }
    catch { return { stake: 1, multiplier: 10 }; }
  });
  const activeRef = useRef(false);

  function saveSettings(s: Partial<TradeSettings>) {
    const merged = { ...settings, ...s };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    setSettings(merged);
  }

  const refreshBalance = useCallback(async () => {
    try {
      const data = await api<DerivBalance & { error?: string }>("/api/deriv/balance");
      if (data.error) { setConnected(false); setBalance(null); return; }
      setBalance(data);
      setConnected(true);
    } catch {
      setConnected(false);
      setBalance(null);
    }
  }, []);

  const refreshPositions = useCallback(async () => {
    try {
      const data = await api<OpenPosition[] | { error: string }>("/api/deriv/positions");
      if (!Array.isArray(data)) return;
      setPositions(data);
    } catch { /* ignore */ }
  }, []);

  // On mount: check connection + load balance + positions
  useEffect(() => {
    refreshBalance();
    refreshPositions();
  }, []);

  const executeTrade = useCallback(async (pair: string, direction: "BUY" | "SELL"): Promise<TradeResult> => {
    if (activeRef.current) return { ok: false, message: "Trade already in progress" };
    activeRef.current = true;
    setStatus("connecting");
    setResult(null);

    try {
      setStatus("proposing");
      const result = await api<TradeResult>("/api/deriv/trade", {
        method: "POST",
        body: JSON.stringify({ pair, direction, stake: settings.stake, multiplier: settings.multiplier }),
      });
      setResult(result);
      setStatus(result.ok ? "done" : "error");
      if (result.ok) { refreshPositions(); refreshBalance(); }
      return result;
    } catch (e: any) {
      const r: TradeResult = { ok: false, message: e?.message ?? "Request failed" };
      setResult(r);
      setStatus("error");
      return r;
    } finally {
      activeRef.current = false;
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [settings.stake, settings.multiplier, refreshPositions, refreshBalance]);

  const closePos = useCallback(async (contractId: number) => {
    try {
      const result = await api<{ ok: boolean; message: string }>(`/api/deriv/close/${contractId}`, { method: "POST" });
      if (result.ok) refreshPositions();
      return result;
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "Close failed" };
    }
  }, [refreshPositions]);

  return {
    connected,
    balance, refreshBalance,
    positions, refreshPositions, closePos,
    settings, saveSettings,
    status, lastResult,
    executeTrade,
    isTrading: status === "connecting" || status === "proposing" || status === "buying",
    // legacy compat
    token: connected ? "server" : null,
    saveToken: () => {},
    removeToken: () => {},
  };
}

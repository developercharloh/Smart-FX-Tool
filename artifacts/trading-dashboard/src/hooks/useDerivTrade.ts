/**
 * useDerivTrade — Deriv deep-link trading.
 * Opens app.deriv.com/dtrader pre-filled with trade details.
 * No API token needed — user is already logged into Deriv on their device.
 */

import { useState, useCallback } from "react";

const SETTINGS_KEY = "smartfx_deriv_trade_settings";

const PAIR_TO_SYMBOL: Record<string, string> = {
  EURUSD: "frxEURUSD", GBPUSD: "frxGBPUSD", USDJPY: "frxUSDJPY",
  AUDUSD: "frxAUDUSD", USDCAD: "frxUSDCAD", NZDUSD: "frxNZDUSD",
  USDCHF: "frxUSDCHF", GBPJPY: "frxGBPJPY", EURJPY: "frxEURJPY",
  EURGBP: "frxEURGBP", AUDJPY: "frxAUDJPY", GBPCAD: "frxGBPCAD",
  AUDCAD: "frxAUDCAD", GBPCHF: "frxGBPCHF", AUDNZD: "frxAUDNZD",
  CADCHF: "frxCADCHF", NZDJPY: "frxNZDJPY", EURCAD: "frxEURCAD",
  EURCHF: "frxEURCHF", EURAUD: "frxEURAUD", GBPAUD: "frxGBPAUD",
  CADJPY: "frxCADJPY", AUDCHF: "frxAUDCHF",
  XAUUSD: "frxXAUUSD", XAGUSD: "frxXAGUSD",
  BTCUSD: "cryBTCUSD", ETHUSD: "cryETHUSD", XRPUSD: "cryXRPUSD",
  R_10: "R_10", R_25: "R_25", R_50: "R_50", R_75: "R_75", R_100: "R_100",
  BOOM500: "BOOM500", BOOM1000: "BOOM1000",
  CRASH500: "CRASH500", CRASH1000: "CRASH1000",
};

export interface TradeSettings {
  stake:      number;
  multiplier: number;
}

export interface TradeResult {
  ok:      boolean;
  message: string;
}

export type TradeStatus = "idle" | "opened";

/** Build the Deriv DTrader deep-link URL */
export function buildDerivTradeUrl(pair: string, direction: "BUY" | "SELL", stake: number, multiplier: number): string | null {
  const symbol = PAIR_TO_SYMBOL[pair.toUpperCase()];
  if (!symbol) return null;
  const contractType = direction === "BUY" ? "MULTUP" : "MULTDOWN";
  const params = new URLSearchParams({
    contract_type: contractType,
    symbol,
    amount:      String(stake),
    multiplier:  String(multiplier),
    basis:       "stake",
    currency:    "USD",
  });
  return `https://app.deriv.com/dtrader?${params.toString()}`;
}

export function useDerivTrade() {
  const [settings, setSettings] = useState<TradeSettings>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
      // Clamp multiplier to valid options if old value stored
      const validMultipliers = [10, 20, 50, 100];
      if (saved.multiplier && !validMultipliers.includes(saved.multiplier)) saved.multiplier = 10;
      return { stake: 1, multiplier: 10, ...saved };
    } catch { return { stake: 1, multiplier: 10 }; }
  });
  const [lastResult, setResult] = useState<TradeResult | null>(null);
  const [status, setStatus]     = useState<TradeStatus>("idle");

  function saveSettings(s: Partial<TradeSettings>) {
    const merged = { ...settings, ...s };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    setSettings(merged);
  }

  const executeTrade = useCallback((pair: string, direction: "BUY" | "SELL"): TradeResult => {
    const url = buildDerivTradeUrl(pair, direction, settings.stake, settings.multiplier);
    if (!url) {
      const r = { ok: false, message: `${pair} not supported` };
      setResult(r);
      return r;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("opened");
    const r = { ok: true, message: `Opened Deriv — confirm ${direction} ${pair}` };
    setResult(r);
    setTimeout(() => setStatus("idle"), 3000);
    return r;
  }, [settings.stake, settings.multiplier]);

  return {
    // Always "connected" — no token needed
    connected:  true,
    balance:    null,
    positions:  [],
    settings,   saveSettings,
    status,     lastResult,
    executeTrade,
    isTrading:  false,
    refreshBalance:   () => {},
    refreshPositions: () => {},
    closePos:   async () => ({ ok: false, message: "Use the Deriv app to close positions" }),
    // legacy compat for scanner card
    token: "deeplink",
    saveToken:   () => {},
    removeToken: () => {},
  };
}

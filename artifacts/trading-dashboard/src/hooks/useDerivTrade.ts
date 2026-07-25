/**
 * useDerivTrade — client-side Deriv WebSocket trading hook
 * Token never leaves the browser. All trades go directly to Deriv API.
 */

import { useState, useCallback, useRef } from "react";

const DERIV_APP_ID   = 1089;
const TOKEN_KEY      = "smartfx_deriv_trade_token";
const SETTINGS_KEY   = "smartfx_deriv_trade_settings";
const WS_URL         = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

// Map our pair names → Deriv symbols
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
  stake:      number;  // USD amount per trade
  multiplier: number;  // 10, 50, 100, 200, 500
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

export type TradeStatus = "idle" | "connecting" | "proposing" | "buying" | "done" | "error";

export interface TradeResult {
  ok:         boolean;
  contractId?: number;
  message:    string;
}

// ─── Single-use WebSocket trade helper ───────────────────────────────────────

function derivTrade(token: string, symbol: string, direction: "BUY" | "SELL", stake: number, multiplier: number): Promise<TradeResult> {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    const contractType = direction === "BUY" ? "MULTUP" : "MULTDOWN";
    let proposalId: string | null = null;
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ ok: false, message: "Timeout — Deriv did not respond in time" });
    }, 20000);

    ws.onopen = () => ws.send(JSON.stringify({ authorize: token }));

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);

        if (msg.error) {
          clearTimeout(timeout);
          ws.close();
          resolve({ ok: false, message: msg.error.message ?? "Deriv API error" });
          return;
        }

        if (msg.msg_type === "authorize") {
          // Get proposal
          ws.send(JSON.stringify({
            proposal:      1,
            amount:        stake,
            basis:         "stake",
            contract_type: contractType,
            currency:      "USD",
            duration:      1,
            duration_unit: "d",
            multiplier,
            symbol,
          }));
        }

        if (msg.msg_type === "proposal") {
          proposalId = msg.proposal?.id;
          if (!proposalId) {
            clearTimeout(timeout);
            ws.close();
            resolve({ ok: false, message: "No proposal received" });
            return;
          }
          // Buy immediately
          ws.send(JSON.stringify({ buy: proposalId, price: stake }));
        }

        if (msg.msg_type === "buy") {
          clearTimeout(timeout);
          ws.close();
          const cid = msg.buy?.contract_id;
          resolve({
            ok:         true,
            contractId: cid,
            message:    `Trade opened! Contract #${cid}`,
          });
        }
      } catch {
        clearTimeout(timeout);
        ws.close();
        resolve({ ok: false, message: "Unexpected response from Deriv" });
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      resolve({ ok: false, message: "WebSocket connection failed" });
    };
  });
}

// ─── Fetch open multiplier positions ─────────────────────────────────────────

export function fetchOpenPositions(token: string): Promise<OpenPosition[]> {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => { ws.close(); resolve([]); }, 15000);

    ws.onopen = () => ws.send(JSON.stringify({ authorize: token }));

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.msg_type === "authorize") {
          ws.send(JSON.stringify({ portfolio: 1, contract_type: ["MULTUP", "MULTDOWN"] }));
        }
        if (msg.msg_type === "portfolio") {
          clearTimeout(timeout);
          ws.close();
          const contracts = msg.portfolio?.contracts ?? [];
          const positions: OpenPosition[] = contracts.map((c: any) => ({
            contractId:   c.contract_id,
            symbol:       c.symbol,
            type:         c.contract_type,
            direction:    c.contract_type === "MULTUP" ? "BUY" : "SELL",
            stake:        c.buy_price,
            currentValue: c.bid_price ?? c.buy_price,
            profit:       (c.bid_price ?? c.buy_price) - c.buy_price,
            entrySpot:    c.entry_spot ?? 0,
            openedAt:     c.date_start * 1000,
          }));
          resolve(positions);
        }
      } catch { clearTimeout(timeout); ws.close(); resolve([]); }
    };

    ws.onerror = () => { clearTimeout(timeout); resolve([]); };
  });
}

// ─── Close a position ─────────────────────────────────────────────────────────

export function closePosition(token: string, contractId: number): Promise<{ ok: boolean; message: string }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => { ws.close(); resolve({ ok: false, message: "Timeout" }); }, 15000);

    ws.onopen = () => ws.send(JSON.stringify({ authorize: token }));

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.error) { clearTimeout(timeout); ws.close(); resolve({ ok: false, message: msg.error.message }); return; }
        if (msg.msg_type === "authorize") {
          ws.send(JSON.stringify({ sell: contractId, price: 0 }));
        }
        if (msg.msg_type === "sell") {
          clearTimeout(timeout); ws.close();
          resolve({ ok: true, message: `Position closed at ${msg.sell?.sold_for?.toFixed(2) ?? "market"}` });
        }
      } catch { clearTimeout(timeout); ws.close(); resolve({ ok: false, message: "Unexpected error" }); }
    };

    ws.onerror = () => { clearTimeout(timeout); resolve({ ok: false, message: "Connection failed" }); };
  });
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useDerivTrade() {
  const [token, setToken]       = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [settings, setSettings] = useState<TradeSettings>(() => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}"); } catch { return {}; }
  });
  const [status, setStatus]     = useState<TradeStatus>("idle");
  const [lastResult, setResult] = useState<TradeResult | null>(null);
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const activeRef = useRef(false);

  const effectiveSettings: TradeSettings = {
    stake:      settings.stake      ?? 1,
    multiplier: settings.multiplier ?? 10,
  };

  function saveToken(t: string) {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  function saveSettings(s: Partial<TradeSettings>) {
    const merged = { ...effectiveSettings, ...s };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    setSettings(merged);
  }

  const executeTrade = useCallback(async (pair: string, direction: "BUY" | "SELL") => {
    if (!token) return { ok: false, message: "No token set" };
    if (activeRef.current) return { ok: false, message: "Trade already in progress" };

    const symbol = PAIR_TO_SYMBOL[pair.toUpperCase()];
    if (!symbol) return { ok: false, message: `Pair ${pair} not supported` };

    activeRef.current = true;
    setStatus("connecting");
    setResult(null);

    try {
      setStatus("proposing");
      const result = await derivTrade(token, symbol, direction, effectiveSettings.stake, effectiveSettings.multiplier);
      setResult(result);
      setStatus(result.ok ? "done" : "error");
      if (result.ok) refreshPositions();
      return result;
    } finally {
      activeRef.current = false;
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [token, effectiveSettings.stake, effectiveSettings.multiplier]);

  const refreshPositions = useCallback(async () => {
    if (!token) return;
    const pos = await fetchOpenPositions(token);
    setPositions(pos);
  }, [token]);

  const closePos = useCallback(async (contractId: number) => {
    if (!token) return;
    const result = await closePosition(token, contractId);
    if (result.ok) refreshPositions();
    return result;
  }, [token, refreshPositions]);

  return {
    token, saveToken, removeToken,
    settings: effectiveSettings, saveSettings,
    status, lastResult,
    positions, refreshPositions, closePos,
    executeTrade,
    isTrading: status === "connecting" || status === "proposing" || status === "buying",
  };
}

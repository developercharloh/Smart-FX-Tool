import { useState, useEffect, useRef } from "react";

const DERIV_WS_URL = "wss://ws.binaryws.com/websockets/v3?app_id=1089";

const DERIV_SYMBOL_MAP: Record<string, string> = {
  // Forex — Deriv uses frx prefix
  EURUSD: "frxEURUSD",
  GBPUSD: "frxGBPUSD",
  USDJPY: "frxUSDJPY",
  AUDUSD: "frxAUDUSD",
  USDCAD: "frxUSDCAD",
  NZDUSD: "frxNZDUSD",
  USDCHF: "frxUSDCHF",
  GBPJPY: "frxGBPJPY",
  EURJPY: "frxEURJPY",
  EURGBP: "frxEURGBP",
  EURCHF: "frxEURCHF",
  EURCAD: "frxEURCAD",
  GBPCAD: "frxGBPCAD",
  AUDCAD: "frxAUDCAD",
  CADJPY: "frxCADJPY",
  AUDNZD: "frxAUDNZD",
  AUDCHF: "frxAUDCHF",
  GBPCHF: "frxGBPCHF",
  NZDJPY: "frxNZDJPY",
  // Deriv Synthetics — same symbol
  R_10: "R_10",
  R_25: "R_25",
  R_50: "R_50",
  R_75: "R_75",
  R_100: "R_100",
  "1HZ10V": "1HZ10V",
  "1HZ25V": "1HZ25V",
  "1HZ50V": "1HZ50V",
  "1HZ75V": "1HZ75V",
  "1HZ100V": "1HZ100V",
  BOOM300: "BOOM300",
  BOOM500: "BOOM500",
  BOOM1000: "BOOM1000",
  CRASH300: "CRASH300",
  CRASH500: "CRASH500",
  CRASH1000: "CRASH1000",
  JD10: "JD10",
  JD25: "JD25",
  JD50: "JD50",
  JD75: "JD75",
  JD100: "JD100",
};

export interface LivePrice {
  price: number;
  change: number;
  changePct: number;
  direction: "up" | "down" | "flat";
  connected: boolean;
  symbol: string;
}

export function useLivePrice(symbol: string): LivePrice | null {
  const [data, setData] = useState<LivePrice | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const openPriceRef = useRef<number | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  const subIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const derivSymbol = DERIV_SYMBOL_MAP[symbol];
    if (!derivSymbol) return;

    let active = true;

    function connect() {
      const ws = new WebSocket(DERIV_WS_URL);
      wsRef.current = ws;
      openPriceRef.current = null;
      prevPriceRef.current = null;

      ws.onopen = () => {
        if (!active) return;
        ws.send(JSON.stringify({
          ticks: derivSymbol,
          subscribe: 1,
        }));
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.error) return;

          if (msg.tick) {
            const price = msg.tick.quote;
            subIdRef.current = msg.tick.id;

            if (openPriceRef.current === null) {
              openPriceRef.current = price;
            }

            const open = openPriceRef.current;
            const change = price - open;
            const changePct = (change / open) * 100;
            const prev = prevPriceRef.current;
            const direction =
              prev === null ? "flat" : price > prev ? "up" : price < prev ? "down" : "flat";

            prevPriceRef.current = price;

            setData({
              price,
              change,
              changePct,
              direction,
              connected: true,
              symbol,
            });
          }
        } catch {}
      };

      ws.onclose = () => {
        if (active) {
          setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      active = false;
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN && subIdRef.current) {
          wsRef.current.send(JSON.stringify({
            forget: subIdRef.current,
          }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      setData(null);
      openPriceRef.current = null;
      prevPriceRef.current = null;
    };
  }, [symbol]);

  return data;
}

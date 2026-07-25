/**
 * Server-side Deriv API routes
 * Uses DERIV_API_TOKEN env var — token never exposed to the browser.
 */

import { Router } from "express";
import WebSocket from "ws";

const router = Router();

const DERIV_APP_ID = 1089;
const WS_URL       = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

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

function getToken(): string | null {
  return process.env.DERIV_API_TOKEN ?? null;
}

// ── WebSocket helper ──────────────────────────────────────────────────────────

function derivWS<T>(handler: (ws: WebSocket, token: string, resolve: (v: T) => void, reject: (e: Error) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = getToken();
    if (!token) { reject(new Error("DERIV_API_TOKEN not configured")); return; }

    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error("Deriv WebSocket timeout"));
    }, 20000);

    const done = (v: T) => { clearTimeout(timeout); ws.terminate(); resolve(v); };
    const fail = (e: Error) => { clearTimeout(timeout); ws.terminate(); reject(e); };

    ws.on("open", () => ws.send(JSON.stringify({ authorize: token })));
    ws.on("error", (e) => fail(e));
    handler(ws, token, done, fail);
  });
}

// ── GET /api/deriv/status ─────────────────────────────────────────────────────
// Check if token is configured and valid

router.get("/status", async (_req, res) => {
  const token = getToken();
  if (!token) return res.json({ connected: false, reason: "No token configured" });

  try {
    const result = await derivWS<{ loginid: string; currency: string; balance: number }>((ws, _t, done, fail) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.error) { fail(new Error(msg.error.message)); return; }
        if (msg.msg_type === "authorize") {
          ws.send(JSON.stringify({ balance: 1, account: "current" }));
        }
        if (msg.msg_type === "balance") {
          done({
            loginid:  msg.balance?.loginid  ?? "",
            currency: msg.balance?.currency ?? "USD",
            balance:  msg.balance?.balance  ?? 0,
          });
        }
      });
    });
    return res.json({ connected: true, ...result });
  } catch (err: any) {
    return res.json({ connected: false, reason: err.message });
  }
});

// ── GET /api/deriv/balance ────────────────────────────────────────────────────

router.get("/balance", async (_req, res) => {
  try {
    const result = await derivWS<{ loginid: string; currency: string; balance: number }>((ws, _t, done, fail) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.error) { fail(new Error(msg.error.message)); return; }
        if (msg.msg_type === "authorize") {
          ws.send(JSON.stringify({ balance: 1, account: "current" }));
        }
        if (msg.msg_type === "balance") {
          done({
            loginid:  msg.balance?.loginid  ?? "",
            currency: msg.balance?.currency ?? "USD",
            balance:  msg.balance?.balance  ?? 0,
          });
        }
      });
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/deriv/positions ──────────────────────────────────────────────────

router.get("/positions", async (_req, res) => {
  try {
    const positions = await derivWS<any[]>((ws, _t, done, fail) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.error) { fail(new Error(msg.error.message)); return; }
        if (msg.msg_type === "authorize") {
          ws.send(JSON.stringify({ portfolio: 1, contract_type: ["MULTUP", "MULTDOWN"] }));
        }
        if (msg.msg_type === "portfolio") {
          const contracts = msg.portfolio?.contracts ?? [];
          done(contracts.map((c: any) => ({
            contractId:   c.contract_id,
            symbol:       c.symbol,
            type:         c.contract_type,
            direction:    c.contract_type === "MULTUP" ? "BUY" : "SELL",
            stake:        c.buy_price,
            currentValue: c.bid_price ?? c.buy_price,
            profit:       (c.bid_price ?? c.buy_price) - c.buy_price,
            entrySpot:    c.entry_spot ?? 0,
            openedAt:     c.date_start * 1000,
          })));
        }
      });
    });
    return res.json(positions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/deriv/trade ─────────────────────────────────────────────────────
// Body: { pair, direction, stake, multiplier }

router.post("/trade", async (req, res) => {
  const { pair, direction, stake = 1, multiplier = 10 } = req.body;

  if (!pair || !["BUY", "SELL"].includes(direction)) {
    return res.status(400).json({ error: "pair and direction (BUY|SELL) required" });
  }

  const symbol = PAIR_TO_SYMBOL[String(pair).toUpperCase()];
  if (!symbol) return res.status(400).json({ error: `Pair ${pair} not supported` });

  const contractType = direction === "BUY" ? "MULTUP" : "MULTDOWN";

  try {
    const result = await derivWS<{ ok: boolean; contractId?: number; message: string }>((ws, _t, done, fail) => {
      let proposalId: string | null = null;

      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.error) { done({ ok: false, message: msg.error.message ?? "Deriv API error" }); return; }

        if (msg.msg_type === "authorize") {
          ws.send(JSON.stringify({
            proposal: 1, amount: Number(stake), basis: "stake",
            contract_type: contractType, currency: "USD",
            duration: 1, duration_unit: "d",
            multiplier: Number(multiplier), symbol,
          }));
        }
        if (msg.msg_type === "proposal") {
          proposalId = msg.proposal?.id;
          if (!proposalId) { done({ ok: false, message: "No proposal received" }); return; }
          ws.send(JSON.stringify({ buy: proposalId, price: Number(stake) }));
        }
        if (msg.msg_type === "buy") {
          done({ ok: true, contractId: msg.buy?.contract_id, message: `Trade opened! Contract #${msg.buy?.contract_id}` });
        }
      });
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ── POST /api/deriv/close/:contractId ────────────────────────────────────────

router.post("/close/:contractId", async (req, res) => {
  const contractId = Number(req.params.contractId);
  if (isNaN(contractId)) return res.status(400).json({ error: "Invalid contractId" });

  try {
    const result = await derivWS<{ ok: boolean; message: string }>((ws, _t, done, fail) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.error) { done({ ok: false, message: msg.error.message }); return; }
        if (msg.msg_type === "authorize") {
          ws.send(JSON.stringify({ sell: contractId, price: 0 }));
        }
        if (msg.msg_type === "sell") {
          done({ ok: true, message: `Position closed at ${msg.sell?.sold_for?.toFixed(2) ?? "market"}` });
        }
      });
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

export default router;

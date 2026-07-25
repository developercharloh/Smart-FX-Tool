import { Router } from "express";
import { db } from "@workspace/db";
import { mt5ExecutionsTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";

const router = Router();

// Simple EA key auth — set MT5_EA_KEY env var to override the default
const EA_KEY = process.env.MT5_EA_KEY ?? "smartfx-ea-2025";

function checkEAKey(key: string | undefined): boolean {
  return key === EA_KEY;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mt5/queue
// Dashboard calls this after the user confirms. Creates an "approved" record.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/queue", async (req, res) => {
  try {
    const { pair, signal, timeframe, entry, stopLoss, takeProfit, riskPercent, confidenceScore, riskRewardRatio } = req.body;
    if (!pair || !signal || !timeframe || entry == null || stopLoss == null || takeProfit == null) {
      return res.status(400).json({ error: "Missing required fields: pair, signal, timeframe, entry, stopLoss, takeProfit" });
    }
    if (!["BUY", "SELL"].includes(signal)) {
      return res.status(400).json({ error: "signal must be BUY or SELL" });
    }
    const [row] = await db
      .insert(mt5ExecutionsTable)
      .values({
        pair,
        signal,
        timeframe,
        entry: Number(entry),
        stopLoss: Number(stopLoss),
        takeProfit: Number(takeProfit),
        riskPercent: Number(riskPercent ?? 1.0),
        confidenceScore: Number(confidenceScore ?? 0),
        riskRewardRatio: Number(riskRewardRatio ?? 0),
        status: "approved",
      })
      .returning();
    return res.status(201).json(row);
  } catch (err) {
    console.error("mt5/queue error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mt5/pending?key=XXX[&format=mql5]
// EA polls this. Returns "approved" rows and atomically marks them "picked_up".
// format=mql5 returns pipe-delimited text instead of JSON (easier to parse in MQL5)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/pending", async (req, res) => {
  if (!checkEAKey(req.query.key as string)) {
    return res.status(401).json({ error: "Invalid EA key" });
  }
  try {
    const rows = await db
      .select()
      .from(mt5ExecutionsTable)
      .where(eq(mt5ExecutionsTable.status, "approved"))
      .orderBy(mt5ExecutionsTable.createdAt);

    if (rows.length === 0) {
      if (req.query.format === "mql5") return res.type("text").send("");
      return res.json([]);
    }

    // Atomically mark as picked_up
    const ids = rows.map(r => r.id);
    await db
      .update(mt5ExecutionsTable)
      .set({ status: "picked_up" })
      .where(inArray(mt5ExecutionsTable.id, ids));

    if (req.query.format === "mql5") {
      // pipe-delimited: id|pair|signal|entry|stopLoss|takeProfit|riskPercent
      const lines = rows.map(r =>
        [r.id, r.pair, r.signal, r.entry, r.stopLoss, r.takeProfit, r.riskPercent].join("|")
      );
      return res.type("text").send(lines.join("\n"));
    }

    return res.json(rows.map(r => ({ ...r, status: "picked_up" })));
  } catch (err) {
    console.error("mt5/pending error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mt5/report?key=XXX
// EA reports the result of an execution attempt.
// Body: { id, status: "executed"|"failed", ticket?, lots?, price?, error? }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/report", async (req, res) => {
  if (!checkEAKey(req.query.key as string)) {
    return res.status(401).json({ error: "Invalid EA key" });
  }
  try {
    const { id, status, ticket, lots, price, error: eaError } = req.body;
    if (!id || !["executed", "failed"].includes(status)) {
      return res.status(400).json({ error: "id and status (executed|failed) required" });
    }
    const updates: Record<string, unknown> = { status };
    if (status === "executed") {
      updates.eaTicket = ticket ? Number(ticket) : null;
      updates.eaLots = lots ? Number(lots) : null;
      updates.eaPrice = price ? Number(price) : null;
      updates.executedAt = new Date();
    }
    if (eaError) updates.eaError = String(eaError);

    const [updated] = await db
      .update(mt5ExecutionsTable)
      .set(updates)
      .where(eq(mt5ExecutionsTable.id, Number(id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Execution not found" });
    return res.json(updated);
  } catch (err) {
    console.error("mt5/report error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mt5/executions
// Dashboard fetches recent execution history.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/executions", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(mt5ExecutionsTable)
      .orderBy(desc(mt5ExecutionsTable.createdAt))
      .limit(30);
    return res.json(rows);
  } catch (err) {
    console.error("mt5/executions error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/mt5/executions/:id
// Cancel an approved/picked_up execution from the dashboard.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/executions/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [row] = await db
      .select()
      .from(mt5ExecutionsTable)
      .where(eq(mt5ExecutionsTable.id, id));

    if (!row) return res.status(404).json({ error: "Not found" });
    if (!["approved", "picked_up"].includes(row.status)) {
      return res.status(400).json({ error: `Cannot cancel execution with status: ${row.status}` });
    }

    const [updated] = await db
      .update(mt5ExecutionsTable)
      .set({ status: "cancelled" })
      .where(eq(mt5ExecutionsTable.id, id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("mt5/cancel error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { accessKeysTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "smartfx-admin-2024";

function requireAdmin(req: any, res: any, next: any) {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function generateKey(): string {
  const part = () => randomBytes(3).toString("hex").toUpperCase();
  return `SFX-${part()}-${part()}-${part()}`;
}

function expiresAtForPlan(plan: string): Date | null {
  const now = new Date();
  if (plan === "monthly")   { now.setDate(now.getDate() + 30);  return now; }
  if (plan === "quarterly") { now.setDate(now.getDate() + 90);  return now; }
  if (plan === "yearly")    { now.setFullYear(now.getFullYear() + 1); return now; }
  return null;
}

router.use(requireAdmin);

router.get("/keys", async (_req, res) => {
  const keys = await db
    .select()
    .from(accessKeysTable)
    .orderBy(desc(accessKeysTable.createdAt));
  res.json(keys);
});

router.post("/keys", async (req, res) => {
  const { plan, label } = req.body;
  const validPlans = ["monthly", "quarterly", "yearly", "lifetime"];
  if (!validPlans.includes(plan)) {
    res.status(400).json({ error: "Invalid plan. Use monthly, quarterly, yearly, or lifetime." });
    return;
  }

  const key = generateKey();
  const expiresAt = expiresAtForPlan(plan);

  const [created] = await db
    .insert(accessKeysTable)
    .values({ key, plan: plan as any, label: label ?? null, expiresAt, isActive: true })
    .returning();

  res.status(201).json(created);
});

router.patch("/keys/:id/revoke", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(accessKeysTable).set({ isActive: false }).where(eq(accessKeysTable.id, id));
  res.json({ success: true });
});

router.patch("/keys/:id/activate", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(accessKeysTable).set({ isActive: true }).where(eq(accessKeysTable.id, id));
  res.json({ success: true });
});

router.patch("/keys/:id/extend", async (req, res) => {
  const id = Number(req.params.id);
  const { days } = req.body;
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!days || isNaN(Number(days))) { res.status(400).json({ error: "days required" }); return; }

  const [record] = await db.select().from(accessKeysTable).where(eq(accessKeysTable.id, id));
  if (!record) { res.status(404).json({ error: "Not found" }); return; }

  const base = record.expiresAt && new Date(record.expiresAt) > new Date()
    ? new Date(record.expiresAt)
    : new Date();
  base.setDate(base.getDate() + Number(days));

  const [updated] = await db
    .update(accessKeysTable)
    .set({ expiresAt: base })
    .where(eq(accessKeysTable.id, id))
    .returning();

  res.json(updated);
});

router.delete("/keys/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(accessKeysTable).where(eq(accessKeysTable.id, id));
  res.status(204).send();
});

export default router;

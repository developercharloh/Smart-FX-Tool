import { Router } from "express";
import { db } from "@workspace/db";
import { accessKeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/validate", async (req, res) => {
  const { key } = req.body;
  if (!key || typeof key !== "string") {
    res.status(400).json({ valid: false, reason: "No key provided" });
    return;
  }

  const [record] = await db
    .select()
    .from(accessKeysTable)
    .where(eq(accessKeysTable.key, key.trim().toUpperCase()));

  if (!record) {
    res.status(401).json({ valid: false, reason: "Invalid access key" });
    return;
  }

  if (!record.isActive) {
    res.status(403).json({ valid: false, reason: "This key has been revoked" });
    return;
  }

  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    res.status(403).json({ valid: false, reason: "This key has expired" });
    return;
  }

  res.json({
    valid: true,
    plan: record.plan,
    expiresAt: record.expiresAt,
    label: record.label,
  });
});

export default router;

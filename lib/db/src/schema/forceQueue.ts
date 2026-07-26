import { pgTable, text, real, integer, bigint, pgEnum } from "drizzle-orm/pg-core";

export const forceQueueStatusEnum = pgEnum("force_queue_status", ["PENDING", "TAKEN"]);
export const forceQueueDirectionEnum = pgEnum("force_queue_direction", ["BUY", "SELL"]);

// Persisted force-queue — survives server restarts and works across dev/prod
export const forceQueueTable = pgTable("force_queue", {
  id:         text("id").primaryKey(),
  signalId:   text("signal_id").notNull(),
  lotSize:    real("lot_size").notNull().default(0.01),
  pair:       text("pair").notNull(),
  direction:  forceQueueDirectionEnum("direction").notNull(),
  entry:      real("entry").notNull().default(0),
  sl:         real("sl").notNull().default(0),
  tp:         real("tp").notNull().default(0),
  confidence: integer("confidence").notNull().default(0),
  timeframe:  text("timeframe").notNull().default("H1"),
  createdAt:  bigint("created_at", { mode: "number" }).notNull(),
  status:     forceQueueStatusEnum("status").notNull().default("PENDING"),
});

export type ForceQueueRow = typeof forceQueueTable.$inferSelect;

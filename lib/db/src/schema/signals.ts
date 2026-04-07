import { pgTable, serial, text, real, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalTypeEnum = pgEnum("signal_type", ["BUY", "SELL"]);
export const structureTypeEnum = pgEnum("structure_type", ["BOS", "CHOCH", "NONE"]);
export const trendEnum = pgEnum("trend", ["BULLISH", "BEARISH", "NEUTRAL"]);
export const signalStatusEnum = pgEnum("signal_status", ["ACTIVE", "HIT_TP", "HIT_SL", "EXPIRED"]);

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  signal: signalTypeEnum("signal").notNull(),
  timeframe: text("timeframe").notNull(),
  entry: real("entry").notNull(),
  stopLoss: real("stop_loss").notNull(),
  takeProfit: real("take_profit").notNull(),
  confidenceScore: integer("confidence_score").notNull(),
  reasons: text("reasons").array().notNull(),
  structureType: structureTypeEnum("structure_type").notNull(),
  trend: trendEnum("trend").notNull(),
  hasOrderBlock: boolean("has_order_block").notNull().default(false),
  hasSupportResistance: boolean("has_support_resistance").notNull().default(false),
  riskRewardRatio: real("risk_reward_ratio").notNull(),
  status: signalStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, createdAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;

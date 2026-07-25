import { pgTable, serial, text, real, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { signalTypeEnum } from "./signals";

export const mt5ExecutionStatusEnum = pgEnum("mt5_execution_status", [
  "approved",   // user confirmed in dashboard — waiting for EA pickup
  "picked_up",  // EA fetched it, attempting to open
  "executed",   // EA opened trade successfully
  "failed",     // EA tried but failed (requote, margin, etc.)
  "cancelled",  // user cancelled before EA picked it up
]);

export const mt5ExecutionsTable = pgTable("mt5_executions", {
  id:              serial("id").primaryKey(),
  pair:            text("pair").notNull(),
  signal:          signalTypeEnum("signal").notNull(),
  timeframe:       text("timeframe").notNull(),
  entry:           real("entry").notNull(),
  stopLoss:        real("stop_loss").notNull(),
  takeProfit:      real("take_profit").notNull(),
  riskPercent:     real("risk_percent").notNull().default(1.0),
  confidenceScore: integer("confidence_score").notNull(),
  riskRewardRatio: real("risk_reward_ratio").notNull(),
  status:          mt5ExecutionStatusEnum("status").notNull().default("approved"),
  // Filled in by the EA after execution
  eaTicket:        integer("ea_ticket"),
  eaLots:          real("ea_lots"),
  eaPrice:         real("ea_price"),
  eaError:         text("ea_error"),
  executedAt:      timestamp("executed_at"),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
});

export type MT5Execution = typeof mt5ExecutionsTable.$inferSelect;
export type InsertMT5Execution = typeof mt5ExecutionsTable.$inferInsert;

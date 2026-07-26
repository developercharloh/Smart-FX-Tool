import { pgTable, real, integer, timestamp } from "drizzle-orm/pg-core";

export const eaSettingsTable = pgTable("ea_settings", {
  id:                integer("id").primaryKey().default(1),
  dailyProfitTarget: real("daily_profit_target").notNull().default(0),
  dailyLossLimit:    real("daily_loss_limit").notNull().default(0),
  lotSize:           real("lot_size").notNull().default(0.01),
  minConfidence:     integer("min_confidence").notNull().default(80),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

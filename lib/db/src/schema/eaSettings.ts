import { pgTable, real, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const eaSettingsTable = pgTable("ea_settings", {
  id:                integer("id").primaryKey().default(1),
  dailyProfitTarget: real("daily_profit_target").notNull().default(0),
  dailyLossLimit:    real("daily_loss_limit").notNull().default(0),
  lotSize:           real("lot_size").notNull().default(0.01),
  minConfidence:     integer("min_confidence").notNull().default(80),
  minProfitClose:    real("min_profit_close").notNull().default(0),
  // ── Real-money production controls ──────────────────────────────────────────
  halted:            boolean("halted").notNull().default(false),
  riskPercent:       real("risk_percent").notNull().default(1.0),   // % of balance risked per trade
  maxOpenTrades:     integer("max_open_trades").notNull().default(3),
  maxSpreadPips:     real("max_spread_pips").notNull().default(3.0),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

export type EASettings = typeof eaSettingsTable.$inferSelect;

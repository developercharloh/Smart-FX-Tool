/**
 * Persistent EA trade journal — survives server restarts.
 * EA reports open/close events via POST /api/ea/trade.
 */
import { pgTable, text, real, integer, bigint } from "drizzle-orm/pg-core";

export const eaTradesTable = pgTable("ea_trades", {
  id:         text("id").primaryKey(),           // "{ticket}-{openedAt}"
  ticket:     text("ticket").notNull(),
  login:      text("login").notNull().default(""),
  symbol:     text("symbol").notNull(),
  direction:  text("direction").notNull(),        // "BUY" | "SELL"
  lots:       real("lots").notNull().default(0.01),
  openPrice:  real("open_price").notNull().default(0),
  closePrice: real("close_price"),
  sl:         real("sl").notNull().default(0),
  tp:         real("tp").notNull().default(0),
  signalId:   text("signal_id").notNull().default(""),
  confidence: integer("confidence").notNull().default(0),
  timeframe:  text("timeframe").notNull().default(""),
  profit:     real("profit"),
  status:     text("status").notNull().default("OPEN"),  // "OPEN" | "CLOSED"
  openedAt:   bigint("opened_at", { mode: "number" }).notNull(),
  closedAt:   bigint("closed_at", { mode: "number" }),
});

export type EATrade = typeof eaTradesTable.$inferSelect;

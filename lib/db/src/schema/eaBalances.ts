import { pgTable, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const accountTypeEnum = pgEnum("account_type", ["real", "demo"]);

// One row per MT5 login — upserted on every EA balance report
export const eaBalancesTable = pgTable("ea_balances", {
  login:       text("login").primaryKey(),
  balance:     real("balance").notNull().default(0),
  equity:      real("equity").notNull().default(0),
  currency:    text("currency").notNull().default("USD"),
  server:      text("server").notNull().default(""),
  accountType: accountTypeEnum("account_type").notNull().default("demo"),
  reportedAt:  timestamp("reported_at").defaultNow().notNull(),
});

export type EABalance = typeof eaBalancesTable.$inferSelect;

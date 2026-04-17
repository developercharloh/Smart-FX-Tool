import { pgTable, serial, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const planTypeEnum = pgEnum("plan_type", ["monthly", "quarterly", "yearly", "lifetime"]);

export const accessKeysTable = pgTable("access_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  plan: planTypeEnum("plan").notNull(),
  label: text("label"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AccessKey = typeof accessKeysTable.$inferSelect;

import { defineConfig } from "drizzle-kit";
import path from "path";

const url = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set NEON_DATABASE_URL or DATABASE_URL before running migrations");

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: { url },
});

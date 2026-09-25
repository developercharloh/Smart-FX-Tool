import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.NEON_DATABASE_URL) {
  throw new Error("NEON_DATABASE_URL must be set to connect to the external Neon database.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL,
  },
});

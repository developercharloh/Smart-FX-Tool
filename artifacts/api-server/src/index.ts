import app from "./app";
import { logger } from "./lib/logger";
import { startAutoScanner, startPriceMonitor } from "./routes/signals";
import { pool } from "@workspace/db";

/** Ensure all required tables and columns exist — safe to re-run on every startup */
async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS signals (
        id             SERIAL PRIMARY KEY,
        pair           TEXT NOT NULL,
        signal         TEXT NOT NULL,
        timeframe      TEXT NOT NULL,
        entry          REAL NOT NULL,
        stop_loss      REAL NOT NULL,
        take_profit    REAL NOT NULL,
        confidence_score INTEGER NOT NULL,
        reasons        TEXT[] NOT NULL,
        structure_type TEXT NOT NULL DEFAULT 'NONE',
        trend          TEXT NOT NULL DEFAULT 'BULLISH',
        has_order_block BOOLEAN NOT NULL DEFAULT FALSE,
        has_support_resistance BOOLEAN NOT NULL DEFAULT FALSE,
        risk_reward_ratio REAL NOT NULL DEFAULT 0,
        status         TEXT NOT NULL DEFAULT 'PENDING',
        created_at     TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Add PENDING to signal_status enum if it exists as a type
      DO $$ BEGIN
        ALTER TYPE signal_status ADD VALUE IF NOT EXISTS 'PENDING';
      EXCEPTION WHEN undefined_object THEN NULL;
               WHEN duplicate_object  THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS ea_balances (
        login          TEXT PRIMARY KEY,
        balance        REAL NOT NULL DEFAULT 0,
        equity         REAL NOT NULL DEFAULT 0,
        currency       TEXT NOT NULL DEFAULT 'USD',
        server         TEXT NOT NULL DEFAULT '',
        account_type   TEXT NOT NULL DEFAULT 'demo',
        reported_at    TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS access_keys (
        id             SERIAL PRIMARY KEY,
        key            TEXT NOT NULL UNIQUE,
        label          TEXT,
        created_at     TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS force_queue (
        id             TEXT PRIMARY KEY,
        pair           TEXT NOT NULL,
        direction      TEXT NOT NULL,
        lot_size       REAL NOT NULL DEFAULT 0.01,
        sl             REAL NOT NULL DEFAULT 0,
        tp             REAL NOT NULL DEFAULT 0,
        signal_id      TEXT NOT NULL DEFAULT '',
        confidence     INTEGER NOT NULL DEFAULT 0,
        timeframe      TEXT NOT NULL DEFAULT 'H1',
        status         TEXT NOT NULL DEFAULT 'PENDING',
        created_at     TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ea_settings (
        id                   INTEGER PRIMARY KEY DEFAULT 1,
        daily_profit_target  REAL NOT NULL DEFAULT 0,
        daily_loss_limit     REAL NOT NULL DEFAULT 0,
        lot_size             REAL NOT NULL DEFAULT 0.01,
        min_confidence       INTEGER NOT NULL DEFAULT 80,
        min_profit_close     REAL NOT NULL DEFAULT 0,
        halted               BOOLEAN NOT NULL DEFAULT FALSE,
        risk_percent         REAL NOT NULL DEFAULT 1.0,
        max_open_trades      INTEGER NOT NULL DEFAULT 3,
        max_spread_pips      REAL NOT NULL DEFAULT 3.0,
        updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
      );

      -- Add new columns to ea_settings if missing (safe on existing tables)
      ALTER TABLE ea_settings ADD COLUMN IF NOT EXISTS halted           BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE ea_settings ADD COLUMN IF NOT EXISTS risk_percent     REAL NOT NULL DEFAULT 1.0;
      ALTER TABLE ea_settings ADD COLUMN IF NOT EXISTS max_open_trades  INTEGER NOT NULL DEFAULT 3;
      ALTER TABLE ea_settings ADD COLUMN IF NOT EXISTS max_spread_pips  REAL NOT NULL DEFAULT 3.0;

      -- Persistent EA trade journal (survives server restarts)
      CREATE TABLE IF NOT EXISTS ea_trades (
        id          TEXT PRIMARY KEY,
        ticket      TEXT NOT NULL,
        login       TEXT NOT NULL DEFAULT '',
        symbol      TEXT NOT NULL,
        direction   TEXT NOT NULL,
        lots        REAL NOT NULL DEFAULT 0.01,
        open_price  REAL NOT NULL DEFAULT 0,
        close_price REAL,
        sl          REAL NOT NULL DEFAULT 0,
        tp          REAL NOT NULL DEFAULT 0,
        signal_id   TEXT NOT NULL DEFAULT '',
        confidence  INTEGER NOT NULL DEFAULT 0,
        timeframe   TEXT NOT NULL DEFAULT '',
        profit      REAL,
        status      TEXT NOT NULL DEFAULT 'OPEN',
        opened_at   BIGINT NOT NULL,
        closed_at   BIGINT
      );
    `);
    logger.info("Schema ensured");
  } catch (err) {
    logger.warn({ err }, "Schema ensure warning (non-fatal)");
  } finally {
    client.release();
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

ensureSchema().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startAutoScanner();
    startPriceMonitor();
  });
});

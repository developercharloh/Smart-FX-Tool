/**
 * Serverless entry point — compiled by esbuild into api/index.js.
 * Exports Express app (no app.listen). Starts the auto-scanner on cold start.
 */
import app from "./app.js";
import { startAutoScanner } from "./routes/signals.js";

startAutoScanner();

export default app;

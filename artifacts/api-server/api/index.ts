/**
 * Vercel serverless entry point.
 * Exports the Express app — Vercel injects its own HTTP server (no app.listen needed).
 * startAutoScanner() is called once per function instance (not per request).
 * EA polls every 10 s, keeping the instance warm so the 2-min setInterval keeps firing.
 */
import app from "../src/app.js";
import { startAutoScanner } from "../src/routes/signals.js";

// Start scanner once on cold start — interval keeps running while instance is warm
startAutoScanner();

export default app;

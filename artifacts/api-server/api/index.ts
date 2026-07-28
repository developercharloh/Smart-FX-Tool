/**
 * Vercel serverless entry point.
 * Exports the Express app — Vercel injects its own HTTP server (no app.listen needed).
 */
import app from "../src/app.js";
export default app;

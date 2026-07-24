import { Router } from "express";

const router = Router();

const FOREX_PAIRS = [
  // Forex Majors
  { symbol: "EURUSD", base: "EUR", quote: "USD", pip: 0.0001, decimals: 5 },
  { symbol: "GBPUSD", base: "GBP", quote: "USD", pip: 0.0001, decimals: 5 },
  { symbol: "USDJPY", base: "USD", quote: "JPY", pip: 0.01, decimals: 3 },
  { symbol: "AUDUSD", base: "AUD", quote: "USD", pip: 0.0001, decimals: 5 },
  { symbol: "USDCAD", base: "USD", quote: "CAD", pip: 0.0001, decimals: 5 },
  { symbol: "NZDUSD", base: "NZD", quote: "USD", pip: 0.0001, decimals: 5 },
  { symbol: "USDCHF", base: "USD", quote: "CHF", pip: 0.0001, decimals: 5 },
  // Commodities
  { symbol: "XAUUSD", base: "XAU", quote: "USD", pip: 0.01, decimals: 2 },
  // Forex Crosses
  { symbol: "GBPJPY", base: "GBP", quote: "JPY", pip: 0.01, decimals: 3 },
  { symbol: "EURJPY", base: "EUR", quote: "JPY", pip: 0.01, decimals: 3 },
  { symbol: "EURGBP", base: "EUR", quote: "GBP", pip: 0.0001, decimals: 5 },
  { symbol: "EURCHF", base: "EUR", quote: "CHF", pip: 0.0001, decimals: 5 },
  { symbol: "EURCAD", base: "EUR", quote: "CAD", pip: 0.0001, decimals: 5 },
  { symbol: "GBPCAD", base: "GBP", quote: "CAD", pip: 0.0001, decimals: 5 },
  { symbol: "AUDCAD", base: "AUD", quote: "CAD", pip: 0.0001, decimals: 5 },
  { symbol: "CADJPY", base: "CAD", quote: "JPY", pip: 0.01, decimals: 3 },
  // Deriv Volatility Indices (Continuous)
  { symbol: "R_10", base: "VOL10", quote: "IDX", pip: 0.01, decimals: 3 },
  { symbol: "R_25", base: "VOL25", quote: "IDX", pip: 0.01, decimals: 3 },
  { symbol: "R_50", base: "VOL50", quote: "IDX", pip: 0.01, decimals: 3 },
  { symbol: "R_75", base: "VOL75", quote: "IDX", pip: 0.01, decimals: 3 },
  { symbol: "R_100", base: "VOL100", quote: "IDX", pip: 0.01, decimals: 3 },
  // Deriv Volatility Indices (1s)
  { symbol: "1HZ10V", base: "VOL10-1S", quote: "IDX", pip: 0.01, decimals: 3 },
  { symbol: "1HZ25V", base: "VOL25-1S", quote: "IDX", pip: 0.01, decimals: 3 },
  { symbol: "1HZ50V", base: "VOL50-1S", quote: "IDX", pip: 0.01, decimals: 3 },
  { symbol: "1HZ75V", base: "VOL75-1S", quote: "IDX", pip: 0.01, decimals: 3 },
  { symbol: "1HZ100V", base: "VOL100-1S", quote: "IDX", pip: 0.01, decimals: 3 },
  // Deriv Boom & Crash
  { symbol: "BOOM300", base: "BOOM300", quote: "IDX", pip: 0.01, decimals: 2 },
  { symbol: "BOOM500", base: "BOOM500", quote: "IDX", pip: 0.01, decimals: 2 },
  { symbol: "BOOM1000", base: "BOOM1000", quote: "IDX", pip: 0.01, decimals: 2 },
  { symbol: "CRASH300", base: "CRASH300", quote: "IDX", pip: 0.01, decimals: 2 },
  { symbol: "CRASH500", base: "CRASH500", quote: "IDX", pip: 0.01, decimals: 2 },
  { symbol: "CRASH1000", base: "CRASH1000", quote: "IDX", pip: 0.01, decimals: 2 },
  // Deriv Jump Indices
  { symbol: "JD10", base: "JUMP10", quote: "IDX", pip: 0.01, decimals: 2 },
  { symbol: "JD25", base: "JUMP25", quote: "IDX", pip: 0.01, decimals: 2 },
  { symbol: "JD50", base: "JUMP50", quote: "IDX", pip: 0.01, decimals: 2 },
  { symbol: "JD75", base: "JUMP75", quote: "IDX", pip: 0.01, decimals: 2 },
  { symbol: "JD100", base: "JUMP100", quote: "IDX", pip: 0.01, decimals: 2 },
];

router.get("/", (req, res) => {
  res.json(FOREX_PAIRS);
});

export default router;

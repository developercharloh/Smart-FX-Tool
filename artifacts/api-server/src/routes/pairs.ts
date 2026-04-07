import { Router } from "express";

const router = Router();

const FOREX_PAIRS = [
  { symbol: "EURUSD", base: "EUR", quote: "USD", pip: 0.0001, decimals: 5 },
  { symbol: "GBPUSD", base: "GBP", quote: "USD", pip: 0.0001, decimals: 5 },
  { symbol: "USDJPY", base: "USD", quote: "JPY", pip: 0.01, decimals: 3 },
  { symbol: "AUDUSD", base: "AUD", quote: "USD", pip: 0.0001, decimals: 5 },
  { symbol: "USDCAD", base: "USD", quote: "CAD", pip: 0.0001, decimals: 5 },
  { symbol: "NZDUSD", base: "NZD", quote: "USD", pip: 0.0001, decimals: 5 },
  { symbol: "USDCHF", base: "USD", quote: "CHF", pip: 0.0001, decimals: 5 },
  { symbol: "GBPJPY", base: "GBP", quote: "JPY", pip: 0.01, decimals: 3 },
  { symbol: "EURJPY", base: "EUR", quote: "JPY", pip: 0.01, decimals: 3 },
  { symbol: "EURGBP", base: "EUR", quote: "GBP", pip: 0.0001, decimals: 5 },
  { symbol: "EURCHF", base: "EUR", quote: "CHF", pip: 0.0001, decimals: 5 },
  { symbol: "EURCAD", base: "EUR", quote: "CAD", pip: 0.0001, decimals: 5 },
  { symbol: "GBPCAD", base: "GBP", quote: "CAD", pip: 0.0001, decimals: 5 },
  { symbol: "AUDCAD", base: "AUD", quote: "CAD", pip: 0.0001, decimals: 5 },
  { symbol: "CADJPY", base: "CAD", quote: "JPY", pip: 0.01, decimals: 3 },
];

router.get("/", (req, res) => {
  res.json(FOREX_PAIRS);
});

export default router;

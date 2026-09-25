import { Router, type IRouter } from "express";
import {
  GetMarketAnalysisQueryParams,
  GetMarketAnalysisResponse,
  GetMarketScannerQueryParams,
  GetMarketScannerResponse,
} from "@workspace/api-zod";
import {
  getDetailedAnalysis,
  getScannerSnapshot,
} from "../lib/market-analysis";

const router: IRouter = Router();

router.get("/markets/scanner", async (req, res): Promise<void> => {
  const query = GetMarketScannerQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  try {
    const result = await getScannerSnapshot(query.data);
    if (result.skipped > 0) {
      req.log.warn(
        { skippedSymbols: result.skipped, market: result.market },
        "Some symbols could not be analyzed",
      );
    }
    res.json(GetMarketScannerResponse.parse(result));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Binance market data request failed";
    req.log.error({ err: error }, "Market scanner request failed");
    res.status(502).json({ error: message });
  }
});

router.get("/markets/analysis", async (req, res): Promise<void> => {
  const query = GetMarketAnalysisQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  try {
    const result = await getDetailedAnalysis(
      query.data.market,
      query.data.symbol,
      query.data.primaryTimeframe,
      query.data.confirmationTimeframe,
      query.data.trendTimeframe,
    );
    res.json(GetMarketAnalysisResponse.parse(result));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Binance market data request failed";
    req.log.error(
      { err: error, symbol: query.data.symbol, market: query.data.market },
      "Market analysis request failed",
    );
    const isUnsupportedSymbol =
      message.includes("not currently trading") || message.includes("no current ticker");
    res.status(isUnsupportedSymbol ? 400 : 502).json({ error: message });
  }
});

export default router;
import type { Candle, MarketType, Timeframe } from "@workspace/api-zod";

type ExchangeSymbol = {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  contractType?: string;
};

type ExchangeInfo = { symbols: ExchangeSymbol[] };
type RawTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  bidPrice?: string;
  askPrice?: string;
};
type RawOrderBook = { bids: [string, string][]; asks: [string, string][] };

type CacheEntry = { expiresAt: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const CACHE_TTLS = {
  exchangeInfo: 10 * 60_000,
  ticker: 12_000,
  candles: 10_000,
  orderBook: 3_000,
} as const;

const HOSTS: Record<MarketType, string> = {
  // Binance's Spot REST docs explicitly direct public-only market-data calls here.
  spot: "https://data-api.binance.vision",
  usdm: "https://fapi.binance.com",
};

const ENDPOINTS: Record<
  MarketType,
  { exchangeInfo: string; ticker: string; klines: string; depth: string }
> = {
  spot: {
    exchangeInfo: "/api/v3/exchangeInfo",
    ticker: "/api/v3/ticker/24hr",
    klines: "/api/v3/klines",
    depth: "/api/v3/depth",
  },
  usdm: {
    exchangeInfo: "/fapi/v1/exchangeInfo",
    ticker: "/fapi/v1/ticker/24hr",
    klines: "/fapi/v1/klines",
    depth: "/fapi/v1/depth",
  },
};

const intervals = new Set<Timeframe>([
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d",
]);

function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiresAt > now) return Promise.resolve(entry.value as T);

  const promise = load();
  cache.set(key, { expiresAt: now + ttl, value: promise });
  return promise
    .then((value) => {
      cache.set(key, { expiresAt: Date.now() + ttl, value });
      return value;
    })
    .catch((error: unknown) => {
      if (cache.get(key)?.value === promise) cache.delete(key);
      throw error;
    });
}

async function requestJson<T>(
  market: MarketType,
  path: string,
  params?: URLSearchParams,
): Promise<T> {
  const url = new URL(path, HOSTS[market]);
  if (params) url.search = params.toString();

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`Could not reach Binance public market data: ${message}`);
  }

  if (!response.ok) {
    if (response.status === 429 || response.status === 418) {
      const retryAfter = response.headers.get("retry-after");
      throw new Error(
        `Binance rate limit response (${response.status})${retryAfter ? `; retry after ${retryAfter}s` : ""}`,
      );
    }
    if (response.status === 451) {
      throw new Error(
        `Binance has restricted ${market === "usdm" ? "USDⓈ-M Futures" : "Spot"} public market-data access from this server's network location. No substitute or simulated data is shown.`,
      );
    }
    throw new Error(`Binance returned HTTP ${response.status} for ${path}`);
  }

  return (await response.json()) as T;
}

export async function getExchangeSymbols(market: MarketType): Promise<ExchangeSymbol[]> {
  const endpoint = ENDPOINTS[market].exchangeInfo;
  const info = await cached(`${market}:exchangeInfo`, CACHE_TTLS.exchangeInfo, () =>
    requestJson<ExchangeInfo>(market, endpoint),
  );

  return info.symbols.filter(
    (symbol) =>
      symbol.status === "TRADING" &&
      (market !== "usdm" || !symbol.contractType || symbol.contractType === "PERPETUAL"),
  );
}

export async function getAllDayTickers(market: MarketType): Promise<RawTicker[]> {
  return cached(`${market}:ticker24h`, CACHE_TTLS.ticker, () =>
    requestJson<RawTicker[]>(market, ENDPOINTS[market].ticker),
  );
}

export async function getKlines(
  market: MarketType,
  symbol: string,
  timeframe: Timeframe,
  limit = 200,
): Promise<Candle[]> {
  if (!intervals.has(timeframe)) throw new Error("Unsupported candlestick interval");
  const params = new URLSearchParams({
    symbol,
    interval: timeframe,
    limit: String(Math.min(500, Math.max(50, limit))),
  });

  const rows = await cached(
    `${market}:klines:${symbol}:${timeframe}:${params.get("limit")}`,
    CACHE_TTLS.candles,
    () => requestJson<unknown[][]>(market, ENDPOINTS[market].klines, params),
  );

  return rows.map((row) => ({
    openTime: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
    closeTime: Number(row[6]),
    quoteVolume: Number(row[7]),
    tradeCount: Number(row[8]),
  }));
}

export async function getOrderBook(
  market: MarketType,
  symbol: string,
): Promise<RawOrderBook> {
  const params = new URLSearchParams({ symbol, limit: "20" });
  return cached(`${market}:depth:${symbol}`, CACHE_TTLS.orderBook, () =>
    requestJson<RawOrderBook>(market, ENDPOINTS[market].depth, params),
  );
}

export function parsePositive(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getSpreadPercent(ticker: RawTicker): number | null {
  const bid = parsePositive(ticker.bidPrice);
  const ask = parsePositive(ticker.askPrice);
  if (bid <= 0 || ask <= 0 || ask < bid) return null;
  return ((ask - bid) / ((ask + bid) / 2)) * 100;
}

export function getTickerIndex(
  tickers: RawTicker[],
): Map<string, RawTicker> {
  return new Map(tickers.map((ticker) => [ticker.symbol, ticker]));
}

export type PublicTicker = RawTicker;
export type BinanceOrderBook = RawOrderBook;
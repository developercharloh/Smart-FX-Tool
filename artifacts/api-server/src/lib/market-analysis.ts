import type {
  Candle,
  ConfidenceLabel,
  DivergenceAnalysis,
  IndicatorSet,
  MarketType,
  OrderBookAnalysis,
  ScannerItem,
  StructureAnalysis,
  Timeframe,
  Trend,
} from "@workspace/api-zod";
import {
  getAllDayTickers,
  getExchangeSymbols,
  getKlines,
  getOrderBook,
  getSpreadPercent,
  getTickerIndex,
  parsePositive,
  type BinanceOrderBook,
  type PublicTicker,
} from "./binance-market";

type MarketOptions = {
  market: MarketType;
  primaryTimeframe: Timeframe;
  confirmationTimeframe: Timeframe;
  trendTimeframe: Timeframe;
};

type BaseAnalysis = {
  indicators: IndicatorSet;
  structure: StructureAnalysis;
  divergence: DivergenceAnalysis;
  macdState: Trend;
  bullishScore: number;
  bearishScore: number;
  bullishFactors: string[];
  bearishFactors: string[];
  latestClose: number;
};

type Swing = { index: number; value: number };
type ScoreResult = {
  bullishScore: number;
  bearishScore: number;
  bullishFactors: string[];
  bearishFactors: string[];
};

function finite(value: number | undefined): number | null {
  return value !== undefined && Number.isFinite(value) ? value : null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function emaSeries(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);
  if (values.length < period) return result;
  const seed = mean(values.slice(0, period));
  if (seed === null) return result;
  const multiplier = 2 / (period + 1);
  result[period - 1] = seed;
  let previous = seed;
  for (let index = period; index < values.length; index += 1) {
    previous = (values[index] - previous) * multiplier + previous;
    result[index] = previous;
  }
  return result;
}

function rsiSeries(values: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null);
  if (values.length <= period) return result;

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  result[period] =
    averageLoss === 0
      ? 100
      : 100 - 100 / (1 + averageGain / averageLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    averageGain =
      (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss =
      (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    result[index] =
      averageLoss === 0
        ? 100
        : 100 - 100 / (1 + averageGain / averageLoss);
  }
  return result;
}

function macdSeries(values: number[]): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const fast = emaSeries(values, 12);
  const slow = emaSeries(values, 26);
  const macd = values.map((_, index) =>
    fast[index] !== null && slow[index] !== null
      ? fast[index]! - slow[index]!
      : null,
  );
  const compactMacd = macd.flatMap((value, index) =>
    value === null ? [] : [{ index, value }],
  );
  const signalValues = emaSeries(
    compactMacd.map((entry) => entry.value),
    9,
  );
  const signal: (number | null)[] = Array(values.length).fill(null);
  signalValues.forEach((value, index) => {
    const sourceIndex = compactMacd[index]?.index;
    if (sourceIndex !== undefined) signal[sourceIndex] = value;
  });
  const histogram = macd.map((value, index) =>
    value !== null && signal[index] !== null ? value - signal[index]! : null,
  );
  return { macd, signal, histogram };
}

function stochasticRsiSeries(values: number[], period = 14): (number | null)[] {
  const rsi = rsiSeries(values, period);
  const result: (number | null)[] = Array(values.length).fill(null);
  for (let index = period * 2; index < values.length; index += 1) {
    const window = rsi
      .slice(index - period + 1, index + 1)
      .filter((value): value is number => value !== null);
    if (window.length < period || rsi[index] === null) continue;
    const low = Math.min(...window);
    const high = Math.max(...window);
    result[index] = high === low ? 50 : ((rsi[index]! - low) / (high - low)) * 100;
  }
  return result;
}

function pivots(
  values: number[],
  kind: "high" | "low",
  left = 2,
  right = 2,
): Swing[] {
  const result: Swing[] = [];
  for (let index = left; index < values.length - right; index += 1) {
    let isPivot = true;
    for (let offset = 1; offset <= left; offset += 1) {
      if (
        kind === "low"
          ? values[index] > values[index - offset]
          : values[index] < values[index - offset]
      ) {
        isPivot = false;
        break;
      }
    }
    if (!isPivot) continue;
    for (let offset = 1; offset <= right; offset += 1) {
      if (
        kind === "low"
          ? values[index] > values[index + offset]
          : values[index] < values[index + offset]
      ) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) result.push({ index, value: values[index] });
  }
  return result;
}

function calculateAdx(candles: Candle[], period = 14): number | null {
  if (candles.length < period * 2 + 1) return null;
  const dxValues: number[] = [];
  for (let index = candles.length - period * 2; index < candles.length; index += 1) {
    const current = candles[index];
    const previous = candles[index - 1];
    const trueRange = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close),
    );
    const up = current.high - previous.high;
    const down = previous.low - current.low;
    const plusDm = up > down && up > 0 ? up : 0;
    const minusDm = down > up && down > 0 ? down : 0;
    let trSum = 0;
    let plusSum = 0;
    let minusSum = 0;
    for (
      let cursor = Math.max(1, index - period + 1);
      cursor <= index;
      cursor += 1
    ) {
      const candle = candles[cursor];
      const before = candles[cursor - 1];
      trSum += Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - before.close),
        Math.abs(candle.low - before.close),
      );
      const upMove = candle.high - before.high;
      const downMove = before.low - candle.low;
      plusSum += upMove > downMove && upMove > 0 ? upMove : 0;
      minusSum += downMove > upMove && downMove > 0 ? downMove : 0;
    }
    if (trSum <= 0) continue;
    const plusDi = (plusSum / trSum) * 100;
    const minusDi = (minusSum / trSum) * 100;
    const denominator = plusDi + minusDi;
    if (denominator > 0) {
      dxValues.push((Math.abs(plusDi - minusDi) / denominator) * 100);
    }
  }
  return finite(mean(dxValues.slice(-period)) ?? undefined);
}

function calculateObv(candles: Candle[]): number[] {
  const output = Array<number>(candles.length).fill(0);
  for (let index = 1; index < candles.length; index += 1) {
    const previous = candles[index - 1].close;
    const current = candles[index].close;
    output[index] =
      output[index - 1] +
      (current > previous ? candles[index].volume : current < previous ? -candles[index].volume : 0);
  }
  return output;
}

function divergenceSignals(
  candles: Candle[],
  oscillatorValues: (number | null)[],
  indicatorName: string,
  minimumDifference: number,
): { bullish: boolean; bearish: boolean } {
  const lows = pivots(candles.map((candle) => candle.low), "low").slice(-2);
  const highs = pivots(candles.map((candle) => candle.high), "high").slice(-2);
  const validValue = (index: number): number | null => {
    const value = oscillatorValues[index];
    return value !== null && Number.isFinite(value) ? value : null;
  };
  const [priorLow, lastLow] = lows;
  const [priorHigh, lastHigh] = highs;
  const priorLowIndicator = priorLow ? validValue(priorLow.index) : null;
  const lastLowIndicator = lastLow ? validValue(lastLow.index) : null;
  const priorHighIndicator = priorHigh ? validValue(priorHigh.index) : null;
  const lastHighIndicator = lastHigh ? validValue(lastHigh.index) : null;
  const scale = Math.max(
    Math.abs(priorLowIndicator ?? 0),
    Math.abs(lastLowIndicator ?? 0),
    Math.abs(priorHighIndicator ?? 0),
    Math.abs(lastHighIndicator ?? 0),
    1,
  );
  const threshold =
    indicatorName === "OBV"
      ? scale * 0.03
      : indicatorName === "MACD"
        ? scale * 0.05
        : minimumDifference;

  return {
    bullish:
      priorLow !== undefined &&
      lastLow !== undefined &&
      priorLowIndicator !== null &&
      lastLowIndicator !== null &&
      lastLow.value < priorLow.value * 0.995 &&
      lastLowIndicator > priorLowIndicator + threshold,
    bearish:
      priorHigh !== undefined &&
      lastHigh !== undefined &&
      priorHighIndicator !== null &&
      lastHighIndicator !== null &&
      lastHigh.value > priorHigh.value * 1.005 &&
      lastHighIndicator < priorHighIndicator - threshold,
  };
}

function structureAnalysis(candles: Candle[]): StructureAnalysis {
  const highs = pivots(candles.map((candle) => candle.high), "high").slice(-6);
  const lows = pivots(candles.map((candle) => candle.low), "low").slice(-6);
  const higherHighs = highs.slice(1).filter(
    (swing, index) => swing.value > highs[index].value * 1.001,
  ).length;
  const lowerHighs = highs.slice(1).filter(
    (swing, index) => swing.value < highs[index].value * 0.999,
  ).length;
  const higherLows = lows.slice(1).filter(
    (swing, index) => swing.value > lows[index].value * 1.001,
  ).length;
  const lowerLows = lows.slice(1).filter(
    (swing, index) => swing.value < lows[index].value * 0.999,
  ).length;
  const last = candles.at(-1);
  const latestHigh = highs.at(-1);
  const previousHigh = highs.at(-2);
  const latestLow = lows.at(-1);
  const previousLow = lows.at(-2);
  const bullishBreak =
    last !== undefined &&
    previousHigh !== undefined &&
    last.close > previousHigh.value;
  const bearishBreak =
    last !== undefined &&
    previousLow !== undefined &&
    last.close < previousLow.value;
  const bullishStructure =
    higherHighs >= 1 && higherLows >= 1 && higherHighs + higherLows > lowerHighs + lowerLows;
  const bearishStructure =
    lowerHighs >= 1 && lowerLows >= 1 && lowerHighs + lowerLows > higherHighs + higherLows;
  const trend: Trend =
    bullishStructure || bullishBreak
      ? "BULLISH"
      : bearishStructure || bearishBreak
        ? "BEARISH"
        : "NEUTRAL";

  return {
    trend,
    support: finite(latestLow?.value),
    resistance: finite(latestHigh?.value),
    higherHighs,
    higherLows,
    lowerHighs,
    lowerLows,
    breakOfStructure: bullishBreak || bearishBreak,
  };
}

function calculateIndicators(candles: Candle[]): {
  indicators: IndicatorSet;
  rsiValues: (number | null)[];
  macdValues: (number | null)[];
  stochValues: (number | null)[];
  obvValues: number[];
} {
  const closes = candles.map((candle) => candle.close);
  const latest = candles.length - 1;
  const rsiValues = rsiSeries(closes);
  const emas = [9, 20, 50, 100, 200].map((period) =>
    emaSeries(closes, period),
  );
  const macd = macdSeries(closes);
  const stochValues = stochasticRsiSeries(closes);
  const obvValues = calculateObv(candles);
  const latestCandles = candles.slice(-20);
  const middle = mean(latestCandles.map((candle) => candle.close));
  const standardDeviation =
    middle === null
      ? null
      : Math.sqrt(
          mean(latestCandles.map((candle) => (candle.close - middle) ** 2)) ?? 0,
        );
  const trueRanges = candles.slice(-15).map((candle, index, rows) => {
    const previous = candles[Math.max(0, candles.length - rows.length + index - 1)];
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previous.close),
      Math.abs(candle.low - previous.close),
    );
  });
  const volumeAverage = mean(candles.slice(-21, -1).map((candle) => candle.volume));
  const latestVolume = candles.at(-1)?.volume ?? 0;
  const typicalVolume = candles
    .slice(-30)
    .reduce((sum, candle) => sum + candle.volume, 0);
  const vwapDenominator = typicalVolume;
  const vwap =
    vwapDenominator > 0
      ? candles
          .slice(-30)
          .reduce(
            (sum, candle) =>
              sum +
              ((candle.high + candle.low + candle.close) / 3) * candle.volume,
            0,
          ) / vwapDenominator
      : null;
  const lastClose = closes.at(-1);
  const previousClose = closes.at(-2);
  const macdLine = macd.macd[latest];
  const macdSignal = macd.signal[latest];
  const macdHistogram = macd.histogram[latest];

  return {
    indicators: {
      rsi: finite(rsiValues[latest] ?? undefined),
      ema9: finite(emas[0][latest] ?? undefined),
      ema20: finite(emas[1][latest] ?? undefined),
      ema50: finite(emas[2][latest] ?? undefined),
      ema100: finite(emas[3][latest] ?? undefined),
      ema200: finite(emas[4][latest] ?? undefined),
      macd: finite(macdLine ?? undefined),
      macdSignal: finite(macdSignal ?? undefined),
      macdHistogram: finite(macdHistogram ?? undefined),
      atr: finite(mean(trueRanges) ?? undefined),
      vwap: finite(vwap ?? undefined),
      bollingerUpper:
        middle !== null && standardDeviation !== null
          ? middle + 2 * standardDeviation
          : null,
      bollingerMiddle: finite(middle ?? undefined),
      bollingerLower:
        middle !== null && standardDeviation !== null
          ? middle - 2 * standardDeviation
          : null,
      adx: calculateAdx(candles),
      obv: obvValues.at(-1) ?? 0,
      volumeAverage: finite(volumeAverage ?? undefined),
      relativeVolume:
        volumeAverage !== null && volumeAverage > 0
          ? latestVolume / volumeAverage
          : 0,
      momentum:
        lastClose !== undefined && previousClose !== undefined
          ? lastClose - previousClose
          : null,
      rateOfChange:
        lastClose !== undefined && closes.length >= 11 && closes.at(-11)! !== 0
          ? ((lastClose - closes.at(-11)!) / closes.at(-11)!) * 100
          : null,
      stochasticRsi: finite(stochValues[latest] ?? undefined),
    },
    rsiValues,
    macdValues: macd.histogram,
    stochValues,
    obvValues,
  };
}

function analyzeBase(candles: Candle[]): BaseAnalysis {
  if (candles.length < 30) {
    throw new Error("Binance returned too few completed candles for reliable analysis");
  }
  const { indicators, rsiValues, macdValues, stochValues, obvValues } =
    calculateIndicators(candles);
  const structure = structureAnalysis(candles);
  const rsiDivergence = divergenceSignals(candles, rsiValues, "RSI", 3);
  const macdDivergence = divergenceSignals(candles, macdValues, "MACD", 0);
  const stochDivergence = divergenceSignals(candles, stochValues, "Stochastic RSI", 3);
  const obvDivergence = divergenceSignals(candles, obvValues, "OBV", 0);
  const bullishIndicators = [
    ...(rsiDivergence.bullish ? ["RSI"] : []),
    ...(macdDivergence.bullish ? ["MACD"] : []),
    ...(stochDivergence.bullish ? ["Stochastic RSI"] : []),
    ...(obvDivergence.bullish ? ["OBV"] : []),
  ];
  const bearishIndicators = [
    ...(rsiDivergence.bearish ? ["RSI"] : []),
    ...(macdDivergence.bearish ? ["MACD"] : []),
    ...(stochDivergence.bearish ? ["Stochastic RSI"] : []),
    ...(obvDivergence.bearish ? ["OBV"] : []),
  ];
  const lastClose = candles.at(-1)?.close ?? 0;
  const previousClose = candles.at(-2)?.close ?? lastClose;
  const previousHistogram = macdValues.at(-2) ?? null;
  const latestHistogram = macdValues.at(-1) ?? null;
  const rsi = indicators.rsi;
  const stoch = indicators.stochasticRsi;
  const relativeVolume = indicators.relativeVolume;
  const bullishFactors: string[] = [];
  const bearishFactors: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  if (rsi !== null && rsi < 35) {
    bullishScore += 8;
    bullishFactors.push(`RSI is oversold at ${rsi.toFixed(1)}`);
  }
  if (rsi !== null && rsi > 65) {
    bearishScore += 8;
    bearishFactors.push(`RSI is elevated at ${rsi.toFixed(1)}`);
  }
  if (bullishIndicators.length > 0) {
    bullishScore += Math.min(12, bullishIndicators.length * 6);
    bullishFactors.push(`Bullish divergence: ${bullishIndicators.join(", ")}`);
  }
  if (bearishIndicators.length > 0) {
    bearishScore += Math.min(12, bearishIndicators.length * 6);
    bearishFactors.push(`Bearish divergence: ${bearishIndicators.join(", ")}`);
  }
  if (
    stoch !== null &&
    stoch < 25 &&
    stochValues.at(-1) !== null &&
    (stochValues.at(-2) ?? 0) < stoch
  ) {
    bullishScore += 5;
    bullishFactors.push("Stochastic RSI turned up from a low range");
  }
  if (
    stoch !== null &&
    stoch > 75 &&
    stochValues.at(-1) !== null &&
    (stochValues.at(-2) ?? 100) > stoch
  ) {
    bearishScore += 5;
    bearishFactors.push("Stochastic RSI turned down from a high range");
  }
  if (
    latestHistogram !== null &&
    previousHistogram !== null &&
    latestHistogram > previousHistogram
  ) {
    bullishScore += 5;
    bullishFactors.push("MACD histogram is improving");
  }
  if (
    latestHistogram !== null &&
    previousHistogram !== null &&
    latestHistogram < previousHistogram
  ) {
    bearishScore += 5;
    bearishFactors.push("MACD histogram is weakening");
  }
  if (
    indicators.ema20 !== null &&
    lastClose > indicators.ema20 &&
    previousClose <= indicators.ema20
  ) {
    bullishScore += 6;
    bullishFactors.push("Price reclaimed EMA 20");
  }
  if (
    indicators.ema20 !== null &&
    lastClose < indicators.ema20 &&
    previousClose >= indicators.ema20
  ) {
    bearishScore += 6;
    bearishFactors.push("Price lost EMA 20");
  }
  if (structure.higherLows > 0) {
    bullishScore += 6;
    bullishFactors.push("A higher-low structure is present");
  }
  if (structure.lowerHighs > 0) {
    bearishScore += 6;
    bearishFactors.push("A lower-high structure is present");
  }
  if (
    structure.trend === "BULLISH" &&
    structure.breakOfStructure
  ) {
    bullishScore += 12;
    bullishFactors.push("Bullish break of structure");
  }
  if (
    structure.trend === "BEARISH" &&
    structure.breakOfStructure
  ) {
    bearishScore += 12;
    bearishFactors.push("Bearish break of structure");
  }
  const latestCandle = candles.at(-1);
  if (relativeVolume >= 1.2 && latestCandle && latestCandle.close > latestCandle.open) {
    bullishScore += 10;
    bullishFactors.push(`Buying volume expanded to ${relativeVolume.toFixed(2)}× average`);
  }
  if (relativeVolume >= 1.2 && latestCandle && latestCandle.close < latestCandle.open) {
    bearishScore += 10;
    bearishFactors.push(`Selling volume expanded to ${relativeVolume.toFixed(2)}× average`);
  }
  if (
    latestHistogram !== null &&
    latestHistogram > 0 &&
    (indicators.momentum ?? 0) > 0
  ) {
    bullishScore += 6;
    bullishFactors.push("Positive MACD and short-term momentum");
  }
  if (
    latestHistogram !== null &&
    latestHistogram < 0 &&
    (indicators.momentum ?? 0) < 0
  ) {
    bearishScore += 6;
    bearishFactors.push("Negative MACD and short-term momentum");
  }

  return {
    indicators,
    structure,
    divergence: {
      bullish: bullishIndicators.length > 0,
      bearish: bearishIndicators.length > 0,
      indicators: [...bullishIndicators.map((name) => `Bullish ${name}`), ...bearishIndicators.map((name) => `Bearish ${name}`)],
    },
    macdState:
      (indicators.macdHistogram ?? 0) > 0
        ? "BULLISH"
        : (indicators.macdHistogram ?? 0) < 0
          ? "BEARISH"
          : "NEUTRAL",
    bullishScore,
    bearishScore,
    bullishFactors,
    bearishFactors,
    latestClose: lastClose,
  };
}

function confidenceFor(score: number): ConfidenceLabel {
  if (score >= 90) return "EXTREME CONFLUENCE";
  if (score >= 75) return "STRONG";
  if (score >= 60) return "DEVELOPING";
  if (score >= 40) return "WEAK";
  return "NO SIGNAL";
}

function assembleScore(
  primary: BaseAnalysis,
  confirmation: BaseAnalysis,
  trend: BaseAnalysis,
): ScoreResult {
  let bullishScore = primary.bullishScore;
  let bearishScore = primary.bearishScore;
  const bullishFactors = [...primary.bullishFactors];
  const bearishFactors = [...primary.bearishFactors];
  if (confirmation.structure.trend === "BULLISH") {
    bullishScore += 8;
    bullishFactors.push("Confirmation timeframe structure is bullish");
  } else if (confirmation.structure.trend === "BEARISH") {
    bullishScore -= 7;
    bearishScore += 4;
    bearishFactors.push("Confirmation timeframe structure is bearish");
  }
  if (trend.structure.trend === "BULLISH") {
    bullishScore += 10;
    bullishFactors.push("Higher-timeframe trend is bullish");
  } else if (trend.structure.trend === "BEARISH") {
    bullishScore -= 10;
    bearishScore += 6;
    bearishFactors.push("Higher-timeframe trend remains bearish");
  }
  if (confirmation.structure.trend === "BEARISH") {
    bearishScore += 8;
    bearishFactors.push("Confirmation timeframe structure is bearish");
  }
  if (trend.structure.trend === "BEARISH") {
    bearishScore += 10;
    bearishFactors.push("Higher-timeframe trend is bearish");
  } else if (trend.structure.trend === "BULLISH") {
    bearishScore -= 10;
  }
  return {
    bullishScore: Math.round(Math.max(0, Math.min(100, bullishScore))),
    bearishScore: Math.round(Math.max(0, Math.min(100, bearishScore))),
    bullishFactors: [...new Set(bullishFactors)],
    bearishFactors: [...new Set(bearishFactors)],
  };
}

function signalFor(
  bullishScore: number,
  bearishScore: number,
  confirmation: BaseAnalysis,
  trend: BaseAnalysis,
  primary: BaseAnalysis,
): ScannerItem["signal"] {
  const bullish = bullishScore > bearishScore;
  const score = bullish ? bullishScore : bearishScore;
  const aligned =
    bullish
      ? confirmation.structure.trend === "BULLISH" && trend.structure.trend === "BULLISH"
      : confirmation.structure.trend === "BEARISH" && trend.structure.trend === "BEARISH";
  const candle = primary.latestClose;
  const volumeConfirmed = primary.indicators.relativeVolume >= 1.2;
  const structureBreak =
    primary.structure.breakOfStructure &&
    primary.structure.trend === (bullish ? "BULLISH" : "BEARISH");

  if (score < 40) return "NO SIGNAL";
  if (score < 60) return "WATCH";
  if (score >= 75 && aligned && volumeConfirmed && structureBreak && candle > 0) {
    return bullish ? "CONFIRMED BULLISH" : "CONFIRMED BEARISH";
  }
  if (score >= 75) return bullish ? "STRONG BULLISH" : "STRONG BEARISH";
  return bullish ? "DEVELOPING BULLISH" : "DEVELOPING BEARISH";
}

function buildScannerItem(
  market: MarketType,
  symbolInfo: { symbol: string; baseAsset: string; quoteAsset: string },
  ticker: PublicTicker,
  timeframe: Timeframe,
  confirmationTimeframe: Timeframe,
  trendTimeframe: Timeframe,
  primaryCandles: Candle[],
  confirmationCandles: Candle[],
  trendCandles: Candle[],
): ScannerItem {
  const now = Date.now();
  const completed = (candles: Candle[]) => candles.filter((candle) => candle.closeTime < now);
  const primary = analyzeBase(completed(primaryCandles));
  const confirmation = analyzeBase(completed(confirmationCandles));
  const trend = analyzeBase(completed(trendCandles));
  const score = assembleScore(primary, confirmation, trend);
  const bullishScore = score.bullishScore;
  const bearishScore = score.bearishScore;
  const strongest = Math.max(bullishScore, bearishScore);

  return {
    symbol: symbolInfo.symbol,
    baseAsset: symbolInfo.baseAsset,
    quoteAsset: symbolInfo.quoteAsset,
    lastPrice: parsePositive(ticker.lastPrice),
    priceChangePercent: Number(ticker.priceChangePercent) || 0,
    quoteVolume: parsePositive(ticker.quoteVolume),
    spreadPercent: getSpreadPercent(ticker),
    primaryTimeframe: timeframe,
    confirmationTimeframe,
    trendTimeframe,
    primaryTrend: primary.structure.trend,
    confirmationTrend: confirmation.structure.trend,
    higherTimeframeTrend: trend.structure.trend,
    bullishScore,
    bearishScore,
    signal: signalFor(bullishScore, bearishScore, confirmation, trend, primary),
    confidence: confidenceFor(strongest),
    relativeVolume: primary.indicators.relativeVolume,
    rsi: primary.indicators.rsi,
    macdState: primary.macdState,
    bullishFactors: score.bullishFactors,
    bearishFactors: score.bearishFactors,
    updatedAt: new Date(),
  };
}

async function mapLimited<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const output: R[] = [];
  for (let index = 0; index < values.length; index += concurrency) {
    const batch = values.slice(index, index + concurrency);
    output.push(...(await Promise.all(batch.map(mapper))));
  }
  return output;
}

export async function getScannerSnapshot(options: {
  market: MarketType;
  primaryTimeframe: Timeframe;
  confirmationTimeframe: Timeframe;
  trendTimeframe: Timeframe;
  minimumQuoteVolume: number;
  limit: number;
  search?: string;
}): Promise<{
  market: MarketType;
  supportedSymbols: number;
  eligibleSymbols: number;
  primaryTimeframe: Timeframe;
  confirmationTimeframe: Timeframe;
  trendTimeframe: Timeframe;
  updatedAt: string;
  items: ScannerItem[];
  skipped: number;
}> {
  const [symbols, tickers] = await Promise.all([
    getExchangeSymbols(options.market),
    getAllDayTickers(options.market),
  ]);
  const tickerBySymbol = getTickerIndex(tickers);
  const search = options.search?.trim().toUpperCase();
  const eligible = symbols
    .filter(
      (symbol) =>
        symbol.quoteAsset === "USDT" &&
        tickerBySymbol.has(symbol.symbol) &&
        parsePositive(tickerBySymbol.get(symbol.symbol)?.quoteVolume) >=
          options.minimumQuoteVolume &&
        (!search ||
          symbol.symbol.includes(search) ||
          symbol.baseAsset.toUpperCase().includes(search)),
    )
    .sort(
      (left, right) =>
        parsePositive(tickerBySymbol.get(right.symbol)?.quoteVolume) -
        parsePositive(tickerBySymbol.get(left.symbol)?.quoteVolume),
    );
  const candidates = eligible.slice(0, options.limit);
  const intervals = [
    ...new Set([
      options.primaryTimeframe,
      options.confirmationTimeframe,
      options.trendTimeframe,
    ]),
  ];
  const settled = await mapLimited(candidates, 6, async (symbol) => {
    const ticker = tickerBySymbol.get(symbol.symbol);
    if (!ticker) return null;
    try {
      const candleSets = await Promise.all(
        intervals.map((interval) =>
          getKlines(options.market, symbol.symbol, interval, 200),
        ),
      );
      const candlesByTimeframe = new Map(
        intervals.map((interval, index) => [interval, candleSets[index]]),
      );
      return buildScannerItem(
        options.market,
        symbol,
        ticker,
        options.primaryTimeframe,
        options.confirmationTimeframe,
        options.trendTimeframe,
        candlesByTimeframe.get(options.primaryTimeframe) ?? [],
        candlesByTimeframe.get(options.confirmationTimeframe) ?? [],
        candlesByTimeframe.get(options.trendTimeframe) ?? [],
      );
    } catch {
      return null;
    }
  });

  const items = settled.filter((item): item is ScannerItem => item !== null);
  return {
    market: options.market,
    supportedSymbols: symbols.filter((symbol) => symbol.quoteAsset === "USDT").length,
    eligibleSymbols: eligible.length,
    primaryTimeframe: options.primaryTimeframe,
    confirmationTimeframe: options.confirmationTimeframe,
    trendTimeframe: options.trendTimeframe,
    updatedAt: new Date().toISOString(),
    items,
    skipped: candidates.length - items.length,
  };
}

export async function getDetailedAnalysis(
  market: MarketType,
  symbol: string,
  primaryTimeframe: Timeframe,
  confirmationTimeframe: Timeframe,
  trendTimeframe: Timeframe,
): Promise<{
  market: MarketType;
  symbol: string;
  analysis: ScannerItem;
  candles: Candle[];
  indicators: IndicatorSet;
  structure: StructureAnalysis;
  divergence: DivergenceAnalysis;
  orderBook: OrderBookAnalysis;
}> {
  const symbols = await getExchangeSymbols(market);
  const symbolInfo = symbols.find((candidate) => candidate.symbol === symbol);
  if (!symbolInfo || symbolInfo.quoteAsset !== "USDT") {
    throw new Error("Symbol is not currently trading on this Binance market");
  }
  const intervals = [...new Set([primaryTimeframe, confirmationTimeframe, trendTimeframe])];
  const [candleSets, rawOrderBook, tickers] = await Promise.all([
    Promise.all(
      intervals.map((interval) =>
        getKlines(market, symbol, interval, interval === primaryTimeframe ? 300 : 200),
      ),
    ),
    getOrderBook(market, symbol),
    getAllDayTickers(market),
  ]);
  const candlesByTimeframe = new Map(
    intervals.map((interval, index) => [interval, candleSets[index]]),
  );
  const candlesFor = (interval: Timeframe) => candlesByTimeframe.get(interval) ?? [];
  const rawPrimaryCandles = candlesFor(primaryTimeframe);
  const rawConfirmationCandles = candlesFor(confirmationTimeframe);
  const rawTrendCandles = candlesFor(trendTimeframe);
  const ticker = getTickerIndex(tickers).get(symbol);
  if (!ticker) throw new Error("Binance has no current ticker for this symbol");

  const now = Date.now();
  const completed = (rows: Candle[]) => rows.filter((candle) => candle.closeTime < now);
  const primaryCandles = completed(rawPrimaryCandles);
  const primary = analyzeBase(primaryCandles);
  const confirmation = analyzeBase(completed(rawConfirmationCandles));
  const trend = analyzeBase(completed(rawTrendCandles));
  const score = assembleScore(primary, confirmation, trend);
  const item = buildScannerItem(
    market,
    symbolInfo,
    ticker,
    primaryTimeframe,
    confirmationTimeframe,
    trendTimeframe,
    rawPrimaryCandles,
    rawConfirmationCandles,
    rawTrendCandles,
  );
  const bids = rawOrderBook.bids.map(([price, quantity]) => ({
    price: Number(price),
    quantity: Number(quantity),
  }));
  const asks = rawOrderBook.asks.map(([price, quantity]) => ({
    price: Number(price),
    quantity: Number(quantity),
  }));
  const bidVolume = bids.reduce((sum, level) => sum + level.quantity, 0);
  const askVolume = asks.reduce((sum, level) => sum + level.quantity, 0);
  const totalVolume = bidVolume + askVolume;
  const orderBook: OrderBookAnalysis = {
    bidVolume,
    askVolume,
    imbalance: totalVolume > 0 ? (bidVolume - askVolume) / totalVolume : 0,
    spreadPercent: getSpreadPercent(ticker),
    bids,
    asks,
  };

  return {
    market,
    symbol,
    analysis: {
      ...item,
      bullishScore: score.bullishScore,
      bearishScore: score.bearishScore,
      bullishFactors: score.bullishFactors,
      bearishFactors: score.bearishFactors,
      signal: signalFor(
        score.bullishScore,
        score.bearishScore,
        confirmation,
        trend,
        primary,
      ),
      confidence: confidenceFor(Math.max(score.bullishScore, score.bearishScore)),
    },
    candles: primaryCandles,
    indicators: primary.indicators,
    structure: primary.structure,
    divergence: primary.divergence,
    orderBook,
  };
}
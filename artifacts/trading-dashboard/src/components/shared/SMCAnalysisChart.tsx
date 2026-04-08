import { useEffect, useRef, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";

// ── Local Indicators ──────────────────────────────────────────────────────────

function computeEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function computeBB(candles: any[], period = 20) {
  const result: { time: number; upper: number; mid: number; lower: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1).map((c: any) => c.close);
    const mid = slice.reduce((a: number, b: number) => a + b, 0) / period;
    const std = Math.sqrt(slice.reduce((acc: number, v: number) => acc + (v - mid) ** 2, 0) / period);
    result.push({ time: candles[i].time, upper: mid + 2 * std, mid, lower: mid - 2 * std });
  }
  return result;
}

// ── Zone Box Primitive ────────────────────────────────────────────────────────

class ZoneBoxPrimitive {
  private _high: number;
  private _low: number;
  private _fillColor: string;
  private _lineColor: string;
  private _series: ISeriesApi<"Candlestick"> | null = null;

  constructor(high: number, low: number, fillColor: string, lineColor: string) {
    this._high = high;
    this._low  = low;
    this._fillColor = fillColor;
    this._lineColor = lineColor;
  }

  attached({ series }: { series: ISeriesApi<"Candlestick"> }) { this._series = series; }
  detached() { this._series = null; }

  paneViews() {
    const self = this;
    return [{
      zOrder: () => "bottom" as const,
      renderer: () => ({
        draw(target: any) {
          if (!self._series) return;
          target.useMediaCoordinateSpace(({ context, mediaSize }: any) => {
            const yHigh = self._series!.priceToCoordinate(self._high);
            const yLow  = self._series!.priceToCoordinate(self._low);
            if (yHigh === null || yLow === null) return;
            const top    = Math.min(yHigh, yLow);
            const bottom = Math.max(yHigh, yLow);
            const h      = bottom - top;
            // Filled rectangle
            context.globalAlpha = 0.18;
            context.fillStyle   = self._fillColor;
            context.fillRect(0, top, mediaSize.width, h);
            // Border lines
            context.globalAlpha = 0.9;
            context.strokeStyle = self._lineColor;
            context.lineWidth   = 1;
            context.setLineDash([4, 3]);
            context.beginPath();
            context.moveTo(0, top); context.lineTo(mediaSize.width, top); context.stroke();
            context.beginPath();
            context.moveTo(0, bottom); context.lineTo(mediaSize.width, bottom); context.stroke();
            context.setLineDash([]);
            context.globalAlpha = 1;
          });
        },
      }),
    }];
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  result: any;
  height?: number;
}

export default function SMCAnalysisChart({ result, height = 620 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);

  const build = useCallback(() => {
    if (!containerRef.current || !result?.chartCandles?.length) return;

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: height - 44, // minus header
      layout: { background: { type: ColorType.Solid, color: "#0a0a14" }, textColor: "#9ca3af" },
      grid:   { vertLines: { color: "#111827" }, horzLines: { color: "#111827" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1f2937" },
      timeScale: { borderColor: "#1f2937", timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    const raw: { time: number; open: number; high: number; low: number; close: number }[] = result.chartCandles;
    const closes = raw.map(c => c.close);
    const times  = raw.map(c => c.time as Time);

    // ── 1. Candlesticks ─────────────────────────────────────────────────────
    const cs = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981", downColor: "#ef4444",
      borderUpColor: "#10b981", borderDownColor: "#ef4444",
      wickUpColor: "#10b981", wickDownColor: "#ef4444",
    });
    cs.setData(raw.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));

    // ── 2. EMA 20 ────────────────────────────────────────────────────────────
    const ema20 = computeEMA(closes, 20);
    const ema20S = chart.addSeries(LineSeries, { color: "#06b6d4", lineWidth: 1, title: "EMA 20", priceLineVisible: false, lastValueVisible: true });
    ema20S.setData(ema20.map((v, i) => ({ time: times[i + 19], value: v })));

    // ── 3. EMA 50 ────────────────────────────────────────────────────────────
    const ema50 = computeEMA(closes, 50);
    const ema50S = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, title: "EMA 50", priceLineVisible: false, lastValueVisible: true });
    ema50S.setData(ema50.map((v, i) => ({ time: times[i + 49], value: v })));

    // ── 4. Bollinger Bands ───────────────────────────────────────────────────
    const bb = computeBB(raw, 20);
    const bbOpts = (title: string) => ({ color: "rgba(99,102,241,0.55)", lineWidth: 1 as const, lineStyle: LineStyle.Dashed, title, priceLineVisible: false, lastValueVisible: false });
    const bbU = chart.addSeries(LineSeries, bbOpts("BB Upper"));
    const bbM = chart.addSeries(LineSeries, { color: "rgba(99,102,241,0.3)", lineWidth: 1, lineStyle: LineStyle.SparseDotted, title: "BB Mid", priceLineVisible: false, lastValueVisible: false });
    const bbL = chart.addSeries(LineSeries, bbOpts("BB Lower"));
    bbU.setData(bb.map(d => ({ time: d.time as Time, value: d.upper })));
    bbM.setData(bb.map(d => ({ time: d.time as Time, value: d.mid })));
    bbL.setData(bb.map(d => ({ time: d.time as Time, value: d.lower })));

    // ── 5. Zone Boxes (filled rectangles via primitive) ───────────────────────
    function addBox(high: number, low: number, fill: string, line: string) {
      const prim = new ZoneBoxPrimitive(high, low, fill, line);
      (cs as any).attachPrimitive(prim);
    }

    // Order Block
    if (result.orderBlockZone) {
      const c = result.orderBlockZone.type === "BULLISH" ? "#f59e0b" : "#ef4444";
      addBox(result.orderBlockZone.high, result.orderBlockZone.low, c, c);
    }
    // FVG
    if (result.fvgZone) {
      const c = result.fvgZone.type === "BULLISH" ? "#8b5cf6" : "#a855f7";
      addBox(result.fvgZone.high, result.fvgZone.low, c, c);
    }
    // Support
    addBox(result.supportZone.high, result.supportZone.low, "#10b981", "#10b981");
    // Resistance
    addBox(result.resistanceZone.high, result.resistanceZone.low, "#ef4444", "#ef4444");
    // OTE
    if (result.isInOTE) {
      addBox(result.oteFibHigh, result.oteFibLow, "#eab308", "#eab308");
    }

    // ── 6. Price Lines (labeled horizontal lines) ─────────────────────────────
    function pl(price: number, color: string, title: string, style = LineStyle.Solid, width: 1 | 2 = 1) {
      cs.createPriceLine({ price, color, lineWidth: width, lineStyle: style, axisLabelVisible: true, title });
    }

    // Entry / TP / SL
    if (result.signal !== "NEUTRAL") {
      const eColor = result.signal === "BUY" ? "#10b981" : "#ef4444";
      pl(result.entry,      eColor,    `ENTRY ${result.signal}`,           LineStyle.Solid, 2);
      pl(result.takeProfit, "#10b981", `TP  1:${result.riskRewardRatio}R`, LineStyle.Dashed);
      pl(result.stopLoss,   "#ef4444", "SL  ATR-based",                    LineStyle.Dashed);
    }

    // OB labels
    if (result.orderBlockZone) {
      pl(result.orderBlockZone.high, "#f59e0b", `OB ${result.orderBlockZone.type} — High`);
      pl(result.orderBlockZone.low,  "#f59e0b", `OB ${result.orderBlockZone.type} — Low`, LineStyle.Dashed);
    }
    // FVG labels
    if (result.fvgZone) {
      pl(result.fvgZone.high, "#8b5cf6", `FVG ${result.fvgZone.type} — High`);
      pl(result.fvgZone.low,  "#8b5cf6", `FVG ${result.fvgZone.type} — Low`, LineStyle.Dashed);
    }
    // Fibonacci OTE labels
    if (result.isInOTE) {
      pl(result.oteFibHigh, "#eab308", "Fib 0.618 OTE High");
      pl(result.oteFibLow,  "#eab308", "Fib 0.786 OTE Low", LineStyle.Dashed);
    }
    // Swing High / Low (BOS/CHoCH levels)
    pl(result.swingHighLevel, "rgba(239,68,68,0.7)",   result.structureType !== "NONE" ? `${result.structureType} — Swing High` : "Swing High", LineStyle.LargeDashed);
    pl(result.swingLowLevel,  "rgba(16,185,129,0.7)",  result.structureType !== "NONE" ? `${result.structureType} — Swing Low`  : "Swing Low",  LineStyle.LargeDashed);
    // Equilibrium (50% of range)
    pl(result.equilibriumLevel, "rgba(255,255,255,0.25)", `EQ 50% — ${result.premiumDiscount}`, LineStyle.SparseDotted);
    // Liquidity sweep
    if (result.hasLiquiditySweep && result.liquidityLevel) {
      pl(result.liquidityLevel, "#22d3ee", `${result.liquiditySweepType} Liquidity Sweep`, LineStyle.Dashed, 2);
    }
    // Support / Resistance labels
    pl(result.supportZone.high,    "#10b981", "Support Zone Top",    LineStyle.Dashed);
    pl(result.supportZone.low,     "#10b981", "Support Zone Bottom", LineStyle.Dashed);
    pl(result.resistanceZone.high, "#ef4444", "Resistance Zone Top",    LineStyle.Dashed);
    pl(result.resistanceZone.low,  "#ef4444", "Resistance Zone Bottom", LineStyle.Dashed);

    // ── 7. Markers ────────────────────────────────────────────────────────────
    const markers: SeriesMarker<Time>[] = [];
    const lastT = times[times.length - 1];

    if (result.signal !== "NEUTRAL") {
      markers.push({ time: lastT, position: result.signal === "BUY" ? "belowBar" : "aboveBar", color: result.signal === "BUY" ? "#10b981" : "#ef4444", shape: result.signal === "BUY" ? "arrowUp" : "arrowDown", text: `${result.signal}  Entry`, size: 2 });
    }
    if (result.hasCandlePattern && result.candlePattern) {
      const bull = result.candlePattern.startsWith("Bullish");
      markers.push({ time: times[times.length - 2] ?? lastT, position: bull ? "belowBar" : "aboveBar", color: "#a855f7", shape: "circle", text: result.candlePattern, size: 1 });
    }
    if (result.hasLiquiditySweep) {
      const sweepT = times[Math.max(0, times.length - 6)];
      markers.push({ time: sweepT, position: result.liquiditySweepType === "SSL" ? "belowBar" : "aboveBar", color: "#22d3ee", shape: "circle", text: `${result.liquiditySweepType} Swept`, size: 1 });
    }
    if (result.hasDivergence) {
      markers.push({ time: times[Math.max(0, times.length - 12)], position: "aboveBar", color: "#ec4899", shape: "circle", text: result.divergenceType?.replace(/_/g, " ") ?? "Divergence", size: 1 });
    }

    markers.sort((a, b) => (a.time as number) - (b.time as number));
    if (markers.length) cs.setMarkers(markers);

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [result, height]);

  useEffect(() => {
    const cleanup = build();
    return () => {
      cleanup?.();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [build]);

  if (!result?.chartCandles?.length) return null;

  const signal = result.signal;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border/40 bg-[#0a0a14]">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/30 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground">{result.pair} · {result.timeframe}</span>
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-semibold">SMC Analysis Chart</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${signal === "BUY" ? "bg-emerald-500/15 text-emerald-400" : signal === "SELL" ? "bg-rose-500/15 text-rose-400" : "bg-slate-500/15 text-slate-400"}`}>{signal}</span>
          </div>
          <span className="text-[10px] text-muted-foreground/60">All levels auto-drawn · Scroll to zoom</span>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-muted-foreground/70">
          {[
            { color: "#06b6d4", label: "EMA 20" },
            { color: "#f59e0b", label: "EMA 50" },
            { color: "rgba(99,102,241,0.7)", label: "Bollinger Bands" },
            { color: "#f59e0b", label: "Order Block", fill: true },
            { color: "#8b5cf6", label: "Fair Value Gap", fill: true },
            { color: "#10b981", label: "Support Zone", fill: true },
            { color: "#ef4444", label: "Resistance Zone", fill: true },
            { color: "#eab308", label: "Fib OTE Zone", fill: true },
            { color: "#22d3ee", label: "Liquidity Sweep" },
            { color: "rgba(255,255,255,0.3)", label: "EQ 50%" },
          ].map(({ color, label, fill }) => (
            <span key={label} className="flex items-center gap-1">
              {fill
                ? <span className="w-3 h-3 rounded-sm inline-block opacity-60" style={{ background: color }} />
                : <span className="w-4 h-0.5 inline-block" style={{ background: color }} />
              }
              {label}
            </span>
          ))}
        </div>
      </div>
      <div ref={containerRef} style={{ height: height - 44, width: "100%" }} />
    </div>
  );
}

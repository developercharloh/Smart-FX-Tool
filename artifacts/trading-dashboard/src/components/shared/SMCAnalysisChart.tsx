import { useEffect, useRef, useCallback, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  LineStyle,
  ColorType,
  CrosshairMode,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { cn } from "@/lib/utils";

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
            const h      = Math.max(bottom - top, 1);
            context.globalAlpha = 0.18;
            context.fillStyle   = self._fillColor;
            context.fillRect(0, top, mediaSize.width, h);
            context.globalAlpha = 0.85;
            context.strokeStyle = self._lineColor;
            context.lineWidth   = 1;
            context.setLineDash([5, 4]);
            [[0, top], [0, bottom]].forEach(([x, y]) => {
              context.beginPath();
              context.moveTo(x, y);
              context.lineTo(mediaSize.width, y);
              context.stroke();
            });
            context.setLineDash([]);
            context.globalAlpha = 1;
          });
        },
      }),
    }];
  }
}

// ── Drawing Toggles Config ────────────────────────────────────────────────────

const TOGGLE_GROUPS = [
  {
    label: "Best Picks",
    items: [
      { key: "entryLevels",   label: "Entry / SL / TP",   color: "#10b981" },
      { key: "orderBlock",    label: "Order Block",        color: "#f59e0b" },
      { key: "fvg",           label: "Fair Value Gap",     color: "#8b5cf6" },
      { key: "bos",           label: "BOS / CHoCH Level",  color: "#94a3b8" },
      { key: "liquidity",     label: "Liquidity Sweep",    color: "#22d3ee" },
    ],
  },
  {
    label: "More Drawings",
    items: [
      { key: "supportResistance", label: "Support / Resistance", color: "#64748b" },
      { key: "fibonacci",         label: "Fibonacci OTE",        color: "#eab308" },
      { key: "ema",               label: "EMA 20 / 50",          color: "#06b6d4" },
      { key: "bb",                label: "Bollinger Bands",      color: "#6366f1" },
      { key: "equilibrium",       label: "EQ 50% Line",          color: "#475569" },
      { key: "markers",           label: "Pattern Markers",      color: "#a855f7" },
    ],
  },
];

const DEFAULT_ON = new Set(["entryLevels", "orderBlock", "fvg", "bos", "liquidity", "markers"]);

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  result: any;
  height?: number;
}

export default function SMCAnalysisChart({ result, height = 620 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(() => new Set(DEFAULT_ON));
  const [showMore, setShowMore] = useState(false);

  function toggle(key: string) {
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const build = useCallback(() => {
    if (!containerRef.current || !result?.chartCandles?.length) return;

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: height - 96, // minus header + toggles
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

    // Helpers
    function addBox(high: number, low: number, fill: string, line: string) {
      (cs as any).attachPrimitive(new ZoneBoxPrimitive(high, low, fill, line));
    }
    function pl(price: number, color: string, title: string, style = LineStyle.Solid, width: 1 | 2 = 1) {
      cs.createPriceLine({ price, color, lineWidth: width, lineStyle: style, axisLabelVisible: true, title });
    }

    // ── Candlesticks ─────────────────────────────────────────────────────────
    const cs = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981", downColor: "#ef4444",
      borderUpColor: "#10b981", borderDownColor: "#ef4444",
      wickUpColor: "#10b981", wickDownColor: "#ef4444",
    });
    cs.setData(raw.map(c => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));

    // ── EMA 20 / 50 ──────────────────────────────────────────────────────────
    if (enabled.has("ema")) {
      const ema20 = computeEMA(closes, 20);
      const e20 = chart.addSeries(LineSeries, { color: "#06b6d4", lineWidth: 1, title: "EMA 20", priceLineVisible: false, lastValueVisible: true });
      e20.setData(ema20.map((v, i) => ({ time: times[i + 19], value: v })));

      const ema50 = computeEMA(closes, 50);
      const e50 = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, title: "EMA 50", priceLineVisible: false, lastValueVisible: true });
      e50.setData(ema50.map((v, i) => ({ time: times[i + 49], value: v })));
    }

    // ── Bollinger Bands ───────────────────────────────────────────────────────
    if (enabled.has("bb")) {
      const bb = computeBB(raw, 20);
      const bbOpts = (t: string) => ({ color: "rgba(99,102,241,0.55)", lineWidth: 1 as const, lineStyle: LineStyle.Dashed, title: t, priceLineVisible: false, lastValueVisible: false });
      const bbU = chart.addSeries(LineSeries, bbOpts("BB Upper"));
      const bbM = chart.addSeries(LineSeries, { color: "rgba(99,102,241,0.3)", lineWidth: 1, lineStyle: LineStyle.SparseDotted, title: "BB Mid", priceLineVisible: false, lastValueVisible: false });
      const bbL = chart.addSeries(LineSeries, bbOpts("BB Lower"));
      bbU.setData(bb.map(d => ({ time: d.time as Time, value: d.upper })));
      bbM.setData(bb.map(d => ({ time: d.time as Time, value: d.mid })));
      bbL.setData(bb.map(d => ({ time: d.time as Time, value: d.lower })));
    }

    // ── Zone Boxes + Price Lines ──────────────────────────────────────────────

    // Order Block
    if (enabled.has("orderBlock") && result.orderBlockZone) {
      const c = result.orderBlockZone.type === "BULLISH" ? "#f59e0b" : "#ef4444";
      addBox(result.orderBlockZone.high, result.orderBlockZone.low, c, c);
      pl(result.orderBlockZone.high, c, `OB ${result.orderBlockZone.type} High`);
      pl(result.orderBlockZone.low,  c, `OB ${result.orderBlockZone.type} Low`, LineStyle.Dashed);
    }

    // Fair Value Gap
    if (enabled.has("fvg") && result.fvgZone) {
      const c = "#8b5cf6";
      addBox(result.fvgZone.high, result.fvgZone.low, c, c);
      pl(result.fvgZone.high, c, `FVG ${result.fvgZone.type} High`);
      pl(result.fvgZone.low,  c, `FVG ${result.fvgZone.type} Low`, LineStyle.Dashed);
    }

    // Support / Resistance
    if (enabled.has("supportResistance")) {
      addBox(result.supportZone.high,    result.supportZone.low,    "#10b981", "#10b981");
      addBox(result.resistanceZone.high, result.resistanceZone.low, "#ef4444", "#ef4444");
      pl(result.supportZone.high,    "#10b981", "Support Top",    LineStyle.Dashed);
      pl(result.supportZone.low,     "#10b981", "Support Bottom", LineStyle.Dashed);
      pl(result.resistanceZone.high, "#ef4444", "Resistance Top",    LineStyle.Dashed);
      pl(result.resistanceZone.low,  "#ef4444", "Resistance Bottom", LineStyle.Dashed);
    }

    // Fibonacci OTE
    if (enabled.has("fibonacci") && result.isInOTE) {
      addBox(result.oteFibHigh, result.oteFibLow, "#eab308", "#eab308");
      pl(result.oteFibHigh, "#eab308", "Fib 0.618 OTE High");
      pl(result.oteFibLow,  "#eab308", "Fib 0.786 OTE Low", LineStyle.Dashed);
    }

    // BOS / CHoCH Swing Levels
    if (enabled.has("bos")) {
      pl(result.swingHighLevel, "rgba(239,68,68,0.75)",  result.structureType !== "NONE" ? `${result.structureType} Swing High` : "Swing High", LineStyle.LargeDashed);
      pl(result.swingLowLevel,  "rgba(16,185,129,0.75)", result.structureType !== "NONE" ? `${result.structureType} Swing Low`  : "Swing Low",  LineStyle.LargeDashed);
    }

    // Liquidity Sweep
    if (enabled.has("liquidity") && result.hasLiquiditySweep && result.liquidityLevel) {
      pl(result.liquidityLevel, "#22d3ee", `${result.liquiditySweepType} Liquidity Swept`, LineStyle.Dashed, 2);
    }

    // EQ 50% line
    if (enabled.has("equilibrium")) {
      pl(result.equilibriumLevel, "rgba(255,255,255,0.2)", `EQ 50% — ${result.premiumDiscount}`, LineStyle.SparseDotted);
    }

    // Entry / SL / TP
    if (enabled.has("entryLevels") && result.signal !== "NEUTRAL") {
      const eColor = result.signal === "BUY" ? "#10b981" : "#ef4444";
      pl(result.entry,      eColor,    `ENTRY ${result.signal}`,              LineStyle.Solid, 2);
      pl(result.takeProfit, "#10b981", `TP  1:${result.riskRewardRatio}R`,    LineStyle.Dashed);
      pl(result.stopLoss,   "#ef4444", "SL  ATR-based",                       LineStyle.Dashed);
    }

    // ── Markers ───────────────────────────────────────────────────────────────
    if (enabled.has("markers")) {
      const mkrs: SeriesMarker<Time>[] = [];
      const lastT = times[times.length - 1];

      if (result.signal !== "NEUTRAL") {
        mkrs.push({ time: lastT, position: result.signal === "BUY" ? "belowBar" : "aboveBar", color: result.signal === "BUY" ? "#10b981" : "#ef4444", shape: result.signal === "BUY" ? "arrowUp" : "arrowDown", text: `${result.signal} Entry`, size: 2 });
      }
      if (result.hasCandlePattern && result.candlePattern) {
        const bull = result.candlePattern.startsWith("Bullish");
        mkrs.push({ time: times[times.length - 2] ?? lastT, position: bull ? "belowBar" : "aboveBar", color: "#a855f7", shape: "circle", text: result.candlePattern, size: 1 });
      }
      if (result.hasLiquiditySweep) {
        mkrs.push({ time: times[Math.max(0, times.length - 6)], position: result.liquiditySweepType === "SSL" ? "belowBar" : "aboveBar", color: "#22d3ee", shape: "circle", text: `${result.liquiditySweepType} Sweep`, size: 1 });
      }
      if (result.hasDivergence) {
        mkrs.push({ time: times[Math.max(0, times.length - 12)], position: "aboveBar", color: "#ec4899", shape: "circle", text: result.divergenceType?.replace(/_/g, " ") ?? "Divergence", size: 1 });
      }

      if (mkrs.length) {
        mkrs.sort((a, b) => (a.time as number) - (b.time as number));
        createSeriesMarkers(cs, mkrs);
      }
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [result, height, enabled]);

  useEffect(() => {
    const cleanup = build();
    return () => {
      cleanup?.();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [build]);

  if (!result?.chartCandles?.length) return null;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border/40 bg-[#0a0a14]">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-border/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-foreground">{result.pair} · {result.timeframe}</span>
            <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-1.5 py-0.5 font-semibold">SMC Analysis Chart</span>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded",
              result.signal === "BUY"  ? "bg-emerald-500/15 text-emerald-400" :
              result.signal === "SELL" ? "bg-rose-500/15 text-rose-400" :
              "bg-slate-500/15 text-slate-400")}>
              {result.signal}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/50">Scroll / pinch to zoom</span>
        </div>

        {/* Toggle rows */}
        <div className="space-y-2">
          {/* Best Picks label */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Best Picks</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Best Picks toggles */}
          <div className="flex flex-wrap gap-2">
            {TOGGLE_GROUPS[0].items.map(({ key, label, color }) => {
              const on = enabled.has(key);
              return (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95"
                  style={{
                    background: on ? color : "rgba(255,255,255,0.07)",
                    color: on ? "#000" : "#fff",
                    border: on ? `1.5px solid ${color}` : `1.5px solid rgba(255,255,255,0.18)`,
                    boxShadow: on ? `0 0 10px ${color}55` : "none",
                  }}
                >
                  {/* color swatch always visible */}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                    style={{ background: color }}
                  />
                  {label}
                  {/* checkmark when ON */}
                  {on && <span className="text-[10px] font-black ml-0.5">✓</span>}
                </button>
              );
            })}
          </div>

          {/* More Drawings expand button */}
          <button
            onClick={() => setShowMore(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/60 hover:text-white transition-colors"
          >
            <span
              className="w-4 h-4 rounded flex items-center justify-center text-[10px] border border-white/20 bg-white/5"
            >{showMore ? "▲" : "▼"}</span>
            {showMore ? "Hide extra drawings" : "Add more drawings"}
          </button>

          {/* More Drawings toggles */}
          {showMore && (
            <div className="flex flex-wrap gap-2">
              {TOGGLE_GROUPS[1].items.map(({ key, label, color }) => {
                const on = enabled.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95"
                    style={{
                      background: on ? color : "rgba(255,255,255,0.07)",
                      color: on ? "#000" : "#fff",
                      border: on ? `1.5px solid ${color}` : `1.5px solid rgba(255,255,255,0.18)`,
                      boxShadow: on ? `0 0 10px ${color}55` : "none",
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20"
                      style={{ background: color }}
                    />
                    {label}
                    {on && <span className="text-[10px] font-black ml-0.5">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div ref={containerRef} style={{ height: height - 96, width: "100%" }} />
    </div>
  );
}

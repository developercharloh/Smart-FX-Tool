import { useEffect, useRef, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";

const GRAN_MAP: Record<string, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  M30: 1800,
  H1: 3600,
  H4: 14400,
  D1: 86400,
};

const WS_URL = "wss://ws.binaryws.com/websockets/v3?app_id=1";

interface Props {
  symbol: string;
  timeframe?: string;
  height?: number;
}

export default function SyntheticChart({ symbol, timeframe = "H1", height = 560 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const subIdRef     = useRef<string | null>(null);
  const granularity  = GRAN_MAP[timeframe] || 3600;

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    subIdRef.current = null;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // ── Create chart ──────────────────────────────────────────────────────
    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0a0a14" },
        textColor:  "#9ca3af",
      },
      grid: {
        vertLines:  { color: "#1f2937" },
        horzLines:  { color: "#1f2937" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1f2937" },
      timeScale: {
        borderColor:     "#1f2937",
        timeVisible:     true,
        secondsVisible:  granularity < 3600,
      },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor:         "#10b981",
      downColor:       "#ef4444",
      borderUpColor:   "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor:     "#10b981",
      wickDownColor:   "#ef4444",
    });
    seriesRef.current = series;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    // ── WebSocket ─────────────────────────────────────────────────────────
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: 500,
        end: "latest",
        granularity,
        style: "candles",
        subscribe: 1,
      }));
    };

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);

      // History dump
      if (msg.candles && seriesRef.current) {
        const candles: CandlestickData[] = msg.candles.map((c: any) => ({
          time:  c.epoch as Time,
          open:  parseFloat(c.open),
          high:  parseFloat(c.high),
          low:   parseFloat(c.low),
          close: parseFloat(c.close),
        }));
        seriesRef.current.setData(candles);
        chart.timeScale().fitContent();
        if (msg.subscription) subIdRef.current = msg.subscription.id;
      }

      // Live OHLC update
      if (msg.ohlc && seriesRef.current) {
        const o = msg.ohlc;
        seriesRef.current.update({
          time:  parseInt(o.epoch) as Time,
          open:  parseFloat(o.open),
          high:  parseFloat(o.high),
          low:   parseFloat(o.low),
          close: parseFloat(o.close),
        });
        if (msg.subscription) subIdRef.current = msg.subscription.id;
      }

      // Error from Deriv
      if (msg.error) {
        console.warn("Deriv WS error:", msg.error.message);
      }
    };

    ws.onerror  = (e) => console.warn("Deriv WS error", e);
    ws.onclose  = () => {};

    return () => {
      ro.disconnect();
      cleanup();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  // Re-run whenever symbol or timeframe changes — full remount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, granularity]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border/40" style={{ height }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a14] border-b border-border/30">
        <span className="text-xs font-mono font-bold text-emerald-400">{symbol}</span>
        <span className="text-xs text-muted-foreground">{timeframe} · Live</span>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Deriv
        </span>
      </div>
      <div ref={containerRef} style={{ height: height - 36, width: "100%" }} />
    </div>
  );
}

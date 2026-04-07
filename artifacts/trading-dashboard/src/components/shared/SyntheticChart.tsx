import { useEffect, useRef, memo } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";

const DERIV_WS_URL = "wss://ws.binaryws.com/websockets/v3?app_id=1089";

const GRAN_MAP: Record<string, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  M30: 1800,
  H1: 3600,
  H4: 14400,
  D1: 86400,
};

interface SyntheticChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
}

function SyntheticChart({ symbol, timeframe = "H1", height = 580 }: SyntheticChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const gran = GRAN_MAP[timeframe] || 3600;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: "rgba(10,10,20,1)" },
        textColor: "rgba(200,200,220,0.8)",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    let subId: string | null = null;

    const ws = new WebSocket(DERIV_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: 500,
        end: "latest",
        granularity: gran,
        style: "candles",
        subscribe: 1,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.error) return;

        if (msg.msg_type === "candles" && msg.candles) {
          const candles = msg.candles.map((c: any) => ({
            time: c.epoch as number,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
          }));
          series.setData(candles);
          chart.timeScale().fitContent();
          if (msg.subscription) {
            subId = msg.subscription.id;
          }
        } else if (msg.msg_type === "ohlc" && msg.ohlc) {
          const o = msg.ohlc;
          series.update({
            time: o.open_time as number,
            open: parseFloat(o.open),
            high: parseFloat(o.high),
            low: parseFloat(o.low),
            close: parseFloat(o.close),
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => ws.close();

    return () => {
      ro.disconnect();
      if (ws.readyState === WebSocket.OPEN && subId) {
        ws.send(JSON.stringify({ forget: subId }));
      }
      ws.close();
      wsRef.current = null;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, timeframe, height]);

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-border/40"
      style={{ height, minHeight: height, background: "rgba(10,10,20,1)" }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default memo(SyntheticChart);

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";

const DERIV_WS = "wss://ws.binaryws.com/websockets/v3?app_id=1089";

const GRANULARITY_MAP: Record<string, number> = {
  M1: 60, M5: 300, M15: 900, M30: 1800,
  H1: 3600, H4: 14400, D1: 86400,
};

function calcEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = data[0];
  for (let i = 0; i < data.length; i++) {
    ema = i === 0 ? data[i] : data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRSI(closes: number[], period = 14): number[] {
  const result: number[] = new Array(period).fill(NaN);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d);
  }
  avgGain /= period;
  avgLoss /= period;
  result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? Math.abs(d) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return result;
}

const CHART_OPTS = {
  layout: {
    background: { type: ColorType.Solid, color: "#0a0a14" },
    textColor: "#9ca3af",
    fontSize: 11,
  },
  grid: {
    vertLines: { color: "rgba(255,255,255,0.03)" },
    horzLines: { color: "rgba(255,255,255,0.03)" },
  },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
  timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
};

interface DerivChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
}

interface OHLCBar {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  epoch: number;
  granularity: number;
}

export function DerivChart({ symbol, timeframe = "H1", height = 580 }: DerivChartProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const mainChart = useRef<IChartApi | null>(null);
  const rsiChart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema20Series = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50Series = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeries = useRef<ISeriesApi<"Line"> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const barsRef = useRef<OHLCBar[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const granularity = GRANULARITY_MAP[timeframe] ?? 3600;

  const startCountdown = useCallback((bar: OHLCBar) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      const nextClose = bar.epoch + bar.granularity;
      const remaining = nextClose - Math.floor(Date.now() / 1000);
      if (remaining <= 0) {
        setCountdown(0);
        if (countdownRef.current) clearInterval(countdownRef.current);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, []);

  const updateIndicators = useCallback(() => {
    const bars = barsRef.current;
    if (bars.length < 20) return;
    const closes = bars.map(b => b.close);
    const times = bars.map(b => b.time);

    const ema20 = calcEMA(closes, 20);
    ema20Series.current?.setData(times.map((t, i) => ({ time: t, value: ema20[i] })));

    if (bars.length >= 50) {
      const ema50 = calcEMA(closes, 50);
      ema50Series.current?.setData(times.map((t, i) => ({ time: t, value: ema50[i] })));
    }

    if (bars.length > 14) {
      const rsi = calcRSI(closes, 14);
      rsiSeries.current?.setData(
        times
          .map((t, i) => ({ time: t, value: rsi[i] }))
          .filter(p => !isNaN(p.value))
      );
    }
  }, []);

  useEffect(() => {
    if (!mainRef.current || !rsiRef.current) return;

    // Main chart
    const mc = createChart(mainRef.current, {
      ...CHART_OPTS,
      width: mainRef.current.clientWidth,
      height: Math.round(height * 0.72),
    });
    mainChart.current = mc;

    const cs = mc.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    candleSeries.current = cs;

    const e20 = mc.addLineSeries({ color: "#facc15", lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    ema20Series.current = e20;

    const e50 = mc.addLineSeries({ color: "#60a5fa", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, lineStyle: LineStyle.Dashed });
    ema50Series.current = e50;

    // RSI chart
    const rc = createChart(rsiRef.current, {
      ...CHART_OPTS,
      width: rsiRef.current.clientWidth,
      height: Math.round(height * 0.22),
      timeScale: { ...CHART_OPTS.timeScale, visible: false },
    });
    rsiChart.current = rc;

    const rs = rc.addLineSeries({ color: "#a78bfa", lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
    rsiSeries.current = rs;

    // OB/OS reference lines
    rc.addLineSeries({ color: "rgba(239,83,80,0.4)", lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false })
      .setData([{ time: 0 as Time, value: 70 }, { time: 99999999999 as Time, value: 70 }]);
    rc.addLineSeries({ color: "rgba(38,166,154,0.4)", lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false })
      .setData([{ time: 0 as Time, value: 30 }, { time: 99999999999 as Time, value: 30 }]);

    // Sync crosshair
    mc.subscribeCrosshairMove(p => {
      if (p.time) rc.setCrosshairPosition(0, p.time, rs);
      else rc.clearCrosshairPosition();
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (mainRef.current) mc.applyOptions({ width: mainRef.current.clientWidth });
      if (rsiRef.current) rc.applyOptions({ width: rsiRef.current.clientWidth });
    });
    if (mainRef.current) ro.observe(mainRef.current.parentElement!);

    // WebSocket
    let active = true;
    let subId: string | null = null;

    function connect() {
      const ws = new WebSocket(DERIV_WS);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        ws.send(JSON.stringify({
          ticks_history: symbol,
          subscribe: 1,
          end: "latest",
          count: 1000,
          granularity,
          style: "candles",
          adjust_start_time: 1,
        }));
      };

      ws.onmessage = (event) => {
        if (!active) return;
        const msg = JSON.parse(event.data);
        if (msg.error) {
          setStatus("error");
          return;
        }

        if (msg.msg_type === "candles" && msg.candles) {
          const bars: OHLCBar[] = msg.candles.map((c: any) => ({
            time: c.epoch as Time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            epoch: c.epoch,
            granularity,
          }));
          barsRef.current = bars;
          cs.setData(bars as CandlestickData[]);
          updateIndicators();
          mc.timeScale().fitContent();
          subId = msg.subscription?.id ?? null;
          setStatus("live");
          if (bars.length > 0) startCountdown(bars[bars.length - 1]);
        }

        if (msg.msg_type === "ohlc" && msg.ohlc) {
          const o = msg.ohlc;
          const bar: OHLCBar = {
            time: o.open_time as Time,
            open: parseFloat(o.open),
            high: parseFloat(o.high),
            low: parseFloat(o.low),
            close: parseFloat(o.close),
            epoch: o.open_time,
            granularity,
          };

          const bars = barsRef.current;
          if (bars.length > 0 && bars[bars.length - 1].epoch === bar.epoch) {
            bars[bars.length - 1] = bar;
          } else {
            bars.push(bar);
          }
          barsRef.current = [...bars];
          cs.update(bar as CandlestickData);
          updateIndicators();
          startCountdown(bar);
        }
      };

      ws.onclose = () => { if (active) setTimeout(connect, 2000); };
      ws.onerror = () => { ws.close(); setStatus("error"); };
    }

    connect();

    return () => {
      active = false;
      if (countdownRef.current) clearInterval(countdownRef.current);
      ro.disconnect();
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN && subId) {
          wsRef.current.send(JSON.stringify({ forget: subId }));
        }
        wsRef.current.close();
      }
      mc.remove();
      rc.remove();
    };
  }, [symbol, granularity, height, startCountdown, updateIndicators]);

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border/40" style={{ background: "#0a0a14" }}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <span className="font-mono font-bold text-sm text-foreground">{symbol}</span>
        <span className="text-xs text-muted-foreground">{timeframe}</span>
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-[10px] text-yellow-400/80">EMA 20</span>
          <span className="w-5 h-px bg-yellow-400/60 inline-block" />
          <span className="text-[10px] text-blue-400/80 ml-2">EMA 50</span>
          <span className="w-5 h-px bg-blue-400/60 inline-block border-dashed" />
          <span className="text-[10px] text-violet-400/80 ml-2">RSI 14</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Countdown */}
          {countdown !== null && status === "live" && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Next candle</span>
              <span className="font-mono text-sm font-bold text-primary tabular-nums">{fmt(countdown)}</span>
            </div>
          )}
          {/* Status */}
          {status === "live" && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
            </div>
          )}
          {status === "connecting" && (
            <span className="text-[10px] text-muted-foreground animate-pulse">Connecting...</span>
          )}
          {status === "error" && (
            <span className="text-[10px] text-rose-400">Feed error — retrying</span>
          )}
        </div>
      </div>

      {/* Main candlestick chart */}
      <div ref={mainRef} style={{ width: "100%", height: Math.round(height * 0.72) }} />

      {/* RSI divider label */}
      <div className="px-4 py-0.5 bg-white/[0.015] border-y border-white/5 flex items-center gap-2">
        <span className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-wider">RSI 14</span>
        <span className="text-[9px] text-muted-foreground/50">70 overbought · 30 oversold</span>
      </div>

      {/* RSI chart */}
      <div ref={rsiRef} style={{ width: "100%", height: Math.round(height * 0.22) }} />
    </div>
  );
}

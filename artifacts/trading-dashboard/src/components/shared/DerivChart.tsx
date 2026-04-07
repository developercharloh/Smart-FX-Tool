import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";

// ─── WebSocket ────────────────────────────────────────────────────────────────
const DERIV_WS = "wss://ws.binaryws.com/websockets/v3?app_id=1089";

// Deriv WebSocket symbols — forex uses frx prefix, synthetics use their own name
const DERIV_SYM: Record<string, string> = {
  EURUSD:"frxEURUSD", GBPUSD:"frxGBPUSD", USDJPY:"frxUSDJPY",
  AUDUSD:"frxAUDUSD", USDCAD:"frxUSDCAD", NZDUSD:"frxNZDUSD",
  USDCHF:"frxUSDCHF", GBPJPY:"frxGBPJPY", EURJPY:"frxEURJPY",
  EURGBP:"frxEURGBP", EURCHF:"frxEURCHF", EURCAD:"frxEURCAD",
  GBPCAD:"frxGBPCAD", AUDCAD:"frxAUDCAD", CADJPY:"frxCADJPY",
  AUDNZD:"frxAUDNZD", AUDCHF:"frxAUDCHF", GBPCHF:"frxGBPCHF",
  NZDJPY:"frxNZDJPY",
  // Synthetics — same symbol
  R_10:"R_10", R_25:"R_25", R_50:"R_50", R_75:"R_75", R_100:"R_100",
  "1HZ10V":"1HZ10V","1HZ25V":"1HZ25V","1HZ50V":"1HZ50V",
  "1HZ75V":"1HZ75V","1HZ100V":"1HZ100V",
  BOOM300:"BOOM300", BOOM500:"BOOM500", BOOM1000:"BOOM1000",
  CRASH300:"CRASH300", CRASH500:"CRASH500", CRASH1000:"CRASH1000",
  JD10:"JD10", JD25:"JD25", JD50:"JD50", JD75:"JD75", JD100:"JD100",
  STPIDX10:"STPIDX10",
};

const GRAN: Record<string, number> = {
  M1:60, M5:300, M15:900, M30:1800, H1:3600, H4:14400, D1:86400,
};

// ─── Indicator math ───────────────────────────────────────────────────────────
function ema(data: number[], p: number): number[] {
  const k = 2 / (p + 1), out: number[] = [];
  let e = data[0];
  for (let i = 0; i < data.length; i++) {
    e = i === 0 ? data[i] : data[i] * k + e * (1 - k);
    out.push(+e.toFixed(8));
  }
  return out;
}

function bb(data: number[], p = 20, mult = 2) {
  const upper: number[] = [], middle: number[] = [], lower: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < p - 1) { upper.push(NaN); middle.push(NaN); lower.push(NaN); continue; }
    const slice = data.slice(i - p + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / p;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - sma) ** 2, 0) / p);
    middle.push(+sma.toFixed(8));
    upper.push(+(sma + mult * std).toFixed(8));
    lower.push(+(sma - mult * std).toFixed(8));
  }
  return { upper, middle, lower };
}

function rsi(data: number[], p = 14): number[] {
  const out: number[] = new Array(p).fill(NaN);
  let ag = 0, al = 0;
  for (let i = 1; i <= p; i++) {
    const d = data[i] - data[i - 1];
    if (d > 0) ag += d; else al -= d;
  }
  ag /= p; al /= p;
  out.push(al === 0 ? 100 : +(100 - 100 / (1 + ag / al)).toFixed(2));
  for (let i = p + 1; i < data.length; i++) {
    const d = data[i] - data[i - 1];
    ag = (ag * (p - 1) + (d > 0 ? d : 0)) / p;
    al = (al * (p - 1) + (d < 0 ? -d : 0)) / p;
    out.push(al === 0 ? 100 : +(100 - 100 / (1 + ag / al)).toFixed(2));
  }
  return out;
}

function macd(data: number[]) {
  const fast = ema(data, 12), slow = ema(data, 26);
  const line = fast.map((v, i) => +(v - slow[i]).toFixed(8));
  const signal = ema(line, 9);
  const hist = line.map((v, i) => +(v - signal[i]).toFixed(8));
  return { line, signal, hist };
}

// ─── Theme ────────────────────────────────────────────────────────────────────
const THEME = {
  layout: { background: { type: ColorType.Solid, color: "#0a0a14" }, textColor: "#9ca3af", fontSize: 11 },
  grid: { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.03)" } },
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
  timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Bar { time: Time; open: number; high: number; low: number; close: number; epoch: number; }
interface DerivChartProps { symbol: string; timeframe?: string; height?: number; }

// ─── Component ────────────────────────────────────────────────────────────────
export function DerivChart({ symbol, timeframe = "H1", height = 580 }: DerivChartProps) {
  const mainRef  = useRef<HTMLDivElement>(null);
  const rsiRef   = useRef<HTMLDivElement>(null);
  const macdRef  = useRef<HTMLDivElement>(null);

  const charts = useRef<IChartApi[]>([]);
  const candleS  = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ema20S   = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50S   = useRef<ISeriesApi<"Line"> | null>(null);
  const bbUpS    = useRef<ISeriesApi<"Line"> | null>(null);
  const bbMidS   = useRef<ISeriesApi<"Line"> | null>(null);
  const bbLowS   = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiS     = useRef<ISeriesApi<"Line"> | null>(null);
  const macdLS   = useRef<ISeriesApi<"Line"> | null>(null);
  const macdSigS = useRef<ISeriesApi<"Line"> | null>(null);
  const macdHistS= useRef<ISeriesApi<"Histogram"> | null>(null);

  const barsRef  = useRef<Bar[]>([]);
  const wsRef    = useRef<WebSocket | null>(null);

  const [status, setStatus] = useState<"connecting"|"live"|"error">("connecting");
  const [countdown, setCountdown] = useState<number|null>(null);
  const cdRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const gran = GRAN[timeframe] ?? 3600;

  // ── countdown ──
  const startCd = useCallback((epoch: number) => {
    if (cdRef.current) clearInterval(cdRef.current);
    cdRef.current = setInterval(() => {
      const rem = (epoch + gran) - Math.floor(Date.now() / 1000);
      setCountdown(rem > 0 ? rem : 0);
      if (rem <= 0 && cdRef.current) clearInterval(cdRef.current);
    }, 1000);
  }, [gran]);

  // ── rebuild all indicators from barsRef ──
  const rebuildIndicators = useCallback(() => {
    const bars = barsRef.current;
    if (bars.length < 2) return;
    const times = bars.map(b => b.time);
    const closes = bars.map(b => b.close);

    // EMA 20
    const e20 = ema(closes, 20);
    ema20S.current?.setData(times.map((t,i) => ({ time:t, value:e20[i] })));

    // EMA 50
    if (bars.length >= 50) {
      const e50 = ema(closes, 50);
      ema50S.current?.setData(times.map((t,i) => ({ time:t, value:e50[i] })));
    }

    // BB
    if (bars.length >= 20) {
      const { upper, middle, lower } = bb(closes);
      const clean = (arr: number[]) =>
        times.map((t,i) => ({ time:t, value:arr[i] })).filter(p => !isNaN(p.value));
      bbUpS.current?.setData(clean(upper));
      bbMidS.current?.setData(clean(middle));
      bbLowS.current?.setData(clean(lower));
    }

    // RSI
    if (bars.length > 15) {
      const r = rsi(closes);
      rsiS.current?.setData(
        times.map((t,i)=>({time:t,value:r[i]})).filter(p=>!isNaN(p.value))
      );
    }

    // MACD
    if (bars.length > 35) {
      const { line, signal, hist } = macd(closes);
      macdLS.current?.setData(times.map((t,i)=>({time:t,value:line[i]})));
      macdSigS.current?.setData(times.map((t,i)=>({time:t,value:signal[i]})));
      macdHistS.current?.setData(times.map((t,i)=>({
        time:t, value:hist[i],
        color: hist[i] >= 0 ? "rgba(38,166,154,0.7)" : "rgba(239,83,80,0.7)"
      })));
    }
  }, []);

  // ── chart setup ──
  useEffect(() => {
    if (!mainRef.current || !rsiRef.current || !macdRef.current) return;

    const mainH = Math.round(height * 0.60);
    const rsiH  = Math.round(height * 0.19);
    const macdH = Math.round(height * 0.19);

    // ── main chart ──
    const mc = createChart(mainRef.current, { ...THEME, width: mainRef.current.clientWidth, height: mainH });
    candleS.current  = mc.addSeries(CandlestickSeries, { upColor:"#26a69a", downColor:"#ef5350", borderVisible:false, wickUpColor:"#26a69a", wickDownColor:"#ef5350" });
    ema20S.current   = mc.addSeries(LineSeries, { color:"#facc15",  lineWidth:1, priceLineVisible:false, lastValueVisible:false });
    ema50S.current   = mc.addSeries(LineSeries, { color:"#60a5fa",  lineWidth:1, priceLineVisible:false, lastValueVisible:false, lineStyle:LineStyle.Dashed });
    bbUpS.current    = mc.addSeries(LineSeries, { color:"rgba(96,165,250,0.45)", lineWidth:1, priceLineVisible:false, lastValueVisible:false });
    bbMidS.current   = mc.addSeries(LineSeries, { color:"rgba(96,165,250,0.25)", lineWidth:1, priceLineVisible:false, lastValueVisible:false, lineStyle:LineStyle.Dashed });
    bbLowS.current   = mc.addSeries(LineSeries, { color:"rgba(96,165,250,0.45)", lineWidth:1, priceLineVisible:false, lastValueVisible:false });

    // ── RSI chart ──
    const rc = createChart(rsiRef.current, { ...THEME, width: rsiRef.current.clientWidth, height: rsiH, timeScale:{ ...THEME.timeScale, visible:false } });
    rsiS.current = rc.addSeries(LineSeries, { color:"#a78bfa", lineWidth:1, priceLineVisible:false, lastValueVisible:true });
    rc.addSeries(LineSeries, { color:"rgba(239,83,80,0.35)", lineWidth:1, lineStyle:LineStyle.Dashed, priceLineVisible:false, lastValueVisible:false })
      .setData([{time:1 as Time, value:70},{time:9999999999 as Time, value:70}]);
    rc.addSeries(LineSeries, { color:"rgba(38,166,154,0.35)", lineWidth:1, lineStyle:LineStyle.Dashed, priceLineVisible:false, lastValueVisible:false })
      .setData([{time:1 as Time, value:30},{time:9999999999 as Time, value:30}]);

    // ── MACD chart ──
    const macdC = createChart(macdRef.current, { ...THEME, width: macdRef.current.clientWidth, height: macdH, timeScale:{ ...THEME.timeScale, visible:true } });
    macdHistS.current = macdC.addSeries(HistogramSeries, { priceLineVisible:false, lastValueVisible:false });
    macdLS.current    = macdC.addSeries(LineSeries, { color:"#facc15", lineWidth:1, priceLineVisible:false, lastValueVisible:true });
    macdSigS.current  = macdC.addSeries(LineSeries, { color:"#f87171", lineWidth:1, priceLineVisible:false, lastValueVisible:true });

    charts.current = [mc, rc, macdC];

    // ── sync time scale across all three panes ──
    mc.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range) {
        rc.timeScale().setVisibleLogicalRange(range);
        macdC.timeScale().setVisibleLogicalRange(range);
      }
    });

    // ── resize observer ──
    const parent = mainRef.current.parentElement!;
    const ro = new ResizeObserver(() => {
      const w = parent.clientWidth;
      mc.applyOptions({ width: w });
      rc.applyOptions({ width: w });
      macdC.applyOptions({ width: w });
    });
    ro.observe(parent);

    // ── WebSocket ──
    let active = true;
    let subId: string | null = null;
    const derivSym = DERIV_SYM[symbol] ?? symbol;

    function connect() {
      const ws = new WebSocket(DERIV_WS);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        ws.send(JSON.stringify({
          ticks_history: derivSym,
          subscribe: 1,
          end: "latest",
          count: 1000,
          granularity: gran,
          style: "candles",
          adjust_start_time: 1,
        }));
      };

      ws.onmessage = ({ data }) => {
        if (!active) return;
        const msg = JSON.parse(data);
        if (msg.error) { setStatus("error"); return; }

        if (msg.msg_type === "candles" && msg.candles) {
          const bars: Bar[] = msg.candles.map((c: any) => ({
            time: c.epoch as Time,
            open: +c.open, high: +c.high, low: +c.low, close: +c.close,
            epoch: c.epoch,
          }));
          barsRef.current = bars;
          candleS.current?.setData(bars);
          rebuildIndicators();
          mc.timeScale().fitContent();
          subId = msg.subscription?.id ?? null;
          setStatus("live");
          if (bars.length) startCd(bars[bars.length - 1].epoch);
        }

        if (msg.msg_type === "ohlc" && msg.ohlc) {
          const o = msg.ohlc;
          const bar: Bar = {
            time: o.open_time as Time,
            open: +o.open, high: +o.high, low: +o.low, close: +o.close,
            epoch: o.open_time,
          };
          const bars = barsRef.current;
          if (bars.length && bars[bars.length - 1].epoch === bar.epoch) {
            bars[bars.length - 1] = bar;
          } else {
            bars.push(bar);
          }
          candleS.current?.update(bar);
          rebuildIndicators();
          startCd(bar.epoch);
        }
      };

      ws.onclose = () => { if (active) setTimeout(connect, 2000); };
      ws.onerror = () => { ws.close(); };
    }

    connect();

    return () => {
      active = false;
      if (cdRef.current) clearInterval(cdRef.current);
      ro.disconnect();
      if (wsRef.current?.readyState === WebSocket.OPEN && subId) {
        wsRef.current.send(JSON.stringify({ forget: subId }));
      }
      wsRef.current?.close();
      charts.current.forEach(c => c.remove());
      charts.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, gran, height]);

  function fmtCd(s: number) {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}m ${String(sec).padStart(2,"0")}s` : `${s}s`;
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border/40" style={{ background:"#0a0a14" }}>
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-white/5 bg-white/[0.02]">
        <span className="font-mono font-bold text-sm">{symbol}</span>
        <span className="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{timeframe}</span>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
          <span className="flex items-center gap-1"><span className="w-4 h-px bg-yellow-400/70 inline-block"/>EMA 20</span>
          <span className="flex items-center gap-1"><span className="w-4 h-px bg-blue-400/60 inline-block border-dashed"/>EMA 50</span>
          <span className="flex items-center gap-1"><span className="w-4 h-px bg-blue-400/40 inline-block"/>BB(20)</span>
          <span className="flex items-center gap-1"><span className="w-4 h-px bg-violet-400/70 inline-block"/>RSI 14</span>
          <span className="flex items-center gap-1"><span className="w-4 h-px bg-yellow-400/70 inline-block"/>MACD</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {countdown !== null && status === "live" && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Next candle</span>
              <span className="font-mono text-sm font-bold text-primary tabular-nums">{fmtCd(countdown)}</span>
            </div>
          )}
          {status === "live" && (
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"/>
              </span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Live</span>
            </span>
          )}
          {status === "connecting" && <span className="text-[10px] text-muted-foreground animate-pulse">Connecting…</span>}
          {status === "error"      && <span className="text-[10px] text-rose-400">Error — retrying…</span>}
        </div>
      </div>

      {/* ── Main candlestick ── */}
      <div ref={mainRef} style={{ width:"100%", height:Math.round(height*0.60) }}/>

      {/* ── RSI label ── */}
      <div className="px-4 py-0.5 bg-white/[0.015] border-y border-white/5 flex gap-2 items-center">
        <span className="text-[10px] font-semibold text-violet-400/80 uppercase tracking-wider">RSI 14</span>
        <span className="text-[9px] text-muted-foreground/40">70 = overbought · 30 = oversold</span>
      </div>
      <div ref={rsiRef} style={{ width:"100%", height:Math.round(height*0.19) }}/>

      {/* ── MACD label ── */}
      <div className="px-4 py-0.5 bg-white/[0.015] border-y border-white/5 flex gap-2 items-center">
        <span className="text-[10px] font-semibold text-yellow-400/80 uppercase tracking-wider">MACD 12/26/9</span>
        <span className="w-3 h-px bg-yellow-400/60 inline-block"/>
        <span className="text-[9px] text-muted-foreground/40">Signal</span>
        <span className="w-3 h-px bg-rose-400/60 inline-block"/>
      </div>
      <div ref={macdRef} style={{ width:"100%", height:Math.round(height*0.19) }}/>
    </div>
  );
}

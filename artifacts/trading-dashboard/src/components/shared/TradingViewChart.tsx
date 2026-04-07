import { useEffect, useRef, memo } from "react";

declare global {
  interface Window {
    TradingView: any;
  }
}

const TIMEFRAME_MAP: Record<string, string> = {
  M1: "1",
  M5: "5",
  M15: "15",
  M30: "30",
  H1: "60",
  H4: "240",
  D1: "D",
  W1: "W",
  MN: "M",
};

const TV_SYMBOL_MAP: Record<string, string> = {
  // Forex majors
  EURUSD: "FX:EURUSD",
  GBPUSD: "FX:GBPUSD",
  USDJPY: "FX:USDJPY",
  AUDUSD: "FX:AUDUSD",
  USDCAD: "FX:USDCAD",
  NZDUSD: "FX:NZDUSD",
  USDCHF: "FX:USDCHF",
  // Forex crosses
  GBPJPY: "FX:GBPJPY",
  EURJPY: "FX:EURJPY",
  EURGBP: "FX:EURGBP",
  EURCHF: "FX:EURCHF",
  EURCAD: "FX:EURCAD",
  GBPCAD: "FX:GBPCAD",
  AUDCAD: "FX:AUDCAD",
  CADJPY: "FX:CADJPY",
  AUDNZD: "FX:AUDNZD",
  AUDCHF: "FX:AUDCHF",
  GBPCHF: "FX:GBPCHF",
  NZDJPY: "FX:NZDJPY",
  // Deriv Volatility Indices
  R_10: "DERIV:R_10",
  R_25: "DERIV:R_25",
  R_50: "DERIV:R_50",
  R_75: "DERIV:R_75",
  R_100: "DERIV:R_100",
  "1HZ10V": "DERIV:1HZ10V",
  "1HZ25V": "DERIV:1HZ25V",
  "1HZ50V": "DERIV:1HZ50V",
  "1HZ75V": "DERIV:1HZ75V",
  "1HZ100V": "DERIV:1HZ100V",
  // Deriv Boom & Crash
  BOOM300: "DERIV:BOOM300",
  BOOM500: "DERIV:BOOM500",
  BOOM1000: "DERIV:BOOM1000",
  CRASH300: "DERIV:CRASH300",
  CRASH500: "DERIV:CRASH500",
  CRASH1000: "DERIV:CRASH1000",
  // Deriv Step Indices
  STPIDX10: "DERIV:STPIDX10",
  // Deriv Jump Indices
  JD10: "DERIV:JD10",
  JD25: "DERIV:JD25",
  JD50: "DERIV:JD50",
  JD75: "DERIV:JD75",
  JD100: "DERIV:JD100",
};

let widgetCounter = 0;

interface TradingViewChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
}

function TradingViewChart({ symbol, timeframe = "H1", height = 520 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const containerId = useRef(`tv_chart_${++widgetCounter}`);

  const tvSymbol = TV_SYMBOL_MAP[symbol] || `FX:${symbol}`;
  const tvInterval = TIMEFRAME_MAP[timeframe] || "60";

  useEffect(() => {
    const containerId_ = containerId.current;

    function createWidget() {
      if (!containerRef.current || !window.TradingView) return;

      if (widgetRef.current) {
        try { widgetRef.current.remove?.(); } catch {}
        widgetRef.current = null;
      }

      widgetRef.current = new window.TradingView.widget({
        container_id: containerId_,
        width: "100%",
        height: height,
        symbol: tvSymbol,
        interval: tvInterval,
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0f0f14",
        backgroundColor: "rgba(10,10,18,1)",
        gridColor: "rgba(255,255,255,0.04)",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        allow_symbol_change: false,
        hide_volume: false,
        studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
        withdateranges: true,
        details: false,
        hotlist: false,
        calendar: false,
      });
    }

    const existingScript = document.getElementById("tradingview-widget-script");

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "tradingview-widget-script";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = createWidget;
      document.head.appendChild(script);
    } else if (window.TradingView) {
      createWidget();
    } else {
      existingScript.addEventListener("load", createWidget);
    }

    return () => {
      if (widgetRef.current) {
        try { widgetRef.current.remove?.(); } catch {}
        widgetRef.current = null;
      }
    };
  }, [tvSymbol, tvInterval, height]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border/40 bg-[#0a0a12]" style={{ minHeight: height }}>
      <div id={containerId.current} ref={containerRef} style={{ height }} />
    </div>
  );
}

export default memo(TradingViewChart);

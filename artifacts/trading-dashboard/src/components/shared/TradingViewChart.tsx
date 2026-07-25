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
  // Cryptocurrency — Bitstamp (USD pairs) + Binance (USDT pairs)
  BTCUSD:   "BITSTAMP:BTCUSD",
  ETHUSD:   "BITSTAMP:ETHUSD",
  XRPUSD:   "BITSTAMP:XRPUSD",
  LTCUSD:   "BITSTAMP:LTCUSD",
  DOGEUSD:  "BITSTAMP:DOGEUSD",
  DOTUSD:   "COINBASE:DOTUSD",
  BNBUSDT:  "BINANCE:BNBUSDT",
  SOLUSDT:  "BINANCE:SOLUSDT",
  ADAUSDT:  "BINANCE:ADAUSDT",
  AVAXUSDT: "BINANCE:AVAXUSDT",
  MATICUSDT:"BINANCE:MATICUSDT",
  LINKUSDT: "BINANCE:LINKUSDT",
  // Commodities
  XAUUSD:   "OANDA:XAUUSD",
  XAGUSD:   "OANDA:XAGUSD",
  XPTUSD:   "TVC:PLATINUM",
  USOIL:    "TVC:USOIL",
  UKOIL:    "TVC:UKOIL",
  NATGAS:   "TVC:NATGAS",
  COPPER:   "TVC:COPPER",
  // Forex majors — OANDA feed
  EURUSD: "OANDA:EURUSD",
  GBPUSD: "OANDA:GBPUSD",
  USDJPY: "OANDA:USDJPY",
  AUDUSD: "OANDA:AUDUSD",
  USDCAD: "OANDA:USDCAD",
  NZDUSD: "OANDA:NZDUSD",
  USDCHF: "OANDA:USDCHF",
  // Forex crosses
  GBPJPY: "OANDA:GBPJPY",
  EURJPY: "OANDA:EURJPY",
  EURGBP: "OANDA:EURGBP",
  EURCHF: "OANDA:EURCHF",
  EURCAD: "OANDA:EURCAD",
  GBPCAD: "OANDA:GBPCAD",
  AUDCAD: "OANDA:AUDCAD",
  CADJPY: "OANDA:CADJPY",
  AUDNZD: "OANDA:AUDNZD",
  AUDCHF: "OANDA:AUDCHF",
  GBPCHF: "OANDA:GBPCHF",
  NZDJPY: "OANDA:NZDJPY",
  // Deriv Volatility Indices — TradingView symbol names
  R_10: "DERIV:VOL10INDEX",
  R_25: "DERIV:VOL25INDEX",
  R_50: "DERIV:VOL50INDEX",
  R_75: "DERIV:VOL75INDEX",
  R_100: "DERIV:VOL100INDEX",
  "1HZ10V": "DERIV:1HZ10V",
  "1HZ25V": "DERIV:1HZ25V",
  "1HZ50V": "DERIV:1HZ50V",
  "1HZ75V": "DERIV:1HZ75V",
  "1HZ100V": "DERIV:1HZ100V",
  // Deriv Boom & Crash
  BOOM300: "DERIV:BOOM300N1",
  BOOM500: "DERIV:BOOM500N1",
  BOOM1000: "DERIV:BOOM1000N1",
  CRASH300: "DERIV:CRASH300N1",
  CRASH500: "DERIV:CRASH500N1",
  CRASH1000: "DERIV:CRASH1000N1",
  // Deriv Step Indices
  STPIDX10: "DERIV:STPIDX10",
  // Deriv Jump Indices
  JD10: "DERIV:JD10INDEX",
  JD25: "DERIV:JD25INDEX",
  JD50: "DERIV:JD50INDEX",
  JD75: "DERIV:JD75INDEX",
  JD100: "DERIV:JD100INDEX",
};

let widgetCounter = 0;

interface TradingViewChartProps {
  symbol: string;
  timeframe?: string;
  height?: number;
}

function TradingViewChart({ symbol, timeframe = "H1", height = 580 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const containerId = useRef(`tv_chart_${++widgetCounter}`);

  const tvSymbol = TV_SYMBOL_MAP[symbol] || `OANDA:${symbol}`;
  const tvInterval = TIMEFRAME_MAP[timeframe] || "60";

  useEffect(() => {
    const id = containerId.current;

    function createWidget() {
      if (!containerRef.current || !window.TradingView) return;

      if (widgetRef.current) {
        try { widgetRef.current.remove?.(); } catch {}
        widgetRef.current = null;
      }

      widgetRef.current = new window.TradingView.widget({
        container_id: id,
        symbol: tvSymbol,
        interval: tvInterval,
        autosize: true,
        theme: "dark",
        style: "1",
        locale: "en",
        timezone: "exchange",
        toolbar_bg: "#0d0d14",
        backgroundColor: "rgba(10,10,20,1)",
        gridColor: "rgba(255,255,255,0.03)",
        hide_top_toolbar: false,
        hide_legend: false,
        hide_side_toolbar: false,
        withdateranges: true,
        allow_symbol_change: true,
        watchlist: [],
        enabled_features: [
          "use_localstorage_for_settings",
          "side_toolbar_in_fullscreen_mode",
          "header_in_fullscreen_mode",
          "adaptive_logo",
        ],
        disabled_features: [
          "volume_force_overlay",
        ],
        studies: [],
        show_popup_button: true,
        details: true,
        hotlist: false,
        calendar: false,
        news: [],
        enable_publishing: false,
        save_image: true,
        copyright_style: {
          override: false,
        },
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
  }, [tvSymbol, tvInterval]);

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-border/40"
      style={{ height, minHeight: height, background: "rgba(10,10,20,1)" }}
    >
      <div id={containerId.current} ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default memo(TradingViewChart);

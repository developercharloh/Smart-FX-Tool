import { memo } from "react";

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
  const gran = GRAN_MAP[timeframe] || 3600;
  const src = `https://charts.deriv.com/deriv?symbol=${encodeURIComponent(symbol)}&granularity=${gran}`;

  return (
    <div
      className="w-full rounded-xl overflow-hidden border border-border/40"
      style={{ height, minHeight: height, background: "rgba(10,10,20,1)" }}
    >
      <iframe
        key={src}
        src={src}
        title={`${symbol} Live Chart`}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allow="fullscreen"
      />
    </div>
  );
}

export default memo(SyntheticChart);

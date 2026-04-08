import { useState, useMemo } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  pair:       string;
  entry:      number;
  stopLoss:   number;
  takeProfit: number;
  signal:     "BUY" | "SELL" | "NEUTRAL";
}

function pipSize(pair: string): number {
  if (pair?.includes("JPY"))                                          return 0.01;
  if (["XAUUSD","XAGUSD","XPTUSD"].includes(pair))                   return 0.01;
  if (["USOIL","UKOIL","NATGAS","COPPER"].includes(pair))             return 0.001;
  const CRYPTO = ["BTCUSD","ETHUSD","BNBUSDT","SOLUSDT","AVAXUSDT","LTCUSD","DOGEUSD","MATICUSDT","ADAUSDT","LINKUSDT","DOTUSD","XRPUSD"];
  if (CRYPTO.includes(pair))                                          return 1;
  return 0.0001;
}

function pipValuePerLot(pair: string): number {
  if (pair?.includes("JPY"))                return 9.10;
  if (["XAUUSD"].includes(pair))            return 10;
  if (["XAGUSD"].includes(pair))            return 50;
  if (["USOIL","UKOIL"].includes(pair))     return 10;
  if (["NATGAS"].includes(pair))            return 10;
  if (["COPPER"].includes(pair))            return 10;
  const CRYPTO = ["BTCUSD","ETHUSD","BNBUSDT","SOLUSDT","AVAXUSDT","LTCUSD","DOGEUSD","MATICUSDT","ADAUSDT","LINKUSDT","DOTUSD","XRPUSD"];
  if (CRYPTO.includes(pair))               return 1;
  return 10;
}

function fmt(v: number, dp = 2) { return v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); }

export function PositionSizeCalc({ pair, entry, stopLoss, takeProfit, signal }: Props) {
  const [balance, setBalance] = useState(1000);
  const [risk,    setRisk]    = useState(1);
  const [open,    setOpen]    = useState(true);

  const calc = useMemo(() => {
    const ps        = pipSize(pair);
    const pvl       = pipValuePerLot(pair);
    const slPips    = Math.abs(entry - stopLoss)   / ps;
    const tpPips    = Math.abs(takeProfit - entry) / ps;
    const dollarRisk   = (balance * risk) / 100;
    const lotSize      = pvl > 0 && slPips > 0 ? dollarRisk / (slPips * pvl) : 0;
    const potentialGain = lotSize * tpPips * pvl;
    const rr           = tpPips > 0 && slPips > 0 ? (tpPips / slPips) : 0;
    const miniLots  = lotSize * 10;
    const microLots = lotSize * 100;
    return { slPips, tpPips, dollarRisk, lotSize, potentialGain, rr, miniLots, microLots };
  }, [pair, entry, stopLoss, takeProfit, balance, risk]);

  if (signal === "NEUTRAL") return null;

  const isLong = signal === "BUY";

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold font-mono">Position Size Calculator</span>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isLong ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400",
          )}>{signal}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Balance ($)</label>
              <div className="flex items-center rounded-lg border border-border/60 bg-background/50 overflow-hidden">
                <span className="px-2.5 text-muted-foreground text-sm font-bold">$</span>
                <input
                  type="number" min={100} max={10000000} step={100}
                  value={balance}
                  onChange={e => setBalance(Math.max(100, Number(e.target.value)))}
                  className="flex-1 bg-transparent py-2 pr-3 text-sm font-mono outline-none text-foreground"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Risk per Trade — <span className="text-primary">{risk}%</span>
              </label>
              <div className="pt-1 space-y-1">
                <input
                  type="range" min={0.25} max={5} step={0.25}
                  value={risk}
                  onChange={e => setRisk(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground/50">
                  <span>0.25%</span><span>2.5%</span><span>5%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Dollar Risk",      value: `$${fmt(calc.dollarRisk)}`,       highlight: "text-rose-400" },
              { label: "Potential Profit", value: `$${fmt(calc.potentialGain)}`,    highlight: "text-emerald-400" },
              { label: "SL Distance",      value: `${fmt(calc.slPips, 1)} pips`,    highlight: "" },
              { label: "TP Distance",      value: `${fmt(calc.tpPips, 1)} pips`,    highlight: "" },
              { label: "Risk:Reward",      value: `1 : ${fmt(calc.rr)}`,            highlight: calc.rr >= 2 ? "text-emerald-400" : "text-amber-400" },
              { label: "Standard Lots",    value: fmt(calc.lotSize, 3),             highlight: "text-primary" },
              { label: "Mini Lots",        value: fmt(calc.miniLots, 2),            highlight: "" },
              { label: "Micro Lots",       value: fmt(calc.microLots, 1),           highlight: "" },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="rounded-lg bg-black/20 border border-border/20 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">{label}</p>
                <p className={cn("text-sm font-bold font-mono", highlight || "text-foreground")}>{value}</p>
              </div>
            ))}
          </div>

          {/* Risk warning */}
          {risk > 2 && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <span className="text-amber-400 text-sm">⚠</span>
              <p className="text-[11px] text-amber-400/90">Risk above 2% per trade is aggressive. Consider reducing to protect your account.</p>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/40 text-right">
            Based on {pair} pip value · Standard lot = 100,000 units
          </p>
        </div>
      )}
    </div>
  );
}

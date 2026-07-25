import { useState } from "react";
import { Calculator, Info, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalcResult {
  lotSize: number;
  riskAmount: number;
  pipsAtRisk: number;
  pipValue: number;
  potentialProfit: number;
  rrRatio: number;
}

const PAIR_PIP_VALUES: Record<string, { decimals: number; pipSize: number }> = {
  EURUSD: { decimals: 5, pipSize: 0.0001 },
  GBPUSD: { decimals: 5, pipSize: 0.0001 },
  AUDUSD: { decimals: 5, pipSize: 0.0001 },
  NZDUSD: { decimals: 5, pipSize: 0.0001 },
  USDCAD: { decimals: 5, pipSize: 0.0001 },
  USDCHF: { decimals: 5, pipSize: 0.0001 },
  USDJPY: { decimals: 3, pipSize: 0.01   },
  GBPJPY: { decimals: 3, pipSize: 0.01   },
  EURJPY: { decimals: 3, pipSize: 0.01   },
  CADJPY: { decimals: 3, pipSize: 0.01   },
  XAUUSD: { decimals: 2, pipSize: 0.1    },
  XAGUSD: { decimals: 3, pipSize: 0.001  },
  BTCUSD: { decimals: 2, pipSize: 1      },
  ETHUSD: { decimals: 2, pipSize: 0.1    },
  USOIL:  { decimals: 2, pipSize: 0.01   },
};

const POPULAR_PAIRS = [
  "EURUSD","GBPUSD","USDJPY","AUDUSD","USDCAD","NZDUSD","USDCHF",
  "GBPJPY","EURJPY","XAUUSD","XAGUSD","BTCUSD","ETHUSD","USOIL",
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
        {hint && <span className="text-[10px] text-muted-foreground/60">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function NumInput({
  value, onChange, prefix, suffix, step = "any", min = "0"
}: { value: string; onChange: (v: string) => void; prefix?: string; suffix?: string; step?: string; min?: string }) {
  return (
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-sm text-muted-foreground font-mono">{prefix}</span>}
      <input
        type="number" value={value} onChange={e => onChange(e.target.value)}
        step={step} min={min}
        className={cn(
          "w-full bg-background border border-border/60 rounded-lg py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary/60 transition-colors",
          prefix ? "pl-7" : "pl-3",
          suffix ? "pr-12" : "pr-3"
        )}
      />
      {suffix && <span className="absolute right-3 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

export default function RiskCalculator() {
  const [balance,  setBalance]  = useState("10000");
  const [riskPct,  setRiskPct]  = useState("1");
  const [pair,     setPair]     = useState("EURUSD");
  const [entry,    setEntry]    = useState("");
  const [sl,       setSl]       = useState("");
  const [tp,       setTp]       = useState("");
  const [dir,      setDir]      = useState<"BUY" | "SELL">("BUY");

  function calculate(): CalcResult | null {
    const bal  = parseFloat(balance);
    const risk = parseFloat(riskPct) / 100;
    const ent  = parseFloat(entry);
    const stop = parseFloat(sl);
    const take = parseFloat(tp);

    if (!bal || !risk || !ent || !stop) return null;

    const pairInfo = PAIR_PIP_VALUES[pair] ?? { decimals: 5, pipSize: 0.0001 };
    const riskAmount = bal * risk;
    const slDist = Math.abs(ent - stop);
    const pipsAtRisk = slDist / pairInfo.pipSize;
    if (pipsAtRisk <= 0) return null;

    let pipValue = 10;
    if (pair.endsWith("JPY")) pipValue = 10;
    else if (pair === "XAUUSD") pipValue = 10;
    else if (pair === "BTCUSD") pipValue = 1;
    else if (pair === "ETHUSD") pipValue = 1;
    else pipValue = 10;

    const lotSize = parseFloat((riskAmount / (pipsAtRisk * pipValue)).toFixed(2));
    const potentialProfit = take ? Math.abs(take - ent) / pairInfo.pipSize * pipValue * lotSize : 0;
    const rrRatio = potentialProfit > 0 ? parseFloat((potentialProfit / riskAmount).toFixed(2)) : 0;

    return { lotSize, riskAmount, pipsAtRisk: parseFloat(pipsAtRisk.toFixed(1)), pipValue, potentialProfit: parseFloat(potentialProfit.toFixed(2)), rrRatio };
  }

  const result = calculate();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" /> Risk Calculator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Calculate your ideal lot size based on account balance and risk percentage.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-5 rounded-xl border border-border/40 bg-card/30 p-5">
          <h2 className="text-sm font-bold text-foreground/80">Trade Setup</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Account Balance">
              <NumInput value={balance} onChange={setBalance} prefix="$" step="100" />
            </Field>
            <Field label="Risk Per Trade">
              <NumInput value={riskPct} onChange={setRiskPct} suffix="%" step="0.1" min="0.1" />
            </Field>
          </div>

          <Field label="Pair">
            <select
              value={pair} onChange={e => setPair(e.target.value)}
              className="w-full bg-background border border-border/60 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60"
            >
              {POPULAR_PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Direction">
            <div className="grid grid-cols-2 gap-2">
              {(["BUY", "SELL"] as const).map(d => (
                <button key={d} onClick={() => setDir(d)}
                  className={cn(
                    "py-2.5 rounded-lg border text-sm font-bold transition-all",
                    dir === d
                      ? d === "BUY"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-rose-500/15 border-rose-500/40 text-rose-400"
                      : "border-border/40 text-muted-foreground hover:border-primary/40"
                  )}>
                  {d === "BUY" ? "↑" : "↓"} {d}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Entry">
              <NumInput value={entry} onChange={setEntry} step="any" />
            </Field>
            <Field label="Stop Loss">
              <NumInput value={sl} onChange={setSl} step="any" />
            </Field>
            <Field label="Take Profit" hint="optional">
              <NumInput value={tp} onChange={setTp} step="any" />
            </Field>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold font-mono text-primary">{result.lotSize}</p>
                  <p className="text-xs text-muted-foreground mt-1">Recommended Lot Size</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Risk Amount",    value: `$${result.riskAmount.toFixed(2)}`,   color: "text-rose-400" },
                    { label: "Pips at Risk",   value: `${result.pipsAtRisk} pips`,           color: "text-amber-400" },
                    { label: "Pip Value",      value: `$${result.pipValue}`,                 color: "text-foreground" },
                    { label: "Pot. Profit",    value: result.potentialProfit > 0 ? `$${result.potentialProfit.toFixed(2)}` : "—", color: "text-emerald-400" },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg bg-background/50 border border-border/40 p-3 text-center">
                      <p className={cn("text-lg font-bold font-mono", item.color)}>{item.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                {result.rrRatio > 0 && (
                  <div className={cn(
                    "rounded-lg border p-3 flex items-center justify-between",
                    result.rrRatio >= 2 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"
                  )}>
                    <div className="flex items-center gap-2">
                      {result.rrRatio >= 2 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-amber-400" />}
                      <span className="text-sm font-semibold">Risk/Reward Ratio</span>
                    </div>
                    <span className={cn("text-lg font-bold font-mono", result.rrRatio >= 2 ? "text-emerald-400" : "text-amber-400")}>
                      1:{result.rrRatio}
                    </span>
                  </div>
                )}
              </div>

              {/* MT4/MT5 Copy */}
              <div className="rounded-xl border border-border/40 bg-card/30 p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">MT4/MT5 Summary</p>
                <div className="font-mono text-xs text-foreground/80 bg-background rounded-lg p-3 leading-relaxed border border-border/40">
                  <p>{dir} {pair} @ {entry || "—"}</p>
                  <p>SL: {sl || "—"} | TP: {tp || "—"}</p>
                  <p>Lot Size: {result.lotSize} | Risk: ${result.riskAmount.toFixed(2)} ({riskPct}%)</p>
                  {result.rrRatio > 0 && <p>R:R 1:{result.rrRatio}</p>}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border/40 bg-card/30 p-8 text-center space-y-3">
              <Calculator className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Fill in entry and stop loss to calculate</p>
              <div className="text-left rounded-lg bg-background/50 border border-border/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Info className="w-3 h-3" /> How it works</p>
                <p className="text-[11px] text-muted-foreground">Lot Size = Risk Amount ÷ (Pips at Risk × Pip Value)</p>
                <p className="text-[11px] text-muted-foreground">Standard lot = 100,000 units. 0.01 = micro lot.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

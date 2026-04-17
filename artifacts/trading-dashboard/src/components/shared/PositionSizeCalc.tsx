import { useState, useMemo } from "react";
import { Calculator, ChevronDown, ChevronUp, AlertTriangle, Info, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  pair:           string;
  entry:          number;
  stopLoss:       number;
  takeProfit:     number;
  signal:         "BUY" | "SELL" | "NEUTRAL";
  confidence?:    number;
  sessionQuality?: string;
  session?:       string;
}

type AccountType = "nano" | "micro" | "mini" | "standard";

const ACCOUNT_TYPES: {
  id:         AccountType;
  label:      string;
  desc:       string;
  defaultBal: number;
  lotLabel:   string;
  lotKey:     "microLots" | "miniLots" | "lotSize";
  maxRisk:    number;
}[] = [
  { id: "nano",     label: "Nano",     desc: "< $500",       defaultBal: 200,   lotLabel: "Micro Lots (0.01)",  lotKey: "microLots", maxRisk: 1   },
  { id: "micro",    label: "Micro",    desc: "$500 – $5k",   defaultBal: 1000,  lotLabel: "Mini Lots (0.10)",   lotKey: "miniLots",  maxRisk: 1.5 },
  { id: "mini",     label: "Mini",     desc: "$5k – $25k",   defaultBal: 10000, lotLabel: "Mini Lots (0.10)",   lotKey: "miniLots",  maxRisk: 1   },
  { id: "standard", label: "Standard", desc: "> $25k",        defaultBal: 50000, lotLabel: "Standard Lots (1.0)", lotKey: "lotSize",   maxRisk: 0.5 },
];

function pipSize(pair: string): number {
  if (pair?.includes("JPY"))                                                          return 0.01;
  if (["XAUUSD","XAGUSD","XPTUSD"].includes(pair))                                   return 0.01;
  if (["USOIL","UKOIL","NATGAS","COPPER"].includes(pair))                             return 0.001;
  const CRYPTO = ["BTCUSD","ETHUSD","BNBUSDT","SOLUSDT","AVAXUSDT","LTCUSD","DOGEUSD","MATICUSDT","ADAUSDT","LINKUSDT","DOTUSD","XRPUSD"];
  if (CRYPTO.includes(pair))                                                          return 1;
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

function fmt(v: number, dp = 2) {
  return v.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function fmtLot(v: number): string {
  if (v === 0) return "0.00";
  if (v < 0.01) return "0.01";
  return v.toFixed(2);
}

export function PositionSizeCalc({ pair, entry, stopLoss, takeProfit, signal, confidence = 70, sessionQuality, session }: Props) {
  const [accountType, setAccountType] = useState<AccountType>("micro");
  const [balance,     setBalance]     = useState(1000);
  const [risk,        setRisk]        = useState(1);
  const [open,        setOpen]        = useState(true);

  const acct = ACCOUNT_TYPES.find(a => a.id === accountType)!;

  function selectAccount(id: AccountType) {
    const a = ACCOUNT_TYPES.find(x => x.id === id)!;
    setAccountType(id);
    setBalance(a.defaultBal);
    setRisk(Math.min(risk, a.maxRisk));
  }

  const calc = useMemo(() => {
    const ps            = pipSize(pair);
    const pvl           = pipValuePerLot(pair);
    const slPips        = Math.abs(entry - stopLoss)    / ps;
    const tpPips        = Math.abs(takeProfit - entry)  / ps;
    const dollarRisk    = (balance * risk) / 100;
    const lotSize       = pvl > 0 && slPips > 0 ? dollarRisk / (slPips * pvl) : 0;
    const potentialGain = lotSize * tpPips * pvl;
    const rr            = tpPips > 0 && slPips > 0 ? tpPips / slPips : 0;
    const miniLots      = lotSize * 10;
    const microLots     = lotSize * 100;
    return { slPips, tpPips, dollarRisk, lotSize, potentialGain, rr, miniLots, microLots };
  }, [pair, entry, stopLoss, takeProfit, balance, risk]);

  if (signal === "NEUTRAL") return null;

  const isLong = signal === "BUY";

  const recommendedRaw: number =
    acct.lotKey === "lotSize"   ? calc.lotSize :
    acct.lotKey === "miniLots"  ? calc.miniLots :
    calc.microLots;

  const recommendedLots = Math.max(
    acct.lotKey === "lotSize"  ? 0.01 :
    acct.lotKey === "miniLots" ? 0.10 :
    1,
    Math.round(recommendedRaw * 100) / 100
  );

  const notes: { level: "warn" | "info"; msg: string }[] = [];
  if (sessionQuality === "AVOID")
    notes.push({ level: "warn", msg: `Low-liquidity session (${session ?? "Off-Hours"}) — consider skipping or halving lot size.` });
  if (confidence < 65)
    notes.push({ level: "warn", msg: `Confidence below 65% — reduce lot size by 50% or skip this trade.` });
  if (risk > acct.maxRisk)
    notes.push({ level: "warn", msg: `Risk of ${risk}% is above the ${acct.label} account recommended max of ${acct.maxRisk}%. Reduce risk.` });
  if (calc.rr < 1.5)
    notes.push({ level: "warn", msg: `Risk:Reward below 1.5 — this trade setup is marginal. Only take if all other confluences align.` });
  if (confidence >= 80)
    notes.push({ level: "info", msg: `High-confidence signal (${confidence}%) — trade with full position size if risk management allows.` });
  if (sessionQuality === "OPTIMAL")
    notes.push({ level: "info", msg: `${session} — optimal kill zone. Higher probability of follow-through.` });

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold font-mono">Lot Size & Risk Calculator</span>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            isLong ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400",
          )}>{signal}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">

          {/* Account Type Selector */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Type</p>
            <div className="grid grid-cols-4 gap-2">
              {ACCOUNT_TYPES.map(a => (
                <button
                  key={a.id}
                  onClick={() => selectAccount(a.id)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-center transition-all",
                    accountType === a.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/40 bg-background/30 text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <p className="text-xs font-bold">{a.label}</p>
                  <p className="text-[10px] opacity-70">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recommended Lot Size — Hero Card */}
          <div className={cn(
            "rounded-xl p-4 border flex items-center justify-between",
            isLong ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
          )}>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-0.5">
                <Star className="w-3 h-3" /> Recommended Lot Size
              </p>
              <p className={cn("text-3xl font-bold font-mono", isLong ? "text-emerald-400" : "text-rose-400")}>
                {acct.lotKey === "lotSize"   ? fmtLot(calc.lotSize)   :
                 acct.lotKey === "miniLots"  ? fmtLot(calc.miniLots)  :
                 fmtLot(calc.microLots)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{acct.lotLabel}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] text-muted-foreground">Dollar Risk</p>
              <p className="font-mono font-bold text-rose-400">${fmt(calc.dollarRisk)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Potential Profit</p>
              <p className="font-mono font-bold text-emerald-400">${fmt(calc.potentialGain)}</p>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Balance ($)</label>
              <div className="flex items-center rounded-lg border border-border/60 bg-background/50 overflow-hidden">
                <span className="px-2.5 text-muted-foreground text-sm font-bold">$</span>
                <input
                  type="number" min={100} max={10_000_000} step={100}
                  value={balance}
                  onChange={e => setBalance(Math.max(100, Number(e.target.value)))}
                  className="flex-1 bg-transparent py-2 pr-3 text-sm font-mono outline-none text-foreground"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Risk — <span className="text-primary">{risk}%</span>
                <span className="text-muted-foreground/50 ml-1">(max {acct.maxRisk}% advised)</span>
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

          {/* All lot sizes reference */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Standard Lots",   value: fmt(calc.lotSize,  3), highlight: accountType === "standard" ? "text-primary font-bold" : "" },
              { label: "Mini Lots",       value: fmt(calc.miniLots, 2), highlight: accountType === "mini" || accountType === "micro" ? "text-primary font-bold" : "" },
              { label: "Micro Lots",      value: fmt(calc.microLots,1), highlight: accountType === "nano" ? "text-primary font-bold" : "" },
              { label: "SL Distance",     value: `${fmt(calc.slPips, 1)} pips`,   highlight: "" },
              { label: "TP Distance",     value: `${fmt(calc.tpPips, 1)} pips`,   highlight: "" },
              { label: "Risk : Reward",   value: `1 : ${fmt(calc.rr)}`,            highlight: calc.rr >= 2 ? "text-emerald-400" : calc.rr >= 1.5 ? "text-amber-400" : "text-rose-400" },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="rounded-lg bg-black/20 border border-border/20 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-0.5">{label}</p>
                <p className={cn("text-sm font-mono", highlight || "text-foreground")}>{value}</p>
              </div>
            ))}
          </div>

          {/* Important Notes */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Important Notes</p>
              {notes.map((n, i) => (
                <div key={i} className={cn(
                  "flex items-start gap-2 rounded-lg border px-3 py-2",
                  n.level === "warn"
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-blue-500/10 border-blue-500/20"
                )}>
                  {n.level === "warn"
                    ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    : <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />}
                  <p className={cn("text-[11px]", n.level === "warn" ? "text-amber-400/90" : "text-blue-400/90")}>{n.msg}</p>
                </div>
              ))}
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

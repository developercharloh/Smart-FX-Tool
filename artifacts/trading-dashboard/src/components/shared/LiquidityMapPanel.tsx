import { cn } from "@/lib/utils";
import { Droplets, ArrowUp, ArrowDown, Equal } from "lucide-react";

interface LiquidityZone {
  price: number;
  type: "BSL" | "SSL" | "EQH" | "EQL";
  label: string;
  strength: number;
  swept: boolean;
}

interface Props {
  zones: LiquidityZone[];
  currentPrice: number;
  decimals?: number;
  className?: string;
}

const TYPE_CONFIG = {
  EQH: { color: "text-rose-400",    bg: "bg-rose-400/10 border-rose-400/20",    icon: Equal,    label: "EQH" },
  EQL: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", icon: Equal, label: "EQL" },
  BSL: { color: "text-rose-300",    bg: "bg-rose-300/8 border-rose-300/15",     icon: ArrowUp,  label: "BSL" },
  SSL: { color: "text-emerald-300", bg: "bg-emerald-300/8 border-emerald-300/15", icon: ArrowDown, label: "SSL" },
};

function StrengthDots({ strength, color }: { strength: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i <= strength ? color.replace("text-", "bg-") : "bg-white/10")} />
      ))}
    </div>
  );
}

export function LiquidityMapPanel({ zones, currentPrice, decimals = 5, className }: Props) {
  if (!zones.length) return (
    <div className="text-xs text-muted-foreground/50 italic p-4 text-center">Insufficient candle data for liquidity map</div>
  );

  const above = zones.filter(z => z.price > currentPrice).sort((a, b) => a.price - b.price);
  const below = zones.filter(z => z.price <= currentPrice).sort((a, b) => b.price - a.price);

  const ZoneRow = ({ z }: { z: LiquidityZone }) => {
    const cfg = TYPE_CONFIG[z.type];
    const Icon = cfg.icon;
    const dist = Math.abs(z.price - currentPrice);
    const distPct = ((dist / currentPrice) * 100).toFixed(2);

    return (
      <div className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 border text-xs gap-3 transition-opacity",
        cfg.bg,
        z.swept && "opacity-40 line-through"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn("w-3.5 h-3.5 shrink-0", cfg.color)} />
          <div className="min-w-0">
            <div className={cn("font-mono font-bold", cfg.color)}>{z.price.toFixed(decimals)}</div>
            <div className="text-muted-foreground/70 truncate text-[10px]">{z.label}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StrengthDots strength={z.strength} color={cfg.color} />
          <span className="text-[10px] text-muted-foreground/60">{distPct}% away</span>
          {z.swept && <span className="text-[9px] text-muted-foreground/40 font-semibold">SWEPT</span>}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Above current price */}
      {above.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-rose-400/70 flex items-center gap-1.5">
            <ArrowUp className="w-3 h-3" /> Buyside Liquidity — above current price
          </div>
          {above.map((z, i) => <ZoneRow key={i} z={z} />)}
        </div>
      )}

      {/* Current price indicator */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-primary/40" />
        <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
          PRICE {currentPrice.toFixed(decimals)}
        </span>
        <div className="flex-1 h-px bg-primary/40" />
      </div>

      {/* Below current price */}
      {below.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 flex items-center gap-1.5">
            <ArrowDown className="w-3 h-3" /> Sellside Liquidity — below current price
          </div>
          {below.map((z, i) => <ZoneRow key={i} z={z} />)}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground/40 pt-1">
        Swept zones (faded) = liquidity already taken. Unswept = pending pools where price may return.
      </div>
    </div>
  );
}

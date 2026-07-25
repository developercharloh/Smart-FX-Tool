import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLivePrice } from "@/hooks/useLivePrice";
import { Wifi, WifiOff } from "lucide-react";

interface LivePriceTickerProps {
  symbol: string;
  decimals?: number;
}

function formatPrice(price: number, decimals: number) {
  return price.toFixed(decimals);
}

function getDecimals(symbol: string): number {
  const isJpy = symbol.includes("JPY") || symbol.includes("CAD") || symbol.includes("jpy");
  const isSynthetic = !symbol.startsWith("frx") && !/^[A-Z]{6}$/.test(symbol) ||
    ["R_10","R_25","R_50","R_75","R_100","BOOM300","BOOM500","BOOM1000",
     "CRASH300","CRASH500","CRASH1000","JD10","JD25","JD50","JD75","JD100",
     "1HZ10V","1HZ25V","1HZ50V","1HZ75V","1HZ100V"].includes(symbol);
  if (isSynthetic) return 2;
  if (isJpy) return 3;
  return 5;
}

export function LivePriceTicker({ symbol, decimals }: LivePriceTickerProps) {
  const live = useLivePrice(symbol);
  const priceRef = useRef<HTMLSpanElement>(null);
  const prevDirection = useRef<string>("flat");
  const dec = decimals ?? getDecimals(symbol);

  useEffect(() => {
    if (!live || !priceRef.current) return;
    if (live.direction !== "flat" && live.direction !== prevDirection.current) {
      const el = priceRef.current;
      el.classList.remove("price-flash-up", "price-flash-down");
      void el.offsetWidth;
      el.classList.add(live.direction === "up" ? "price-flash-up" : "price-flash-down");
      prevDirection.current = live.direction;
    }
  }, [live]);

  if (!live) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-muted/20 border border-border/30 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
        <span className="text-sm text-muted-foreground font-mono">Connecting to live feed...</span>
      </div>
    );
  }

  const isUp = live.changePct >= 0;

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 rounded-lg bg-card/60 border border-border/40 backdrop-blur-sm">
      {/* Live dot */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold tracking-widest text-emerald-500 uppercase">Live</span>
      </div>

      {/* Symbol */}
      <span className="font-mono font-bold text-sm text-foreground">{symbol}</span>

      {/* Price — flashes green/red on each tick */}
      <span
        ref={priceRef}
        className={cn(
          "font-mono text-2xl font-bold tracking-tight transition-colors duration-75",
          live.direction === "up" ? "text-emerald-400" :
          live.direction === "down" ? "text-rose-400" : "text-foreground"
        )}
      >
        {formatPrice(live.price, dec)}
      </span>

      {/* Change */}
      <div className={cn(
        "flex items-center gap-1 text-sm font-mono font-semibold px-2 py-0.5 rounded",
        isUp ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
      )}>
        <span>{isUp ? "+" : ""}{live.change.toFixed(dec)}</span>
        <span className="text-xs">({isUp ? "+" : ""}{live.changePct.toFixed(2)}%)</span>
      </div>

      {/* Connection indicator */}
      <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/60">
        {live.connected
          ? <Wifi className="w-3 h-3 text-emerald-500/60" />
          : <WifiOff className="w-3 h-3 text-rose-500/60" />}
        <span>Deriv feed</span>
      </div>
    </div>
  );
}

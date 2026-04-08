import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface Session {
  name: string;
  open: number;
  close: number;
  color: string;
  dot: string;
}

const SESSIONS: Session[] = [
  { name: "Sydney",   open: 22 * 60, close: 7  * 60,  color: "text-sky-400",     dot: "bg-sky-400"     },
  { name: "Tokyo",    open: 0  * 60, close: 9  * 60,  color: "text-violet-400",  dot: "bg-violet-400"  },
  { name: "London",   open: 7  * 60, close: 16 * 60,  color: "text-emerald-400", dot: "bg-emerald-400" },
  { name: "New York", open: 12 * 60, close: 21 * 60,  color: "text-amber-400",   dot: "bg-amber-400"   },
];

function utcMinutes(): number {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

function isActive(s: Session, mins: number): boolean {
  if (s.open < s.close) return mins >= s.open && mins < s.close;
  return mins >= s.open || mins < s.close;
}

function minsUntilOpen(s: Session, mins: number): number {
  if (isActive(s, mins)) return 0;
  let diff = s.open - mins;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function fmtCountdown(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtUTC(): string {
  const now = new Date();
  return now.toUTCString().slice(17, 22) + " UTC";
}

export function SessionClock() {
  const [mins, setMins] = useState(utcMinutes());
  const [utc, setUtc]   = useState(fmtUTC());

  useEffect(() => {
    const t = setInterval(() => { setMins(utcMinutes()); setUtc(fmtUTC()); }, 15000);
    return () => clearInterval(t);
  }, []);

  const overlap = SESSIONS.filter(s => isActive(s, mins)).length >= 2;

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold font-mono">Market Sessions</span>
          {overlap && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              ⚡ SESSION OVERLAP
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground">{utc}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SESSIONS.map(s => {
          const active = isActive(s, mins);
          const wait   = minsUntilOpen(s, mins);
          return (
            <div
              key={s.name}
              className={cn(
                "rounded-lg px-3 py-2.5 border flex flex-col gap-1.5 transition-all",
                active
                  ? "bg-card border-border/60 shadow-sm"
                  : "bg-card/30 border-border/20 opacity-60",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", s.dot, active ? "animate-pulse" : "opacity-30")} />
                <span className={cn("text-[11px] font-bold", active ? s.color : "text-muted-foreground")}>{s.name}</span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/70">
                {active
                  ? <span className={cn("font-bold", s.color)}>OPEN NOW</span>
                  : <span>Opens in {fmtCountdown(wait)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

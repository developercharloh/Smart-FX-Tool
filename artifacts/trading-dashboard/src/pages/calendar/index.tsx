import { useQuery } from "@tanstack/react-query";
import { CalendarDays, AlertTriangle, Minus, TrendingUp, RefreshCw, Globe } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CalendarEvent {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: "High" | "Medium" | "Low" | string;
  forecast?: string;
  previous?: string;
  actual?: string;
}

const IMPACT_CONFIG = {
  High:   { color: "text-rose-400",   bg: "bg-rose-500/10 border-rose-500/20",    icon: AlertTriangle, dot: "bg-rose-500"   },
  Medium: { color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20",  icon: TrendingUp,    dot: "bg-amber-500"  },
  Low:    { color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",    icon: Minus,         dot: "bg-blue-500"   },
};

const FLAG_EMOJI: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", AUD: "🇦🇺",
  CAD: "🇨🇦", CHF: "🇨🇭", NZD: "🇳🇿", CNY: "🇨🇳", ALL: "🌐",
};

function normalizeDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {}
  return dateStr.slice(0, 10);
}

function groupByDate(events: CalendarEvent[]) {
  const groups: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const key = normalizeDate(ev.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function formatEventDate(dateStr: string) {
  try {
    const d = new Date(dateStr + "T12:00:00Z");
    return format(d, "EEEE, MMMM d");
  } catch { return dateStr; }
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

export default function EconomicCalendar() {
  const [impactFilter, setImpactFilter] = React.useState<string>("All");
  const [countryFilter, setCountryFilter] = React.useState<string>("All");

  const { data, isLoading, isError, refetch, isFetching } = useQuery<CalendarEvent[]>({
    queryKey: ["economic-calendar"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/calendar`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 1000 * 60 * 15,
  });

  const countries = data
    ? ["All", ...Array.from(new Set(data.map(e => e.country))).sort()]
    : ["All"];

  const filtered = (data ?? []).filter(ev => {
    const matchImpact  = impactFilter  === "All" || ev.impact  === impactFilter;
    const matchCountry = countryFilter === "All" || ev.country === countryFilter;
    return matchImpact && matchCountry;
  });

  const groups = groupByDate(filtered);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> Economic Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">This week's high-impact economic events.</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-card/30 border border-border/40 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Impact:</span>
          {["All", "High", "Medium", "Low"].map(imp => (
            <button key={imp} onClick={() => setImpactFilter(imp)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold border transition-all",
                impactFilter === imp ? "bg-primary/15 border-primary/40 text-primary" : "border-border/40 text-muted-foreground hover:border-primary/30"
              )}>{imp}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Currency:</span>
          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
            className="bg-background border border-border/60 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/60">
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl border border-border/40 bg-card/30 p-5 animate-pulse space-y-3">
              <div className="h-4 w-32 bg-border/40 rounded" />
              {[1,2].map(j => <div key={j} className="h-14 bg-border/20 rounded-lg" />)}
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
          <p className="text-sm text-rose-400">Could not load calendar data.</p>
        </div>
      )}

      {!isLoading && groups.length === 0 && (
        <div className="rounded-xl border border-border/40 bg-card/30 p-10 text-center">
          <Globe className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No events match your filters this week.</p>
        </div>
      )}

      {groups.map(([dateStr, events]) => (
        <div key={dateStr} className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
          <div className={cn(
            "px-5 py-3 border-b border-border/40 flex items-center justify-between",
            isToday(dateStr) && "bg-primary/5 border-primary/20"
          )}>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              {formatEventDate(dateStr)}
              {isToday(dateStr) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">TODAY</span>
              )}
            </h2>
            <span className="text-xs text-muted-foreground">{events.length} event{events.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="divide-y divide-border/30">
            {events.map((ev, i) => {
              const impact = IMPACT_CONFIG[ev.impact as keyof typeof IMPACT_CONFIG] ?? IMPACT_CONFIG.Low;
              const flag   = FLAG_EMOJI[ev.country] ?? "🌐";
              return (
                <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="text-xs font-mono text-muted-foreground w-14 shrink-0">
                    {ev.time ? ev.time.slice(0,5) : "—"} <span className="text-[9px]">UTC</span>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full shrink-0", impact.dot)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ev.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{flag} {ev.country}</p>
                  </div>
                  <div className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0", impact.bg, impact.color)}>
                    {ev.impact}
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    {ev.actual ? (
                      <p className="text-xs font-bold text-emerald-400 font-mono">{ev.actual}</p>
                    ) : ev.forecast ? (
                      <p className="text-xs text-muted-foreground font-mono">F: {ev.forecast}</p>
                    ) : null}
                    {ev.previous && <p className="text-[10px] text-muted-foreground/60 font-mono">P: {ev.previous}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

import React from "react";

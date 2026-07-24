import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Calendar as CalendarIcon, Loader2, AlertTriangle, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface EconomicEvent {
  id?: string;
  title: string;
  country: string;
  date: string;
  time: string;
  impact: string;
  forecast?: string;
  previous?: string;
}

export default function Calendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/calendar")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch calendar");
        return res.json();
      })
      .then((data) => {
        setEvents(Array.isArray(data) ? data : data.events || []);
        setError(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-destructive font-mono uppercase tracking-widest gap-2">
        <AlertTriangle className="w-5 h-5" /> Error loading economic calendar
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <div className="border-b border-border pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Economic Calendar
          </h1>
          <p className="text-muted-foreground text-sm font-mono mt-1 uppercase">High-Impact Macro Events</p>
        </div>
      </div>

      <div className="border border-border/50 rounded-sm bg-card/30 overflow-x-auto">
        <table className="w-full text-sm text-left font-mono">
          <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 border-b border-border/50">
            <tr>
              <th className="px-4 py-3 font-normal">Time</th>
              <th className="px-4 py-3 font-normal">Country</th>
              <th className="px-4 py-3 font-normal">Impact</th>
              <th className="px-4 py-3 font-normal">Event</th>
              <th className="px-4 py-3 font-normal text-right">Actual</th>
              <th className="px-4 py-3 font-normal text-right">Forecast</th>
              <th className="px-4 py-3 font-normal text-right">Previous</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground uppercase tracking-widest text-xs">
                  No upcoming events
                </td>
              </tr>
            ) : (
              events.map((ev, i) => (
                <tr key={ev.id || i} className="hover:bg-card/80 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-bold">{ev.time}</div>
                    <div className="text-[10px] text-muted-foreground">{ev.date}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 bg-secondary rounded-sm font-bold text-xs">
                      {ev.country}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold",
                      ev.impact?.toUpperCase() === "HIGH" ? "bg-destructive/20 text-destructive border border-destructive/30" :
                      ev.impact?.toUpperCase() === "MEDIUM" ? "bg-chart-4/20 text-chart-4 border border-chart-4/30" :
                      "bg-primary/20 text-primary border border-primary/30"
                    )}>
                      {ev.impact}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate" title={ev.title}>
                    {ev.title}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-muted-foreground">
                    --
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {ev.forecast || "--"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-muted-foreground">
                    {ev.previous || "--"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

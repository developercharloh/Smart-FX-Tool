import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Zap, CreditCard, Settings, MoreHorizontal,
  Newspaper, Calculator, CalendarDays, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_TABS = [
  { href: "/",        label: "Home",     icon: LayoutDashboard },
  { href: "/signals", label: "Scanner",  icon: Zap },
  { href: "/trades",  label: "Trades",   icon: CreditCard },
  { href: "/setup",   label: "MT5",      icon: Settings },
];

const MORE_ITEMS = [
  { href: "/news",       label: "Market News",      icon: Newspaper },
  { href: "/calculator", label: "Risk Calculator",  icon: Calculator },
  { href: "/calendar",   label: "Econ Calendar",    icon: CalendarDays },
];

export function MobileNav() {
  const [location]   = useLocation();
  const [moreOpen,   setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const moreActive = MORE_ITEMS.some(i => isActive(i.href));

  return (
    <>
      {/* ── Bottom tab bar ── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 flex items-stretch"
        style={{
          background:           "rgba(8,13,20,0.96)",
          backdropFilter:       "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderTop:            "1px solid rgba(59,130,246,0.12)",
          boxShadow:            "0 -4px 32px rgba(0,0,0,0.5)",
          paddingBottom:        "env(safe-area-inset-bottom, 0px)",
          height:               "calc(60px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {PRIMARY_TABS.map(tab => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.href} href={tab.href} onClick={() => setMoreOpen(false)}>
              <div className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-[60px] cursor-pointer transition-all duration-150 select-none px-1",
                "w-[calc((100vw-0px)/5)]",
              )}>
                <div
                  className={cn(
                    "w-10 h-7 rounded-[8px] flex items-center justify-center transition-all duration-200",
                    active ? "bg-primary/20" : "",
                  )}
                  style={active ? { boxShadow: "0 0 12px rgba(59,130,246,0.25)" } : {}}
                >
                  <tab.icon
                    className={cn("w-[19px] h-[19px] transition-colors duration-150",
                      active ? "text-primary" : "text-slate-500")}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                </div>
                <span className={cn(
                  "text-[10px] font-semibold tracking-wide transition-colors duration-150",
                  active ? "text-primary" : "text-slate-500",
                )}>
                  {tab.label}
                </span>
              </div>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(v => !v)}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-[60px] cursor-pointer transition-all duration-150 select-none px-1"
          style={{ width: "calc((100vw) / 5)" }}
        >
          <div
            className={cn(
              "w-10 h-7 rounded-[8px] flex items-center justify-center transition-all duration-200",
              (moreOpen || moreActive) ? "bg-primary/20" : "",
            )}
            style={(moreOpen || moreActive) ? { boxShadow: "0 0 12px rgba(59,130,246,0.25)" } : {}}
          >
            {moreOpen
              ? <X className="w-[19px] h-[19px] text-primary" strokeWidth={2.2} />
              : <MoreHorizontal
                  className={cn("w-[19px] h-[19px] transition-colors duration-150",
                    moreActive ? "text-primary" : "text-slate-500")}
                  strokeWidth={1.8}
                />
            }
          </div>
          <span className={cn(
            "text-[10px] font-semibold tracking-wide transition-colors duration-150",
            (moreOpen || moreActive) ? "text-primary" : "text-slate-500",
          )}>More</span>
        </button>
      </nav>

      {/* ── More sheet (slides up) ── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMoreOpen(false)}
          />

          {/* Sheet */}
          <div
            className="lg:hidden fixed inset-x-0 z-40 rounded-t-[20px] overflow-hidden"
            style={{
              bottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
              background: "rgba(10,15,28,0.98)",
              backdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(59,130,246,0.15)",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
            </div>

            <div className="px-4 pb-5 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 pb-2"
                style={{ color: "rgba(148,163,184,0.4)" }}>
                More Pages
              </p>
              {MORE_ITEMS.map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}>
                    <div
                      className={cn(
                        "flex items-center gap-4 px-4 py-3.5 rounded-[12px] transition-all duration-150 cursor-pointer",
                        active ? "bg-primary/10" : "hover:bg-white/[0.05]",
                      )}
                      style={active ? { border: "1px solid rgba(59,130,246,0.22)" } : { border: "1px solid transparent" }}
                    >
                      <div
                        className={cn("w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0",
                          active ? "bg-primary/15" : "bg-white/[0.04]")}
                        style={active ? { boxShadow: "0 0 12px rgba(59,130,246,0.2)" } : {}}
                      >
                        <item.icon
                          className={cn("w-4.5 h-4.5", active ? "text-primary" : "text-slate-400")}
                          strokeWidth={active ? 2.2 : 1.8}
                        />
                      </div>
                      <span className={cn("text-[14px] font-semibold",
                        active ? "text-primary" : "text-slate-300")}>
                        {item.label}
                      </span>
                      {active && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                          style={{ boxShadow: "0 0 6px rgba(59,130,246,0.8)" }} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}

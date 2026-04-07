import { useState } from "react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, Plus, Zap, LayoutDashboard,
  Newspaper, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

const NAV_LINKS = [
  { href: "/",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/signals",     label: "All Signals",   icon: Activity },
  { href: "/analyze",     label: "Live Analyze",  icon: Zap },
  { href: "/news",        label: "Market News",   icon: Newspaper },
  { href: "/signals/new", label: "Manual Signal", icon: Plus },
];

function RightNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="relative flex flex-col items-center w-12 border-l border-border bg-card shrink-0">
      {/* Hamburger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-4 w-8 h-8 flex items-center justify-center rounded-md border border-border/60 hover:bg-secondary transition-colors"
        aria-label="Toggle navigation"
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Dropdown panel — opens to the left */}
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-12 z-40 w-52 bg-card border border-border/60 rounded-l-xl shadow-2xl overflow-hidden">
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Menu</p>
            </div>
            <nav className="p-2">
              {NAV_LINKS.map((link) => {
                const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <link.icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,255,255,0.03),rgba(0,0,0,0))] pointer-events-none" />
        <div className="flex-1 overflow-y-auto z-10 relative">
          <div className="container mx-auto p-6 md:p-8 max-w-[1400px]">
            {children}
          </div>
        </div>
      </main>
      <RightNav />
    </div>
  );
}

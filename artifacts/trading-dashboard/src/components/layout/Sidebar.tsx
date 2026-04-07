import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity, BarChart2, Plus, Zap, LayoutDashboard,
  Settings, Newspaper, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/signals",     label: "All Signals",   icon: Activity },
  { href: "/analyze",     label: "Live Analyze",  icon: Zap },
  { href: "/news",        label: "Market News",   icon: Newspaper },
  { href: "/signals/new", label: "Manual Signal", icon: Plus },
];

export function Sidebar() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const currentPage = links.find(
    (l) => l.href === location || (l.href !== "/" && location.startsWith(l.href))
  );

  return (
    <>
      {/* Top bar */}
      <header className="w-full border-b border-border bg-card z-40 shrink-0">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center text-primary">
              <BarChart2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-foreground">SmartFX</span>
          </Link>

          {/* Current page label (center) */}
          {currentPage && (
            <span className="text-sm font-semibold text-muted-foreground tracking-wide hidden sm:block">
              {currentPage.label}
            </span>
          )}

          {/* Hamburger button */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center justify-center w-9 h-9 rounded-md border border-border/60 bg-background hover:bg-secondary transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Dropdown menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />

          {/* Menu panel */}
          <div className="absolute top-14 right-0 z-40 w-60 bg-card border border-border/60 rounded-bl-xl shadow-2xl overflow-hidden">
            <nav className="p-2">
              {links.map((link) => {
                const active =
                  location === link.href ||
                  (link.href !== "/" && location.startsWith(link.href));
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
            <div className="border-t border-border/50 p-2">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
                <Settings className="w-4 h-4 shrink-0" />
                <span className="font-medium">Settings</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

import { Link, useLocation } from "wouter";
import { Activity, BarChart2, Plus, Zap, LayoutDashboard, Settings, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/",            label: "Dashboard",     icon: LayoutDashboard },
    { href: "/signals",     label: "All Signals",   icon: Activity },
    { href: "/analyze",     label: "Live Analyze",  icon: Zap },
    { href: "/news",        label: "Market News",   icon: Newspaper },
    { href: "/signals/new", label: "Manual Signal", icon: Plus },
  ];

  return (
    <header className="w-full border-b border-border bg-card z-30 shrink-0">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 mr-2">
          <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center text-primary">
            <BarChart2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-foreground">SmartFX</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {links.map((link) => {
            const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <link.icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Settings right-aligned */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0">
          <Settings className="w-4 h-4" />
          <span className="font-medium">Settings</span>
        </div>
      </div>
    </header>
  );
}

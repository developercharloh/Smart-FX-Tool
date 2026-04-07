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
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
            <BarChart2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">SmartFX</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 mt-2 px-3">
          Menu
        </div>
        {links.map((link) => {
          const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors font-medium",
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

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">
          <Settings className="w-4 h-4" />
          <span className="font-medium">Settings</span>
        </div>
      </div>
    </aside>
  );
}

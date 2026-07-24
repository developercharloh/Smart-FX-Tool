import { Link, useLocation } from "wouter";
import { 
  Activity, 
  BarChart2, 
  Calendar as CalendarIcon, 
  Cpu, 
  Newspaper, 
  Settings,
  Terminal,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/signals", label: "Signals", icon: BarChart2 },
  { href: "/analyze", label: "Live Analysis", icon: Cpu },
  { href: "/news", label: "Market News", icon: Newspaper },
  { href: "/calendar", label: "Economic Calendar", icon: CalendarIcon },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();

  return (
    <div className="w-64 h-screen border-r border-border bg-card flex flex-col font-mono text-sm shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-border justify-between">
        <div className="flex items-center">
          <Terminal className="w-5 h-5 text-primary mr-3" />
          <span className="font-bold tracking-widest uppercase">Smart FX</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <div
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-sm cursor-pointer transition-colors group",
                  isActive 
                    ? "bg-primary/10 text-primary border-l-2 border-primary" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground border-l-2 border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4 mr-3", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="uppercase tracking-wider text-[11px] font-bold">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border flex flex-col gap-2">
        <Link href="/xk-manage" onClick={onClose}>
          <div className="flex items-center px-3 py-2 rounded-sm cursor-pointer text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Settings className="w-4 h-4 mr-3" />
            <span className="uppercase tracking-wider text-[11px] font-bold">Admin</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

import { Link } from "wouter";
import { BarChart2 } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-16 border-r border-border bg-card flex flex-col items-center py-5 shrink-0">
      <Link href="/" className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
        <BarChart2 className="w-5 h-5" />
      </Link>
    </aside>
  );
}

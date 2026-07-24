import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, slides in when open */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:translate-x-0 md:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-mono font-bold tracking-widest uppercase text-sm">Smart FX</span>
        </div>

        <main className="flex-1 overflow-y-auto relative">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-50" />
          {children}
        </main>
      </div>
    </div>
  );
}

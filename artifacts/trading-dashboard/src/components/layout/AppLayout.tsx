import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Right column: slim top bar + scrollable page */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto relative">
          {/* Subtle top-of-page radial glow */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-64 z-0"
            style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 100%)" }}
          />
          <div className="relative z-10 container mx-auto p-6 md:p-8 max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

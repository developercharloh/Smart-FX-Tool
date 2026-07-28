import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { MobileNav } from "./MobileNav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground selection:bg-primary/30 overflow-hidden">
      <TopNav />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.06) 0%, transparent 100%)" }} />
        <div className="flex-1 overflow-y-auto z-10 relative">
          <div className="container mx-auto p-6 md:p-8 max-w-[1400px] pb-24 lg:pb-8">
            {children}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

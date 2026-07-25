import { ReactNode } from "react";
import { TopNav } from "./TopNav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground selection:bg-primary/30 overflow-hidden">
      <TopNav />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(0,255,255,0.035),rgba(0,0,0,0))] pointer-events-none" />
        <div className="flex-1 overflow-y-auto z-10 relative">
          <div className="container mx-auto p-6 md:p-8 max-w-[1400px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

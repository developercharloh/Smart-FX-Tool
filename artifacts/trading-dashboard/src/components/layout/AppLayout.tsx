import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen min-w-[1280px] bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,255,255,0.03),rgba(0,0,0,0))] pointer-events-none" />
        <div className="flex-1 overflow-y-auto z-10 relative">
          <div className="container mx-auto p-6 md:p-8 max-w-[1400px]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

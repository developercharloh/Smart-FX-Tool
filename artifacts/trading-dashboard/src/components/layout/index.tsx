import { ReactNode } from "react";
import { Sidebar } from "./sidebar";

interface LayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export function Layout({ children, onLogout }: LayoutProps) {
  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-50"></div>
        {children}
      </main>
    </div>
  );
}

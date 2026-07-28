import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Bell, Crown, ChevronDown, Settings, LogOut, Shield, X, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const NOTIFS = [
  { title: "GBPJPY signal hit Take Profit", time: "2m ago",  type: "win"  },
  { title: "EURUSD new signal generated",   time: "15m ago", type: "info" },
  { title: "AUDUSD hit Stop Loss",          time: "1h ago",  type: "loss" },
];

const BREADCRUMBS: Record<string, string> = {
  "/":           "Dashboard",
  "/signals":    "AI Scanner",
  "/news":       "Market News",
  "/calculator": "Risk Calculator",
  "/calendar":   "Economic Calendar",
  "/trades":     "Transactions",
  "/setup":      "MT5 Setup",
  "/analyze":    "Live Analysis",
  "/settings":   "Settings",
};

export function TopBar() {
  const [location]       = useLocation();
  const [searchOpen,     setSearchOpen]     = useState(false);
  const [userMenuOpen,   setUserMenuOpen]   = useState(false);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const searchRef        = useRef<HTMLInputElement>(null);
  const userRef          = useRef<HTMLDivElement>(null);
  const notifRef         = useRef<HTMLDivElement>(null);

  const pageTitle = BREADCRUMBS[location] ?? BREADCRUMBS[Object.keys(BREADCRUMBS).find(k => k !== "/" && location.startsWith(k)) ?? ""] ?? "SmartFX";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  return (
    <header
      className="h-[58px] flex items-center px-6 gap-4 shrink-0"
      style={{
        background: "hsl(var(--background))",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
      }}
    >
      {/* Page title */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <h1 className="text-[16px] font-bold text-foreground tracking-tight truncate">{pageTitle}</h1>
      </div>

      {/* Live mini-tickers */}
      <div className="hidden xl:flex items-center gap-1">
        {[
          ["EUR/USD", "loading…", "—"],
          ["XAU/USD", "loading…", "—"],
          ["BTC/USD", "loading…", "—"],
        ].map(([pair]) => (
          <LiveTicker key={pair} pair={pair} />
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Search */}
        {searchOpen ? (
          <div
            className="flex items-center gap-2 rounded-[9px] px-3 py-1.5"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}
          >
            <Search className="w-3.5 h-3.5 text-primary shrink-0" />
            <input
              ref={searchRef}
              placeholder="Search…"
              className="bg-transparent text-sm text-foreground placeholder-muted-foreground/40 outline-none w-28 md:w-36"
              onBlur={() => setSearchOpen(false)}
            />
            <button onClick={() => setSearchOpen(false)}>
              <X className="w-3 h-3 text-muted-foreground/50" />
            </button>
          </div>
        ) : (
          <IconBtn onClick={() => setSearchOpen(true)} title="Search">
            <Search className="w-4 h-4" />
          </IconBtn>
        )}

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <div className="relative">
            <IconBtn onClick={() => { setNotifOpen(v => !v); setUserMenuOpen(false); }}>
              <Bell className="w-4 h-4" />
            </IconBtn>
            <span
              className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: "#3B82F6", boxShadow: "0 0 8px rgba(59,130,246,0.6)" }}
            >3</span>
          </div>

          {notifOpen && (
            <div
              className="absolute top-11 right-0 w-72 rounded-[14px] p-2 z-50"
              style={{
                background: "hsl(var(--popover))",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              }}
            >
              <div className="flex items-center justify-between px-2 pb-2 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">Notifications</p>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full text-primary"
                  style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)" }}
                >3 new</span>
              </div>
              {NOTIFS.map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-2 py-2.5 rounded-[9px] hover:bg-white/[0.04] cursor-pointer transition-colors">
                  <div
                    className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                      n.type === "win" ? "bg-emerald-400" : n.type === "loss" ? "bg-red-400" : "bg-primary"
                    )}
                    style={{
                      boxShadow: n.type === "win" ? "0 0 6px rgba(52,211,153,0.8)"
                        : n.type === "loss" ? "0 0 6px rgba(239,68,68,0.8)"
                        : "0 0 6px rgba(59,130,246,0.8)"
                    }}
                  />
                  <div>
                    <p className="text-[13px] text-foreground font-medium leading-snug">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
              <div className="mt-1 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button className="w-full text-center text-xs font-medium text-primary/70 hover:text-primary transition-colors py-1">
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 mx-0.5" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-[10px] hover:bg-white/[0.04] transition-all duration-150"
          >
            <div
              className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[12px] font-extrabold text-white shrink-0"
              style={{ background: "linear-gradient(135deg,#3B82F6,#7C3AED)" }}
            >C</div>
            <div className="text-left leading-tight hidden md:block">
              <p className="text-[12.5px] font-semibold text-foreground">Charles</p>
              <p className="text-[9.5px] font-medium flex items-center gap-0.5" style={{ color: "rgba(59,130,246,0.65)" }}>
                <Crown className="w-2.5 h-2.5 inline" /> Premium
              </p>
            </div>
            <ChevronDown className={cn("w-3 h-3 text-muted-foreground/40 transition-transform duration-200 hidden md:block", userMenuOpen && "rotate-180")} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute top-11 right-0 w-48 rounded-[14px] p-1.5 z-50"
              style={{
                background: "hsl(var(--popover))",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              }}
            >
              <div className="px-3 py-2.5 mb-1">
                <p className="text-[13px] font-semibold text-foreground">Charles</p>
                <p className="text-[11px] text-muted-foreground/50">charles@smartfx.ai</p>
                <div
                  className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-[6px]"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}
                >
                  <Crown className="w-3 h-3 text-primary" />
                  <span className="text-[11px] font-semibold text-primary">Premium Plan</span>
                </div>
              </div>
              <div className="h-px my-1" style={{ background: "rgba(255,255,255,0.05)" }} />
              {[
                { icon: Settings, label: "Settings",     href: "/settings" },
                { icon: Shield,   label: "Security",     href: null },
              ].map(item => (
                item.href ? (
                  <a key={item.label} href={item.href}>
                    <MenuRow icon={item.icon} label={item.label} />
                  </a>
                ) : (
                  <MenuRow key={item.label} icon={item.icon} label={item.label} />
                )
              ))}
              <div className="h-px my-1" style={{ background: "rgba(255,255,255,0.05)" }} />
              <MenuRow icon={LogOut} label="Sign Out" danger />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Sub-components ── */

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-[8px] flex items-center justify-center text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-white/[0.05]"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {children}
    </button>
  );
}

function MenuRow({ icon: Icon, label, danger }: { icon: any; label: string; danger?: boolean }) {
  return (
    <button
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-[7px] rounded-[8px] text-[12.5px] transition-colors",
        danger
          ? "text-red-400 hover:text-red-300 hover:bg-red-400/[0.06]"
          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

function LiveTicker({ pair }: { pair: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-[8px]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span className="text-[10.5px] font-semibold text-muted-foreground/60">{pair}</span>
      <span className="text-[11px] font-mono font-semibold text-foreground/50">—</span>
    </div>
  );
}

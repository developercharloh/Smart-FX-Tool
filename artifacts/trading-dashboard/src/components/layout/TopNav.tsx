import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart2, Search, Bell, MessageSquare,
  ChevronDown, Settings, LogOut, Shield, Crown, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/",           label: "Dashboard",    emoji: "◈" },
  { href: "/signals",    label: "AI Scanner",   emoji: "⚡" },
  { href: "/news",       label: "News",         emoji: "◎" },
  { href: "/calculator", label: "Risk Calc",    emoji: "◉" },
  { href: "/calendar",   label: "Calendar",     emoji: "◷" },
  { href: "/trades",     label: "Transactions", emoji: "◈" },
  { href: "/setup",      label: "MT5 Setup",    emoji: "◎" },
];

const NOTIFS = [
  { title: "GBPJPY signal hit Take Profit", time: "2m ago",  type: "win"  },
  { title: "EURUSD new signal generated",   time: "15m ago", type: "info" },
  { title: "AUDUSD hit Stop Loss",          time: "1h ago",  type: "loss" },
];

export function TopNav() {
  const [location] = useLocation();
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const userRef   = useRef<HTMLDivElement>(null);
  const notifRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  function NavLink({ link, compact = false }: { link: typeof NAV_LINKS[0]; compact?: boolean }) {
    const active = isActive(link.href);
    return (
      <Link href={link.href}>
        <div
          className={cn(
            "relative flex items-center gap-1.5 rounded-[10px] font-medium transition-all duration-200 cursor-pointer select-none whitespace-nowrap",
            compact ? "px-2.5 py-1.5 text-[12px]" : "px-3 py-2 text-[13px]",
            active ? "text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.05]",
          )}
          style={active ? {
            background: "rgba(59,130,246,0.12)",
            border:     "1px solid rgba(59,130,246,0.28)",
            boxShadow:  "0 0 14px rgba(59,130,246,0.08)",
          } : { border: "1px solid transparent" }}
        >
          <span className={cn(
            "font-bold leading-none select-none",
            compact ? "text-[12px]" : "text-[13px]",
            active ? "text-primary" : "text-muted-foreground/40",
          )}>
            {link.emoji}
          </span>
          <span className={cn(active && "font-semibold")}>{link.label}</span>
          {active && (
            <span
              className="absolute bottom-0 left-3 right-3 h-[1.5px] rounded-full"
              style={{
                background: "linear-gradient(90deg,transparent,rgba(59,130,246,0.9),transparent)",
                boxShadow:  "0 0 8px rgba(59,130,246,0.7)",
              }}
            />
          )}
          {active && compact && (
            <span
              className="absolute bottom-0 left-2.5 right-2.5 h-[1.5px] rounded-full"
              style={{ background: "rgba(59,130,246,0.85)", boxShadow: "0 0 6px rgba(59,130,246,0.7)" }}
            />
          )}
        </div>
      </Link>
    );
  }

  const ICON_BTN = "w-9 h-9 rounded-[10px] flex items-center justify-center text-slate-400 transition-all duration-200 hover:text-primary hover:bg-primary/[0.07]";
  const GLASS_DROPDOWN: React.CSSProperties = {
    background:           "hsl(var(--popover))",
    backdropFilter:       "blur(24px) saturate(160%)",
    WebkitBackdropFilter: "blur(24px) saturate(160%)",
    border:               "1px solid rgba(255,255,255,0.08)",
    boxShadow:            "0 24px 64px rgba(0,0,0,0.7)",
  };

  return (
    <>
      {/* ── Main nav bar ── */}
      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background:           "rgba(8,13,20,0.92)",
          backdropFilter:       "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          borderBottom:         "1px solid rgba(59,130,246,0.1)",
          boxShadow:            "0 1px 0 0 rgba(59,130,246,0.06), 0 6px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center h-[62px] px-4 md:px-6 gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group select-none">
            <div
              className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 transition-shadow duration-300"
              style={{
                background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                boxShadow:  "0 0 20px rgba(59,130,246,0.35)",
              }}
            >
              <BarChart2 className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <p className="text-[14px] font-extrabold text-white tracking-tight">SmartFX</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] hidden sm:block"
                style={{ color: "rgba(59,130,246,0.6)" }}>
                AI Trading Dashboard
              </p>
            </div>
          </Link>

          {/* Desktop center nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_LINKS.map(link => <NavLink key={link.href} link={link} />)}
          </nav>

          <div className="flex-1 lg:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Search */}
            {searchOpen ? (
              <div
                className="flex items-center gap-2 rounded-[10px] px-3 py-2"
                style={{ border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.06)" }}
              >
                <Search className="w-4 h-4 text-primary shrink-0" />
                <input
                  ref={searchRef}
                  placeholder="Search…"
                  className="bg-transparent text-sm text-white placeholder-slate-500 outline-none w-28 md:w-40"
                  onBlur={() => setSearchOpen(false)}
                />
                <button onClick={() => setSearchOpen(false)}>
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className={ICON_BTN}
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setNotifOpen(v => !v); setUserMenuOpen(false); }}
                className={cn(ICON_BTN, "relative")}
                style={{ border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Bell className="w-4 h-4" />
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#3B82F6,#6366F1)", boxShadow: "0 0 8px rgba(59,130,246,0.7)" }}
                >3</span>
              </button>

              {notifOpen && (
                <div style={GLASS_DROPDOWN} className="absolute top-11 right-0 w-72 rounded-[16px] p-2.5 z-50">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Notifications</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-primary"
                      style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.22)" }}>
                      3 new
                    </span>
                  </div>
                  {NOTIFS.map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-2 py-2.5 rounded-[10px] hover:bg-white/[0.04] cursor-pointer transition-colors">
                      <div
                        className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0",
                          n.type === "win" ? "bg-emerald-400" : n.type === "loss" ? "bg-red-400" : "bg-primary")}
                        style={{ boxShadow: n.type === "win" ? "0 0 6px rgba(52,211,153,0.8)"
                          : n.type === "loss" ? "0 0 6px rgba(239,68,68,0.8)"
                          : "0 0 6px rgba(59,130,246,0.8)" }}
                      />
                      <div>
                        <p className="text-sm text-white font-medium leading-snug">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <button className="w-full text-center text-xs font-medium text-primary/70 hover:text-primary transition-colors py-1">
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <button
              className={cn(ICON_BTN, "relative hover:text-indigo-400")}
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <MessageSquare className="w-4 h-4" />
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: "rgba(99,102,241,0.9)", boxShadow: "0 0 8px rgba(99,102,241,0.7)" }}
              >1</span>
            </button>

            <div className="w-px h-6 hidden sm:block" style={{ background: "rgba(255,255,255,0.07)" }} />

            {/* User menu */}
            <div ref={userRef} className="relative">
              <button
                onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}
                className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-[11px] hover:bg-white/[0.04] transition-all duration-200"
              >
                <div
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #3B82F6, #7C3AED)",
                    boxShadow:  "0 0 14px rgba(59,130,246,0.2)",
                  }}
                >C</div>
                <div className="text-left leading-tight hidden md:block">
                  <p className="text-[13px] font-semibold text-white">Charles</p>
                  <p className="text-[10px] font-medium flex items-center gap-0.5"
                    style={{ color: "rgba(59,130,246,0.65)" }}>
                    <Crown className="w-2.5 h-2.5 inline" /> Premium
                  </p>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform duration-200 hidden md:block", userMenuOpen && "rotate-180")} />
              </button>

              {userMenuOpen && (
                <div style={GLASS_DROPDOWN} className="absolute top-12 right-0 w-52 rounded-[16px] p-2 z-50">
                  <div className="px-3 py-2.5 mb-1">
                    <p className="text-sm font-semibold text-white">Charles</p>
                    <p className="text-xs text-slate-500">charles@smartfx.ai</p>
                    <div
                      className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-[7px]"
                      style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.18)" }}
                    >
                      <Crown className="w-3 h-3 text-primary" />
                      <span className="text-[11px] font-semibold text-primary">Premium Plan</span>
                    </div>
                  </div>
                  <div className="h-px my-1" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <Link href="/settings">
                    <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                  </Link>
                  <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <Shield className="w-4 h-4" /> Security
                  </button>
                  <div className="h-px my-1" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-red-400 hover:text-red-300 hover:bg-red-400/[0.06] transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav strip removed — replaced by MobileNav bottom tab bar */}
      </header>
    </>
  );
}

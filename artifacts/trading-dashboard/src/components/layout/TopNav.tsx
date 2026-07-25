import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart2, Search, Bell, MessageSquare, Moon,
  ChevronDown, Settings, LogOut, Shield, Crown, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/",            label: "Dashboard",    emoji: "🏠" },
  { href: "/signals",     label: "Live Signals", emoji: "📈" },
  { href: "/analyze",     label: "AI Scanner",   emoji: "🤖" },
  { href: "/news",        label: "News",         emoji: "📰" },
  { href: "/calculator",  label: "Risk Calc",    emoji: "🧮" },
  { href: "/calendar",    label: "Econ Calendar",emoji: "📅" },
  { href: "/setup",       label: "MT5 Setup",    emoji: "⚙️"  },
];

const NOTIFS = [
  { title: "GBPJPY signal hit Take Profit", time: "2m ago",  type: "win"  },
  { title: "EURUSD new signal generated",   time: "15m ago", type: "info" },
  { title: "AUDUSD hit Stop Loss",          time: "1h ago",  type: "loss" },
];

const GLASS_NAV: React.CSSProperties = {
  background:           "rgba(11, 15, 25, 0.88)",
  backdropFilter:       "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
};

const GLASS_STRIP: React.CSSProperties = {
  background:           "rgba(11, 15, 25, 0.92)",
  backdropFilter:       "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderBottom:         "1px solid rgba(0, 255, 255, 0.07)",
  boxShadow:            "0 4px 24px rgba(0,0,0,0.4)",
};

const GLASS_DROPDOWN: React.CSSProperties = {
  background:           "rgba(10, 13, 22, 0.97)",
  backdropFilter:       "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border:               "1px solid rgba(0, 255, 255, 0.1)",
  boxShadow:            "0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,255,255,0.04)",
};

const ICON_BTN =
  "w-9 h-9 rounded-[10px] bg-white/[0.04] flex items-center justify-center text-slate-400 transition-all duration-200 hover:text-cyan-400 hover:bg-cyan-400/[0.06]";

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

  /* ─── shared nav link renderer ─── */
  function NavLink({ link, compact = false }: { link: typeof NAV_LINKS[0]; compact?: boolean }) {
    const active = isActive(link.href);
    return (
      <Link href={link.href}>
        <div
          style={active ? {
            background: "rgba(0,255,255,0.07)",
            border:     "1px solid rgba(0,255,255,0.2)",
            boxShadow:  "0 0 12px rgba(0,255,255,0.06)",
          } : { border: "1px solid transparent" }}
          className={cn(
            "relative flex items-center gap-1.5 rounded-[10px] font-medium transition-all duration-200 cursor-pointer group select-none whitespace-nowrap",
            compact ? "px-2.5 py-1.5 text-[12px]" : "px-3 py-2 text-[13px]",
            active
              ? "text-white"
              : "text-slate-400 hover:text-white hover:bg-white/[0.04] hover:border-white/[0.07]",
          )}
        >
          <span
            className={cn(
              "transition-transform duration-200 group-hover:scale-110 leading-none",
              compact ? "text-[13px]" : "text-[15px]",
              active && "[filter:drop-shadow(0_0_5px_rgba(0,255,255,0.7))]",
            )}
          >
            {link.emoji}
          </span>
          <span className={cn(active && "font-semibold")}>{link.label}</span>
          {active && !compact && (
            <span
              style={{
                background: "linear-gradient(90deg, transparent, rgba(0,255,255,0.9), transparent)",
                boxShadow:  "0 0 8px rgba(0,255,255,0.75)",
              }}
              className="absolute bottom-0 left-3 right-3 h-[1.5px] rounded-full"
            />
          )}
          {active && compact && (
            <span
              style={{ background: "rgba(0,255,255,0.8)", boxShadow: "0 0 6px rgba(0,255,255,0.7)" }}
              className="absolute bottom-0 left-2.5 right-2.5 h-[1.5px] rounded-full"
            />
          )}
        </div>
      </Link>
    );
  }

  return (
    <>
      {/* ══════════════════════════════════════════
          TOP BAR — logo | desktop-nav | actions
      ══════════════════════════════════════════ */}
      <header
        style={{
          ...GLASS_NAV,
          borderBottom: "1px solid rgba(0,255,255,0.06)",
          boxShadow:    "0 1px 0 0 rgba(0,255,255,0.04), 0 6px 32px rgba(0,0,0,0.5)",
        }}
        className="sticky top-0 z-50 w-full"
      >
        <div className="flex items-center h-[64px] px-4 md:px-6 gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group select-none">
            <div
              style={{
                background: "linear-gradient(135deg, rgba(0,255,255,0.12), rgba(139,92,246,0.12))",
                border:     "1px solid rgba(0,255,255,0.2)",
                boxShadow:  "0 0 16px rgba(0,255,255,0.08)",
              }}
              className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
            >
              <BarChart2 className="w-[18px] h-[18px] text-cyan-400" />
            </div>
            <div className="leading-tight">
              <p className="text-[14px] font-bold text-white tracking-tight">SmartFX</p>
              <p style={{ color: "rgba(0,220,220,0.5)" }} className="text-[9px] font-semibold uppercase tracking-[0.13em] hidden sm:block">
                AI Trading Dashboard
              </p>
            </div>
          </Link>

          {/* Desktop center nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_LINKS.map(link => <NavLink key={link.href} link={link} />)}
          </nav>

          {/* Spacer on mobile */}
          <div className="flex-1 lg:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* Search */}
            {searchOpen ? (
              <div
                style={{ border: "1px solid rgba(0,255,255,0.22)", background: "rgba(0,255,255,0.04)" }}
                className="flex items-center gap-2 rounded-[10px] px-3 py-2"
              >
                <Search className="w-4 h-4 text-cyan-400 shrink-0" />
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
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                className={ICON_BTN}
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setNotifOpen(v => !v); setUserMenuOpen(false); }}
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                className={cn(ICON_BTN, "relative")}
              >
                <Bell className="w-4 h-4" />
                <span
                  style={{ background: "linear-gradient(135deg,#00ffff,#8b5cf6)", boxShadow: "0 0 8px rgba(0,255,255,0.65)" }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-black flex items-center justify-center"
                >3</span>
              </button>
              {notifOpen && (
                <div
                  style={GLASS_DROPDOWN}
                  className="absolute top-11 right-0 w-72 rounded-[16px] p-2.5 z-50"
                >
                  <div className="flex items-center justify-between px-2 pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Notifications</p>
                    <span style={{ color:"rgba(0,255,255,0.7)", border:"1px solid rgba(0,255,255,0.2)" }} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-400/[0.06]">3 new</span>
                  </div>
                  {NOTIFS.map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-2 py-2.5 rounded-[10px] hover:bg-white/[0.04] cursor-pointer transition-colors">
                      <div
                        className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", n.type==="win"?"bg-emerald-400":n.type==="loss"?"bg-red-400":"bg-cyan-400")}
                        style={n.type==="win"?{boxShadow:"0 0 6px rgba(52,211,153,0.8)"}:n.type==="loss"?{boxShadow:"0 0 6px rgba(248,113,113,0.8)"}:{boxShadow:"0 0 6px rgba(0,255,255,0.8)"}}
                      />
                      <div>
                        <p className="text-sm text-white font-medium leading-snug">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t border-white/[0.05]">
                    <button style={{ color:"rgba(0,255,255,0.7)" }} className="w-full text-center text-xs font-medium hover:text-cyan-300 transition-colors py-1">
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <button
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              className={cn(ICON_BTN, "relative hover:text-purple-400")}
            >
              <MessageSquare className="w-4 h-4" />
              <span style={{ background:"rgba(139,92,246,0.9)", boxShadow:"0 0 8px rgba(139,92,246,0.7)" }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center">1</span>
            </button>

            {/* Theme */}
            <button
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              className={cn(ICON_BTN, "hidden sm:flex hover:text-amber-400")}
            >
              <Moon className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-white/[0.06] hidden sm:block" />

            {/* User */}
            <div ref={userRef} className="relative">
              <button
                onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}
                className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-[11px] hover:bg-white/[0.04] transition-all duration-200"
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(0,255,255,0.25), rgba(139,92,246,0.25))",
                    border:     "1.5px solid rgba(0,255,255,0.28)",
                    boxShadow:  "0 0 12px rgba(0,255,255,0.12)",
                  }}
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center text-sm font-bold text-white shrink-0"
                >C</div>
                <div className="text-left leading-tight hidden md:block">
                  <p className="text-[13px] font-semibold text-white">Charles</p>
                  <p style={{ color:"rgba(0,210,210,0.65)" }} className="text-[10px] font-medium flex items-center gap-0.5">
                    <Crown className="w-2.5 h-2.5 inline" /> Premium Plan
                  </p>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-500 transition-transform duration-200 hidden md:block", userMenuOpen && "rotate-180")} />
              </button>

              {userMenuOpen && (
                <div style={GLASS_DROPDOWN} className="absolute top-12 right-0 w-52 rounded-[16px] p-2 z-50">
                  <div className="px-3 py-2.5 mb-1">
                    <p className="text-sm font-semibold text-white">Charles</p>
                    <p className="text-xs text-slate-500">charles@smartfx.ai</p>
                    <div style={{ background:"linear-gradient(90deg,rgba(0,255,255,0.1),rgba(139,92,246,0.1))", border:"1px solid rgba(0,255,255,0.15)" }} className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-[7px]">
                      <Crown className="w-3 h-3 text-cyan-400" />
                      <span className="text-[11px] font-semibold text-cyan-300">Premium Plan</span>
                    </div>
                  </div>
                  <div className="h-px bg-white/[0.05] my-1" />
                  <Link href="/settings">
                    <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                  </Link>
                  <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <Shield className="w-4 h-4" /> Security
                  </button>
                  <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <Crown className="w-4 h-4 text-amber-400" /> Upgrade Plan
                  </button>
                  <div className="h-px bg-white/[0.05] my-1" />
                  <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-red-400 hover:text-red-300 hover:bg-red-400/[0.06] transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            MOBILE NAV STRIP — always visible, horizontal scroll
            Hidden on lg+ (desktop uses center nav above)
        ══════════════════════════════════════════ */}
        <div
          style={GLASS_STRIP}
          className="lg:hidden overflow-x-auto scrollbar-none"
        >
          <div className="flex items-center gap-1.5 px-3 py-2" style={{ width: "max-content", minWidth: "100%" }}>
            {NAV_LINKS.map(link => <NavLink key={link.href} link={link} compact />)}
          </div>
        </div>
      </header>
    </>
  );
}

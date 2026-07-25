import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart2, Search, Bell, MessageSquare, Moon, Sun,
  ChevronDown, Settings, LogOut, Shield, Crown, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const NAV_LINKS = [
  { href: "/",            label: "Dashboard",    emoji: "🏠" },
  { href: "/signals",     label: "Live Signals", emoji: "📈" },
  { href: "/analyze",     label: "AI Scanner",   emoji: "🤖" },
  { href: "/news",        label: "News",         emoji: "📰" },
  { href: "/calculator",  label: "Risk Calc",    emoji: "🧮" },
  { href: "/calendar",    label: "Econ Calendar",emoji: "📅" },
  { href: "/signals/new", label: "Manual",       emoji: "✍️" },
];

const NOTIFS = [
  { title: "GBPJPY signal hit Take Profit", time: "2m ago",  type: "win"  },
  { title: "EURUSD new signal generated",   time: "15m ago", type: "info" },
  { title: "AUDUSD hit Stop Loss",          time: "1h ago",  type: "loss" },
];

const GLASS_NAV: React.CSSProperties = {
  background:           "rgba(11, 15, 25, 0.82)",
  backdropFilter:       "blur(28px) saturate(180%)",
  WebkitBackdropFilter: "blur(28px) saturate(180%)",
  borderBottom:         "1px solid rgba(0, 255, 255, 0.07)",
  boxShadow:            "0 1px 0 0 rgba(0,255,255,0.04), 0 8px 48px rgba(0,0,0,0.55)",
};

const GLASS_DROPDOWN: React.CSSProperties = {
  background:           "rgba(10, 13, 22, 0.97)",
  backdropFilter:       "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border:               "1px solid rgba(0, 255, 255, 0.1)",
  boxShadow:            "0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(0,255,255,0.04), 0 0 40px rgba(0,255,255,0.03)",
};

const ICON_BTN = "w-9 h-9 rounded-[10px] bg-white/[0.04] flex items-center justify-center text-slate-400 transition-all duration-200 hover:text-cyan-400 hover:bg-cyan-400/[0.06] hover:border-cyan-400/20";

export function TopNav() {
  const [location] = useLocation();
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const userRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
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

  // close mobile menu on navigate
  useEffect(() => { setMobileOpen(false); }, [location]);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <>
      {/* ── Main nav bar ── */}
      <header
        style={GLASS_NAV}
        className="sticky top-0 z-50 w-full h-[76px] flex items-center px-5 lg:px-8 gap-4"
      >
        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group select-none">
          <div
            style={{
              background:  "linear-gradient(135deg, rgba(0,255,255,0.12), rgba(139,92,246,0.12))",
              border:      "1px solid rgba(0,255,255,0.18)",
              boxShadow:   "0 0 18px rgba(0,255,255,0.08)",
              transition:  "box-shadow .3s",
            }}
            className="w-10 h-10 rounded-[12px] flex items-center justify-center group-hover:[box-shadow:0_0_28px_rgba(0,255,255,0.25)]"
          >
            <BarChart2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-bold text-white tracking-tight">SmartFX</p>
            <p
              style={{ color: "rgba(0,230,230,0.55)" }}
              className="text-[9px] font-semibold uppercase tracking-[0.14em]"
            >
              AI Trading Dashboard
            </p>
          </div>
        </Link>

        {/* ── Thin rule ── */}
        <div className="w-px h-8 bg-white/[0.06] shrink-0 hidden lg:block" />

        {/* ── Center nav ── */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
          {NAV_LINKS.map(link => {
            const active = isActive(link.href);
            return (
              <Link key={link.href} href={link.href}>
                <div
                  style={active ? {
                    background:  "rgba(0,255,255,0.06)",
                    border:      "1px solid rgba(0,255,255,0.17)",
                    boxShadow:   "0 0 14px rgba(0,255,255,0.05)",
                  } : {
                    border: "1px solid transparent",
                  }}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-200 cursor-pointer group select-none",
                    active
                      ? "text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04] hover:border-white/[0.07]",
                  )}
                >
                  <span
                    className={cn(
                      "text-[15px] transition-transform duration-200 group-hover:scale-110 leading-none",
                      active && "[filter:drop-shadow(0_0_6px_rgba(0,255,255,0.7))]",
                    )}
                  >
                    {link.emoji}
                  </span>
                  <span className={cn(active && "font-semibold")}>{link.label}</span>

                  {/* Glowing underline */}
                  {active && (
                    <span
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(0,255,255,0.9), transparent)",
                        boxShadow:  "0 0 8px rgba(0,255,255,0.75)",
                      }}
                      className="absolute bottom-0 left-3 right-3 h-[1.5px] rounded-full"
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ── Thin rule ── */}
        <div className="w-px h-8 bg-white/[0.06] shrink-0 hidden lg:block" />

        {/* ── Right actions ── */}
        <div className="flex items-center gap-1.5 ml-auto lg:ml-0 shrink-0">

          {/* Search */}
          {searchOpen ? (
            <div
              style={{ border: "1px solid rgba(0,255,255,0.2)", background: "rgba(0,255,255,0.04)" }}
              className="flex items-center gap-2 rounded-[10px] px-3 py-2 transition-all duration-200"
            >
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                ref={searchRef}
                placeholder="Search pairs, signals…"
                className="bg-transparent text-sm text-white placeholder-slate-500 outline-none w-40"
                onBlur={() => setSearchOpen(false)}
              />
              <button onClick={() => setSearchOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-3.5 h-3.5" />
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
                style={{
                  background: "linear-gradient(135deg,#00ffff,#8b5cf6)",
                  boxShadow:  "0 0 8px rgba(0,255,255,0.65)",
                }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-black flex items-center justify-center"
              >
                3
              </span>
            </button>

            {notifOpen && (
              <div
                style={GLASS_DROPDOWN}
                className="absolute top-11 right-0 w-76 rounded-[16px] p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between px-2 pb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Notifications</p>
                  <span
                    style={{ color: "rgba(0,255,255,0.7)", border: "1px solid rgba(0,255,255,0.2)" }}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-400/[0.06]"
                  >
                    3 new
                  </span>
                </div>
                <div className="space-y-0.5">
                  {NOTIFS.map((n, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-2 py-2.5 rounded-[10px] hover:bg-white/[0.04] cursor-pointer transition-colors"
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                          n.type === "win"  ? "bg-emerald-400" :
                          n.type === "loss" ? "bg-red-400"     : "bg-cyan-400",
                        )}
                        style={
                          n.type === "win"  ? { boxShadow: "0 0 6px rgba(52,211,153,0.8)"  } :
                          n.type === "loss" ? { boxShadow: "0 0 6px rgba(248,113,113,0.8)" } :
                                             { boxShadow: "0 0 6px rgba(0,255,255,0.8)"    }
                        }
                      />
                      <div>
                        <p className="text-sm text-white font-medium leading-snug">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-white/[0.05]">
                  <button
                    style={{ color: "rgba(0,255,255,0.7)" }}
                    className="w-full text-center text-xs font-medium hover:text-cyan-300 transition-colors py-1"
                  >
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <button
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            className={cn(ICON_BTN, "relative hover:text-purple-400 hover:bg-purple-400/[0.06] hover:border-purple-400/20")}
          >
            <MessageSquare className="w-4 h-4" />
            <span
              style={{ background: "rgba(139,92,246,0.9)", boxShadow: "0 0 8px rgba(139,92,246,0.7)" }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
            >
              1
            </span>
          </button>

          {/* Theme toggle */}
          <button
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            className={cn(ICON_BTN, "hover:text-amber-400 hover:bg-amber-400/[0.06] hover:border-amber-400/20")}
          >
            <Moon className="w-4 h-4" />
          </button>

          {/* Thin rule */}
          <div className="w-px h-7 bg-white/[0.06] mx-1" />

          {/* User profile */}
          <div ref={userRef} className="relative">
            <button
              onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-[12px] transition-all duration-200 hover:bg-white/[0.04] group"
            >
              {/* Avatar */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(0,255,255,0.25), rgba(139,92,246,0.25))",
                  border:     "1.5px solid rgba(0,255,255,0.28)",
                  boxShadow:  "0 0 14px rgba(0,255,255,0.12)",
                }}
                className="w-8 h-8 rounded-[9px] flex items-center justify-center text-sm font-bold text-white shrink-0"
              >
                C
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <p className="text-[13px] font-semibold text-white">Charles</p>
                <p
                  style={{ color: "rgba(0,220,220,0.65)" }}
                  className="text-[10px] font-medium flex items-center gap-1"
                >
                  <Crown className="w-2.5 h-2.5 inline" />
                  Premium Plan
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-slate-500 transition-transform duration-200 hidden sm:block",
                  userMenuOpen && "rotate-180",
                )}
              />
            </button>

            {userMenuOpen && (
              <div
                style={GLASS_DROPDOWN}
                className="absolute top-12 right-0 w-52 rounded-[16px] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                {/* User info */}
                <div className="px-3 py-2.5 mb-1">
                  <p className="text-sm font-semibold text-white">Charles</p>
                  <p className="text-xs text-slate-500">charles@smartfx.ai</p>
                  <div
                    style={{
                      background: "linear-gradient(90deg,rgba(0,255,255,0.12),rgba(139,92,246,0.12))",
                      border:     "1px solid rgba(0,255,255,0.15)",
                    }}
                    className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-[7px]"
                  >
                    <Crown className="w-3 h-3 text-cyan-400" />
                    <span className="text-[11px] font-semibold text-cyan-300">Premium Plan</span>
                  </div>
                </div>

                <div className="h-px bg-white/[0.05] my-1" />

                {/* Menu items */}
                <Link href="/settings">
                  <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                </Link>
                <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                  <Shield className="w-4 h-4" /> Security
                </button>
                <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Upgrade Plan</span>
                </button>

                <div className="h-px bg-white/[0.05] my-1" />

                <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[10px] text-sm text-red-400 hover:text-red-300 hover:bg-red-400/[0.06] transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            className={cn(ICON_BTN, "lg:hidden ml-1")}
          >
            <div className="space-y-1 w-4">
              <span className={cn("block h-px bg-slate-400 transition-all duration-300", mobileOpen && "rotate-45 translate-y-[5px]")} />
              <span className={cn("block h-px bg-slate-400 transition-all duration-300", mobileOpen && "opacity-0")} />
              <span className={cn("block h-px bg-slate-400 transition-all duration-300", mobileOpen && "-rotate-45 -translate-y-[5px]")} />
            </div>
          </button>
        </div>
      </header>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div
          style={GLASS_DROPDOWN}
          className="lg:hidden fixed top-[76px] inset-x-0 z-40 rounded-b-[20px] p-4 animate-in fade-in slide-in-from-top-2 duration-150 mx-3"
        >
          <nav className="space-y-1">
            {NAV_LINKS.map(link => {
              const active = isActive(link.href);
              return (
                <Link key={link.href} href={link.href}>
                  <div
                    style={active ? {
                      background: "rgba(0,255,255,0.06)",
                      border:     "1px solid rgba(0,255,255,0.17)",
                    } : { border: "1px solid transparent" }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-150",
                      active ? "text-white font-semibold" : "text-slate-400",
                    )}
                  >
                    <span className="text-base">{link.emoji}</span>
                    <span>{link.label}</span>
                    {active && (
                      <div
                        style={{ background: "rgba(0,255,255,0.8)", boxShadow: "0 0 8px rgba(0,255,255,0.7)" }}
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}

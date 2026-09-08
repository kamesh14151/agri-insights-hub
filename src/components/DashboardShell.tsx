import { useState, useRef, useEffect, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, ScanLine, Cpu, Sprout, CloudSun,
  TrendingUp, Settings, Menu, X, LogOut, Leaf, ChevronRight,
  Bell, Search, Globe, ChevronDown, ShieldAlert, Users, Shield
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { toast } from "sonner";
import { FloatingWidgets } from "@/components/FloatingWidgets";
import { supabase } from "@/lib/supabase";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { user, logout, update } = useAuth();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (user?.id) {
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10).then(({ data }) => {
        if (data) setNotifications(data);
      });
      const sub = supabase.channel(`notifications:${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
          supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10).then(({ data }) => {
            if (data) setNotifications(data);
          });
        }).subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
      if (langRef.current && !langRef.current.contains(event.target as Node)) setLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";

  const navItems = isManagerOrAdmin
    ? [
        { to: "/app/admin",   label: t("nav_admin", "Admin Console & Users"), icon: Shield, exact: false },
        { to: "/app/manager", label: t("nav_manager", "Manager Hub & Radar"),   icon: ShieldAlert, exact: false },
      ]
    : [
        { to: "/app",          label: t("nav_dashboard", "Dashboard"),   icon: LayoutDashboard, exact: true },
        { to: "/app/iot",      label: t("nav_iot", "IoT Monitoring"),   icon: Cpu },
        { to: "/app/disease",  label: t("nav_disease", "AI Insights"),  icon: ScanLine },
        { to: "/app/crops",    label: t("nav_crops", "Crop Planner"), icon: Sprout },
        { to: "/app/weather",  label: t("nav_weather", "Weather Intelligence"), icon: CloudSun },
        { to: "/app/market",   label: t("nav_market", "Market Demand"),  icon: TrendingUp },
      ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === `${to}/` : pathname.startsWith(to);

  const signOut = () => {
    logout();
    toast.success(t("sign_out"));
    navigate({ to: "/", replace: true });
  };

  const handleProfileUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    update({
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      location: formData.get("location") as string,
      farmSize: formData.get("farmSize") as string,
    });
    toast.success("Profile updated");
    setProfileOpen(false);
  };

  return (
    <div className="app-shell min-h-screen bg-background text-foreground font-sans antialiased">

      {/* Mobile overlay */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`glass-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-[64px] shrink-0 items-center justify-between px-5 mt-2">
          <Link to={isManagerOrAdmin ? "/app/admin" : "/app"} className="flex items-center gap-2.5 min-w-0" onClick={() => setOpen(false)}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#1a1a18] shadow-sm">
              <Leaf className="h-4 w-4 text-white" />
            </span>
            <span className="text-[14px] font-semibold tracking-[-0.02em] truncate text-[#1a1a18]">Agrisynapse</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden rounded-full p-1.5 text-[#7a7a72] hover:bg-black/5 transition" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a7a72]">
            {isManagerOrAdmin ? t("management_console", "Management Console") : t("workspace", "Workspace")}
          </p>
          {navItems.map((item) => {
            const active = isActive(item.to, "exact" in item ? item.exact : false);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-full px-3 py-2.5 text-[13px] transition-all duration-150 ${
                  active
                    ? "nav-item-active"
                    : "text-[#7a7a72] hover:bg-black/5 hover:text-[#1a1a18]"
                }`}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all ${
                  active
                    ? "bg-[#c8e44a]/30 text-[#3d5a00]"
                    : "text-[#7a7a72] group-hover:text-[#1a1a18]"
                }`}>
                  <item.icon className="h-[14px] w-[14px]" />
                </span>
                <span className="truncate flex-1">{item.label}</span>
                {active && <ChevronRight className="h-3 w-3 text-[#3d5a00]/50 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer: Profile area that opens Settings */}
        <div className="px-3 pb-4 border-t border-black/[0.06] pt-3">
          <div 
            onClick={() => {
              setSettingsOpen(true);
              setOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/[0.04] transition cursor-pointer"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#c8e44a] text-[13px] font-bold text-[#1a1a18]">
              {(user?.name ?? "G").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#1a1a18]">{user?.name ?? "Farmer"}</p>
              <p className="truncate text-[11px] text-[#7a7a72]">{t("settings_preferences", "Settings & Preferences")}</p>
            </div>
            <Settings className="h-4 w-4 text-[#7a7a72]" />
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="lg:pl-[260px]">

        {/* ── Top nav ────────────────────────────────────────────────────── */}
        <header className="top-nav sticky top-0 z-40 h-[64px] bg-background border-b border-border">
          <div className="h-full px-4 sm:px-6 flex items-center gap-3">

            {/* Mobile hamburger */}
            <button onClick={() => setOpen(true)}
              className="lg:hidden grid h-9 w-9 place-items-center rounded-full bg-black/[0.06] text-[#1a1a18] hover:bg-black/10 transition"
              aria-label="Open menu">
              <Menu className="h-4 w-4" />
            </button>

            {/* Desktop: empty placeholder to push right controls */}
            <div className="hidden lg:flex flex-1" />

            {/* Mobile logo */}
            <div className="lg:hidden flex-1 min-w-0">
              <span className="text-[14px] font-semibold text-[#1a1a18]">Agrisynapse</span>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-3 ml-auto">
              
              {/* Modern Language Selector */}
              <div className="relative" ref={langRef}>
                <button 
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-black/[0.06] transition text-[#7a7a72] hover:text-[#1a1a18]"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span className="text-[12px] font-medium">{LANGUAGES.find(l => l.code === lang)?.full || 'English'}</span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-2 w-32 rounded-2xl bg-white border border-black/[0.06] shadow-lg overflow-hidden py-1 z-50">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLang(l.code as Lang);
                          toast.success(t("toast_lang"));
                          setLangOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-[12px] transition ${
                          lang === l.code ? "bg-[#c8e44a]/20 text-[#3d5a00] font-semibold" : "text-[#7a7a72] hover:bg-black/5 hover:text-[#1a1a18]"
                        }`}
                      >
                        {l.full}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    if (!notificationsOpen && notifications.some(n => !n.read)) {
                      supabase.from("notifications").update({ read: true }).eq("user_id", user?.id).then(() => {
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      });
                    }
                  }}
                  className="relative grid h-9 w-9 place-items-center rounded-full bg-black/[0.06] text-[#7a7a72] hover:bg-black/10 hover:text-[#1a1a18] transition"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto rounded-2xl bg-white border border-black/[0.06] shadow-xl p-2 z-50">
                    <h3 className="px-3 py-2 text-xs font-bold text-[#1a1a18] uppercase tracking-wider">Notifications</h3>
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#7a7a72]">No notifications yet</div>
                    ) : (
                      <div className="space-y-1 mt-1">
                        {notifications.map(n => (
                          <div key={n.id} className={`p-3 rounded-xl text-sm transition ${!n.read ? "bg-[#c8e44a]/10" : "hover:bg-black/[0.02]"}`}>
                            <p className="font-semibold text-[#1a1a18]">{n.title}</p>
                            <p className="text-xs text-[#7a7a72] mt-0.5 leading-relaxed">{n.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Profile Modal Trigger */}
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#c8e44a] text-[#1a1a18] text-[13px] font-bold ring-2 ring-white shadow-sm hover:scale-105 transition"
                >
                  {(user?.name ?? "G").charAt(0).toUpperCase()}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-80 rounded-[24px] bg-white border border-black/[0.08] shadow-xl p-5 z-50">
                    <div className="flex items-center gap-4 border-b border-black/[0.06] pb-4 mb-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#c8e44a]/20 text-xl font-bold text-[#3d5a00]">
                        {(user?.name ?? "G").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[15px] text-[#1a1a18]">{user?.name}</p>
                        <p className="truncate text-[12px] text-[#7a7a72]">{user?.email}</p>
                        <span className="mt-1 inline-block rounded-full bg-[#c8e44a]/30 px-2 py-0.5 text-[10px] font-bold capitalize text-[#3d5a00]">
                          {user?.role || "farmer"}
                        </span>
                      </div>
                    </div>
                    
                    <form onSubmit={handleProfileUpdate} className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-[#7a7a72] ml-1">Full Name</label>
                        <input name="name" defaultValue={user?.name || ""} className="w-full mt-1 rounded-xl bg-black/[0.03] border-transparent px-3 py-2 text-[13px] focus:bg-white focus:border-[#c8e44a] focus:ring-1 focus:ring-[#c8e44a] outline-none transition" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-[#7a7a72] ml-1">Phone</label>
                          <input name="phone" defaultValue={user?.phone || ""} className="w-full mt-1 rounded-xl bg-black/[0.03] border-transparent px-3 py-2 text-[13px] focus:bg-white focus:border-[#c8e44a] focus:ring-1 focus:ring-[#c8e44a] outline-none transition" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-[#7a7a72] ml-1">Farm Size</label>
                          <input name="farmSize" defaultValue={user?.farmSize || ""} className="w-full mt-1 rounded-xl bg-black/[0.03] border-transparent px-3 py-2 text-[13px] focus:bg-white focus:border-[#c8e44a] focus:ring-1 focus:ring-[#c8e44a] outline-none transition" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-[#7a7a72] ml-1">Location</label>
                        <input name="location" defaultValue={user?.location || ""} className="w-full mt-1 rounded-xl bg-black/[0.03] border-transparent px-3 py-2 text-[13px] focus:bg-white focus:border-[#c8e44a] focus:ring-1 focus:ring-[#c8e44a] outline-none transition" />
                      </div>
                      

                      <div className="flex gap-2 mt-4 pt-4 border-t border-black/[0.06]">
                        <button type="submit" className="flex-1 btn-lime py-2 text-[13px] rounded-full">Save</button>
                        <button type="button" onClick={signOut} className="p-2 rounded-full text-[#e05245] hover:bg-red-50 transition" title="Sign out">
                          <LogOut className="h-4 w-4" />
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto">
          {children}
        </main>
      </div>

      <FloatingWidgets />

      {/* ── Settings Modal ─────────────────────────────────────────────────── */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl p-6 sm:p-8 animate-scale-in">
            <button 
              onClick={() => setSettingsOpen(false)} 
              className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground transition"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-bold tracking-tight mb-6">{t("settings_title") || "Settings"}</h2>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="card p-5 rounded-2xl bg-black/[0.02] border-transparent">
                <h3 className="font-semibold text-sm mb-4">{t("lang_appearance") || "Appearance"}</h3>
                <label className="block mb-4">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("interface_lang") || "Language"}</span>
                  <select
                    value={lang}
                    onChange={(e) => {
                      setLang(e.target.value as Lang);
                      toast.success(t("toast_lang"));
                    }}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c8e44a]"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.full}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="card p-5 rounded-2xl bg-black/[0.02] border-transparent">
                <h3 className="font-semibold text-sm mb-4">{t("alerts_header") || "Alerts"}</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium">Push Notifications</span>
                    <input type="checkbox" className="rounded text-[#c8e44a] focus:ring-[#c8e44a]" defaultChecked />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email Alerts</span>
                    <input type="checkbox" className="rounded text-[#c8e44a] focus:ring-[#c8e44a]" defaultChecked />
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-black/5">
              <button onClick={() => setSettingsOpen(false)} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-black/5 rounded-full transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── PageIntro ──────────────────────────────────────────────────────────── */
export function PageIntro({ index, eyebrow, title, subtitle }: {
  index: string; eyebrow: string; title: string; subtitle: string;
}) {
  return (
    <header className="premium-page-intro mb-8 pb-7 animate-float-up">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a7a72] mb-3">{eyebrow}</p>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-[-0.04em] text-[#1a1a18]">{title}</h1>
      <p className="mt-3 max-w-2xl text-[14px] text-[#7a7a72] leading-relaxed">{subtitle}</p>
    </header>
  );
}

/* ── Panel ──────────────────────────────────────────────────────────────── */
export function Panel({ title, action, children, className = "", onClick }: {
  title?: string; action?: ReactNode; children: ReactNode; className?: string; onClick?: () => void;
}) {
  return (
    <section
      onClick={onClick}
      className={`card p-5 sm:p-6 rounded-[24px] ${className}`}
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-[15px] tracking-[-0.01em] text-[#1a1a18]">{title}</h2>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

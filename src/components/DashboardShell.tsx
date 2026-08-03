import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, ScanLine, Cpu, Sprout, CloudSun, TrendingUp, Store, CalendarCheck,
  ShoppingBag, MessageCircle, Mic, User, Settings, Shield, Menu, X, Moon, Sun, LogOut, Leaf,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { toast } from "sonner";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/disease", label: "Disease Detection", icon: ScanLine },
  { to: "/app/iot", label: "IoT Monitoring", icon: Cpu },
  { to: "/app/crops", label: "Crop Recommendation", icon: Sprout },
  { to: "/app/weather", label: "Weather Intelligence", icon: CloudSun },
  { to: "/app/market", label: "Market Demand", icon: TrendingUp },
  { to: "/app/marketplace", label: "Marketplace", icon: Store },
  { to: "/app/booking", label: "Service Booking", icon: CalendarCheck },
  { to: "/app/shop", label: "Agri Shop", icon: ShoppingBag },
  { to: "/app/chatbot", label: "AI Chatbot", icon: MessageCircle },
  { to: "/app/voice", label: "Voice Assistant", icon: Mic },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = user?.role === "admin" ? [...NAV, { to: "/app/admin", label: "Admin Console", icon: Shield }] : NAV;

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === `${to}/` : pathname.startsWith(to);

  const signOut = () => {
    logout();
    toast.success("Signed out");
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[268px] border-r border-border bg-card flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-border shrink-0">
          <Link to="/app" className="flex items-center gap-2 min-w-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-serif text-lg tracking-tight truncate">Agrisynapse</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden text-muted-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((item) => {
            const active = isActive(item.to, "exact" in item ? item.exact : false);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${active ? "text-primary" : ""}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary text-sm font-semibold">
              {(user?.name ?? "G").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name ?? "Guest"}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{user?.role ?? "visitor"}</p>
            </div>
            <button onClick={signOut} aria-label="Sign out" className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[268px]">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="h-full px-4 sm:px-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden text-muted-foreground" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <p className="hidden lg:block text-sm text-muted-foreground truncate">
              {t("nav_weather") ? "" : ""}Welcome back, <span className="text-foreground">{user?.name?.split(" ")[0] ?? "farmer"}</span> — here is your field intelligence.
            </p>
            <span className="lg:hidden font-serif text-base truncate">Agrisynapse</span>
            <div className="flex items-center gap-2 justify-self-end">
              <select
                value={lang}
                onChange={(e) => {
                  setLang(e.target.value as Lang);
                  toast.success(t("toast_lang"));
                }}
                aria-label="Language"
                className="hidden sm:block rounded-md border border-border bg-transparent px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.full}</option>
                ))}
              </select>
              <button
                onClick={toggle}
                aria-label="Toggle theme"
                className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground transition"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-10 py-8 max-w-[1400px] mx-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageIntro({ index, eyebrow, title, subtitle }: { index: string; eyebrow: string; title: string; subtitle: string }) {
  return (
    <header className="mb-10 grid grid-cols-12 gap-4 border-b border-border pb-8">
      <div className="col-span-12 md:col-span-2 font-serif text-2xl text-muted-foreground">{index}</div>
      <div className="col-span-12 md:col-span-10 min-w-0">
        <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{eyebrow}</p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-[1.08] tracking-tight">{title}</h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground leading-relaxed">{subtitle}</p>
      </div>
    </header>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="font-serif text-lg sm:text-xl truncate">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
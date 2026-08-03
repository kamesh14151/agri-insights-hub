import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight, Droplets, ScanLine, ThermometerSun, TrendingUp,
  ShoppingBag, Shield, Users, Layers, Activity as ActivityIcon, CheckCircle, User
} from "lucide-react";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { IOT_TIMESERIES, MARKET_TREND } from "@/lib/mock";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Agrisynapse" },
      { name: "description", content: "Your farm at a glance: soil telemetry, disease alerts, market movement and upcoming bookings." },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const role = user?.role ?? "user";

  const farmerStats = [
    { label: t("soil_moisture"), value: "62%", note: t("optimal_band"), icon: Droplets },
    { label: t("field_temp"), value: "31.4°C", note: t("temp_note"), icon: ThermometerSun },
    { label: t("scans_week"), value: "18", note: t("action_needed"), icon: ScanLine },
    { label: t("paddy_price"), value: "₹2,380", note: t("month_increase"), icon: TrendingUp },
  ];

  const farmerQuick = [
    { to: "/app/disease" as const, label: t("scan_leaf"), desc: t("scan_leaf_desc") },
    { to: "/app/crops" as const, label: t("plan_crop"), desc: t("plan_crop_desc") },
    { to: "/app/marketplace" as const, label: t("list_produce"), desc: t("list_produce_desc") },
    { to: "/app/booking" as const, label: t("book_service"), desc: t("book_service_desc") },
  ];

  const farmerActivity = [
    { title: "Soil Moisture Alert", detail: "Moisture dropped in Sector 4B. Recommended drip irrigation for 30 mins.", time: "10 mins ago" },
    { title: "Crop Analysis Complete", detail: "Gemini diagnosed Paddy Blast disease in Scan #402. Treatment recommended.", time: "2 hours ago" },
    { title: "Service Booking Confirmed", detail: "Tractor with Rotavator from Kisan Agro Rentals scheduled for tomorrow.", time: "Yesterday" },
  ];

  const buyerStats = [
    { label: "Paddy Market Price", value: "₹2,380/q", note: "+2.1% this month", icon: TrendingUp },
    { label: "Tomato Market Price", value: "₹1,900/q", note: "-3.5% this week", icon: TrendingUp },
    { label: "Active Orders", value: "3", note: "1 shipped, 2 packing", icon: ShoppingBag },
    { label: "Marketplace Offers", value: "12", note: "4 new listings today", icon: Layers },
  ];

  const buyerQuick = [
    { to: "/app/marketplace" as const, label: t("explore_marketplace"), desc: t("explore_marketplace_desc") },
    { to: "/app/shop" as const, label: t("order_seeds"), desc: t("order_seeds_desc") },
    { to: "/app/market" as const, label: t("check_demand"), desc: t("check_demand_desc") },
    { to: "/app/weather" as const, label: t("weather_forecast"), desc: t("weather_forecast_desc") },
  ];

  const buyerActivity = [
    { title: "Order Shipped", detail: "Order #8491 (NPK Fertilizer & Drip pipes) has been dispatched.", time: "30 mins ago" },
    { title: "New Listing Match", detail: "Farmer Murugan posted 2.5 tonnes of Premium Turmeric.", time: "4 hours ago" },
    { title: "Price Drop Alert", detail: "Regional tomato prices down to ₹1,900 per quintal.", time: "1 day ago" },
  ];

  const adminStats = [
    { label: "Total Active Users", value: "152", note: "+12 registered today", icon: Users },
    { label: "Monthly Trade Volume", value: "₹3.42L", note: "+14.8% vs last month", icon: TrendingUp },
    { label: "Live Service Bookings", value: "48", note: "98% completion rate", icon: Layers },
    { label: "System Status", value: "99.98%", note: "All services healthy", icon: Shield },
  ];

  const adminQuick = [
    { to: "/app/admin" as const, label: t("nav_admin"), desc: "Manage accounts, platform health & operations" },
    { to: "/app/marketplace" as const, label: t("nav_marketplace_audit"), desc: t("review_listings_desc") },
    { to: "/app/profile" as const, label: t("nav_profile"), desc: "Administrative credentials and identity" },
    { to: "/app/settings" as const, label: t("global_settings"), desc: t("global_settings_desc") },
  ];

  const adminActivity = [
    { title: "Payout Processed", detail: "₹1,950 paid to Kisan Agro Rentals for Completed Booking #291", time: "1 hour ago" },
    { title: "System Check Complete", detail: "AI endpoints and database clusters reported 100% operational.", time: "3 hours ago" },
    { title: "Flagged Listing Reviewed", detail: "Admin approved listing #843 after verification of certificates.", time: "5 hours ago" },
  ];

  const currentStats = role === "admin" ? adminStats : role === "farmer" ? farmerStats : buyerStats;
  const currentQuick = role === "admin" ? adminQuick : role === "farmer" ? farmerQuick : buyerQuick;
  const currentActivity = role === "admin" ? adminActivity : role === "farmer" ? farmerActivity : buyerActivity;

  return (
    <>
      <PageIntro
        index="01 / Home"
        eyebrow={role === "admin" ? t("admin_console_eyebrow") : role === "farmer" ? t("farmer_workspace") : t("buyer_terminal")}
        title={`${t("welcome_back")}, ${user?.name ?? "User"}`}
        subtitle={
          role === "farmer"
            ? "Your fields, quietly explained. Live sensor telemetry, disease alerts, price updates, and equipment bookings."
            : role === "admin"
            ? "Platform operations, user growth, sensor fleet health, and system analytics in one command view."
            : "Direct agricultural trade. Browse crop listings, monitor market trends, and purchase certified inputs."
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {currentStats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <p className="mt-3 font-serif text-3xl">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Charts & Activity */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main Chart */}
        {role === "farmer" ? (
          <Panel title="Soil moisture · last 24 hours" className="lg:col-span-2">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={IOT_TIMESERIES}>
                  <defs>
                    <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" interval={3} />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="moisture" stroke="var(--primary)" fill="url(#m)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        ) : role === "admin" ? (
          <Panel title="Platform Trade Volume & User Registrations" className="lg:col-span-2">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MARKET_TREND}>
                  <defs>
                    <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={40} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="paddy" stroke="var(--primary)" fill="url(#t)" strokeWidth={2} name="Trade Vol (k)" />
                  <Area type="monotone" dataKey="tomato" stroke="var(--accent-foreground)" fillOpacity={0.05} strokeWidth={2} name="Registrations" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        ) : (
          <Panel title="Crop Market Movement" className="lg:col-span-2">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MARKET_TREND}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={44} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="paddy" stroke="var(--primary)" fillOpacity={0.12} fill="var(--primary)" strokeWidth={2} name="Paddy Price (₹)" />
                  <Area type="monotone" dataKey="tomato" stroke="var(--accent-foreground)" fillOpacity={0.08} fill="var(--accent-foreground)" strokeWidth={2} name="Tomato Price (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}

        {/* Activity feed */}
        <Panel title={role === "admin" ? t("system_audit_log") : role === "farmer" ? t("recent_alerts") : t("recent_activity")}>
          <ul className="space-y-4">
            {currentActivity.map((a) => (
              <li key={a.title} className="border-l-2 border-primary/40 pl-4">
                <p className="text-sm font-medium leading-snug">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{a.time}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Quick actions panel */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {role === "farmer" ? (
          <Panel title={t("soil_sensor_status")} className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-primary bg-primary/10">
                <span className="text-2xl font-serif text-primary">3</span>
                <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">✓</span>
              </div>
              <div>
                <h4 className="text-sm font-medium">{t("sensor_connected")}</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {t("sensor_connected_desc")}
                </p>
                <Link to="/app/iot" className="mt-3.5 inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                  {t("inspect_telemetry")} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Panel>
        ) : role === "admin" ? (
          <Panel title={t("admin_summary")} className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 py-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">KYC Audits pending</p>
                <p className="mt-2 text-2xl font-serif">4</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Unresolved disputes</p>
                <p className="mt-2 text-2xl font-serif">0</p>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title={t("buyer_guarantees")} className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Agrisynapse Trade Protection Enabled</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {t("buyer_guarantees_desc")}
                </p>
                <Link to="/app/marketplace" className="mt-3.5 inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                  {t("browse_marketplace")} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Panel>
        )}

        <Panel title={t("quick_actions")}>
          <div className="space-y-2">
            {currentQuick.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border p-4 transition hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{q.label}</span>
                  <span className="block text-xs text-muted-foreground">{q.desc}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </Link>
            ))}
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <ActivityIcon className="h-3.5 w-3.5 text-primary" /> Updates live with user context.
          </p>
        </Panel>
      </div>
    </>
  );
}
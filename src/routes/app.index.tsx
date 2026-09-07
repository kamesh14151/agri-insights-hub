import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight, Droplets, ScanLine, ThermometerSun, TrendingUp,
  Activity as ActivityIcon
} from "lucide-react";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { IOT_TIMESERIES } from "@/lib/mock";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Soil Health Monitoring System — Agrisynapse" },
      { name: "description", content: "Monitor soil telemetry, field conditions, disease alerts and crop recommendations." },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const stats = [
    { label: t("soil_moisture"), value: "62%", note: t("optimal_band"), icon: Droplets },
    { label: t("field_temp"), value: "31.4°C", note: t("temp_note"), icon: ThermometerSun },
    { label: t("scans_week"), value: "18", note: t("action_needed"), icon: ScanLine },
    { label: t("paddy_price"), value: "₹2,380", note: t("month_increase"), icon: TrendingUp },
  ];

  const quickActions = [
    { to: "/app/disease" as const, label: t("scan_leaf"), desc: t("scan_leaf_desc") },
    { to: "/app/crops" as const, label: t("plan_crop"), desc: t("plan_crop_desc") },
    { to: "/app/iot" as const, label: t("inspect_telemetry"), desc: "Review live soil moisture, nutrient and sensor readings" },
    { to: "/app/weather" as const, label: t("weather_forecast"), desc: t("weather_forecast_desc") },
  ];

  const activity = [
    { title: "Soil Moisture Alert", detail: "Moisture dropped in Sector 4B. Recommended drip irrigation for 30 mins.", time: "10 mins ago" },
    { title: "Crop Analysis Complete", detail: "Gemini diagnosed Paddy Blast disease in Scan #402. Treatment recommended.", time: "2 hours ago" },
    { title: "Nutrient Reading Updated", detail: "Nitrogen and potassium readings are within the target range for your paddy plot.", time: "Yesterday" },
  ];
  const fieldCondition = [
    { name: "Optimal", value: 72, color: "#5b8c51" },
    { name: "Watch", value: 18, color: "#d6a94c" },
    { name: "Action", value: 10, color: "#ef4444" },
  ];
  const nutrientSnapshot = [
    { nutrient: "Nitrogen", value: 68, fill: "#5b8c51" },
    { nutrient: "Phosphorus", value: 42, fill: "#d6a94c" },
    { nutrient: "Potassium", value: 55, fill: "#3b82f6" },
  ];

  return (
    <>
      <PageIntro
        index="01 / Dashboard"
        eyebrow={
          "🌱 Field Intelligence · Agrisynapse Hub"
        }
        title={
          "Soil Health Monitoring System"
        }
        subtitle={
          `Welcome back, ${user?.name ?? "User"}. Monitor live sensor telemetry, soil health trends, disease alerts and crop recommendations in one place.`
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
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

        {/* Activity feed */}
        <Panel title={t("recent_alerts")}>
          <ul className="space-y-4">
            {activity.map((a) => (
              <li key={a.title} className="border-l-2 border-primary/40 pl-4">
                <p className="text-sm font-medium leading-snug">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{a.time}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Field condition distribution">
          <div className="flex h-[220px] items-center">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie data={fieldCondition} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3}>
                  {fieldCondition.map((item) => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 text-sm">
              {fieldCondition.map((item) => <div key={item.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} /><span className="text-muted-foreground">{item.name}</span><strong className="ml-auto">{item.value}%</strong></div>)}
            </div>
          </div>
        </Panel>
        <Panel title="Current NPK snapshot">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nutrientSnapshot}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="nutrient" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{nutrientSnapshot.map((item) => <Cell key={item.nutrient} fill={item.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Quick actions panel */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title={t("soil_sensor_status")} className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-center gap-6 py-4">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-primary bg-primary/10">
              <span className="text-2xl font-serif text-primary">3</span>
              <span className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">✓</span>
            </div>
            <div>
              <h4 className="text-sm font-medium">{t("sensor_connected")}</h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t("sensor_connected_desc")}</p>
              <Link to="/app/iot" className="mt-3.5 inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                {t("inspect_telemetry")} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Panel>

        <Panel title={t("quick_actions")}>
          <div className="space-y-2">
            {quickActions.map((q) => (
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

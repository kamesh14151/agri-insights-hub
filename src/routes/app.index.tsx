import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, Droplets, ScanLine, Sprout, ThermometerSun, TrendingUp } from "lucide-react";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { ACTIVITY, IOT_TIMESERIES, MARKET_TREND } from "@/lib/mock";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Agrisynapse" },
      { name: "description", content: "Your farm at a glance: soil telemetry, disease alerts, market movement and upcoming bookings." },
      { property: "og:title", content: "Dashboard — Agrisynapse" },
      { property: "og:description", content: "Soil telemetry, disease alerts, market movement and bookings in one view." },
    ],
  }),
  component: DashboardHome,
});

const STATS = [
  { label: "Soil moisture", value: "62%", note: "Optimal band", icon: Droplets },
  { label: "Field temp", value: "31.4°C", note: "+1.8° vs yesterday", icon: ThermometerSun },
  { label: "Scans this week", value: "18", note: "2 need action", icon: ScanLine },
  { label: "Paddy price", value: "₹2,380", note: "+2.1% this month", icon: TrendingUp },
];

const QUICK = [
  { to: "/app/disease", label: "Scan a leaf", desc: "Upload a photo for instant diagnosis" },
  { to: "/app/crops", label: "Plan next crop", desc: "Soil and climate matched picks" },
  { to: "/app/marketplace", label: "List produce", desc: "Reach verified buyers directly" },
  { to: "/app/booking", label: "Book a tractor", desc: "Equipment, labour and transport" },
] as const;

function DashboardHome() {
  const { user } = useAuth();
  return (
    <>
      <PageIntro
        index="01 / Home"
        eyebrow={`${user?.role} workspace`}
        title="Your fields, quietly explained."
        subtitle="Live sensor readings, disease alerts, price movement and the next best action — collected into one editorial view."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((s) => (
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

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
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

        <Panel title="Recent activity">
          <ul className="space-y-4">
            {ACTIVITY.map((a) => (
              <li key={a.title} className="border-l-2 border-primary/40 pl-4">
                <p className="text-sm font-medium leading-snug">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{a.time}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Market movement" className="lg:col-span-2">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MARKET_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={44} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="paddy" stroke="var(--primary)" fillOpacity={0.12} fill="var(--primary)" strokeWidth={2} />
                <Area type="monotone" dataKey="tomato" stroke="var(--accent-foreground)" fillOpacity={0.08} fill="var(--accent-foreground)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Quick actions">
          <div className="space-y-2">
            {QUICK.map((q) => (
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
            <Sprout className="h-3.5 w-3.5 text-primary" /> Advice refreshes as sensors report.
          </p>
        </Panel>
      </div>
    </>
  );
}
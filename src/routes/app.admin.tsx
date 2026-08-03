import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { ADMIN_SIGNUPS, ADMIN_STATS, LISTINGS } from "@/lib/mock";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — Agrisynapse" },
      { name: "description", content: "Platform operations: user growth, sensor fleet health and marketplace activity." },
      { property: "og:title", content: "Admin Console — Agrisynapse" },
      { property: "og:description", content: "Growth, fleet health and marketplace oversight for platform admins." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <Panel title="Restricted">
        <p className="text-sm text-muted-foreground">This console is available to platform administrators only.</p>
      </Panel>
    );
  }

  return (
    <>
      <PageIntro
        index="14 / Ops"
        eyebrow="Platform administration"
        title="The network, at altitude."
        subtitle="Growth, sensor fleet health and marketplace throughput across every district Agrisynapse serves."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ADMIN_STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{s.label}</p>
            <p className="mt-3 font-serif text-3xl">{s.value}</p>
            <p className="mt-1 text-xs text-primary">{s.delta} vs last month</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Sign-ups by month" className="lg:col-span-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ADMIN_SIGNUPS}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={40} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="farmers" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="buyers" fill="var(--muted-foreground)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Latest listings">
          <ul className="space-y-4">
            {LISTINGS.slice(0, 5).map((l) => (
              <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{l.crop}</span>
                  <span className="block text-xs text-muted-foreground truncate">{l.farmer} · {l.location}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{l.quantity}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
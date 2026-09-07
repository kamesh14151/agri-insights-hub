import { createFileRoute } from "@tanstack/react-router";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { ADMIN_STATS, ADMIN_SIGNUPS, REGIONAL_DISEASE_ALERTS } from "@/lib/mock";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/manager")({
  head: () => ({
    meta: [
      { title: "Manager Hub — Agrisynapse" },
      { name: "description", content: "Macro analytics and regional insights for territory managers." },
    ],
  }),
  component: ManagerPage,
});

function ManagerPage() {
  const { user } = useAuth();

  if (user?.role !== "manager" && user?.role !== "admin") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
        <p className="mt-2 text-muted-foreground">You do not have permission to view the Manager Hub.</p>
      </div>
    );
  }

  return (
    <>
      <PageIntro
        index="05 / Admin"
        eyebrow="Territory Oversight"
        title="Manager Hub"
        subtitle="Track regional disease outbreaks, monitor active IoT networks, and oversee marketplace performance across your territory."
      />

      <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
        {ADMIN_STATS.map((s) => (
          <Panel key={s.label} className="flex flex-col justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</h3>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-bold tracking-[-0.04em] text-foreground">{s.value}</span>
              <span className={`badge ${s.delta.startsWith("+") ? "badge-lime" : "badge-neutral"}`}>{s.delta}</span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="Platform Growth (Signups)" className="h-[400px]">
          <div className="mt-6 h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ADMIN_SIGNUPS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7a7a72" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#7a7a72" }} />
                <Tooltip
                  cursor={{ stroke: "rgba(0,0,0,0.05)", strokeWidth: 2 }}
                  contentStyle={{ borderRadius: "12px", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 14px rgba(0,0,0,0.08)" }}
                  itemStyle={{ fontSize: "13px", fontWeight: 500 }}
                  labelStyle={{ fontSize: "11px", fontWeight: 700, color: "#7a7a72", textTransform: "uppercase", marginBottom: "4px" }}
                />
                <Line type="monotone" dataKey="farmers" stroke="#c8e44a" strokeWidth={3} dot={{ r: 4, fill: "#c8e44a", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} name="Farmers" />
                <Line type="monotone" dataKey="buyers" stroke="#1a1a18" strokeWidth={2} dot={{ r: 3, fill: "#1a1a18", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} name="Buyers" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Regional Disease Radar">
            <div className="mt-4 space-y-4">
              {REGIONAL_DISEASE_ALERTS.map((alert) => (
                <div key={alert.region + alert.disease} className="rounded-2xl border border-black/[0.06] bg-black/[0.02] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-[#1a1a18]">{alert.disease}</h4>
                      <p className="text-xs text-[#7a7a72] mt-1">{alert.region}</p>
                    </div>
                    <span className={`badge ${
                      alert.severity === "Critical" ? "badge-red" :
                      alert.severity === "High" ? "badge-amber" :
                      alert.severity === "Medium" ? "badge-neutral" :
                      "badge-lime"
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-black/[0.05] pt-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">{alert.occurrences} farms</strong> reported
                    </p>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#7a7a72]">{alert.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

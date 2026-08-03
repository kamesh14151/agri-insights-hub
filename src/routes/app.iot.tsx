import { createFileRoute } from "@tanstack/react-router";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Battery, Droplets, Gauge, Thermometer } from "lucide-react";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { IOT_SENSORS, IOT_TIMESERIES } from "@/lib/mock";

export const Route = createFileRoute("/app/iot")({
  head: () => ({
    meta: [
      { title: "IoT Monitoring — Agrisynapse" },
      { name: "description", content: "Live soil moisture, temperature, humidity, pH and NPK readings from field sensor nodes." },
      { property: "og:title", content: "IoT Monitoring — Agrisynapse" },
      { property: "og:description", content: "Field telemetry: moisture, temperature, humidity, pH, NPK and battery health per node." },
    ],
  }),
  component: IotPage,
});

function Ring({ value, label }: { value: number; label: string }) {
  const dash = 2 * Math.PI * 34;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
        <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="40" cy="40" r="34" fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={dash} strokeDashoffset={dash - (dash * Math.min(value, 100)) / 100}
        />
      </svg>
      <p className="-mt-14 font-serif text-lg">{value}</p>
      <p className="mt-9 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function IotPage() {
  return (
    <>
      <PageIntro
        index="03 / Sense"
        eyebrow="Field telemetry"
        title="Every node, reporting in."
        subtitle="Soil moisture, canopy temperature, humidity, pH and NPK streamed from LoRa nodes across your blocks, with irrigation prompts when a plot drifts out of band."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {IOT_SENSORS.map((n) => (
          <div key={n.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{n.name}</p>
                <p className="text-xs text-muted-foreground">{n.crop}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  n.status === "Optimal" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                }`}
              >
                {n.status}
              </span>
            </div>
            <div className="mt-4 flex justify-center">
              <Ring value={n.moisture} label="Moisture %" />
            </div>
            <dl className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Thermometer className="h-3.5 w-3.5" /> {n.temp}°C</div>
              <div className="flex items-center gap-2"><Droplets className="h-3.5 w-3.5" /> {n.humidity}% RH</div>
              <div className="flex items-center gap-2"><Gauge className="h-3.5 w-3.5" /> pH {n.ph} · {n.npk}</div>
              <div className="flex items-center gap-2"><Battery className="h-3.5 w-3.5" /> {n.battery}% battery</div>
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Panel title="24 hour trend across the farm">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={IOT_TIMESERIES}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" interval={3} />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={34} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="moisture" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="temp" stroke="var(--destructive)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="humidity" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Solid green: soil moisture % · Red: canopy temperature °C · Dashed: relative humidity %</p>
        </Panel>
      </div>
    </>
  );
}
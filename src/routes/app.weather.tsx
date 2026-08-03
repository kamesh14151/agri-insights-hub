import { createFileRoute } from "@tanstack/react-router";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { Weather } from "@/components/Weather";

export const Route = createFileRoute("/app/weather")({
  head: () => ({
    meta: [
      { title: "Weather Intelligence — Agrisynapse" },
      { name: "description", content: "Live agricultural weather with rainfall, humidity and UV plus spraying and irrigation guidance." },
      { property: "og:title", content: "Weather Intelligence — Agrisynapse" },
      { property: "og:description", content: "Live agri weather with spraying, irrigation and harvest timing advisories." },
    ],
  }),
  component: WeatherPage,
});

const ADVISORIES = [
  { title: "Spraying window", body: "Best between 06:00–09:00 tomorrow; wind stays under 8 km/h.", tone: "good" },
  { title: "Irrigation", body: "Skip today on canal-side blocks — 14 mm rain expected in 36 hours.", tone: "good" },
  { title: "Disease pressure", body: "High humidity for 3 consecutive nights raises blast risk in paddy.", tone: "warn" },
  { title: "Harvest timing", body: "Dry spell from Friday — ideal for groundnut lifting and drying.", tone: "good" },
];

function WeatherPage() {
  return (
    <>
      <PageIntro
        index="05 / Sky"
        eyebrow="Agricultural meteorology"
        title="Weather, translated into field work."
        subtitle="Search any location or use your own — then read what the forecast actually means for spraying, irrigation, disease pressure and harvest."
      />
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <Weather />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {ADVISORIES.map((a) => (
          <Panel key={a.title}>
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.tone === "warn" ? "bg-destructive" : "bg-primary"}`} />
              <div className="min-w-0">
                <h3 className="font-medium">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{a.body}</p>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
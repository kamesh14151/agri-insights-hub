import { createFileRoute } from "@tanstack/react-router";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { MapPanel } from "@/components/MapPanel";
import { CROP_RECOMMENDATIONS } from "@/lib/mock";

export const Route = createFileRoute("/app/crops")({
  head: () => ({
    meta: [
      { title: "Crop Recommendation — Agrisynapse" },
      { name: "description", content: "Draw your plot and get soil, climate and market matched crop recommendations with profit estimates." },
      { property: "og:title", content: "Crop Recommendation — Agrisynapse" },
      { property: "og:description", content: "Soil, climate and market matched crop picks with duration, water need and profit estimates." },
    ],
  }),
  component: CropsPage,
});

function CropsPage() {
  return (
    <>
      <PageIntro
        index="04 / Plan"
        eyebrow="Soil, climate and market fit"
        title="What this land wants to grow."
        subtitle="Outline your plot to read soil type, climate window and water need — then compare crop options scored on agronomic fit and expected margin."
      />

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <MapPanel />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {CROP_RECOMMENDATIONS.map((c) => (
          <Panel key={c.crop}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <h3 className="font-serif text-xl truncate">{c.crop}</h3>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{c.match}% match</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${c.match}%` }} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{c.why}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[["Season", c.season], ["Water", c.water], ["Duration", c.duration], ["Est. profit", c.profit]].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}
      </div>
    </>
  );
}
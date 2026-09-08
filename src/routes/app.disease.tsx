import { createFileRoute } from "@tanstack/react-router";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { PlantAnalysis } from "@/components/PlantAnalysis";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/disease")({
  head: () => ({
    meta: [
      { title: "Disease Detection — Agrisynapse" },
      { name: "description", content: "Upload a leaf photo and get an AI diagnosis with severity, treatment and prevention guidance." },
      { property: "og:title", content: "Disease Detection — Agrisynapse" },
      { property: "og:description", content: "AI plant pathology: diagnosis, severity, treatment and prevention from a single photo." },
    ],
  }),
  component: DiseasePage,
});

function DiseasePage() {
  const { t } = useI18n();

  return (
    <>
      <PageIntro
        index="02 / Diagnose"
        eyebrow={t("multimodal_ai_vision", "Computer vision pathology")}
        title={t("pathology_suite_title", "Photograph the leaf. Read the verdict.")}
        subtitle={t("pathology_suite_sub", "Our vision model names the crop and the disease, rates severity and returns a treatment and prevention plan in your language.")}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <PlantAnalysis />
        </div>
        <div className="space-y-6">
          <Panel title={t("how_accurate_scan", "How to get an accurate scan")}>
            <ol className="space-y-3 text-sm text-muted-foreground">
              {[
                t("tip_1", "Shoot in daylight, avoid harsh shadows on the lesion."),
                t("tip_2", "Fill the frame with one affected leaf, not the whole plant."),
                t("tip_3", "Include both upper and lower leaf surfaces when possible."),
                t("tip_4", "Re-scan 7 days after treatment to confirm recovery."),
              ].map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-serif text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title={t("common_this_season", "Common this season")}>
            <ul className="space-y-3 text-sm">
              {[
                ["Rice blast", "Paddy · high humidity"],
                ["Early blight", "Tomato · warm nights"],
                ["Leaf rust", "Wheat · post-rain"],
                ["Sigatoka", "Banana · dense canopy"],
              ].map(([d, c]) => (
                <li key={d} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                  <span className="truncate">{d}</span>
                  <span className="text-xs text-muted-foreground">{c}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
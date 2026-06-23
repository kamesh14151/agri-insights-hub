import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/SiteShell";
import { PlantAnalysis } from "@/components/PlantAnalysis";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Plant Analysis — Agri AI" },
      { name: "description", content: "Upload a leaf photo and get an instant AI diagnosis, severity score and treatment plan." },
      { property: "og:title", content: "Plant Analysis — Agri AI" },
      { property: "og:description", content: "AI-powered disease detection for crops — diagnosis, severity, and treatment in seconds." },
    ],
  }),
  component: AnalyzePage,
});

function AnalyzePage() {
  return (
    <SiteShell>
      <PageHeader
        index="01 / Diagnose"
        eyebrow="AI Plant Analysis"
        title="Diagnose a plant in seconds."
        subtitle="Upload a clear photo of an affected leaf or the whole plant. Our model identifies the crop, the disease, and prescribes a treatment grounded in real agronomy."
      />
      <PlantAnalysis />
    </SiteShell>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/SiteShell";
import { MapPanel } from "@/components/MapPanel";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Land Map — Agri AI" },
      { name: "description", content: "Draw your plot on the map to receive soil type, suitable crops, water needs and risk factors." },
      { property: "og:title", content: "Land Map — Agri AI" },
      { property: "og:description", content: "Interactive land intelligence — soil, climate, crop fit and yield potential for any plot." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  return (
    <SiteShell>
      <PageHeader
        index="02 / Map"
        eyebrow="Interactive Land Intelligence"
        title="Draw your field. Read your land."
        subtitle="Outline any plot in India to instantly see soil type, climate window, recommended crops and water requirements — calibrated to its real area in hectares."
      />
      <MapPanel />
    </SiteShell>
  );
}
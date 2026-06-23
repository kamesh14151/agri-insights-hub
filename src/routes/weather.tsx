import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/SiteShell";
import { Weather } from "@/components/Weather";

export const Route = createFileRoute("/weather")({
  head: () => ({
    meta: [
      { title: "Agricultural Weather — Agri AI" },
      { name: "description", content: "Real-time agricultural weather: temperature, humidity, 24-hour rainfall and UV index for your fields." },
      { property: "og:title", content: "Agricultural Weather — Agri AI" },
      { property: "og:description", content: "Field-grade weather signals: temperature, humidity, rainfall and UV index in one glance." },
    ],
  }),
  component: WeatherPage,
});

function WeatherPage() {
  return (
    <SiteShell>
      <PageHeader
        index="03 / Weather"
        eyebrow="Field-grade Forecasting"
        title="The sky, translated for farming."
        subtitle="Live conditions from Open-Meteo, surfaced as the four signals that actually matter to a grower — temperature, humidity, rainfall and UV exposure."
      />
      <Weather />
    </SiteShell>
  );
}
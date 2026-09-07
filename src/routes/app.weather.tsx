import { createFileRoute } from "@tanstack/react-router";
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

function WeatherPage() {
  return (
    <div className="w-full">
      <Weather />
    </div>
  );
}
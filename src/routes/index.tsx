import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { PlantAnalysis } from "@/components/PlantAnalysis";
import { MapPanel } from "@/components/MapPanel";
import { Weather } from "@/components/Weather";
import { Chatbot } from "@/components/Chatbot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agri AI — Intelligence for every field" },
      { name: "description", content: "Diagnose plant disease, map your land, read live agricultural weather and consult an AI agronomist." },
      { property: "og:title", content: "Agri AI — Intelligence for every field" },
      { property: "og:description", content: "Diagnose plant disease, map your land, read live agricultural weather and consult an AI agronomist." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased scroll-smooth">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <PlantAnalysis />
        <MapPanel />
        <Weather />
      </main>
      <footer className="border-t border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-10 flex flex-col sm:flex-row justify-between gap-3 text-sm text-muted-foreground">
          <p>© 2026 Agri AI. Built for Indian agriculture.</p>
          <p>Powered by Lovable AI · OpenStreetMap · Open-Meteo</p>
        </div>
      </footer>
      <Chatbot />
    </div>
  );
}

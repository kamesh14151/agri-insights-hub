import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, ScanLine, Cpu, TrendingUp, Droplets, Mic } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soil Health Monitoring System — Agrisynapse" },
      { name: "description", content: "A soil health monitoring system with field sensors, disease detection, crop intelligence and an AI agronomist." },
      { property: "og:title", content: "Soil Health Monitoring System — Agrisynapse" },
      { property: "og:description", content: "One workspace for soil telemetry, disease detection, crop planning and field intelligence." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ScanLine, title: "Disease detection", body: "Photograph a leaf and receive a diagnosis, severity rating and treatment plan." },
  { icon: Cpu, title: "IoT monitoring", body: "Soil moisture, temperature, pH and NPK streaming from field nodes." },
  { icon: Leaf, title: "Crop recommendation", body: "Draw your plot; get crops scored on soil, climate and margin." },
  { icon: TrendingUp, title: "Market demand", body: "Price trends and demand gaps that decide what to plant and when to sell." },
  { icon: Droplets, title: "Soil health alerts", body: "Track moisture, pH and nutrient levels, with timely irrigation and treatment prompts." },
  { icon: Mic, title: "Voice assistant", body: "Ask in Tamil, Hindi, Telugu, Kannada, Malayalam or English — hands free." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-[1200px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2 font-serif text-lg tracking-tight">
            <img src="/logo.png" alt="Agrisynapse Logo" className="h-8 w-8 object-contain shrink-0" />
            <span className="truncate">Agrisynapse</span>
          </Link>
          <Link to="/login" className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
            Sign in
          </Link>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-6 md:py-28">
          <p className="mb-5 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Soil health monitoring system</p>
          <h1 className="max-w-4xl font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            The nervous system of the modern farm.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Agrisynapse joins field sensors, soil analysis, computer vision and an AI agronomist into one calm workspace for healthier crops.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/login" className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
              Get started
            </Link>
            <Link to="/login" className="rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition">
              Explore the demo
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-20 sm:px-6">
        <h2 className="max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
          Soil intelligence. One quiet interface.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-sm">
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-serif text-xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-5 py-16 sm:grid-cols-3 sm:px-6">
          {[["12,480", "Monitored fields"], ["3,214", "Live sensor nodes"], ["99.8%", "Sensor data availability"]].map(([v, l]) => (
            <div key={l}>
              <p className="font-serif text-4xl">{v}</p>
              <p className="mt-1 text-sm text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 max-w-[1200px] px-5 py-8 text-xs text-muted-foreground sm:px-6">
          <p>© 2026 Agrisynapse. Built with passion by <span className="font-semibold text-foreground">AJ STUDIOZ</span>.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <Link to="/app" className="font-medium text-primary hover:underline">Launch App →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

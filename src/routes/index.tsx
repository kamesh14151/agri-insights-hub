import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, ScanLine, Cpu, TrendingUp, Store, CalendarCheck, Mic } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agrisynapse — Agricultural Intelligence for Indian Farms" },
      { name: "description", content: "Disease detection, IoT soil monitoring, crop and market intelligence, marketplace, services and a multilingual voice assistant in one platform." },
      { property: "og:title", content: "Agrisynapse — Agricultural Intelligence for Indian Farms" },
      { property: "og:description", content: "One workspace for disease detection, sensors, crop planning, market demand, marketplace and farm services." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ScanLine, title: "Disease detection", body: "Photograph a leaf and receive a diagnosis, severity rating and treatment plan." },
  { icon: Cpu, title: "IoT monitoring", body: "Soil moisture, temperature, pH and NPK streaming from field nodes." },
  { icon: Leaf, title: "Crop recommendation", body: "Draw your plot; get crops scored on soil, climate and margin." },
  { icon: TrendingUp, title: "Market demand", body: "Price trends and demand gaps that decide what to plant and when to sell." },
  { icon: Store, title: "Marketplace & shop", body: "Sell produce directly and buy seed, nutrition and irrigation supplies." },
  { icon: Mic, title: "Voice assistant", body: "Ask in Tamil, Hindi, Telugu, Kannada, Malayalam or English — hands free." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto grid h-16 max-w-[1200px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2 font-serif text-lg tracking-tight">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="truncate">Agrisynapse</span>
          </Link>
          <Link to="/login" className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
            Sign in
          </Link>
        </div>
      </header>

      <section className="border-b border-border">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-6 md:py-28">
          <p className="mb-5 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Agricultural intelligence platform</p>
          <h1 className="max-w-4xl font-serif text-4xl leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            The nervous system of the modern farm.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Agrisynapse joins computer vision, field sensors, market data and an AI agronomist into one calm workspace — built for farmers, buyers and the teams who support them.
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
          Eleven tools. One quiet interface.
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
          {[["12,480", "Farmers on the network"], ["3,214", "Live sensor nodes"], ["₹2.9 Cr", "Produce traded"]].map(([v, l]) => (
            <div key={l}>
              <p className="font-serif text-4xl">{v}</p>
              <p className="mt-1 text-sm text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-10 text-sm text-muted-foreground sm:px-6">
          <p>© 2026 Agrisynapse. Built for Indian agriculture.</p>
          <Link to="/login" className="shrink-0 hover:text-foreground">Sign in</Link>
        </div>
      </footer>

      <CalendarCheck className="hidden" aria-hidden />
    </div>
  );
}
import { Link } from "@tanstack/react-router";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { SiteShell } from "@/components/SiteShell";
import { Leaf, Map as MapIcon, CloudSun, ArrowUpRight } from "lucide-react";

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
  const modules = [
    {
      idx: "01",
      to: "/analyze" as const,
      eyebrow: "Diagnose",
      title: "Plant Analysis",
      body: "Upload a leaf. Get crop, disease, severity and a treatment plan grounded in real agronomy — Powdery Mildew, Leaf Blight, Bacterial Wilt and more.",
      icon: Leaf,
    },
    {
      idx: "02",
      to: "/map" as const,
      eyebrow: "Map",
      title: "Land Intelligence",
      body: "Draw your plot on an interactive map. We read soil type — Black Cotton, Red Loamy, Alluvial — climate window and crop fit at hectare precision.",
      icon: MapIcon,
    },
    {
      idx: "03",
      to: "/weather" as const,
      eyebrow: "Forecast",
      title: "Agricultural Weather",
      body: "Live temperature, humidity, 24-hour rainfall and UV index — the four signals that govern irrigation, spraying and harvest decisions.",
      icon: CloudSun,
    },
  ];

  return (
    <SiteShell>
      <Hero />
      <Features />
      <section id="modules" className="max-w-[1200px] mx-auto px-6 py-20 md:py-28 border-t border-border">
        <div className="grid grid-cols-12 gap-6 mb-14">
          <p className="col-span-12 md:col-span-2 font-serif text-2xl md:text-3xl text-muted-foreground">
            The suite
          </p>
          <h2 className="col-span-12 md:col-span-10 font-serif text-4xl md:text-5xl tracking-tight max-w-3xl">
            Three instruments. One field intelligence platform.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {modules.map((m) => (
            <Link
              key={m.idx}
              to={m.to}
              className="group bg-card hover:bg-accent/40 transition-colors p-8 md:p-10 flex flex-col gap-6 min-h-[360px]"
            >
              <div className="flex items-start justify-between">
                <span className="font-serif text-xl text-muted-foreground">{m.idx}</span>
                <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <m.icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
              <div className="mt-auto">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-3">
                  {m.eyebrow}
                </p>
                <h3 className="font-serif text-3xl tracking-tight">{m.title}</h3>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{m.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}

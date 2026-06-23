import { createFileRoute } from "@tanstack/react-router";
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

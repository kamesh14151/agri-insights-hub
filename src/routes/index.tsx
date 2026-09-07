import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, Droplets, Leaf, ScanLine, Sparkles, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agrisynapse — Data Meets Growth" },
      { name: "description", content: "AI-powered soil intelligence, crop planning, climate IQ and disease detection for modern farmers." },
    ],
  }),
  component: LandingPage,
});

const features = [
  { icon: Droplets, title: "Soil Intelligence",    desc: "Real-time SOC tracking, moisture balance, and nutrient analysis with predicted yield impact." },
  { icon: Cpu,      title: "IoT Field Telemetry",  desc: "Live sensor nodes stream temperature, humidity and soil moisture every 15 minutes." },
  { icon: ScanLine, title: "Disease & Pest AI",    desc: "Photograph a leaf — get a disease name, severity rating and treatment plan instantly." },
  { icon: Leaf,     title: "Crop Recommendations", desc: "Soil + climate + market data combined to suggest the highest-margin crop for your plot." },
];

function LandingPage() {
  return (
    <div className="min-h-screen font-sans antialiased" style={{
      background: "radial-gradient(ellipse 70% 65% at -5% 110%, rgba(160,196,230,0.55), transparent 65%), radial-gradient(ellipse 65% 60% at 105% -5%, rgba(195,228,80,0.42), transparent 60%), #f5f6f0",
    }}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-4 z-50 mx-auto flex max-w-3xl items-center justify-between gap-4 px-3 py-2 premium-nav rounded-full">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-[#1a1a18]">
            <Leaf className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-[13px] font-semibold text-[#1a1a18]">Agrisynapse</span>
        </Link>

        <div className="hidden sm:flex items-center gap-0.5">
          {["Platform", "Features", "Pricing", "About"].map((label) => (
            <a key={label} href="#" className="rounded-full px-3.5 py-1.5 text-[12.5px] text-[#7a7a72] hover:text-[#1a1a18] hover:bg-black/[0.06] transition">{label}</a>
          ))}
        </div>

        <Link to="/login" className="btn-primary text-[12.5px] px-4 py-1.5 shrink-0">
          Sign in
        </Link>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 text-center" style={{ perspective: "1000px" }}>
        <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(184,217,64,0.18)] border border-[rgba(184,217,64,0.35)] px-3.5 py-1.5 text-[11px] font-semibold text-[#3d5a00] mb-8">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#b8d940] opacity-75" />
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#b8d940]" />
          </span>
          Live field monitoring active
        </span>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-[-0.05em] text-[#1a1a18] leading-[0.96] animate-float-up">
          Data Meets
          <br />
          <span style={{ color: "#b8d940" }}>Growth.</span>
        </h1>

        <p className="mt-6 max-w-xl mx-auto text-[15px] text-[#7a7a72] leading-relaxed animate-float-up" style={{ animationDelay: "100ms" }}>
          AI-powered soil intelligence, real-time IoT telemetry, and disease detection — built for the modern farmer who wants precision, not guesswork.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-float-up" style={{ animationDelay: "200ms" }}>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-[13.5px]">
            Start free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="inline-flex items-center gap-2 rounded-full border border-black/[0.10] bg-white/70 px-6 py-2.5 text-[13.5px] text-[#1a1a18] hover:bg-white transition">
            See how it works <ChevronDown className="h-4 w-4" />
          </a>
        </div>

        {/* Hero stat pills - with 3D hover */}
        <div className="mt-14 flex flex-wrap justify-center gap-3 perspective-[1000px] animate-float-up" style={{ animationDelay: "300ms" }}>
          {[["3 nodes", "connected today"], ["72%", "fields in optimal range"], ["+2.3%", "growth / week"]].map(([val, label]) => (
            <span key={label} 
              className="card inline-flex flex-col items-center rounded-2xl px-6 py-3.5 transition-all duration-300 hover:scale-105"
              style={{ transformStyle: "preserve-3d" }}>
              <strong className="text-xl font-bold tracking-[-0.04em] text-[#1a1a18]" style={{ color: "#b8d940", transform: "translateZ(20px)" }}>{val}</strong>
              <span className="text-[11px] text-[#7a7a72] mt-0.5" style={{ transform: "translateZ(10px)" }}>{label}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-5xl px-6 pb-20 perspective-[1200px]">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a7a72] mb-3">Platform</p>
        <h2 className="text-center text-3xl font-bold tracking-[-0.04em] text-[#1a1a18] mb-10">
          Everything your field needs.
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} 
              className="feature-card p-8 transition-transform duration-300 hover:scale-[1.02] hover:-translate-y-2 hover:rotate-1"
              style={{ transformStyle: "preserve-3d" }}>
              <span className="icon-wrap inline-grid h-12 w-12 place-items-center rounded-full mb-5" style={{ transform: "translateZ(30px)" }}>
                <Icon className="h-5 w-5 text-[#3d5a00]" />
              </span>
              <h3 className="text-[17px] font-bold text-[#1a1a18]" style={{ transform: "translateZ(20px)" }}>{title}</h3>
              <p className="mt-2 text-[13.5px] text-[#7a7a72] leading-relaxed" style={{ transform: "translateZ(10px)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA section ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="card rounded-[28px] p-12 text-center" style={{
          background: "linear-gradient(135deg, rgba(26,26,24,0.96) 0%, rgba(40,60,10,0.96) 100%)",
        }}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(184,217,64,0.20)] border border-[rgba(184,217,64,0.35)] px-3 py-1 text-[11px] font-semibold text-[#c8e44a] mb-6">
            <Sparkles className="h-3 w-3" /> Powered by Agrisynapse Vision AI
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-[-0.04em] text-white leading-[1.1]">
            Ready to grow smarter?
          </h2>
          <p className="mt-4 text-[14px] text-white/55 max-w-md mx-auto leading-relaxed">
            Join farmers already using Agrisynapse to make every field decision data-driven.
          </p>
          <Link to="/login" className="btn-lime mt-8 inline-flex items-center gap-2 px-7 py-3 text-[14px] font-semibold">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-black/[0.07] px-6 py-8">
        <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#1a1a18]">
              <Leaf className="h-3 w-3 text-white" />
            </span>
            <span className="text-[12px] font-semibold text-[#1a1a18]">Agrisynapse</span>
          </div>
          <p className="text-[11px] text-[#7a7a72]">© 2026 AJ STUDIOZ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

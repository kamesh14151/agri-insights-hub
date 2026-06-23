import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Chatbot } from "@/components/Chatbot";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <Navbar />
      <main>{children}</main>
      <footer className="border-t border-border mt-24">
        <div className="max-w-[1200px] mx-auto px-6 py-10 flex flex-col sm:flex-row justify-between gap-3 text-sm text-muted-foreground">
          <p>© 2026 Agri AI. Built for Indian agriculture.</p>
          <p>Powered by Lovable AI · OpenStreetMap · Open-Meteo</p>
        </div>
      </footer>
      <Chatbot />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  index,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  index: string;
}) {
  return (
    <section className="border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 pt-20 pb-14 md:pt-28 md:pb-20 grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-2 font-serif text-muted-foreground text-2xl md:text-3xl">
          {index}
        </div>
        <div className="col-span-12 md:col-span-10">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">
            {eyebrow}
          </p>
          <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] tracking-tight">
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>
    </section>
  );
}
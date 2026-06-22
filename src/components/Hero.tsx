import { useI18n } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";

export function Hero() {
  const { t } = useI18n();
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <section id="top" className="max-w-[1200px] mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-36">
      <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">
        Agricultural Intelligence · est. 2026
      </p>
      <h1 className="font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight max-w-4xl">
        {t("hero_title")}
      </h1>
      <p className="mt-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">
        {t("hero_sub")}
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href="#analyze"
          onClick={scrollTo("analyze")}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
        >
          {t("hero_primary")} <ArrowRight className="w-4 h-4" />
        </a>
        <a
          href="#map"
          onClick={scrollTo("map")}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border bg-card hover:bg-accent transition font-medium"
        >
          {t("hero_secondary")}
        </a>
      </div>
    </section>
  );
}
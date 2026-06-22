import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { toast } from "sonner";
import { Sprout } from "lucide-react";

export function Navbar() {
  const { t, lang, setLang } = useI18n();

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <a href="#top" onClick={scrollTo("top")} className="flex items-center gap-2 font-serif text-xl tracking-tight">
          <Sprout className="w-5 h-5 text-primary" />
          <span>Agri AI</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" onClick={scrollTo("features")} className="hover:text-foreground">{t("nav_features")}</a>
          <a href="#analyze" onClick={scrollTo("analyze")} className="hover:text-foreground">{t("nav_analyze")}</a>
          <a href="#map" onClick={scrollTo("map")} className="hover:text-foreground">{t("nav_map")}</a>
          <a href="#weather" onClick={scrollTo("weather")} className="hover:text-foreground">{t("nav_weather")}</a>
        </nav>
        <div className="flex items-center gap-3">
          <select
            value={lang}
            onChange={(e) => {
              setLang(e.target.value as Lang);
              toast.success(t("toast_lang"));
            }}
            className="text-sm bg-transparent border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.full}</option>
            ))}
          </select>
          <a
            href="#analyze"
            onClick={scrollTo("analyze")}
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            {t("cta_start")}
          </a>
        </div>
      </div>
    </header>
  );
}
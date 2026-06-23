import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";
import { toast } from "sonner";
import { Sprout } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Navbar() {
  const { t, lang, setLang } = useI18n();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 font-serif text-lg sm:text-xl tracking-tight shrink-0">
          <Sprout className="w-5 h-5 text-primary" />
          <span>Agri AI</span>
        </Link>
        <nav className="hidden sm:flex items-center gap-4 md:gap-8 text-xs md:text-sm text-muted-foreground">
          <Link to="/analyze" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition">{t("nav_analyze")}</Link>
          <Link to="/map" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition">{t("nav_map")}</Link>
          <Link to="/weather" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition">{t("nav_weather")}</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
          <Link
            to="/analyze"
            className="hidden md:inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            {t("cta_start")}
          </Link>
        </div>
      </div>
      <nav className="sm:hidden flex items-center justify-around border-t border-border text-xs text-muted-foreground py-2.5">
        <Link to="/analyze" activeProps={{ className: "text-foreground" }}>{t("nav_analyze")}</Link>
        <Link to="/map" activeProps={{ className: "text-foreground" }}>{t("nav_map")}</Link>
        <Link to="/weather" activeProps={{ className: "text-foreground" }}>{t("nav_weather")}</Link>
      </nav>
    </header>
  );
}
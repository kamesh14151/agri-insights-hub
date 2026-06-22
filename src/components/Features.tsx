import { useI18n } from "@/lib/i18n";
import { Leaf, Map, CloudSun, Bot } from "lucide-react";

export function Features() {
  const { t } = useI18n();
  const items = [
    { icon: Leaf, title: t("f1_t"), desc: t("f1_d") },
    { icon: Map, title: t("f2_t"), desc: t("f2_d") },
    { icon: CloudSun, title: t("f3_t"), desc: t("f3_d") },
    { icon: Bot, title: t("f4_t"), desc: t("f4_d") },
  ];
  return (
    <section id="features" className="max-w-[1200px] mx-auto px-6 py-20 md:py-28 border-t border-border">
      <h2 className="font-serif text-4xl md:text-5xl tracking-tight max-w-3xl">{t("features_title")}</h2>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {items.map((it) => (
          <div key={it.title} className="bg-card p-8 flex flex-col gap-3">
            <it.icon className="w-6 h-6 text-primary" />
            <h3 className="font-serif text-xl">{it.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
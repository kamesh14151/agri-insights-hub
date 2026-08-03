import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { useTheme } from "@/lib/theme";
import { useI18n, LANGUAGES, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Agrisynapse" },
      { name: "description", content: "Control language, appearance, alerts and measurement units across Agrisynapse." },
      { property: "og:title", content: "Settings — Agrisynapse" },
      { property: "og:description", content: "Language, theme, alerts and unit preferences." },
    ],
  }),
  component: SettingsPage,
});

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!on)}
        aria-label={label}
        className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${on ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`block h-5 w-5 rounded-full bg-background transition-transform ${on ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const [alerts, setAlerts] = useState({ disease: true, irrigation: true, market: false, sms: true });

  return (
    <>
      <PageIntro
        index="13 / Setup"
        eyebrow={t("nav_settings")}
        title={t("settings_title")}
        subtitle={t("settings_sub")}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={t("lang_appearance")}>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">{t("interface_lang")}</span>
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value as Lang);
                toast.success(t("toast_lang"));
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.full}</option>
              ))}
            </select>
          </label>
          <div className="mt-5 flex gap-2">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTheme(m)}
                className={`flex-1 rounded-lg border px-4 py-2.5 text-sm capitalize transition ${
                  theme === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {m === "light" ? t("light_mode") : t("dark_mode")}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={t("alerts_header")}>
          <Toggle
            label={t("disease_alerts")}
            desc={t("disease_alerts_desc")}
            on={alerts.disease}
            onChange={(v) => setAlerts({ ...alerts, disease: v })}
          />
          <Toggle
            label={t("irrigation_prompts")}
            desc={t("irrigation_prompts_desc")}
            on={alerts.irrigation}
            onChange={(v) => setAlerts({ ...alerts, irrigation: v })}
          />
          <Toggle
            label={t("market_movement")}
            desc={t("market_movement_desc")}
            on={alerts.market}
            onChange={(v) => setAlerts({ ...alerts, market: v })}
          />
          <Toggle
            label={t("sms_fallback")}
            desc={t("sms_fallback_desc")}
            on={alerts.sms}
            onChange={(v) => setAlerts({ ...alerts, sms: v })}
          />
        </Panel>
      </div>
    </>
  );
}
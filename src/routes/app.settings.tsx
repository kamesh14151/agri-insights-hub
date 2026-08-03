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
  const { lang, setLang } = useI18n();
  const [alerts, setAlerts] = useState({ disease: true, irrigation: true, market: false, sms: true });

  return (
    <>
      <PageIntro
        index="13 / Setup"
        eyebrow="Preferences"
        title="Tune the platform to your farm."
        subtitle="Language, appearance and which alerts are worth interrupting your day."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Language & appearance">
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">Interface language</span>
            <select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value as Lang);
                toast.success("Language updated");
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
                {m} mode
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Alerts">
          <Toggle label="Disease alerts" desc="Notify when a scan flags high severity" on={alerts.disease} onChange={(v) => setAlerts({ ...alerts, disease: v })} />
          <Toggle label="Irrigation prompts" desc="When soil moisture drops below band" on={alerts.irrigation} onChange={(v) => setAlerts({ ...alerts, irrigation: v })} />
          <Toggle label="Market movement" desc="Price swings above 5% on your crops" on={alerts.market} onChange={(v) => setAlerts({ ...alerts, market: v })} />
          <Toggle label="SMS fallback" desc="Send critical alerts over SMS too" on={alerts.sms} onChange={(v) => setAlerts({ ...alerts, sms: v })} />
        </Panel>
      </div>
    </>
  );
}
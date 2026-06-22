import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Thermometer, Droplets, CloudRain, Sun, Loader2, MapPin } from "lucide-react";

type W = {
  temperature_2m: number; relative_humidity_2m: number;
  precipitation: number; uv_index: number; weather_code: number;
};

export function Weather() {
  const { t } = useI18n();
  const [data, setData] = useState<W | null>(null);
  const [place, setPlace] = useState("Delhi, India");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(lat: number, lng: number) {
      setLoading(true);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&hourly=uv_index&past_days=1`;
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        const uvNow: number | undefined = json.hourly?.uv_index?.[json.hourly.uv_index.length - 1];
        const precip24 = (json.hourly?.precipitation as number[] | undefined)?.slice(-24)?.reduce((a, b) => a + b, 0) ?? json.current.precipitation ?? 0;
        setData({
          temperature_2m: json.current.temperature_2m,
          relative_humidity_2m: json.current.relative_humidity_2m,
          precipitation: precip24,
          uv_index: uvNow ?? 0,
          weather_code: json.current.weather_code,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPlace(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
          load(pos.coords.latitude, pos.coords.longitude);
        },
        () => load(28.6139, 77.209),
        { timeout: 5000 },
      );
    } else load(28.6139, 77.209);
    return () => { cancelled = true; };
  }, []);

  const cards = [
    { icon: Thermometer, label: t("weather_temp"), value: data ? `${data.temperature_2m.toFixed(1)}°C` : "--" },
    { icon: Droplets, label: t("weather_humidity"), value: data ? `${Math.round(data.relative_humidity_2m)}%` : "--" },
    { icon: CloudRain, label: t("weather_rain"), value: data ? `${data.precipitation.toFixed(1)} mm` : "--" },
    { icon: Sun, label: t("weather_uv"), value: data ? data.uv_index.toFixed(1) : "--" },
  ];

  return (
    <section id="weather" className="max-w-[1200px] mx-auto px-6 py-20 md:py-28 border-t border-border">
      <h2 className="font-serif text-4xl md:text-5xl tracking-tight">{t("weather_title")}</h2>
      <p className="mt-4 text-muted-foreground max-w-2xl">{t("weather_sub")}</p>
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="w-3.5 h-3.5" /> {place}
      </p>

      <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {cards.map((c) => (
          <div key={c.label} className="bg-card p-6 md:p-8">
            <c.icon className="w-5 h-5 text-primary" />
            <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            {loading ? (
              <div className="mt-2 h-9 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <p className="mt-1 font-serif text-3xl md:text-4xl">{c.value}</p>
            )}
          </div>
        ))}
      </div>
      {loading && (
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Fetching live data…
        </p>
      )}
    </section>
  );
}
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Thermometer, Droplets, CloudRain, Sun, Loader2, MapPin, Search, LocateFixed } from "lucide-react";
import { toast } from "sonner";

type W = {
  temperature_2m: number; relative_humidity_2m: number;
  precipitation: number; uv_index: number; weather_code: number;
};

type GeoHit = { name: string; country?: string; admin1?: string; latitude: number; longitude: number };

export function Weather() {
  const { t } = useI18n();
  const [data, setData] = useState<W | null>(null);
  const [place, setPlace] = useState("Delhi, India");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function load(lat: number, lng: number) {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&hourly=uv_index,precipitation&past_days=1`;
      const res = await fetch(url);
      const json = await res.json();
      const uvNow: number | undefined = json.hourly?.uv_index?.[json.hourly.uv_index.length - 1];
      const precip24 = (json.hourly?.precipitation as number[] | undefined)?.slice(-24)?.reduce((a, b) => a + b, 0) ?? json.current.precipitation ?? 0;
      setData({
        temperature_2m: json.current.temperature_2m,
        relative_humidity_2m: json.current.relative_humidity_2m,
        precipitation: precip24,
        uv_index: uvNow ?? 0,
        weather_code: json.current.weather_code,
      });
    } catch {
      toast.error("Could not fetch weather");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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
  }, []);

  // Debounced geocoding
  useEffect(() => {
    if (!query.trim()) { setHits([]); return; }
    const q = query.trim();
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
        const json = await res.json();
        setHits((json.results ?? []) as GeoHit[]);
        setOpen(true);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pickHit = (h: GeoHit) => {
    const label = [h.name, h.admin1, h.country].filter(Boolean).join(", ");
    setPlace(label);
    setQuery("");
    setHits([]);
    setOpen(false);
    load(h.latitude, h.longitude);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlace("My location");
        load(pos.coords.latitude, pos.coords.longitude);
      },
      () => toast.error("Location permission denied"),
    );
  };

  const cards = [
    { icon: Thermometer, label: t("weather_temp"), value: data ? `${data.temperature_2m.toFixed(1)}°C` : "--" },
    { icon: Droplets, label: t("weather_humidity"), value: data ? `${Math.round(data.relative_humidity_2m)}%` : "--" },
    { icon: CloudRain, label: t("weather_rain"), value: data ? `${data.precipitation.toFixed(1)} mm` : "--" },
    { icon: Sun, label: t("weather_uv"), value: data ? data.uv_index.toFixed(1) : "--" },
  ];

  return (
    <section id="weather" className="max-w-[1200px] mx-auto px-6 py-14 md:py-20">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" /> {place}
        </p>
        <div ref={boxRef} className="relative w-full sm:max-w-sm">
          <div className="flex items-center gap-2 border border-border rounded-md bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => hits.length && setOpen(true)}
              placeholder="Enter a city or village…"
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <button
              type="button"
              onClick={useMyLocation}
              title="Use my location"
              className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          </div>
          {open && hits.length > 0 && (
            <ul className="absolute z-20 mt-2 w-full max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-lg">
              {hits.map((h, i) => (
                <li key={`${h.name}-${i}`}>
                  <button
                    type="button"
                    onClick={() => pickHit(h)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      <span className="font-medium">{h.name}</span>
                      <span className="text-muted-foreground">
                        {[h.admin1, h.country].filter(Boolean).length ? `, ${[h.admin1, h.country].filter(Boolean).join(", ")}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {cards.map((c) => (
          <div key={c.label} className="bg-card p-5 sm:p-6 md:p-8">
            <c.icon className="w-5 h-5 text-primary" />
            <p className="mt-4 text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            {loading ? (
              <div className="mt-2 h-9 w-24 bg-muted rounded animate-pulse" />
            ) : (
              <p className="mt-1 font-serif text-2xl sm:text-3xl md:text-4xl">{c.value}</p>
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
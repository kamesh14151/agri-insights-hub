import { useEffect, useRef, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Thermometer, Droplets, CloudRain, Sun, Loader2, MapPin,
  Search, LocateFixed, Wind, AlertTriangle, CheckCircle2, Clock,
  Bug, Sprout, Beaker, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────
type Current = {
  temperature_2m: number;
  relative_humidity_2m: number;
  precipitation: number;
  uv_index: number;
  weather_code: number;
  wind_speed_10m: number;
};

type DayForecast = {
  date: string;
  label: string;
  maxTemp: number;
  minTemp: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  riskScore: number;
};

type PestRisk = {
  name: string;
  level: "low" | "medium" | "high" | "critical";
  score: number;
  reason: string;
  icon: typeof Bug;
  crop: string;
};

type GeoHit = { name: string; country?: string; admin1?: string; latitude: number; longitude: number };

// ── Risk calculator ───────────────────────────────────────────────────────
function calcDayRisk(humidity: number, rainfall: number, maxTemp: number, windSpeed: number) {
  let score = 0;
  if (humidity > 85) score += 35;
  else if (humidity > 75) score += 20;
  else if (humidity > 65) score += 10;
  if (rainfall > 10) score += 30;
  else if (rainfall > 5) score += 20;
  else if (rainfall > 1) score += 10;
  if (maxTemp > 34) score += 15;
  else if (maxTemp > 28) score += 8;
  if (windSpeed < 5) score += 10;
  return Math.min(100, score);
}

function calcPestRisks(days: DayForecast[], current: Current): PestRisk[] {
  const avgHumidity = days.slice(0, 3).reduce((a, d) => a + d.humidity, 0) / 3;
  const avgRain = days.slice(0, 3).reduce((a, d) => a + d.rainfall, 0);
  const avgTemp = current.temperature_2m;

  return [
    {
      name: "Fungal / Blast",
      level: avgHumidity > 80 && avgRain > 5 ? "critical" : avgHumidity > 70 ? "high" : avgHumidity > 60 ? "medium" : "low",
      score: Math.min(100, Math.round(avgHumidity * 0.7 + avgRain * 3)),
      reason: `${Math.round(avgHumidity)}% avg humidity · ${avgRain.toFixed(1)} mm last 3 days`,
      icon: Sprout,
      crop: "Paddy, Wheat",
    },
    {
      name: "Aphid & Whitefly",
      level: avgTemp > 30 && avgHumidity < 60 ? "high" : avgTemp > 28 ? "medium" : "low",
      score: Math.min(100, Math.round(avgTemp * 2 + (100 - avgHumidity) * 0.5)),
      reason: `${avgTemp.toFixed(1)}°C temp · ${Math.round(avgHumidity)}% humidity`,
      icon: Bug,
      crop: "Tomato, Cotton",
    },
    {
      name: "Spider Mite",
      level: avgTemp > 33 && avgHumidity < 50 ? "critical" : avgTemp > 30 ? "high" : "low",
      score: Math.min(100, Math.round(avgTemp * 2.5 + (100 - avgHumidity) * 0.6)),
      reason: `Hot & dry conditions favour mites`,
      icon: Bug,
      crop: "Brinjal, Okra",
    },
    {
      name: "Stem Borer",
      level: avgTemp > 28 && avgRain > 15 ? "high" : avgTemp > 26 ? "medium" : "low",
      score: Math.min(100, Math.round(avgTemp * 1.8 + avgRain * 1.5)),
      reason: `${avgRain.toFixed(1)} mm rain promotes stem borer emergence`,
      icon: Beaker,
      crop: "Paddy, Sugarcane",
    },
  ];
}

const RISK_COLORS: Record<string, string> = {
  low:      "oklch(0.52 0.19 148)",
  medium:   "oklch(0.72 0.17 75)",
  high:     "oklch(0.62 0.21 40)",
  critical: "oklch(0.55 0.24 20)",
};

const RISK_BADGE: Record<string, string> = {
  low:      "bg-[oklch(0.52_0.19_148/0.10)] text-[oklch(0.28_0.18_148)] border border-[oklch(0.52_0.19_148/0.25)]",
  medium:   "bg-[oklch(0.72_0.17_75/0.10)] text-[oklch(0.50_0.16_70)] border border-[oklch(0.72_0.17_75/0.25)]",
  high:     "bg-[oklch(0.62_0.21_40/0.10)] text-[oklch(0.45_0.20_38)] border border-[oklch(0.62_0.21_40/0.25)]",
  critical: "bg-[oklch(0.55_0.24_20/0.10)] text-[oklch(0.40_0.22_18)] border border-[oklch(0.55_0.24_20/0.25)]",
};

// ── Main component ────────────────────────────────────────────────────────
export function Weather() {
  const { t } = useI18n();
  const [current, setCurrent] = useState<Current | null>(null);
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [place, setPlace] = useState("Delhi, India");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const url = [
        `https://api.open-meteo.com/v1/forecast`,
        `?latitude=${lat}&longitude=${lng}`,
        `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`,
        `&hourly=uv_index`,
        `&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max,weather_code`,
        `&forecast_days=7`,
        `&timezone=auto`,
      ].join("");

      const res = await fetch(url);
      const j = await res.json();

      const uvNow = j.hourly?.uv_index?.slice(-1)[0] ?? 0;
      setCurrent({
        temperature_2m:        j.current.temperature_2m,
        relative_humidity_2m:  j.current.relative_humidity_2m,
        precipitation:         j.current.precipitation ?? 0,
        uv_index:              uvNow,
        weather_code:          j.current.weather_code,
        wind_speed_10m:        j.current.wind_speed_10m ?? 0,
      });

      const days: DayForecast[] = (j.daily?.time ?? []).map((dateStr: string, i: number) => {
        const d = new Date(dateStr);
        const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
        const humidity = j.daily.relative_humidity_2m_mean?.[i] ?? 65;
        const rainfall = j.daily.precipitation_sum?.[i] ?? 0;
        const maxTemp = j.daily.temperature_2m_max?.[i] ?? 30;
        const minTemp = j.daily.temperature_2m_min?.[i] ?? 22;
        const windSpeed = j.daily.wind_speed_10m_max?.[i] ?? 8;
        const riskScore = calcDayRisk(humidity, rainfall, maxTemp, windSpeed);
        return { date: dateStr, label, maxTemp, minTemp, humidity, rainfall, windSpeed, riskScore };
      });

      setForecast(days);
    } catch {
      toast.error("Could not fetch weather");
    } finally {
      setLoading(false);
    }
  }, []);

  async function fetchLocationName(lat: number, lng: number) {
    try {
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const geo = await res.json();
      return geo.city || geo.locality || geo.principalSubdivision || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    } catch {
      return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }
  }

  const handleGeolocation = useCallback(async (pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    setPlace("Locating...");
    const name = await fetchLocationName(lat, lng);
    setPlace(name);
    load(lat, lng);
  }, [load]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(handleGeolocation, () => load(28.6139, 77.209), { timeout: 5000 });
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
      } finally { setSearching(false); }
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
    setPlace([h.name, h.admin1, h.country].filter(Boolean).join(", "));
    setQuery(""); setHits([]); setOpen(false);
    load(h.latitude, h.longitude);
  };

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(handleGeolocation, () => toast.error("Location permission denied"));
  };

  const pestRisks = current && forecast.length ? calcPestRisks(forecast, current) : [];
  const overallRisk = forecast.length ? Math.round(forecast.slice(0, 3).reduce((a, d) => a + d.riskScore, 0) / 3) : 0;
  const overallLevel = overallRisk >= 70 ? "critical" : overallRisk >= 50 ? "high" : overallRisk >= 30 ? "medium" : "low";

  // Spray window logic
  const sprayWindow = current
    ? current.wind_speed_10m < 10 && current.relative_humidity_2m < 75
      ? { ok: true, msg: "Good — wind < 10 km/h and humidity < 75%. Best window: 06:00–09:00 tomorrow." }
      : { ok: false, msg: `Wait — wind at ${current.wind_speed_10m.toFixed(0)} km/h or humidity at ${current.relative_humidity_2m}% is unfavourable.` }
    : null;

  // Irrigation advisory
  const next2DayRain = forecast.slice(0, 2).reduce((a, d) => a + d.rainfall, 0);
  const irrigationMsg = next2DayRain > 12
    ? { ok: true,  msg: `Skip irrigation — ${next2DayRain.toFixed(1)} mm rain expected in 48 hours.` }
    : next2DayRain > 4
    ? { ok: null,  msg: `Light rain (${next2DayRain.toFixed(1)} mm) expected — monitor soil moisture before irrigating.` }
    : { ok: false, msg: `Irrigate — only ${next2DayRain.toFixed(1)} mm rain forecast in next 48 hours.` };

  const cards = [
    { icon: Thermometer, label: t("weather_temp"),     value: current ? `${current.temperature_2m.toFixed(1)}°C`           : "--" },
    { icon: Droplets,    label: t("weather_humidity"), value: current ? `${Math.round(current.relative_humidity_2m)}%`      : "--" },
    { icon: CloudRain,   label: t("weather_rain"),     value: current ? `${current.precipitation.toFixed(1)} mm`            : "--" },
    { icon: Sun,         label: t("weather_uv"),       value: current ? current.uv_index.toFixed(1)                        : "--" },
    { icon: Wind,        label: "Wind",                value: current ? `${current.wind_speed_10m.toFixed(0)} km/h`         : "--" },
  ];

  return (
    <section id="weather" className="px-6 py-12 space-y-8 max-w-[1200px] mx-auto">

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          {place}
        </p>
        <div ref={boxRef} className="relative w-full sm:max-w-sm">
          <div className="input-premium flex items-center gap-2 rounded-[12px] px-3 py-2.5 focus-within:border-primary/40">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => hits.length && setOpen(true)}
              placeholder="Enter a city or village…"
              className="flex-1 min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <button type="button" onClick={useMyLocation} title="Use my location"
              className="shrink-0 grid h-7 w-7 place-items-center rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition">
              <LocateFixed className="w-3.5 h-3.5" />
            </button>
          </div>
          {open && hits.length > 0 && (
            <ul className="absolute z-20 mt-2 w-full max-h-72 overflow-auto rounded-[14px] border border-border bg-popover shadow-[0_8px_32px_oklch(0.09_0.005_240/0.12)]">
              {hits.map((h, i) => (
                <li key={`${h.name}-${i}`}>
                  <button type="button" onClick={() => pickHit(h)}
                    className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-muted/60 flex items-center gap-2">
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

      {/* ── Current condition cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="stat-card rounded-[1.25rem] p-4 sm:p-5">
            <span className="icon-wrap grid h-7 w-7 place-items-center rounded-[8px]">
              <c.icon className="w-3.5 h-3.5 text-primary" />
            </span>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{c.label}</p>
            {loading
              ? <div className="mt-1 h-8 w-20 bg-muted rounded-lg animate-pulse" />
              : <p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{c.value}</p>
            }
          </div>
        ))}
      </div>

      {/* ── 7-day risk timeline chart ────────────────────────────────────── */}
      {forecast.length > 0 && (
        <div className="glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-[15px] tracking-[-0.02em]">7-Day Disease Risk Timeline</h3>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${RISK_BADGE[overallLevel]}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: RISK_COLORS[overallLevel] }} />
              {overallLevel} overall
            </span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="oklch(0.62 0.21 40)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="oklch(0.62 0.21 40)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="oklch(0.55 0.17 200)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="oklch(0.55 0.17 200)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.005 240 / 0.7)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="oklch(0.60 0.01 240)" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.60 0.01 240)" axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid oklch(0.88 0.005 240 / 0.7)", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 24px oklch(0.09 0.005 240/0.1)" }}
                  formatter={(val: number, name: string) => [
                    name === "riskScore" ? `${val}/100` : name === "humidity" ? `${val}%` : `${val.toFixed(1)} mm`,
                    name === "riskScore" ? "Risk Score" : name === "humidity" ? "Humidity" : "Rainfall",
                  ]}
                />
                <Area type="monotone" dataKey="humidity"  stroke="oklch(0.55 0.17 200)" fill="url(#humGrad)"  strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="riskScore" stroke="oklch(0.62 0.21 40)"  fill="url(#riskGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.62 0.21 40)", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Forecast day bars */}
          <div className="mt-4 h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast} margin={{ top: 0, right: 4, left: -16, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.005 240 / 0.7)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid oklch(0.88 0.005 240 / 0.7)", borderRadius: 12, fontSize: 12 }}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)}${name === "maxTemp" ? "°C" : " mm"}`, name === "maxTemp" ? "Max Temp" : "Rainfall"]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="rainfall" name="Rainfall (mm)" fill="oklch(0.55 0.17 200 / 0.65)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maxTemp"  name="Max Temp (°C)" fill="oklch(0.62 0.21 40 / 0.65)"  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Risk Advisories row ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Spray window */}
        {sprayWindow && (
          <div className={`glass-panel p-5 flex items-start gap-4 ${sprayWindow.ok ? "border-[oklch(0.52_0.19_148/0.30)]" : "border-[oklch(0.62_0.21_40/0.30)]"}`}>
            <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${sprayWindow.ok ? "bg-primary/10 text-primary" : "bg-[oklch(0.62_0.21_40/0.12)] text-[oklch(0.45_0.20_38)]"}`}>
              <Wind className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[13px] font-semibold">Spray Window</p>
              <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">{sprayWindow.msg}</p>
            </div>
          </div>
        )}

        {/* Irrigation */}
        <div className={`glass-panel p-5 flex items-start gap-4 ${irrigationMsg.ok ? "border-[oklch(0.52_0.19_148/0.30)]" : irrigationMsg.ok === null ? "border-[oklch(0.72_0.17_75/0.30)]" : "border-[oklch(0.62_0.21_40/0.30)]"}`}>
          <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${irrigationMsg.ok ? "bg-primary/10 text-primary" : irrigationMsg.ok === null ? "bg-[oklch(0.72_0.17_75/0.12)] text-[oklch(0.50_0.16_70)]" : "bg-[oklch(0.62_0.21_40/0.12)] text-[oklch(0.45_0.20_38)]"}`}>
            <Droplets className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-semibold">Irrigation Advisory</p>
            <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">{irrigationMsg.msg}</p>
          </div>
        </div>

        {/* Harvest timing */}
        <div className="glass-panel p-5 flex items-start gap-4">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-semibold">Harvest Timing</p>
            <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
              {forecast.find(d => d.rainfall < 1 && d.humidity < 60)
                ? `Dry window on ${forecast.find(d => d.rainfall < 1 && d.humidity < 60)?.label} — ideal for lifting and drying.`
                : "No clear dry window in the next 7 days — plan indoor drying alternatives."}
            </p>
          </div>
        </div>

        {/* Disease pressure */}
        <div className={`glass-panel p-5 flex items-start gap-4 ${overallRisk >= 50 ? "border-[oklch(0.62_0.21_40/0.35)]" : ""}`}>
          <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${overallRisk >= 70 ? "bg-[oklch(0.55_0.24_20/0.12)] text-[oklch(0.40_0.22_18)]" : overallRisk >= 50 ? "bg-[oklch(0.62_0.21_40/0.12)] text-[oklch(0.45_0.20_38)]" : "bg-primary/10 text-primary"}`}>
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-semibold">Disease Pressure</p>
            <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
              {overallRisk >= 70
                ? "Critical: 3+ consecutive humid/rainy nights raise blast risk. Apply fungicide preventively."
                : overallRisk >= 50
                ? "Elevated: Humidity is high. Scout paddy blocks daily and avoid spraying in still air."
                : overallRisk >= 30
                ? "Moderate: Conditions are marginal. Monitor and scout every 2 days."
                : "Low: Conditions unfavourable for major outbreaks. Routine monitoring sufficient."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Pest Risk Dashboard ──────────────────────────────────────────── */}
      {pestRisks.length > 0 && (
        <div>
          <h3 className="font-semibold text-[15px] tracking-[-0.02em] mb-4">Pest Risk Dashboard</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {pestRisks.map((pest) => (
              <div key={pest.name} className={`glass-panel p-5 ${pest.level === "critical" ? "border-[oklch(0.55_0.24_20/0.35)]" : pest.level === "high" ? "border-[oklch(0.62_0.21_40/0.30)]" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="icon-wrap grid h-8 w-8 place-items-center rounded-[8px]">
                    <pest.icon className="h-4 w-4 text-primary" />
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${RISK_BADGE[pest.level]}`}>
                    {pest.level}
                  </span>
                </div>
                <p className="mt-3 text-[13.5px] font-semibold">{pest.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{pest.crop}</p>

                {/* Risk gauge */}
                <div className="mt-3 risk-gauge-track h-1.5">
                  <div
                    className="risk-gauge-fill"
                    style={{
                      width: `${pest.score}%`,
                      background: RISK_COLORS[pest.level],
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">{pest.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Fetching live data…
        </p>
      )}
    </section>
  );
}
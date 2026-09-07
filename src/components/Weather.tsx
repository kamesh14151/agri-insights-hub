import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import {
  Thermometer, Droplets, CloudRain, Sun, Loader2, MapPin,
  Search, LocateFixed, Wind, AlertTriangle, CheckCircle2, Clock,
  Bug, Sprout, Beaker, TrendingUp, Volume2, VolumeX, Printer, Info, Calendar, ShieldAlert
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
  low:      "#10b981", // Emerald
  medium:   "#f59e0b", // Amber
  high:     "#f97316", // Orange
  critical: "#e11d48", // Rose
};

const RISK_BADGE: Record<string, string> = {
  low:      "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  medium:   "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  high:     "bg-orange-500/10 text-orange-600 border border-orange-500/20",
  critical: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
};

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

  // Apple-grade states
  const [activeTab, setActiveTab] = useState<"overview" | "hourly" | "pest_risks">("overview");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const load = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const url = [
        `https://api.open-meteo.com/v1/forecast`,
        `?latitude=${lat}&longitude=${lng}`,
        `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`,
        `&hourly=uv_index,temperature_2m,precipitation_probability`,
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
        const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
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

  /* ── Siri Speech Synthesis ── */
  const startSpeech = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Samantha") || v.name.includes("Siri") || v.name.includes("Google")));
    if (voice) utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.02;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    if (!current || !forecast.length) return;
    const today = forecast[0];
    const sprayText = current.wind_speed_10m < 10 && current.relative_humidity_2m < 75 
      ? "Conditions are currently good for spraying." 
      : "Wait to spray, wind or humidity is unfavorable.";
    
    const text = `Good morning. In ${place}, it is currently ${current.temperature_2m.toFixed(1)} degrees. 
    Today's high will be ${today.maxTemp.toFixed(1)} degrees with ${today.rainfall.toFixed(1)} millimeters of rain. 
    ${sprayText} The overall disease pressure is ${overallRisk >= 50 ? "high" : "low"}.`;
    
    startSpeech(text);
  };

  const pestRisks = current && forecast.length ? calcPestRisks(forecast, current) : [];
  const overallRisk = forecast.length ? Math.round(forecast.slice(0, 3).reduce((a, d) => a + d.riskScore, 0) / 3) : 0;
  const overallLevel = overallRisk >= 70 ? "critical" : overallRisk >= 50 ? "high" : overallRisk >= 30 ? "medium" : "low";

  const sprayWindow = current
    ? current.wind_speed_10m < 10 && current.relative_humidity_2m < 75
      ? { ok: true, msg: "Good — wind < 10 km/h and humidity < 75%. Best window: 06:00–09:00 tomorrow." }
      : { ok: false, msg: `Wait — wind at ${current.wind_speed_10m.toFixed(0)} km/h or humidity at ${current.relative_humidity_2m}% is unfavourable.` }
    : null;

  const next2DayRain = forecast.slice(0, 2).reduce((a, d) => a + d.rainfall, 0);
  const irrigationMsg = next2DayRain > 12
    ? { ok: true,  msg: `Skip irrigation — ${next2DayRain.toFixed(1)} mm rain expected in 48 hours.` }
    : next2DayRain > 4
    ? { ok: null,  msg: `Light rain (${next2DayRain.toFixed(1)} mm) expected — monitor soil moisture.` }
    : { ok: false, msg: `Irrigate — only ${next2DayRain.toFixed(1)} mm rain forecast in next 48 hours.` };

  // Dynamic Background based on weather condition (rain vs clear)
  const isRainy = current?.weather_code ? [51,53,55,61,63,65,80,81,82,95,96,99].includes(current.weather_code) : false;
  const bgGradient = isRainy 
    ? "bg-gradient-to-br from-slate-800 via-slate-700 to-indigo-900" 
    : "bg-gradient-to-br from-[#c8e44a]/20 via-sky-50 to-blue-100";
  
  const textColor = isRainy ? "text-white" : "text-[#1a1a18]";
  const cardBg = isRainy ? "bg-white/10" : "bg-white/70";

  return (
    <div className={`w-full text-foreground antialiased transition-colors duration-700 ${bgGradient}`}>
      
      {/* ── Header & Segmented Controls ── */}
      <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-5 sm:p-6 border-b border-black/[0.06] backdrop-blur-xl ${isRainy ? "bg-black/20" : "bg-white/30"}`}>
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/[0.04] border border-black/[0.06] mb-1.5 backdrop-blur-md">
            <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isRainy ? "bg-blue-400" : "bg-[#b8d940]"}`} />
            <span className={`text-[11px] font-semibold tracking-wide uppercase ${isRainy ? "text-white/80" : "text-[#555]"}`}>
              Premium Meteorologist
            </span>
          </div>
          <h2 className={`text-xl sm:text-3xl font-bold tracking-tight ${textColor}`}>
            Weather & Risk Forecasting
          </h2>
          <p className={`text-xs sm:text-sm mt-0.5 ${isRainy ? "text-white/70" : "text-[#7a7a72]"}`}>
            Live hyper-local weather intelligence translated into precision farming actions.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="inline-flex p-1 rounded-full bg-black/[0.05] border border-black/[0.08] shadow-inner backdrop-blur-md">
          {[
            { id: "overview", label: "Overview", icon: Calendar },
            { id: "hourly", label: "Hourly", icon: Clock },
            { id: "pest_risks", label: "Pest Risks", icon: ShieldAlert },
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = activeTab === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setActiveTab(mode.id as any)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white text-[#1a1a18] shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]"
                    : `${isRainy ? "text-white/60 hover:text-white" : "text-[#7a7a72] hover:text-[#1a1a18]"}`
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* ── Toolbar: Search & Voice ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div ref={boxRef} className="relative w-full sm:max-w-md z-30">
            <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 backdrop-blur-md border shadow-sm transition-all focus-within:ring-2 ${isRainy ? "bg-white/10 border-white/20 focus-within:ring-white/30 text-white" : "bg-white/70 border-black/10 focus-within:ring-[#c8e44a] text-black"}`}>
              <Search className={`w-4 h-4 shrink-0 ${isRainy ? "text-white/60" : "text-black/50"}`} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => hits.length && setOpen(true)}
                placeholder="Search your farm location..."
                className={`flex-1 min-w-0 bg-transparent text-sm outline-none ${isRainy ? "placeholder:text-white/50" : "placeholder:text-black/50"}`}
              />
              {searching && <Loader2 className="w-4 h-4 animate-spin opacity-50" />}
              <button type="button" onClick={useMyLocation} title="Use my location"
                className="shrink-0 hover:scale-110 transition">
                <LocateFixed className={`w-4 h-4 ${isRainy ? "text-white" : "text-black"}`} />
              </button>
            </div>
            
            {open && hits.length > 0 && (
              <ul className="absolute mt-2 w-full max-h-72 overflow-auto rounded-2xl border border-black/10 bg-white shadow-xl">
                {hits.map((h, i) => (
                  <li key={`${h.name}-${i}`}>
                    <button type="button" onClick={() => pickHit(h)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-black/5 flex items-center gap-3 text-black">
                      <MapPin className="w-4 h-4 text-black/50 shrink-0" />
                      <span className="truncate">
                        <span className="font-semibold">{h.name}</span>
                        <span className="text-black/50 text-xs ml-2">
                          {[h.admin1, h.country].filter(Boolean).length ? ` ${[h.admin1, h.country].filter(Boolean).join(", ")}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-full backdrop-blur-md border text-sm font-semibold flex items-center gap-2 ${isRainy ? "bg-white/10 border-white/20 text-white" : "bg-white/70 border-black/10 text-black"}`}>
              <MapPin className="w-4 h-4" />
              {place}
            </div>
            
            {current && (
              <button
                onClick={toggleSpeech}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition backdrop-blur-md border ${
                  isSpeaking
                    ? "bg-[#b8d940] text-black border-transparent shadow-[0_0_15px_rgba(184,217,64,0.5)]"
                    : isRainy ? "bg-white/10 border-white/20 text-white hover:bg-white/20" : "bg-white border-black/10 text-black hover:bg-black/5"
                }`}
              >
                {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span>{isSpeaking ? "Pause Summary" : "Voice Readout"}</span>
              </button>
            )}
            
            <button
              onClick={() => window.print()}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition backdrop-blur-md border ${isRainy ? "bg-white/10 border-white/20 text-white hover:bg-white/20" : "bg-white border-black/10 text-black hover:bg-black/5"}`}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* ── Active Tab Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className={`w-8 h-8 animate-spin mb-4 ${isRainy ? "text-white" : "text-black"}`} />
            <p className={isRainy ? "text-white/80" : "text-black/60"}>Fetching premium hyper-local weather...</p>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                {/* ── Top Level Weather Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { icon: Thermometer, label: "Temperature", val: current ? `${current.temperature_2m.toFixed(1)}°C` : "--" },
                    { icon: Droplets, label: "Humidity", val: current ? `${Math.round(current.relative_humidity_2m)}%` : "--" },
                    { icon: CloudRain, label: "Rainfall", val: current ? `${current.precipitation.toFixed(1)} mm` : "--" },
                    { icon: Sun, label: "UV Index", val: current ? current.uv_index.toFixed(1) : "--" },
                    { icon: Wind, label: "Wind Speed", val: current ? `${current.wind_speed_10m.toFixed(0)} km/h` : "--" },
                  ].map((c) => (
                    <div key={c.label} className={`p-5 rounded-[24px] backdrop-blur-xl border ${cardBg} ${isRainy ? "border-white/10" : "border-black/5"} shadow-sm transition hover:scale-[1.02]`}>
                      <span className={`grid h-8 w-8 place-items-center rounded-xl mb-3 ${isRainy ? "bg-white/20" : "bg-black/5"}`}>
                        <c.icon className={`w-4 h-4 ${isRainy ? "text-white" : "text-black"}`} />
                      </span>
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${isRainy ? "text-white/60" : "text-black/50"}`}>{c.label}</p>
                      <p className={`mt-1 text-2xl font-bold ${textColor}`}>{c.val}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Actionable Smart Widgets */}
                  <div className="lg:col-span-5 space-y-4">
                    {sprayWindow && (
                      <div className={`p-5 rounded-[24px] backdrop-blur-xl border ${cardBg} ${isRainy ? "border-white/10" : "border-black/5"}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className={`text-sm font-bold flex items-center gap-2 ${textColor}`}>
                            <Wind className="w-4 h-4" /> Spraying Window
                          </h3>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${sprayWindow.ok ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"}`}>
                            {sprayWindow.ok ? "Optimal" : "Wait"}
                          </span>
                        </div>
                        <p className={`text-sm leading-relaxed ${isRainy ? "text-white/80" : "text-black/70"}`}>{sprayWindow.msg}</p>
                      </div>
                    )}

                    <div className={`p-5 rounded-[24px] backdrop-blur-xl border ${cardBg} ${isRainy ? "border-white/10" : "border-black/5"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-sm font-bold flex items-center gap-2 ${textColor}`}>
                          <Droplets className="w-4 h-4" /> Irrigation Advisory
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${irrigationMsg.ok ? "bg-emerald-500/20 text-emerald-600" : irrigationMsg.ok === null ? "bg-amber-500/20 text-amber-600" : "bg-rose-500/20 text-rose-600"}`}>
                          {irrigationMsg.ok ? "Skip" : irrigationMsg.ok === null ? "Monitor" : "Irrigate"}
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isRainy ? "text-white/80" : "text-black/70"}`}>{irrigationMsg.msg}</p>
                    </div>

                    <div className={`p-5 rounded-[24px] backdrop-blur-xl border ${cardBg} ${isRainy ? "border-white/10" : "border-black/5"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-sm font-bold flex items-center gap-2 ${textColor}`}>
                          <AlertTriangle className="w-4 h-4" /> Disease Pressure
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${RISK_BADGE[overallLevel]}`}>
                          {overallLevel} Risk
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isRainy ? "text-white/80" : "text-black/70"}`}>
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

                  {/* 7 Day Risk Chart */}
                  <div className={`lg:col-span-7 p-6 rounded-[24px] backdrop-blur-xl border ${cardBg} ${isRainy ? "border-white/10" : "border-black/5"} flex flex-col`}>
                    <h3 className={`font-bold text-lg mb-6 ${textColor}`}>7-Day Intelligence Timeline</h3>
                    <div className="flex-1 min-h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={forecast} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isRainy ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: isRainy ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: isRainy ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: isRainy ? "#1e293b" : "white", border: "none", borderRadius: 16, fontSize: 12, color: isRainy ? "white" : "black", boxShadow: "0 10px 30px rgba(0,0,0,0.1)" }}
                            formatter={(val: number, name: string) => [`${val.toFixed(1)}${name === "maxTemp" ? "°C" : " mm"}`, name === "maxTemp" ? "Max Temp" : "Rainfall"]}
                          />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10, color: isRainy ? "white" : "black" }} />
                          <Bar dataKey="rainfall" name="Rainfall (mm)" fill={isRainy ? "#60a5fa" : "#3b82f6"} radius={[6, 6, 0, 0]} />
                          <Bar dataKey="maxTemp"  name="Max Temp (°C)" fill={isRainy ? "#f472b6" : "#f43f5e"}  radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "hourly" && (
              <div className={`p-6 rounded-[24px] backdrop-blur-xl border ${cardBg} ${isRainy ? "border-white/10" : "border-black/5"} min-h-[400px] flex items-center justify-center animate-fade-in`}>
                <div className="text-center space-y-4">
                  <Clock className={`w-12 h-12 mx-auto ${isRainy ? "text-white/50" : "text-black/30"}`} />
                  <h3 className={`text-xl font-bold ${textColor}`}>Detailed Hourly Forecasting</h3>
                  <p className={`text-sm ${isRainy ? "text-white/70" : "text-black/60"}`}>
                    Hourly forecast visuals will render here. Use the overview for actionable insights right now.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "pest_risks" && pestRisks.length > 0 && (
              <div className="animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {pestRisks.map((pest) => (
                    <div key={pest.name} className={`p-6 rounded-[24px] backdrop-blur-xl border ${cardBg} ${isRainy ? "border-white/10" : "border-black/5"} flex flex-col items-center text-center transition hover:scale-[1.02]`}>
                      <h4 className={`font-bold text-base mb-1 ${textColor}`}>{pest.name}</h4>
                      <p className={`text-[10px] uppercase font-bold tracking-wider mb-6 ${isRainy ? "text-white/50" : "text-black/40"}`}>{pest.crop}</p>
                      
                      {/* Apple-grade Circular SVG Gauge */}
                      <div className="relative w-28 h-28 flex items-center justify-center mb-6">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className={isRainy ? "text-white/10" : "text-black/10"}
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            stroke={RISK_COLORS[pest.level]}
                            strokeDasharray={`${pest.score}, 100`}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            fill="none"
                            className="transition-all duration-1000 ease-out"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <pest.icon className="w-5 h-5 mb-1" style={{ color: RISK_COLORS[pest.level] }} />
                          <span className={`text-[10px] font-bold uppercase tracking-wider`} style={{ color: RISK_COLORS[pest.level] }}>
                            {pest.level}
                          </span>
                        </div>
                      </div>
                      
                      <p className={`text-xs leading-relaxed ${isRainy ? "text-white/70" : "text-black/60"}`}>{pest.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
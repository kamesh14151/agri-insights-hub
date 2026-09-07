import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Battery, CheckCircle2, Droplets, Gauge, Loader2, RefreshCw, Thermometer, Wifi, Info, Zap } from "lucide-react";
import { PageIntro, Panel } from "@/components/DashboardShell";

export const Route = createFileRoute("/app/iot")({
  head: () => ({
    meta: [
      { title: "IoT Soil Monitoring — Agrisynapse" },
      { name: "description", content: "Connect a soil sensor hardware URL to view live moisture, temperature, pH and NPK readings." },
    ],
  }),
  component: IotPage,
});

type Telemetry = {
  name: string;
  moisture: number;
  temperature: number;
  humidity: number;
  ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  battery: number;
  timestamp: string;
};

type Reading = Telemetry & { time: string };

const IOT_ENDPOINT = (import.meta.env.VITE_IOT_TELEMETRY_URL ?? "").trim();
const configuredPollSeconds = Number(import.meta.env.VITE_IOT_POLL_INTERVAL_SECONDS ?? 30);
const IOT_POLL_SECONDS = Number.isFinite(configuredPollSeconds) ? Math.max(5, configuredPollSeconds) : 30;
const COLORS = ["#10b981", "#f59e0b", "#3b82f6"];

const emptyTelemetry: Telemetry = {
  name: "", moisture: 0, temperature: 0, humidity: 0, ph: 0,
  nitrogen: 0, phosphorus: 0, potassium: 0, battery: 0, timestamp: new Date().toISOString(),
};

function numberOf(value: unknown, fallback: number) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseTelemetry(payload: unknown): Telemetry {
  const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, any>;
  const data = (raw.data ?? raw.telemetry ?? raw.reading ?? raw) as Record<string, any>;
  const npk = (data.npk ?? {}) as Record<string, any>;
  return {
    name: String(data.name ?? data.deviceName ?? data.device_id ?? data.deviceId ?? "Connected Soil Node"),
    moisture: numberOf(data.moisture ?? data.soilMoisture ?? data.moisture_percent, 0),
    temperature: numberOf(data.temperature ?? data.temp ?? data.soilTemperature, 0),
    humidity: numberOf(data.humidity ?? data.airHumidity ?? data.rh, 0),
    ph: numberOf(data.ph ?? data.pH ?? data.soilPh, 0),
    nitrogen: numberOf(data.nitrogen ?? data.n ?? npk.n ?? npk.nitrogen, 0),
    phosphorus: numberOf(data.phosphorus ?? data.phos ?? data.p ?? npk.p ?? npk.phosphorus, 0),
    potassium: numberOf(data.potassium ?? data.k ?? npk.k ?? npk.potassium, 0),
    battery: numberOf(data.battery ?? data.batteryLevel ?? data.battery_percent, 100),
    timestamp: String(data.timestamp ?? data.updatedAt ?? data.lastUpdated ?? new Date().toISOString()),
  };
}

function statusFor(reading: Telemetry) {
  if (reading.moisture < 30) return { label: "Irrigation needed", color: "text-rose-600 bg-rose-500/10 border-rose-500/20" };
  if (reading.ph && (reading.ph < 5.5 || reading.ph > 7.5)) return { label: "pH attention", color: "text-amber-600 bg-amber-500/10 border-amber-500/20" };
  return { label: "Soil in range", color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" };
}

function MetricCard({ icon: Icon, label, value, unit, colorClass = "text-[#1a1a18]" }: { icon: typeof Gauge; label: string; value: number | string; unit: string; colorClass?: string }) {
  // Format the number to 1 decimal place to prevent overlapping
  const formattedValue = typeof value === "number" ? value.toFixed(1) : value;
  
  return (
    <div className="p-5 rounded-[24px] backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm transition-all hover:scale-[1.02]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#7a7a72]">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-black/5">
          <Icon className="h-4 w-4 text-[#1a1a18]" />
        </span>
      </div>
      <p className={`mt-4 text-3xl font-bold tracking-tight ${colorClass}`}>
        {formattedValue}
        {unit && <span className="ml-1 text-base font-semibold text-black/40">{unit}</span>}
      </p>
    </div>
  );
}

function IotPage() {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateMockTelemetry = (): Telemetry => ({
    name: "Mock Soil Node (Demo)",
    moisture: 55 + Math.random() * 20,
    temperature: 24 + Math.random() * 4,
    humidity: 60 + Math.random() * 10,
    ph: 6.2 + Math.random() * 0.8,
    nitrogen: 45 + Math.random() * 15,
    phosphorus: 35 + Math.random() * 10,
    potassium: 40 + Math.random() * 20,
    battery: 92 - Math.random() * 2,
    timestamp: new Date().toISOString(),
  });

  const fetchTelemetry = async () => {
    setLoading(true);
    setError("");
    try {
      let reading: Telemetry;
      if (IOT_ENDPOINT) {
        const parsed = new URL(IOT_ENDPOINT);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Use an http:// or https:// URL.");
        const response = await fetch(parsed.toString(), { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Device returned HTTP ${response.status}.`);
        reading = normaliseTelemetry(await response.json());
      } else {
        reading = generateMockTelemetry();
      }
      setTelemetry(reading);
      setHistory((current) => [...current.slice(-23), { ...reading, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      setConnected(true);
    } catch (caught) {
      setConnected(false);
      setError(caught instanceof Error ? caught.message : "Could not read telemetry from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTelemetry();
  }, []);

  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(fetchTelemetry, IOT_POLL_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [connected]);

  const currentTelemetry = telemetry ?? emptyTelemetry;
  const status = statusFor(currentTelemetry);
  const nutrients = useMemo(() => [
    { name: "Nitrogen", value: currentTelemetry.nitrogen }, { name: "Phosphorus", value: currentTelemetry.phosphorus }, { name: "Potassium", value: currentTelemetry.potassium },
  ], [currentTelemetry]);
  const soilProfile = useMemo(() => [
    { metric: "Moisture", value: Math.min(100, currentTelemetry.moisture) },
    { metric: "pH balance", value: Math.min(100, Math.max(0, (1 - Math.abs(currentTelemetry.ph - 6.5) / 6.5) * 100)) },
    { metric: "Nitrogen", value: Math.min(100, currentTelemetry.nitrogen) },
    { metric: "Phosphorus", value: Math.min(100, currentTelemetry.phosphorus) },
    { metric: "Potassium", value: Math.min(100, currentTelemetry.potassium) },
  ], [currentTelemetry]);

  return (
    <div className="w-full bg-gradient-to-br from-green-50 via-emerald-50/50 to-blue-50/30 min-h-full">
      <div className="px-6 py-12 max-w-[1200px] mx-auto space-y-8">
        
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/[0.04] border border-black/[0.06] mb-1.5 backdrop-blur-md">
              <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
              <span className="text-[11px] font-semibold tracking-wide uppercase text-[#555]">
                IoT Telemetry
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-[#1a1a18]">
              Soil Hardware Nodes
            </h2>
            <p className="text-xs sm:text-sm mt-0.5 text-[#7a7a72]">
              Live, hyper-local soil readings streamed directly from the field.
            </p>
          </div>
          
          {/* Connection Status & Refresh */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className={`px-4 py-2 rounded-full backdrop-blur-md border text-xs font-semibold flex items-center gap-2 bg-white/70 border-black/10 text-black`}>
              <Wifi className={`w-3.5 h-3.5 ${connected ? "text-emerald-500" : "text-black/40"}`} />
              {connected ? (IOT_ENDPOINT ? `Connected · ${IOT_POLL_SECONDS}s` : `Mock Mode · ${IOT_POLL_SECONDS}s`) : loading ? "Connecting..." : "Not configured"}
            </div>
            
            <button 
              onClick={fetchTelemetry} 
              disabled={loading} 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition backdrop-blur-md bg-[#1a1a18] text-white hover:bg-black/80 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm font-medium flex items-center gap-2">
            <Info className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* ── Active Node Status ── */}
        {!telemetry ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/40 rounded-[32px] border border-black/5 backdrop-blur-xl">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-black/30" />
            <p className="text-black/60 font-medium">Establishing hardware handshake...</p>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            
            <div className="flex flex-wrap items-center justify-between gap-3 px-2">
              <div>
                <h2 className="font-bold text-2xl text-[#1a1a18] flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  {telemetry.name}
                </h2>
                <p className="mt-1 text-xs font-medium text-[#7a7a72]">
                  Sync Timestamp: {new Date(telemetry.timestamp).toLocaleString()}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase border ${status.color}`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {status.label}
              </span>
            </div>

            {/* ── Metric Cards ── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard icon={Droplets} label="Soil Moisture" value={telemetry.moisture} unit="%" colorClass={telemetry.moisture < 30 ? "text-rose-600" : "text-[#1a1a18]"} />
              <MetricCard icon={Thermometer} label="Temperature" value={telemetry.temperature} unit="°C" />
              <MetricCard icon={Gauge} label="Soil pH" value={telemetry.ph || "—"} unit="" colorClass={(telemetry.ph < 5.5 || telemetry.ph > 7.5) ? "text-amber-600" : "text-[#1a1a18]"} />
              <MetricCard icon={Gauge} label="Humidity" value={telemetry.humidity} unit="% RH" />
              <MetricCard icon={Battery} label="Battery" value={telemetry.battery} unit="%" />
            </div>

            {/* ── Charts ── */}
            <div className="grid gap-6 xl:grid-cols-2">
              
              {/* Trend Chart */}
              <div className="p-6 rounded-[32px] backdrop-blur-xl bg-white/70 border border-black/5 flex flex-col">
                <h3 className="font-bold text-[#1a1a18] mb-6">Live Telemetry Trend</h3>
                <div className="h-[290px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.4)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.4)" }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip contentStyle={{ background: "white", border: "none", borderRadius: 16, fontSize: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                      <Line type="monotone" dataKey="moisture" name="Moisture %" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="temperature" name="Temp °C" stroke="#f43f5e" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="humidity" name="Humidity %" stroke="#3b82f6" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* NPK Pie */}
              <div className="p-6 rounded-[32px] backdrop-blur-xl bg-white/70 border border-black/5 flex flex-col">
                <h3 className="font-bold text-[#1a1a18] mb-2">Macronutrient Balance (NPK)</h3>
                <p className="text-xs text-[#7a7a72] mb-4">Values shown in the unit reported by your hardware sensor.</p>
                <div className="h-[270px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={nutrients} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} stroke="none">
                        {nutrients.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "white", border: "none", borderRadius: 16, fontSize: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }} formatter={(val: number) => val.toFixed(1)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* NPK Bar */}
              <div className="p-6 rounded-[32px] backdrop-blur-xl bg-white/70 border border-black/5 flex flex-col">
                <h3 className="font-bold text-[#1a1a18] mb-6">NPK Absolute Comparison</h3>
                <div className="h-[270px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nutrients}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "rgba(0,0,0,0.4)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "rgba(0,0,0,0.4)" }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip contentStyle={{ background: "white", border: "none", borderRadius: 16, fontSize: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }} formatter={(val: number) => val.toFixed(1)} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {nutrients.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="p-6 rounded-[32px] backdrop-blur-xl bg-white/70 border border-black/5 flex flex-col">
                <h3 className="font-bold text-[#1a1a18] mb-6">Comprehensive Soil Health Profile</h3>
                <div className="h-[270px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={soilProfile}>
                      <Tooltip contentStyle={{ background: "white", border: "none", borderRadius: 16, fontSize: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.08)" }} formatter={(val: number) => val.toFixed(1)} />
                      <Radar name="Soil health" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-5 text-center text-[10px] font-bold uppercase tracking-wider text-black/40">
                  {soilProfile.map((item) => <span key={item.metric}>{item.metric}</span>)}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

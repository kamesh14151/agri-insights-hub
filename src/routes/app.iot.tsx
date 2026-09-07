import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Battery, CheckCircle2, Droplets, Gauge, Loader2, RefreshCw, Thermometer, Wifi } from "lucide-react";
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
const COLORS = ["#5b8c51", "#d6a94c", "#3b82b6"];

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
  if (reading.moisture < 30) return { label: "Irrigation needed", color: "text-destructive bg-destructive/10" };
  if (reading.ph && (reading.ph < 5.5 || reading.ph > 7.5)) return { label: "pH attention", color: "text-amber-700 bg-amber-500/10" };
  return { label: "Soil in range", color: "text-primary bg-primary/10" };
}

function MetricCard({ icon: Icon, label, value, unit }: { icon: typeof Gauge; label: string; value: string | number; unit: string }) {
  return (
    <div className="stat-card rounded-[1.5rem] border border-border/60 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</p>
        <span className="icon-wrap grid h-7 w-7 place-items-center rounded-[8px]">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.055em]">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-muted-foreground">{unit}</span>}
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

  const fetchTelemetry = async () => {
    if (!IOT_ENDPOINT) { setError("Telemetry endpoint is not configured."); return; }
    try {
      const parsed = new URL(IOT_ENDPOINT);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Use an http:// or https:// URL.");
      setLoading(true);
      setError("");
      const response = await fetch(parsed.toString(), { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Device returned HTTP ${response.status}.`);
      const reading = normaliseTelemetry(await response.json());
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
    if (!IOT_ENDPOINT) return;
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
    <>
      <PageIntro index="03 / Sense" eyebrow="Connected field telemetry" title="Soil health, from the hardware." subtitle="Live readings are supplied by the hardware endpoint configured for this deployment." />

      <Panel title="Telemetry service">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-2 text-sm"><Wifi className={`h-4 w-4 ${connected ? "text-primary" : "text-muted-foreground"}`} /><span>{connected ? `Connected · refreshes every ${IOT_POLL_SECONDS}s` : loading ? "Connecting to configured device…" : IOT_ENDPOINT ? "Device connection unavailable" : "Device endpoint not configured"}</span></div>{IOT_ENDPOINT && <button onClick={fetchTelemetry} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh readings</button>}</div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span>Set <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">VITE_IOT_TELEMETRY_URL</code> and <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">VITE_IOT_POLL_INTERVAL_SECONDS</code> in the deployment environment.</span><span>Endpoint must allow browser CORS.</span>{error && <span className="text-destructive">{error}</span>}</div>
        <details className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">Expected device JSON format</summary><pre className="mt-2 overflow-x-auto text-[11px]">{`{"name":"Field Node 1","moisture":62,"temperature":29.4,"humidity":68,"ph":6.4,"nitrogen":68,"phosphorus":42,"potassium":55,"battery":88}`}</pre></details>
      </Panel>

      {!telemetry ? <Panel title="Waiting for live readings" className="mt-6"><p className="text-sm text-muted-foreground">{IOT_ENDPOINT ? "The configured telemetry endpoint has not returned a reading yet." : "Add the telemetry URL to your environment configuration, then redeploy the application."}</p></Panel> : <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">{telemetry.name}</h2><p className="mt-1 text-xs text-muted-foreground">Last reading: {new Date(telemetry.timestamp).toLocaleString()}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${status.color}`}><CheckCircle2 className="h-3.5 w-3.5" />{status.label}</span></div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><MetricCard icon={Droplets} label="Soil moisture" value={telemetry.moisture} unit="%" /><MetricCard icon={Thermometer} label="Temperature" value={telemetry.temperature} unit="°C" /><MetricCard icon={Gauge} label="Soil pH" value={telemetry.ph || "—"} unit="" /><MetricCard icon={Gauge} label="Humidity" value={telemetry.humidity} unit="% RH" /><MetricCard icon={Battery} label="Battery" value={telemetry.battery} unit="%" /></div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Live soil trend"><div className="h-[290px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={history}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" /><YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="moisture" name="Moisture %" stroke="var(--primary)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="temperature" name="Temperature °C" stroke="#ef4444" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="humidity" name="Humidity %" stroke="#3b82f6" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Panel>
        <Panel title="NPK nutrient balance"><div className="h-[290px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={nutrients} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={98} paddingAngle={3}>{nutrients.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Legend /></PieChart></ResponsiveContainer></div><p className="text-center text-xs text-muted-foreground">NPK values shown in the unit reported by your sensor.</p></Panel>
        <Panel title="NPK comparison"><div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={nutrients}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" /><YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{nutrients.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
        <Panel title="Soil health profile"><div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={soilProfile}><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Radar name="Soil health" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} /></RadarChart></ResponsiveContainer></div><div className="mt-1 grid grid-cols-5 text-center text-[10px] text-muted-foreground">{soilProfile.map((item) => <span key={item.metric}>{item.metric}</span>)}</div></Panel>
      </div>
      </>}
    </>
  );
}

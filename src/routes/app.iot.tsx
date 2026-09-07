import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Battery, CheckCircle2, Droplets, Gauge, Link2, Loader2, RefreshCw, Thermometer, Unplug, Wifi } from "lucide-react";
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

const DEFAULT_ENDPOINT = "";
const STORAGE_KEY = "agrisynapse-iot-device";
const COLORS = ["#5b8c51", "#d6a94c", "#3b82b6"];

const demoTelemetry: Telemetry = {
  name: "Demo Soil Node", moisture: 62, temperature: 29.4, humidity: 68, ph: 6.4,
  nitrogen: 68, phosphorus: 42, potassium: 55, battery: 88, timestamp: new Date().toISOString(),
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
    <div className="glass-panel rounded-3xl border border-border p-4">
      <div className="flex items-center justify-between gap-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-primary" /></div>
      <p className="mt-3 font-serif text-3xl">{value}<span className="ml-1 text-base text-muted-foreground">{unit}</span></p>
    </div>
  );
}

function IotPage() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [pollSeconds, setPollSeconds] = useState(30);
  const [telemetry, setTelemetry] = useState<Telemetry>(demoTelemetry);
  const [history, setHistory] = useState<Reading[]>([{ ...demoTelemetry, time: "Now" }]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) setEndpoint(saved);
  }, []);

  const fetchTelemetry = async () => {
    const url = endpoint.trim();
    if (!url) { setError("Enter your hardware IP address or telemetry URL first."); return; }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Use an http:// or https:// URL.");
      setLoading(true);
      setError("");
      const response = await fetch(parsed.toString(), { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Device returned HTTP ${response.status}.`);
      const reading = normaliseTelemetry(await response.json());
      setTelemetry(reading);
      setHistory((current) => [...current.slice(-23), { ...reading, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      window.localStorage.setItem(STORAGE_KEY, parsed.toString());
      setConnected(true);
    } catch (caught) {
      setConnected(false);
      setError(caught instanceof Error ? caught.message : "Could not read telemetry from this device.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(fetchTelemetry, Math.max(5, pollSeconds) * 1000);
    return () => window.clearInterval(timer);
  }, [connected, pollSeconds, endpoint]);

  const status = statusFor(telemetry);
  const nutrients = useMemo(() => [
    { name: "Nitrogen", value: telemetry.nitrogen }, { name: "Phosphorus", value: telemetry.phosphorus }, { name: "Potassium", value: telemetry.potassium },
  ], [telemetry]);
  const soilProfile = useMemo(() => [
    { metric: "Moisture", value: Math.min(100, telemetry.moisture) },
    { metric: "pH balance", value: Math.min(100, Math.max(0, (1 - Math.abs(telemetry.ph - 6.5) / 6.5) * 100)) },
    { metric: "Nitrogen", value: Math.min(100, telemetry.nitrogen) },
    { metric: "Phosphorus", value: Math.min(100, telemetry.phosphorus) },
    { metric: "Potassium", value: Math.min(100, telemetry.potassium) },
  ], [telemetry]);

  return (
    <>
      <PageIntro index="03 / Sense" eyebrow="Connected field telemetry" title="Soil health, from the hardware." subtitle="Connect your ESP32, Arduino gateway, Raspberry Pi or cloud sensor endpoint to read live soil values. Demo readings are shown until a device is connected." />

      <Panel title="Connect a soil sensor device">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px_auto] lg:items-end">
          <label className="block"><span className="mb-1.5 block text-xs font-medium">Hardware IP address or telemetry URL</span><input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="http://192.168.1.50/api/telemetry" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-medium">Refresh (sec)</span><input type="number" min="5" value={pollSeconds} onChange={(event) => setPollSeconds(Number(event.target.value) || 30)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" /></label>
          <div className="flex gap-2"><button onClick={fetchTelemetry} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}{connected ? "Refresh data" : "Connect device"}</button>{connected && <button onClick={() => setConnected(false)} className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted" aria-label="Disconnect device"><Unplug className="h-4 w-4" /></button>}</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Wifi className={`h-3.5 w-3.5 ${connected ? "text-primary" : ""}`} />{connected ? `Connected · refreshes every ${pollSeconds}s` : "Demo mode · no device connected"}</span><span>Endpoint must allow browser CORS.</span>{error && <span className="text-destructive">{error}</span>}</div>
        <details className="mt-4 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">Expected device JSON format</summary><pre className="mt-2 overflow-x-auto text-[11px]">{`{"name":"Field Node 1","moisture":62,"temperature":29.4,"humidity":68,"ph":6.4,"nitrogen":68,"phosphorus":42,"potassium":55,"battery":88}`}</pre></details>
      </Panel>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">{telemetry.name}</h2><p className="mt-1 text-xs text-muted-foreground">Last reading: {new Date(telemetry.timestamp).toLocaleString()}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${status.color}`}><CheckCircle2 className="h-3.5 w-3.5" />{status.label}</span></div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><MetricCard icon={Droplets} label="Soil moisture" value={telemetry.moisture} unit="%" /><MetricCard icon={Thermometer} label="Temperature" value={telemetry.temperature} unit="°C" /><MetricCard icon={Gauge} label="Soil pH" value={telemetry.ph || "—"} unit="" /><MetricCard icon={Gauge} label="Humidity" value={telemetry.humidity} unit="% RH" /><MetricCard icon={Battery} label="Battery" value={telemetry.battery} unit="%" /></div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Live soil trend"><div className="h-[290px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={history}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" /><YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="moisture" name="Moisture %" stroke="var(--primary)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="temperature" name="Temperature °C" stroke="#ef4444" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="humidity" name="Humidity %" stroke="#3b82f6" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></Panel>
        <Panel title="NPK nutrient balance"><div className="h-[290px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={nutrients} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={62} outerRadius={98} paddingAngle={3}>{nutrients.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Pie><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Legend /></PieChart></ResponsiveContainer></div><p className="text-center text-xs text-muted-foreground">NPK values shown in the unit reported by your sensor.</p></Panel>
        <Panel title="NPK comparison"><div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={nutrients}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" /><YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={32} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Bar dataKey="value" radius={[6, 6, 0, 0]}>{nutrients.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}</Bar></BarChart></ResponsiveContainer></div></Panel>
        <Panel title="Soil health profile"><div className="h-[270px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={soilProfile}><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} /><Radar name="Soil health" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} /></RadarChart></ResponsiveContainer></div><div className="mt-1 grid grid-cols-5 text-center text-[10px] text-muted-foreground">{soilProfile.map((item) => <span key={item.metric}>{item.metric}</span>)}</div></Panel>
      </div>
      <button onClick={fetchTelemetry} disabled={!connected || loading} className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh connected device now</button>
    </>
  );
}

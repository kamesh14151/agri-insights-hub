import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from "recharts";
import {
  ArrowUpRight, Check, CircleAlert, Droplets, Leaf,
  ScanLine, Sparkles, ThermometerSun, Activity, Zap,
  MapPin, TrendingUp, ExternalLink, Users, ShieldAlert,
} from "lucide-react";
import { Panel } from "@/components/DashboardShell";
import { IOT_TIMESERIES } from "@/lib/mock";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — Agrisynapse" }] }),
  component: DashboardHome,
});

/* ── Mock data ────────────────────────────────────────────────────────────── */
const condition = [
  { name: "Optimal", value: 72, color: "#b8d940" },
  { name: "Observe", value: 18, color: "#e8b84b" },
  { name: "Action",  value: 10, color: "#e05245" },
];

const actions = [
  { to: "/app/iot"     as const, label: "Review telemetry",   detail: "3 field nodes reporting",       icon: Droplets },
  { to: "/app/disease" as const, label: "Analyse a plant",    detail: "Scan for crop stress",           icon: ScanLine },
  { to: "/app/crops"   as const, label: "Plan the next crop", detail: "Soil-matched recommendations",   icon: Leaf },
];

const growthData = [
  { x: "30.25", y: 460 }, { x: "35.30", y: 455 }, { x: "39.35", y: 450 },
  { x: "42.40", y: 465 }, { x: "45.45", y: 458 }, { x: "48.50", y: 480 },
  { x: "50.55", y: 475 }, { x: "52.40", y: 510, dot: true }, { x: "56.50", y: 490 },
];

/* ── Climate gauge SVG ────────────────────────────────────────────────────── */
function ClimateGauge({ value = 28 }: { value?: number }) {
  // Semicircle gauge — exactly like the reference "28°C" with lime arc
  const r = 70;
  const cx = 90;
  const cy = 88;
  const startAngle = 200;
  const endAngle = 340;
  const pct = (value - 10) / 50; // 10–60°C range
  const sweepAngle = (endAngle - startAngle) * Math.min(1, Math.max(0, pct));

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arc(start: number, end: number) {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  return (
    <svg viewBox="0 0 180 110" className="w-full max-w-[200px]">
      {/* Track */}
      <path d={arc(startAngle, endAngle)} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="10" strokeLinecap="round" />
      {/* Fill — lime green */}
      <path d={arc(startAngle, startAngle + sweepAngle)} fill="none" stroke="#b8d940" strokeWidth="10" strokeLinecap="round" />
      {/* Value */}
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#1a1a18" fontSize="26" fontWeight="700" fontFamily="Inter, sans-serif">
        {value}
      </text>
      <text x={cx + 18} y={cy - 10} textAnchor="start" fill="#1a1a18" fontSize="11" fontFamily="Inter, sans-serif">°C</text>
    </svg>
  );
}

/* ── Soil intelligence mini chart ─────────────────────────────────────────── */
const soilData = [
  { m: "Jan", a: 1.2, b: 0.8 }, { m: "Feb", a: 1.4, b: 1.0 },
  { m: "Mar", a: 1.9, b: 1.4 }, { m: "Apr", a: 2.0, b: 1.5 },
  { m: "May", a: 2.1, b: 1.6 }, { m: "Jun", a: 2.3, b: 1.7 },
  { m: "Jul", a: 2.1, b: 1.5 }, { m: "Aug", a: 1.8, b: 1.3 },
  { m: "Sep", a: 1.7, b: 1.2 }, { m: "Oct", a: 1.5, b: 1.0 },
  { m: "Nov", a: 1.4, b: 0.9 }, { m: "Dec", a: 1.2, b: 0.8 },
];

/* ── Dashboard ────────────────────────────────────────────────────────────── */
function DashboardHome() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === "manager" || user?.role === "admin") {
      navigate({ to: "/app/admin", replace: true });
    }
  }, [user?.role, navigate]);

  if (user?.role === "manager" || user?.role === "admin") {
    return null;
  }

  const name = user?.name?.split(" ")[0] ?? "there";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t("good_morning", "Good morning") : hour < 17 ? t("good_afternoon", "Good afternoon") : t("good_evening", "Good evening");

  return (
    <div className="space-y-4 animate-float-up pb-10">

      {/* ── Page header — matches "Data Driven Growth / Data Meets Growth" ── */}
      <div className="flex items-end justify-between gap-4 mb-1">
        <div>
          <p className="text-[11px] font-medium text-[#7a7a72] mb-1">
            {user?.role === "manager" || user?.role === "admin" ? `${user.role.toUpperCase()} OVERSIGHT` : t("data_driven_growth", "Data Driven Growth")}
          </p>
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.04em] text-[#1a1a18]">
            {greeting}, {name}.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px]">
            <span>↑</span> {t("share", "Share")}
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] bg-white/70 border border-black/[0.08] text-[#7a7a72] hover:bg-white transition">
            ✦ {t("research", "Research")}
          </button>
          <button className="grid h-8 w-8 place-items-center rounded-full bg-white/70 border border-black/[0.08] text-[#7a7a72] hover:bg-white transition">
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Executive Management Command Strip for Manager & Admin ── */}
      {(user?.role === "manager" || user?.role === "admin") && (
        <div className="rounded-[22px] border border-black/[0.08] bg-gradient-to-r from-[#1a1a18] via-[#242b1a] to-[#1e2b14] p-5 text-white shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#c8e44a] text-[#1a1a18] text-[10px] font-bold uppercase tracking-wider">
                  {user.role} workspace
                </span>
                <h2 className="text-[17px] font-bold tracking-tight text-white">
                  Territory & Platform Operations Hub
                </h2>
              </div>
              <p className="text-[12px] text-white/70 max-w-xl">
                Manage registered farmer accounts, supervise regional disease radar alerts, monitor IoT node health, and audit marketplace escrow transactions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                to="/app/admin"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#c8e44a] px-4 py-2 text-[12px] font-bold text-[#1a1a18] hover:bg-[#b8d940] transition shadow-md hover:scale-105 active:scale-95"
              >
                <Users className="h-3.5 w-3.5" />
                <span>User Directory & Admin</span>
              </Link>
              <Link
                to="/app/manager"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-4 py-2 text-[12px] font-semibold text-white hover:bg-white/25 transition backdrop-blur-sm hover:scale-105 active:scale-95"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-[#c8e44a]" />
                <span>Manager Hub & Disease Radar</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Bento grid — mirrors reference layout exactly ──────────────── */}
      {/* Row 1: 3 columns */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">

        {/* 1A — Chat / AI assistant card */}
        <div className="card p-5 lg:col-span-3 flex flex-col gap-3 min-h-[300px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#1a1a18]">
                <Sparkles className="h-3 w-3 text-white" />
              </span>
              <span className="text-[13px] font-semibold text-[#1a1a18]">{t("ai_assistant", "AI Assistant")}</span>
            </div>
            <span className="text-[#7a7a72]">⋯</span>
          </div>

          {/* Chat bubbles */}
          <div className="flex-1 space-y-2 overflow-hidden">
            {[
              { q: "You are very clear. What about energy consumption for all the AI?", role: "user" },
              { q: "How does this compare to organic farming methods?", role: "user" },
              { q: "What are the main challenges in deploying such systems?", role: "user" },
              { q: "Can AI help with carbon sequestration?", role: "user" },
              { q: "How can I improve my field's yield this season?", role: "user" },
            ].map((msg, i) => (
              <div key={i} className="rounded-[10px] bg-[rgba(0,0,0,0.04)] px-3 py-2">
                <p className="text-[11px] text-[#7a7a72] leading-[1.5]">{msg.q}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-black/[0.06]">
            <Link to="/app/disease" className="text-[11px] text-[#7a7a72] hover:text-[#1a1a18] transition flex items-center gap-1">
              + {t("source", "Source")}
            </Link>
            <Link to="/app/disease" className="text-[11px] font-medium text-[#1a1a18] hover:opacity-75 flex items-center gap-1">
              {t("analyze", "Analyze")} <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 1B — Soil Intelligence chart */}
        <div className="card p-5 lg:col-span-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-[13px] font-semibold text-[#1a1a18]">{t("soil_intelligence", "Soil Intelligence")}</h2>
              <p className="text-[11px] text-[#7a7a72] mt-0.5">{t("predicted_soc", "Predicted SOC increase: $4–$124 per year")}</p>
              <p className="text-[11px] text-[#7a7a72]">{t("soc_potential", "potential: 5–90 tons CO2-eq/hectare/year")}</p>
            </div>
            <button className="text-[#7a7a72] hover:text-[#1a1a18] transition">
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          {/* Mini stats */}
          <div className="flex gap-4 mb-3 mt-2">
            {[["SOC", "12%"], ["GPS", "34.5E%"], ["HF Value", "0.8%"]].map(([k, v]) => (
              <div key={k} className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#b8d940]" />
                <span className="text-[10px] text-[#7a7a72]">{k}</span>
                <span className="text-[10px] font-semibold text-[#1a1a18]">{v}</span>
              </div>
            ))}
          </div>

          {/* Smooth area chart — lime + blue like reference */}
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={soilData} margin={{ top: 8, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="soilA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#b8d940" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#b8d940" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="soilB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#7ab8d4" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#7ab8d4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#7a7a72" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#7a7a72" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                  formatter={(v: number, name: string) => [`${v}°C`, name === "a" ? "+2.3°C" : "+1.5°C"]}
                />
                <Area type="monotone" dataKey="a" stroke="#b8d940" fill="url(#soilA)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="b" stroke="#7ab8d4" fill="url(#soilB)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 1C — ClimateIQ / Temperature gauge */}
        <div className="card p-5 lg:col-span-4 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-[13px] font-semibold text-[#1a1a18]">ClimateIQ</h2>
              <div className="mt-1.5 space-y-0.5">
                {[["Air Quality", "Good AQI 23"], ["UV Index", "Low 01"], ["UV Index", "High (1)"]].map(([k, v]) => (
                  <div key={k + v} className="flex items-center gap-1.5 text-[10px] text-[#7a7a72]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#b8d940]" />
                    {k}: <span className="font-medium text-[#1a1a18]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="text-[#7a7a72] hover:text-[#1a1a18]">
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          {/* Gauge */}
          <div className="flex flex-1 items-center justify-center">
            <ClimateGauge value={28} />
          </div>

          {/* Bottom stats */}
          <div className="grid grid-cols-3 gap-2 mt-2 border-t border-black/[0.06] pt-3">
            {[["☀️ Sun", "29% Boost"], ["💨 Wind", "Up to 40%"], ["🌧 Rain", "30% Reduced"]].map(([icon, val]) => (
              <div key={val} className="text-center">
                <p className="text-[10px] text-[#7a7a72]">{icon}</p>
                <p className="text-[10px] font-semibold text-[#1a1a18] mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Map card + Growth chart */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">

        {/* 2A — Satellite / field map card */}
        <div className="relative overflow-hidden rounded-[20px] lg:col-span-5 min-h-[260px] shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
          <img
            src="/schwoaze-nature-3526840_1920.jpg"
            alt="Golden Harvest field"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Map tool icons */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {["↑", "⊕", "⊙", "≡", "◎"].map((icon, i) => (
              <button key={i} className="grid h-7 w-7 place-items-center rounded-lg bg-white/20 text-white text-[11px] backdrop-blur hover:bg-white/30 transition">
                {icon}
              </button>
            ))}
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="h-5 w-5 grid place-items-center rounded-md bg-white/20 backdrop-blur">
                <Leaf className="h-3 w-3 text-white" />
              </span>
              <span className="text-white text-[13px] font-semibold">Golden Harvest</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                ["Soil Type", "Clay Mix"],
                ["Nitrogen Content", "60-75 mg/kg (High)"],
                ["Phosphorus", "45-60 21-25 mg/kg"],
                ["Potassium", "85-100 50-120 mg/kg"],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[9px] text-white/60 font-medium">{k}</p>
                  <p className="text-[10px] text-white font-semibold mt-0.5 leading-tight">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2B — Data Meets Growth chart */}
        <div className="card p-5 lg:col-span-7 flex flex-col">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-[14px] font-semibold text-[#1a1a18]">Data Meets Growth</h2>
            </div>
            <button className="text-[#7a7a72] hover:text-[#1a1a18]">
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-4 flex-1 min-h-0">
            {/* Chart */}
            <div className="flex-1 min-w-0">
              {/* Legend */}
              <div className="flex gap-3 mb-2">
                {[["Awareness", "#b8d940"], ["State Projection", "#e8b84b"], ["State Projection", "#e05245"]].map(([label, color], i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                    <span className="text-[9px] text-[#7a7a72]">{label}</span>
                  </div>
                ))}
              </div>
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="growthA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#b8d940" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#b8d940" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="growthB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#e8b84b" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#e8b84b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="x" tick={{ fontSize: 9, fill: "#7a7a72" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "#7a7a72" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10, fontSize: 11 }}
                    />
                    <Area type="monotone" dataKey="y" stroke="#b8d940" fill="url(#growthA)" strokeWidth={2} dot={(props: any) => {
                      if (props.payload.dot) return <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill="#b8d940" stroke="white" strokeWidth={2} />;
                      return <g key={props.key} />;
                    }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right stats column */}
            <div className="w-[140px] shrink-0 space-y-3">
              {[
                { val: "+2.3% / week", label: "Growth Rate",      icon: "🌱", color: "#3d5a00" },
                { val: "72 hrs / day", label: "Sunlight Exposure", icon: "☀️", color: "#7a4d00" },
                { val: "68% optimal", label: "Moisture Level",    icon: "💧", color: "#1a4a7a" },
                { val: "3.6 tons / ha", label: "Expected Yield",  icon: "🌾", color: "#7a4d00" },
                { val: "76% filling",  label: "Growth Stage",     icon: "🌾", color: "#1a1a18" },
                { val: "2.5 tons / ha", label: "AI Forecasted",   icon: "🤖", color: "#7a7a72" },
              ].map(({ val, label, icon, color }) => (
                <div key={label} className="flex items-start gap-1.5">
                  <span className="text-[12px] mt-0.5">{icon}</span>
                  <div>
                    <p className="text-[11px] font-semibold" style={{ color }}>{val}</p>
                    <p className="text-[9px] text-[#7a7a72]">{label}</p>
                  </div>
                </div>
              ))}

              <Link to="/app/iot" className="btn-lime inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold mt-1">
                <Activity className="h-3 w-3" />
                AI Detail
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Stats strip + actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { value: "62%",    label: "Soil Moisture",  note: "Optimal range",         color: "#b8d940" },
          { value: "31.4°C", label: "Temperature",    note: "+1.8° since yesterday",  color: "#e8b84b" },
          { value: "pH 6.4", label: "Soil pH",        note: "Balanced",               color: "#7ab8d4" },
          { value: "88%",    label: "Node Battery",   note: "North Block",            color: "#b8d940" },
        ].map(({ value, label, note, color }) => (
          <div key={label} className="stat-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7a7a72]">{label}</p>
            </div>
            <p className="text-2xl font-bold tracking-[-0.04em] text-[#1a1a18]">{value}</p>
            <p className="mt-1 text-[10px] text-[#7a7a72]">{note}</p>
          </div>
        ))}
      </div>

      {/* Row 4: Priority signals + actions */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
        <Panel title={t("recent_alerts", "Priority Signals")}>
          <div className="space-y-0">
            {[
              ["North Block moisture",  "Irrigate within 90 minutes",         "warn"],
              ["Nutrient balance",      "Nitrogen and potassium are stable",   "ok"],
              ["Crop scan #402",        "Paddy blast treatment is ready",      "ok"],
            ].map(([title, detail, status], i) => (
              <div key={title as string} className={`flex gap-3 py-3.5 ${i ? "border-t border-black/[0.05]" : ""}`}>
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  status === "warn"
                    ? "bg-[rgba(232,184,75,0.18)] text-[#7a4d00]"
                    : "bg-[rgba(184,217,64,0.18)] text-[#3d5a00]"
                }`}>
                  {status === "warn" ? <CircleAlert className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-[#1a1a18]">{title}</p>
                  <p className="text-[11px] text-[#7a7a72] mt-0.5">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={t("quick_actions", "Continue Working")}>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {[
              { to: "/app/iot"     as const, label: t("review_telemetry", "Review telemetry"),   detail: t("nodes_reporting_detail", "3 field nodes reporting"),       icon: Droplets },
              { to: "/app/disease" as const, label: t("analyse_plant", "Analyse a plant"),    detail: t("crop_stress_detail", "Scan for crop stress"),           icon: ScanLine },
              { to: "/app/crops"   as const, label: t("plan_next_crop", "Plan the next crop"), detail: t("soil_matched_detail", "Soil-matched recommendations"),   icon: Leaf },
            ].map((action) => (
              <Link key={action.to} to={action.to}
                className="group rounded-[14px] border border-black/[0.07] bg-[rgba(245,246,240,0.7)] p-4 hover:bg-white hover:border-[#c8e44a]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200">
                <span className="icon-wrap grid h-7 w-7 place-items-center rounded-[8px]">
                  <action.icon className="h-3.5 w-3.5 text-[#3d5a00]" />
                </span>
                <p className="mt-8 text-[12.5px] font-semibold text-[#1a1a18]">{action.label}</p>
                <p className="mt-0.5 text-[11px] text-[#7a7a72] leading-snug">{action.detail}</p>
                <ArrowUpRight className="mt-3 h-3.5 w-3.5 text-[#7a7a72] group-hover:text-[#3d5a00] transition" />
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#7a7a72] border-t border-black/[0.05] pt-3.5">
            <Sparkles className="h-3.5 w-3.5 text-[#b8d940]" />
            Recommendations update with your connected field data.
          </div>
        </Panel>
      </div>
    </div>
  );
}

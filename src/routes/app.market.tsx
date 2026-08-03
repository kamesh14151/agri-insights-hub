import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { DEMAND_FORECAST, MARKET_TREND } from "@/lib/mock";

export const Route = createFileRoute("/app/market")({
  head: () => ({
    meta: [
      { title: "Market Demand — Agrisynapse" },
      { name: "description", content: "Price trends and demand-versus-supply forecasts to decide what to plant and when to sell." },
      { property: "og:title", content: "Market Demand — Agrisynapse" },
      { property: "og:description", content: "Crop price trends and demand forecasting for planting and selling decisions." },
    ],
  }),
  component: MarketPage,
});

const CROPS = ["paddy", "tomato", "turmeric", "cotton"] as const;

function MarketPage() {
  const [crop, setCrop] = useState<(typeof CROPS)[number]>("paddy");

  return (
    <>
      <PageIntro
        index="06 / Market"
        eyebrow="Price and demand intelligence"
        title="Plant what the market is short of."
        subtitle="Eight months of mandi price movement plus a demand-versus-supply read on the crops in your district, so planting and selling become timing decisions."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Price trend (₹ per quintal)"
          className="lg:col-span-2"
          action={
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value as (typeof CROPS)[number])}
              className="rounded-md border border-border bg-transparent px-2 py-1.5 text-xs capitalize focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CROPS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          }
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MARKET_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={52} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey={crop} stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="What to plant next">
          <ul className="space-y-4">
            {DEMAND_FORECAST.map((d) => (
              <li key={d.crop}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
                  <span className="truncate font-medium">{d.crop}</span>
                  <span className="text-xs text-muted-foreground">{d.demand - d.supply > 0 ? `+${d.demand - d.supply}` : d.demand - d.supply} gap</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${d.demand}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{d.advice}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title="Demand vs supply index by crop">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEMAND_FORECAST}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="crop" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={34} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="demand" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="supply" fill="var(--muted-foreground)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}
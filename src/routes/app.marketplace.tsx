import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Search, Sprout } from "lucide-react";
import { toast } from "sonner";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { LISTINGS } from "@/lib/mock";

export const Route = createFileRoute("/app/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Agrisynapse" },
      { name: "description", content: "Farmer-to-buyer produce marketplace with grades, quantities and transparent per-quintal pricing." },
      { property: "og:title", content: "Marketplace — Agrisynapse" },
      { property: "og:description", content: "Buy and sell produce directly with verified farmers and buyers." },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  const [q, setQ] = useState("");
  const results = useMemo(
    () => LISTINGS.filter((l) => `${l.crop} ${l.location} ${l.farmer}`.toLowerCase().includes(q.toLowerCase())),
    [q],
  );

  return (
    <>
      <PageIntro
        index="07 / Trade"
        eyebrow="Farmer to buyer"
        title="Sell the harvest without the middle."
        subtitle="Live produce lots from verified farms with grade, quantity and asking price — enquire directly and settle the logistics in the app."
      />

      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search crop, farmer or district"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => toast.success("Listing draft created")}
          className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
        >
          List produce
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((l) => (
          <Panel key={l.id} className="transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <h3 className="font-serif text-xl truncate">{l.crop}</h3>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary">Grade {l.grade}</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {l.location} · {l.farmer}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Quantity</p>
                <p>{l.quantity}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Harvested</p>
                <p>{l.harvested}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-4">
              <p className="font-serif text-2xl">₹{l.price.toLocaleString("en-IN")}<span className="ml-1 text-xs text-muted-foreground">/ {l.unit}</span></p>
              <button
                onClick={() => toast.success(`Enquiry sent to ${l.farmer}`)}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary transition"
              >
                Enquire
              </button>
            </div>
          </Panel>
        ))}
        {results.length === 0 && (
          <p className="col-span-full flex items-center gap-2 text-sm text-muted-foreground">
            <Sprout className="h-4 w-4" /> No lots match that search yet.
          </p>
        )}
      </div>
    </>
  );
}
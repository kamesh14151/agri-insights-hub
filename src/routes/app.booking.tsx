import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { SERVICES, type Service } from "@/lib/mock";

export const Route = createFileRoute("/app/booking")({
  head: () => ({
    meta: [
      { title: "Service Booking — Agrisynapse" },
      { name: "description", content: "Book tractors, drones, harvest labour, soil testing and cold transport from vetted providers." },
      { property: "og:title", content: "Service Booking — Agrisynapse" },
      { property: "og:description", content: "On-demand equipment, labour, advisory and transport bookings for your farm." },
    ],
  }),
  component: BookingPage,
});

const TYPES = ["All", "Equipment", "Labour", "Advisory", "Transport"] as const;

function BookingPage() {
  const [filter, setFilter] = useState<(typeof TYPES)[number]>("All");
  const [selected, setSelected] = useState<Service | null>(null);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("4");
  const [bookings, setBookings] = useState<{ id: string; name: string; date: string; total: number }[]>([]);

  const list = SERVICES.filter((s) => filter === "All" || s.type === filter);

  const confirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const total = selected.rate * Number(hours || 1);
    setBookings((b) => [{ id: `${Date.now()}`, name: selected.name, date: date || "Next available", total }, ...b]);
    toast.success(`${selected.name} booked`);
    setSelected(null);
    setDate("");
  };

  return (
    <>
      <PageIntro
        index="08 / Book"
        eyebrow="On-demand farm services"
        title="Machinery and hands, when the season needs them."
        subtitle="Tractors, drone spraying, harvest crews, soil labs and refrigerated transport — all with live rates, ratings and availability."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              filter === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((s) => (
            <Panel key={s.id}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h3 className="font-serif text-lg truncate">{s.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{s.provider}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" /> {s.rating}
                </span>
              </div>
              <p className="mt-4 font-serif text-2xl">
                ₹{s.rate.toLocaleString("en-IN")}
                <span className="ml-1 text-xs text-muted-foreground">/ {s.unit}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Available: {s.available}</p>
              <button
                onClick={() => setSelected(s)}
                className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                Book
              </button>
            </Panel>
          ))}
        </div>

        <div className="space-y-6">
          <Panel title={selected ? `Book ${selected.name}` : "Booking form"}>
            {selected ? (
              <form onSubmit={confirm} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">Date</span>
                  <input
                    type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">Quantity ({selected.unit})</span>
                  <input
                    type="number" min="1" value={hours} onChange={(e) => setHours(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <p className="text-sm text-muted-foreground">
                  Estimated total <span className="text-foreground">₹{(selected.rate * Number(hours || 1)).toLocaleString("en-IN")}</span>
                </p>
                <button className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
                  Confirm booking
                </button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Pick a service to schedule it.</p>
            )}
          </Panel>

          <Panel title="Your bookings">
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet this season.</p>
            ) : (
              <ul className="space-y-3">
                {bookings.map((b) => (
                  <li key={b.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                    <CalendarCheck className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate">{b.name}</span>
                      <span className="block text-xs text-muted-foreground">{b.date}</span>
                    </span>
                    <span className="shrink-0">₹{b.total.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
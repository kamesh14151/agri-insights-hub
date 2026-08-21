import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Star, Loader2, CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { SERVICES, type Service } from "@/lib/mock";
import { createBookingCheckout } from "@/lib/payments.server";
import { openRazorpayCheckout } from "@/lib/razorpay";



export const Route = createFileRoute("/app/booking")({
  head: () => ({
    meta: [
      { title: "Service Booking — Agrisynapse" },
      { name: "description", content: "Book tractors, drones, harvest labour, soil testing and cold transport from vetted providers." },
    ],
  }),
  component: BookingPage,
});

const TYPES = ["All", "Equipment", "Labour", "Advisory", "Transport"] as const;

function BookingPage() {
  const navigate = useNavigate();
  const checkout = useServerFn(createBookingCheckout);
  const [filter, setFilter] = useState<(typeof TYPES)[number]>("All");
  const [selected, setSelected] = useState<Service | null>(null);
  const [date, setDate] = useState("");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);

  const list = SERVICES.filter(s => filter === "All" || s.type === filter);
  const total = selected ? selected.rate * Math.max(1, Number(qty)) : 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !date) { toast.error("Please select a date"); return; }
    setBusy(true);
    try {
      const result = await checkout({
        data: {
          serviceId: selected.id,
          serviceName: selected.name,
          provider: selected.provider,
          date,
          qty: Math.max(1, Number(qty)),
          unit: selected.unit,
          rate: selected.rate,
          baseUrl: window.location.origin,
        },
      });
      // Redirect to Dodo checkout
      window.location.href = result.checkoutUrl;
    } catch (err: any) {
      toast.error(err?.message ?? "Payment failed. Try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <PageIntro
        index="08 / Book"
        eyebrow="On-demand farm services"
        title="Machinery and hands, when the season needs them."
        subtitle="Tractors, drone spraying, harvest crews, soil labs and refrigerated transport — live rates, ratings and instant checkout."
      />

      {/* Filter pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TYPES.map(t => (
          <button
            key={t} onClick={() => setFilter(t)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${filter === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >{t}</button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Service cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map(s => (
            <Panel key={s.id} className={`cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md ${selected?.id === s.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelected(s)}>
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
              <div className="mt-4 flex items-center justify-between">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${s.type === "Equipment" ? "border-blue-500/30 text-blue-500" : s.type === "Labour" ? "border-orange-500/30 text-orange-500" : s.type === "Advisory" ? "border-purple-500/30 text-purple-500" : "border-green-500/30 text-green-500"}`}>{s.type}</span>
                <button
                  onClick={e => { e.stopPropagation(); setSelected(s); }}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${selected?.id === s.id ? "bg-primary text-primary-foreground" : "border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary"}`}
                >
                  {selected?.id === s.id ? "Selected ✓" : "Select"}
                </button>
              </div>
            </Panel>
          ))}
        </div>

        {/* Booking form panel */}
        <div className="space-y-6">
          <Panel title={selected ? `Book · ${selected.name}` : "Booking form"} className="lg:sticky lg:top-24">
            {selected ? (
              <form onSubmit={handleCheckout} className="space-y-4">
                {/* Summary */}
                <div className="rounded-lg bg-muted/50 px-3 py-3 space-y-1">
                  <p className="text-sm font-medium">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.provider}</p>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">Date *</span>
                  <input
                    required type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={date} onChange={e => setDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] uppercase tracking-widest text-muted-foreground">Quantity ({selected.unit})</span>
                  <input
                    type="number" min="1" value={qty}
                    onChange={e => setQty(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>

                {/* Total */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total payable</span>
                  <span className="font-serif text-2xl text-primary">₹{total.toLocaleString("en-IN")}</span>
                </div>

                <button
                  type="button" disabled={busy}
                  onClick={async () => {
                    if (!selected) return;
                    setBusy(true);
                    await openRazorpayCheckout({
                      amountInRupees: total,
                      name: selected.name,
                      description: `Service Booking: ${selected.name} (${qty} ${selected.unit})`,

                      onSuccess: (paymentResult) => {
                        toast.success("Service Booking Confirmed via Razorpay!");
                        setBusy(false);
                        navigate({ to: "/app/booking/success", search: { booking_id: `bkg_${Date.now()}`, payment_id: paymentResult.razorpay_payment_id } as any });
                      },
                      onFailure: () => setBusy(false),
                      onDismiss: () => setBusy(false),
                    });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                >
                  <CreditCard className="h-4 w-4" /> Pay ₹{total.toLocaleString("en-IN")} via Razorpay
                </button>

                <p className="text-center text-[11px] text-muted-foreground">
                  Secured by Razorpay Standard Checkout · UPI, Cards, Net Banking accepted
                </p>


              </form>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CalendarCheck className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Select a service from the left to book and pay.</p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
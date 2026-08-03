import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Search, Sprout, X, Phone, MessageSquare, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { LISTINGS, type Listing } from "@/lib/mock";
import { submitEnquiry } from "@/lib/payments.server";

export const Route = createFileRoute("/app/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Agrisynapse" },
      { name: "description", content: "Farmer-to-buyer produce marketplace with grades, quantities and transparent per-quintal pricing." },
    ],
  }),
  component: MarketplacePage,
});

function EnquiryModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const send = useServerFn(submitEnquiry);
  const [form, setForm] = useState({ buyerName: "", buyerPhone: "", quantity: "", offerPrice: listing.price, message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.buyerName || !form.buyerPhone || !form.quantity) { toast.error("Please fill all required fields"); return; }
    setBusy(true);
    try {
      await send({ data: { listingId: listing.id, crop: listing.crop, farmer: listing.farmer, ...form } });
      setDone(true);
    } catch { toast.error("Could not send enquiry. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-serif text-lg font-semibold">{listing.crop}</h2>
            <p className="text-xs text-muted-foreground">{listing.farmer} · {listing.location}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted transition"><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sprout className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-serif text-xl">Enquiry Sent!</h3>
            <p className="text-sm text-muted-foreground">We've shared your details with <strong>{listing.farmer}</strong>. They'll contact you within 24 hours.</p>
            <button onClick={onClose} className="mt-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-5 py-5">
            <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Asking price: </span>
              <strong>₹{listing.price.toLocaleString("en-IN")} / {listing.unit}</strong>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">Available: </span><strong>{listing.quantity}</strong>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">Your Name *</span>
                <input required value={form.buyerName} onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))} placeholder="Full name" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">Phone *</span>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input required value={form.buyerPhone} onChange={e => setForm(f => ({ ...f, buyerPhone: e.target.value }))} placeholder="+91 98765 43210" className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">Qty Needed *</span>
                <input required value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 2 tonnes" className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">Your Offer (₹/{listing.unit})</span>
                <input type="number" value={form.offerPrice} onChange={e => setForm(f => ({ ...f, offerPrice: Number(e.target.value) }))} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-widest text-muted-foreground">Message <span className="normal-case">(optional)</span></span>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                <textarea rows={2} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Preferred delivery, payment terms…" className="w-full resize-none rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </label>

            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50">
              {busy ? "Sending…" : <><span>Send Enquiry</span><ChevronRight className="h-4 w-4" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function MarketplacePage() {
  const [q, setQ] = useState("");
  const [enquiring, setEnquiring] = useState<Listing | null>(null);
  const results = useMemo(() => LISTINGS.filter(l => `${l.crop} ${l.location} ${l.farmer}`.toLowerCase().includes(q.toLowerCase())), [q]);

  return (
    <>
      <PageIntro index="07 / Trade" eyebrow="Farmer to buyer" title="Sell the harvest without the middle." subtitle="Live produce lots from verified farms with grade, quantity and asking price — enquire directly and settle logistics in the app." />

      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search crop, farmer or district" className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={() => toast.success("Listing draft created")} className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">List produce</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {results.map(l => (
          <Panel key={l.id} className="transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <h3 className="font-serif text-xl truncate">{l.crop}</h3>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] text-primary">Grade {l.grade}</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {l.location} · {l.farmer}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Quantity</p><p>{l.quantity}</p></div>
              <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Harvested</p><p>{l.harvested}</p></div>
            </div>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-4">
              <p className="font-serif text-2xl">₹{l.price.toLocaleString("en-IN")}<span className="ml-1 text-xs text-muted-foreground">/ {l.unit}</span></p>
              <button onClick={() => setEnquiring(l)} className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition">Enquire</button>
            </div>
          </Panel>
        ))}
        {results.length === 0 && <p className="col-span-full flex items-center gap-2 text-sm text-muted-foreground"><Sprout className="h-4 w-4" /> No lots match that search yet.</p>}
      </div>

      {enquiring && <EnquiryModal listing={enquiring} onClose={() => setEnquiring(null)} />}
    </>
  );
}
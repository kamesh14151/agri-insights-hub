import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  MapPin, Search, Sprout, X, Phone, MessageSquare, ChevronRight,
  PlusCircle, ShoppingCart, ShieldCheck, CheckCircle2, Clock, Truck,
  DollarSign, PackageCheck, AlertCircle, ArrowUpRight, Filter, BadgeCheck, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { openRazorpayCheckout } from "@/lib/razorpay";


import {
  getMarketplaceListings,
  publishProduceListing,
  createProduceOrderCheckout,
  getMarketplaceOrders,
  updateMarketplaceOrderStatus,
  submitEnquiry,
  type MarketplaceProduceListing,
  type MarketplaceOrder,
} from "@/lib/payments.server";

export const Route = createFileRoute("/app/marketplace")({
  head: () => ({
    meta: [
      { title: "Agricultural Marketplace — Agrisynapse | AJ STUDIOZ" },
      { name: "description", content: "Farmer-to-buyer direct crop trade with Razorpay Standard Checkout and Escrow protection." },
    ],
  }),
  component: MarketplacePage,
});

/* ── Modal: Farmer Publish Produce for Sale ── */
function PublishListingModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (listing: MarketplaceProduceListing) => void;
}) {
  const { user } = useAuth();
  const publishFn = useServerFn(publishProduceListing);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    crop: "",
    variety: "",
    quantity: "",
    price: "",
    unit: "quintal",
    grade: "A",
    location: "Theni, Tamil Nadu",
    farmer: user?.name || "Kamesh",
    farmerPhone: "+91 98421 12345",
    harvested: "Fresh Harvest (Ready to load)",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.crop || !form.quantity || !form.price || !form.location) {
      toast.error("Please fill in all required listing fields");
      return;
    }

    setBusy(true);
    try {
      const res = await publishFn({
        data: {
          crop: form.crop,
          variety: form.variety,
          farmer: form.farmer,
          farmerEmail: user?.email || "kamesh14151@gmail.com",
          farmerPhone: form.farmerPhone,
          location: form.location,
          quantity: form.quantity,
          price: Number(form.price),
          unit: form.unit,
          grade: form.grade,
          harvested: form.harvested,
        },
      });

      if (res.success && res.listing) {
        toast.success(`🎉 ${form.crop} successfully listed for sale!`);
        onSuccess(res.listing);
        onClose();
      }
    } catch (err) {
      toast.error("Failed to publish produce lot. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold">Publish Harvest for Sale</h2>
              <p className="text-xs text-muted-foreground">List your produce directly to verified buyers nationwide</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Crop Name *</label>
              <input
                required
                value={form.crop}
                onChange={e => setForm(f => ({ ...f, crop: e.target.value }))}
                placeholder="e.g. Paddy, Turmeric, Tomato"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Variety / Cultivar</label>
              <input
                value={form.variety}
                onChange={e => setForm(f => ({ ...f, variety: e.target.value }))}
                placeholder="e.g. ADT 45, Salem Finger, Arka"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Available Quantity *</label>
              <input
                required
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                placeholder="e.g. 5 tonnes"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Price (₹) *</label>
              <input
                required
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                placeholder="2400"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Unit</label>
              <select
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="quintal">quintal</option>
                <option value="ton">ton</option>
                <option value="kg">kg</option>
                <option value="crate">crate</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Quality Grade</label>
              <select
                value={form.grade}
                onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Premium">Grade Premium (Export Quality)</option>
                <option value="A">Grade A (High Commercial)</option>
                <option value="B">Grade B (Standard Market)</option>
                <option value="C">Grade C (Processing / Industrial)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Farm Location *</label>
              <input
                required
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="District, State (e.g. Erode, TN)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Farmer Contact Name</label>
              <input
                required
                value={form.farmer}
                onChange={e => setForm(f => ({ ...f, farmer: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone Number</label>
              <input
                required
                value={form.farmerPhone}
                onChange={e => setForm(f => ({ ...f, farmerPhone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>Escrow Protected: Buyer payment will be locked securely until dispatch & physical delivery confirmation.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {busy ? "Publishing..." : "Publish Produce Lot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal: Buyer Instant Escrow / Razorpay Checkout ── */
function BuyNowCheckoutModal({
  listing,
  onClose,
  onSuccess,
}: {
  listing: MarketplaceProduceListing;
  onClose: () => void;
  onSuccess: (order: MarketplaceOrder) => void;
}) {
  const { user } = useAuth();
  const buyFn = useServerFn(createProduceOrderCheckout);
  const [busy, setBusy] = useState(false);

  const [orderQty, setOrderQty] = useState("1");
  const [buyerName, setBuyerName] = useState(user?.name || "Kamesh");
  const [buyerEmail, setBuyerEmail] = useState(user?.email || "kamesh14151@gmail.com");
  const [buyerPhone, setBuyerPhone] = useState("+91 98765 43210");
  const [deliveryAddress, setDeliveryAddress] = useState("Warehouse 3, Agro Hub Road, Chennai - 600001");

  const totalAmount = Math.max(1, Number(orderQty) || 1) * listing.price;

  const handleRazorpayCheckout = async () => {
    if (!buyerName || !buyerPhone || !deliveryAddress) {
      toast.error("Please fill in all required buyer details.");
      return;
    }
    setBusy(true);
    await openRazorpayCheckout({
      amountInRupees: totalAmount,
      name: "Agrisynapse Produce Marketplace",
      description: `Escrow Fund for ${orderQty} ${listing.unit} of ${listing.crop}`,
      prefill: {
        name: buyerName,
        email: buyerEmail,
        contact: buyerPhone,
      },
      onSuccess: async (paymentResult) => {
        try {
          const res = await buyFn({
            data: {
              listingId: listing.id,
              quantity: `${orderQty} ${listing.unit}`,
              totalAmount,
              buyerName,
              buyerEmail,
              buyerPhone,
              deliveryAddress,
              baseUrl: typeof window !== "undefined" ? window.location.origin : "",
            },
          });
          if (res.success && res.order) {
            toast.success(`🎉 Payment verified! Escrow funded for ${listing.crop}.`);
            onSuccess(res.order);
            onClose();
          }
        } catch {
          toast.error("Order recording failed after payment. Contact support.");
        } finally {
          setBusy(false);
        }
      },
      onFailure: () => setBusy(false),
      onDismiss: () => setBusy(false),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold">Buy {listing.crop}</h2>
              <p className="text-xs text-muted-foreground">Direct Escrow Checkout · Sold by {listing.farmer}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl bg-muted/60 p-3.5 space-y-2 text-sm border border-border/50">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Produce Lot:</span>
              <span className="font-medium text-foreground">{listing.crop} (Grade {listing.grade})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price per {listing.unit}:</span>
              <span className="font-medium text-foreground">₹{listing.price.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Farm Origin:</span>
              <span className="text-foreground">{listing.location}</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity ({listing.unit}) *</label>
              <input
                required
                type="number"
                min="1"
                value={orderQty}
                onChange={e => setOrderQty(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Total Payable</label>
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-base font-serif font-bold text-primary">
                ₹{totalAmount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Buyer Name *</label>
              <input
                required
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Phone Number *</label>
              <input
                required
                value={buyerPhone}
                onChange={e => setBuyerPhone(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Delivery Destination Address *</label>
            <textarea
              required
              rows={2}
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              placeholder="Warehouse / Mandi Delivery Address..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Razorpay Standard Checkout & Agricultural Escrow Protection</span>
            </div>
            <p>Your ₹{totalAmount.toLocaleString("en-IN")} is held in safe escrow. Funds are only disbursed to {listing.farmer} upon delivery verification.</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleRazorpayCheckout}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              {busy ? "Processing..." : `Pay ₹${totalAmount.toLocaleString("en-IN")} via Razorpay`}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Modal: Direct Enquiry / Offer ── */
function EnquiryModal({
  listing,
  onClose,
}: {
  listing: MarketplaceProduceListing;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const sendFn = useServerFn(submitEnquiry);
  const [form, setForm] = useState({
    buyerName: user?.name || "Kamesh",
    buyerPhone: "+91 98765 43210",
    quantity: listing.quantity,
    offerPrice: listing.price,
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.buyerName || !form.buyerPhone || !form.quantity) {
      toast.error("Please fill all required fields");
      return;
    }
    setBusy(true);
    try {
      await sendFn({
        data: {
          listingId: listing.id,
          crop: listing.crop,
          farmer: listing.farmer,
          ...form,
        },
      });
      setDone(true);
      toast.success("Enquiry sent to farmer!");
    } catch {
      toast.error("Could not send enquiry. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="font-serif text-lg font-semibold">{listing.crop}</h2>
            <p className="text-xs text-muted-foreground">{listing.farmer} · {listing.location}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sprout className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-serif text-xl font-semibold">Offer & Enquiry Sent!</h3>
            <p className="text-xs text-muted-foreground">
              Your offer has been submitted to <strong>{listing.farmer}</strong>. They will reach out via WhatsApp/Call.
            </p>
            <button onClick={onClose} className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="rounded-lg bg-muted/60 p-2.5 text-xs">
              <span className="text-muted-foreground">Asking: </span>
              <strong>₹{listing.price.toLocaleString("en-IN")} / {listing.unit}</strong>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="text-muted-foreground">Available: </span>
              <strong>{listing.quantity}</strong>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-0.5">Your Name *</label>
                <input
                  required
                  value={form.buyerName}
                  onChange={e => setForm(f => ({ ...f, buyerName: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-0.5">Phone *</label>
                <input
                  required
                  value={form.buyerPhone}
                  onChange={e => setForm(f => ({ ...f, buyerPhone: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-0.5">Quantity Needed *</label>
                <input
                  required
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-0.5">Your Offer (₹/{listing.unit})</label>
                <input
                  type="number"
                  value={form.offerPrice}
                  onChange={e => setForm(f => ({ ...f, offerPrice: Number(e.target.value) }))}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-muted-foreground mb-0.5">Note to Farmer</label>
              <textarea
                rows={2}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Logistics preferences, payment terms..."
                className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {busy ? "Sending..." : "Submit Offer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Main Marketplace Route Page ── */
function MarketplacePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const role = user?.role || "user";

  const fetchListings = useServerFn(getMarketplaceListings);
  const fetchOrders = useServerFn(getMarketplaceOrders);
  const updateStatusFn = useServerFn(updateMarketplaceOrderStatus);

  const [activeTab, setActiveTab] = useState<"browse" | "my_orders" | "my_listings">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");

  const [listings, setListings] = useState<MarketplaceProduceListing[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [buyNowListing, setBuyNowListing] = useState<MarketplaceProduceListing | null>(null);
  const [enquireListing, setEnquireListing] = useState<MarketplaceProduceListing | null>(null);

  // Load live listings & orders
  useEffect(() => {
    async function loadData() {
      try {
        const [lRes, oRes] = await Promise.all([
          fetchListings(),
          fetchOrders(),
        ]);
        if (lRes.listings) setListings(lRes.listings);
        if (oRes.orders) setOrders(oRes.orders);
      } catch (err) {
        console.error("Failed to load marketplace data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const matchQuery = `${l.crop} ${l.farmer} ${l.location} ${l.grade}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGrade = gradeFilter === "all" || l.grade === gradeFilter;
      return matchQuery && matchGrade;
    });
  }, [listings, searchQuery, gradeFilter]);

  // Farmer's own listings
  const myListings = useMemo(() => {
    return listings.filter(l => l.farmerEmail === user?.email || l.farmer.toLowerCase().includes((user?.name || "").toLowerCase()));
  }, [listings, user]);

  // Buyer's orders
  const myPurchases = useMemo(() => {
    return orders.filter(o => o.buyerEmail === user?.email || role === "admin" || o.farmerEmail === user?.email);
  }, [orders, user, role]);

  const handleConfirmReceipt = async (orderId: string) => {
    try {
      const res = await updateStatusFn({ data: { orderId, status: "delivered" } });
      if (res.success && res.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? res.order : o));
        toast.success("✅ Delivery confirmed! Escrow funds released to farmer.");
      }
    } catch {
      toast.error("Failed to confirm delivery");
    }
  };

  const handleDispatchOrder = async (orderId: string) => {
    try {
      const res = await updateStatusFn({ data: { orderId, status: "dispatched" } });
      if (res.success && res.order) {
        setOrders(prev => prev.map(o => o.id === orderId ? res.order : o));
        toast.success("🚚 Order marked as Dispatched with Logistics Partner.");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <>
      <PageIntro
        index="07 / Trade"
        eyebrow="Farmer-to-Buyer Production Marketplace"
        title="Direct Agricultural Commerce & Escrow."
        subtitle="Farmers publish fresh harvest lots for sale, verified buyers purchase directly with Razorpay Secure Checkout, and platform escrows ensure fair settlement."
      />

      {/* Action Header & Tabs */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-card border border-border text-xs">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "browse" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {role === "farmer" ? "🌾 Marketplace Lots" : "🌾 Available Harvests"} ({filteredListings.length})
          </button>
          <button
            onClick={() => setActiveTab("my_orders")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "my_orders" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {role === "farmer" ? "📦 Incoming Buyer Orders" : "📦 My Purchases & Escrows"} ({myPurchases.length})
          </button>
          {(role === "farmer" || role === "admin") && (
            <button
              onClick={() => setActiveTab("my_listings")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === "my_listings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🚜 My Published Lots ({myListings.length})
            </button>
          )}
        </div>

        {/* ONLY Farmers & Admin can publish produce */}
        {(role === "farmer" || role === "admin") && (
          <button
            onClick={() => setPublishModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <PlusCircle className="h-4 w-4" />
            Publish Produce for Sale
          </button>
        )}
      </div>

      {/* Role Informational Notification */}
      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary">
            {role === "farmer" ? "🌾 Farmer Seller Terminal" : role === "admin" ? "🛡️ Admin Operations" : "🛒 Buyer Terminal"}
          </span>
          <span className="text-muted-foreground hidden sm:inline">—</span>
          <span className="text-muted-foreground">
            {role === "farmer"
              ? "Farmers publish harvest lots for sale & fulfill incoming buyer orders."
              : role === "admin"
              ? "Admin mode: Audit marketplace lots, monitor escrow settlements and manage orders."
              : "Buyers browse direct farmer harvests & purchase securely via Razorpay Escrow Checkout."}
          </span>
        </div>
      </div>

      {/* Tab 1: Browse Listings */}
      {activeTab === "browse" && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by crop, farmer name, district or grade..."
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={gradeFilter}
                onChange={e => setGradeFilter(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Quality Grades</option>
                <option value="Premium">Grade Premium</option>
                <option value="A">Grade A</option>
                <option value="B">Grade B</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map(l => {
              const isOwnListing = l.farmerEmail === user?.email || l.farmer.toLowerCase().includes((user?.name || "").toLowerCase());
              const canBuy = role !== "farmer";

              return (
                <Panel key={l.id} className="relative flex flex-col justify-between transition hover:-translate-y-0.5 hover:shadow-md border border-border/80">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-xl font-semibold tracking-tight">{l.crop}</h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{l.location} · {l.farmer}</span>
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        l.grade === "Premium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "bg-primary/10 text-primary"
                      }`}>
                        Grade {l.grade}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3 text-xs">
                      <div>
                        <p className="uppercase tracking-wider text-[10px] text-muted-foreground">Available Quantity</p>
                        <p className="font-semibold text-foreground mt-0.5">{l.quantity}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wider text-[10px] text-muted-foreground">Harvest Timeline</p>
                        <p className="font-semibold text-foreground mt-0.5">{l.harvested}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block">Asking Rate</span>
                        <p className="font-serif text-2xl font-bold text-foreground">
                          ₹{l.price.toLocaleString("en-IN")}
                          <span className="ml-1 text-xs font-sans font-normal text-muted-foreground">/ {l.unit}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Escrow Guard</span>
                      </div>
                    </div>

                    {/* Role-Specific Action Buttons */}
                    {canBuy ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setEnquireListing(l)}
                          className="rounded-lg border border-border py-2 text-xs font-medium hover:bg-muted transition"
                        >
                          Make Offer
                        </button>
                        <button
                          onClick={() => setBuyNowListing(l)}
                          className="rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                        >
                          Buy Now
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-muted/60 p-2 text-center text-xs text-muted-foreground">
                        {isOwnListing ? (
                          <span className="font-medium text-primary">🌱 Your Listed Produce Lot (Active)</span>
                        ) : (
                          <span className="text-[11px]">🌾 Farmer Seller Mode · Switch to Buyer to purchase</span>
                        )}
                      </div>
                    )}
                  </div>
                </Panel>
              );
            })}
            {filteredListings.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center">
                <Sprout className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No produce lots match that filter</p>
                <button
                  onClick={() => { setSearchQuery(""); setGradeFilter("all"); }}
                  className="mt-3 text-xs text-primary underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab 2: My Purchases & Escrow Orders */}
      {activeTab === "my_orders" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-serif text-lg font-semibold">Active Orders & Escrow Settlements</h3>
                <p className="text-xs text-muted-foreground">Track order dispatch, inspect delivery, and release locked escrow payments to farmers.</p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border">
              {myPurchases.map(order => (
                <div key={order.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-base">{order.crop}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                        order.status === "delivered" || order.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : order.status === "dispatched"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}>
                        {order.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Farmer: <strong>{order.farmer}</strong> · Quantity: <strong>{order.quantity}</strong> · Destination: {order.deliveryAddress}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      Payment ID: <code className="bg-muted px-1.5 py-0.5 rounded">{order.paymentId}</code> · Razorpay Escrow
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-right">
                      <p className="font-serif text-xl font-bold">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {order.escrowStatus === "released_to_farmer" ? "✓ Escrow Released" : "🔒 Held in Escrow"}
                      </p>
                    </div>

                    {order.status === "escrow_funded" && (
                      <button
                        onClick={() => handleDispatchOrder(order.id)}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        Mark Dispatched
                      </button>
                    )}

                    {order.status !== "delivered" && order.status !== "completed" && (
                      <button
                        onClick={() => handleConfirmReceipt(order.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                      >
                        Confirm Receipt & Release Funds
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {myPurchases.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No active orders yet. Browse harvests and buy directly with escrow protection.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: My Published Listings (Farmer) */}
      {activeTab === "my_listings" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-serif text-lg font-semibold">My Active Harvest Lots</h3>
                <p className="text-xs text-muted-foreground">Manage your crop lots, adjust pricing, and track incoming buyer bids.</p>
              </div>
              <button
                onClick={() => setPublishModalOpen(true)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                + New Listing
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myListings.map(l => (
                <div key={l.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-base">{l.crop}</h4>
                      <p className="text-xs text-muted-foreground">{l.location} · Grade {l.grade}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 font-medium">
                      Active
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p><span className="text-muted-foreground">Quantity:</span> {l.quantity}</p>
                    <p><span className="text-muted-foreground">Asking Price:</span> ₹{l.price.toLocaleString("en-IN")} / {l.unit}</p>
                  </div>
                </div>
              ))}
              {myListings.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-muted-foreground">
                  You have not published any harvest lots yet. Click "Publish Produce for Sale" above.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {publishModalOpen && (
        <PublishListingModal
          onClose={() => setPublishModalOpen(false)}
          onSuccess={(newListing) => setListings(prev => [newListing, ...prev])}
        />
      )}

      {buyNowListing && (
        <BuyNowCheckoutModal
          listing={buyNowListing}
          onClose={() => setBuyNowListing(null)}
          onSuccess={(newOrder) => {
            setOrders(prev => [newOrder, ...prev]);
            setActiveTab("my_orders");
          }}
        />
      )}

      {enquireListing && (
        <EnquiryModal
          listing={enquireListing}
          onClose={() => setEnquireListing(null)}
        />
      )}
    </>
  );
}
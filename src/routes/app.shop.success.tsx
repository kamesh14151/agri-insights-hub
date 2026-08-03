import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2, Package, ArrowLeft, Loader2, Truck, MapPin,
  ShieldCheck, FileText, Printer, Sparkles, Navigation, Clock
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { confirmOrder, type ShopOrderRecord } from "@/lib/payments.server";

export const Route = createFileRoute("/app/shop/success")({
  head: () => ({
    meta: [
      { title: "Order Confirmed — Agrisynapse | AJ STUDIOZ" },
      { name: "description", content: "Your agricultural purchase has been placed and confirmed with escrow security." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    order_id: String(s.order_id ?? ""),
    payment_id: String(s.payment_id ?? ""),
    mock: s.mock === "1" || s.mock === 1,
  }),
  component: ShopSuccessPage,
});

function ShopSuccessPage() {
  const { order_id, payment_id, mock } = Route.useSearch();
  const confirm = useServerFn(confirmOrder);
  const [order, setOrder] = useState<ShopOrderRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!order_id) {
      setLoading(false);
      return;
    }
    confirm({ data: { orderId: order_id, paymentId: payment_id || undefined } })
      .then(r => setOrder((r.order as any) || null))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [order_id, payment_id]);

  return (
    <div className="flex min-h-[75vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8 text-center shadow-2xl animate-in fade-in duration-300">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Confirming your transaction & allocating farmer stock…</p>
          </div>
        ) : order ? (
          <div className="space-y-5 text-left">
            {/* Header with Success Tick */}
            <div className="text-center pb-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h1 className="mt-4 font-serif text-2xl font-bold">Order Placed Successfully!</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Thank you! Your order has been secured under Agrisynapse Escrow Protection.
              </p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-mono font-bold text-primary">
                <span>Order #{order.id}</span>
              </div>
            </div>

            {/* Estimated Arrival Banner */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Truck className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Estimated Delivery</p>
                  <p className="text-muted-foreground">
                    Arriving by <strong className="text-primary">{order.estimatedDeliveryDate || "in 3–5 days"}</strong>
                  </p>
                </div>
              </div>
              <span className="rounded-md bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[11px] font-bold">
                {order.deliverySpeed === "express" ? "⚡ Express Agro" : "🌾 Standard Mandi"}
              </span>
            </div>

            {/* 5-Step Stepper Preview */}
            <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1">
                <span className="text-primary font-bold">1. Placed</span>
                <span>2. Farmer Packaging</span>
                <span>3. Mandi Logistics</span>
                <span>4. Delivered</span>
              </div>
              <div className="overflow-hidden h-2 rounded-full bg-muted">
                <div className="w-1/4 h-full bg-primary rounded-full transition-all duration-500" />
              </div>
            </div>

            {/* Shipping Destination */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" /> Shipping Destination
              </span>
              <p className="font-semibold">{order.shippingAddress?.fullName} ({order.shippingAddress?.phone})</p>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                {order.shippingAddress?.street}, {order.shippingAddress?.landmark ? `${order.shippingAddress.landmark}, ` : ""}{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
              </p>
            </div>

            {/* Ordered Items Breakdown */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground block">
                Ordered Items ({order.items.length})
              </span>
              <div className="divide-y divide-border/40 max-h-36 overflow-y-auto pr-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        Qty: <strong>{item.qty}</strong> · Seller: <strong>{item.sellerName || "Agri Certified Farmer"}</strong>
                      </p>
                    </div>
                    <span className="font-bold">₹{(item.price * item.qty).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-2.5 flex items-center justify-between text-sm font-bold">
                <span>Total Amount Paid</span>
                <span className="font-serif text-xl text-primary">₹{order.total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                to="/app/shop"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-primary-foreground hover:opacity-95 transition shadow-sm"
              >
                <Package className="h-4 w-4" />
                <span>Track Order in My Orders</span>
              </Link>

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-semibold hover:bg-muted transition"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            <Package className="mx-auto h-12 w-12 text-primary" />
            <h1 className="font-serif text-2xl font-bold">Order Received</h1>
            <p className="text-xs text-muted-foreground">
              Your payment has been logged. You can view all shipments in your account dashboard.
            </p>
            <Link
              to="/app/shop"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Agri Shop</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

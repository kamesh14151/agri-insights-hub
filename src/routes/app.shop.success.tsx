import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Package, ArrowLeft, Loader2, Truck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { confirmOrder } from "@/lib/payments.server";

export const Route = createFileRoute("/app/shop/success")({
  head: () => ({ meta: [{ title: "Order Confirmed — Agrisynapse" }] }),
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
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!order_id) { setLoading(false); return; }
    confirm({ data: { orderId: order_id, paymentId: payment_id || undefined } })
      .then(r => setOrder(r.order))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [order_id]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Confirming your order…</p>
          </div>
        ) : order ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <h1 className="mt-5 font-serif text-2xl font-semibold">Order Placed!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your inputs are on their way. Expected delivery in 3–5 working days.</p>

            {/* Delivery tracker bar */}
            <div className="mt-5 flex items-center gap-1">
              {["Ordered", "Packed", "Shipped", "Delivered"].map((step, idx) => (
                <div key={step} className="flex flex-1 flex-col items-center gap-1">
                  <div className={`h-2 w-full rounded-full ${idx === 0 ? "bg-primary" : "bg-muted"}`} />
                  <span className="text-[10px] text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>

            {/* Order items */}
            <div className="mt-5 rounded-xl bg-muted/50 px-5 py-4 text-left space-y-2 text-sm max-h-48 overflow-y-auto">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-muted-foreground truncate mr-2">{item.name} × {item.qty}</span>
                  <span className="shrink-0">₹{(item.price * item.qty).toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2.5">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-serif text-xl text-primary">₹{order.total.toLocaleString("en-IN")}</span>
              </div>
              {(payment_id && !mock) && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Payment ID</span><span className="font-mono truncate ml-2">{payment_id}</span>
                </div>
              )}
              {mock && <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 pt-1">⚠ Test mode — no real payment charged</p>}
            </div>

            <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Truck className="h-3.5 w-3.5 text-primary" />
              Free delivery on orders above ₹2,000
            </div>

            <Link to="/app/shop" className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition">
              <ArrowLeft className="h-4 w-4" /> Continue Shopping
            </Link>
          </>
        ) : (
          <>
            <Package className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 font-serif text-2xl">Order Received</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your payment was processed. Order details will appear in your dashboard shortly.</p>
            <Link to="/app/shop" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
              <ArrowLeft className="h-4 w-4" /> Back to Shop
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

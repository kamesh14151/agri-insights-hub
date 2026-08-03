import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Star, Trash2, CreditCard, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { PRODUCTS, type Product } from "@/lib/mock";
import { createShopCheckout } from "@/lib/payments.server";

export const Route = createFileRoute("/app/shop")({
  head: () => ({
    meta: [
      { title: "Agri Shop — Agrisynapse" },
      { name: "description", content: "Buy seeds, fertilizers, bio-pesticides, tools and irrigation kits with transparent pricing." },
    ],
  }),
  component: ShopPage,
});

const CATS = ["All", "Seeds", "Fertilizers", "Pesticides", "Tools", "Irrigation"] as const;

function ShopPage() {
  const checkout = useServerFn(createShopCheckout);
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => PRODUCTS.filter(p => cat === "All" || p.category === cat), [cat]);
  const total = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const itemCount = cart.reduce((n, i) => n + i.qty, 0);

  const add = (product: Product) => {
    setCart(c => {
      const ex = c.find(i => i.product.id === product.id);
      if (ex) return c.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { product, qty: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const step = (id: string, delta: number) =>
    setCart(c => c.map(i => i.product.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));

  const remove = (id: string) => setCart(c => c.filter(i => i.product.id !== id));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setBusy(true);
    try {
      const result = await checkout({
        data: {
          items: cart.map(i => ({ id: i.product.id, name: i.product.name, qty: i.qty, price: i.product.price })),
          baseUrl: window.location.origin,
        },
      });
      window.location.href = result.checkoutUrl;
    } catch (err: any) {
      toast.error(err?.message ?? "Checkout failed. Try again.");
      setBusy(false);
    }
  };

  return (
    <>
      <PageIntro
        index="09 / Supply"
        eyebrow="Inputs and equipment"
        title="Everything the season asks for."
        subtitle="Certified seed, soil-safe nutrition, bio-pesticides, tools and drip components — priced clearly and delivered to the village."
      />

      {/* Category pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${cat === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >{c}</button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        {/* Products */}
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map(p => (
            <Panel key={p.id} className="flex flex-col transition hover:-translate-y-0.5 hover:shadow-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <h3 className="font-serif text-lg leading-snug">{p.name}</h3>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" /> {p.rating}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              <div className="mt-1 text-[11px] text-muted-foreground">Stock: {p.stock} units</div>
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-4">
                <p className="font-serif text-2xl">
                  ₹{p.price.toLocaleString("en-IN")}
                  <span className="ml-1 text-xs text-muted-foreground">/ {p.unit}</span>
                </p>
                <button
                  onClick={() => add(p)}
                  className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
                >
                  {cart.find(i => i.product.id === p.id) ? `+1 (${cart.find(i => i.product.id === p.id)!.qty})` : "Add"}
                </button>
              </div>
            </Panel>
          ))}
        </div>

        {/* Cart */}
        <Panel className="h-max lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg">Cart</h3>
            {itemCount > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{itemCount}</span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Your cart is empty.<br />Add products from the catalogue.</p>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {cart.map(i => (
                  <li key={i.product.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{i.product.name}</p>
                      <p className="text-xs text-muted-foreground">₹{i.product.price.toLocaleString("en-IN")} × {i.qty}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button onClick={() => step(i.product.id, -1)} className="grid h-6 w-6 place-items-center rounded border border-border hover:border-primary transition" aria-label="Decrease">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm">{i.qty}</span>
                        <button onClick={() => step(i.product.id, 1)} className="grid h-6 w-6 place-items-center rounded border border-border hover:border-primary transition" aria-label="Increase">
                          <Plus className="h-3 w-3" />
                        </button>
                        <button onClick={() => remove(i.product.id)} className="ml-1 text-muted-foreground hover:text-destructive transition" aria-label="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-medium">₹{(i.product.price * i.qty).toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>

              {/* Total */}
              <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between border-t border-border">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-serif text-2xl text-primary">₹{total.toLocaleString("en-IN")}</span>
              </div>

              <button
                onClick={handleCheckout} disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
              >
                {busy ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting to payment…</>
                ) : (
                  <><CreditCard className="h-4 w-4" /> Pay ₹{total.toLocaleString("en-IN")} via Dodo</>
                )}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                <Package className="inline h-3 w-3 mr-1" />
                Delivery 3–5 days · Free above ₹2,000
              </p>
              <p className="text-center text-[11px] text-muted-foreground">
                Secured by Dodo Payments · UPI, Cards, Net Banking
              </p>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
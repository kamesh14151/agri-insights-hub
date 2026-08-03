import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { PRODUCTS, type Product } from "@/lib/mock";

export const Route = createFileRoute("/app/shop")({
  head: () => ({
    meta: [
      { title: "Agri Shop — Agrisynapse" },
      { name: "description", content: "Buy seeds, fertilizers, bio-pesticides, tools and irrigation kits with transparent pricing." },
      { property: "og:title", content: "Agri Shop — Agrisynapse" },
      { property: "og:description", content: "Seeds, fertilizers, pesticides, tools and irrigation supplies delivered to the farm." },
    ],
  }),
  component: ShopPage,
});

const CATS = ["All", "Seeds", "Fertilizers", "Pesticides", "Tools", "Irrigation"] as const;

function ShopPage() {
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);

  const list = useMemo(() => PRODUCTS.filter((p) => cat === "All" || p.category === cat), [cat]);
  const total = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  const add = (product: Product) => {
    setCart((c) => {
      const existing = c.find((i) => i.product.id === product.id);
      if (existing) return c.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { product, qty: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const step = (id: string, delta: number) =>
    setCart((c) =>
      c.map((i) => (i.product.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)),
    );

  return (
    <>
      <PageIntro
        index="09 / Supply"
        eyebrow="Inputs and equipment"
        title="Everything the season asks for."
        subtitle="Certified seed, soil-safe nutrition, bio-pesticides, tools and drip components — priced clearly and delivered to the village."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              cat === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((p) => (
            <Panel key={p.id} className="flex flex-col transition hover:-translate-y-0.5 hover:shadow-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <h3 className="font-serif text-lg leading-snug">{p.name}</h3>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" /> {p.rating}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-4">
                <p className="font-serif text-2xl">
                  ₹{p.price.toLocaleString("en-IN")}
                  <span className="ml-1 text-xs text-muted-foreground">/ {p.unit}</span>
                </p>
                <button
                  onClick={() => add(p)}
                  className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
                >
                  Add
                </button>
              </div>
            </Panel>
          ))}
        </div>

        <Panel title="Cart" className="h-max lg:sticky lg:top-24">
          {cart.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="h-4 w-4" /> Your cart is empty.
            </p>
          ) : (
            <>
              <ul className="space-y-4">
                {cart.map((i) => (
                  <li key={i.product.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{i.product.name}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button onClick={() => step(i.product.id, -1)} className="grid h-6 w-6 place-items-center rounded border border-border" aria-label="Decrease">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm">{i.qty}</span>
                        <button onClick={() => step(i.product.id, 1)} className="grid h-6 w-6 place-items-center rounded border border-border" aria-label="Increase">
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setCart((c) => c.filter((x) => x.product.id !== i.product.id))}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm">₹{(i.product.price * i.qty).toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-serif text-2xl">₹{total.toLocaleString("en-IN")}</span>
              </div>
              <button
                onClick={() => {
                  toast.success("Order placed — delivery in 3 days");
                  setCart([]);
                }}
                className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                Checkout
              </button>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
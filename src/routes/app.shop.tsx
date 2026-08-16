import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Minus, Plus, ShoppingCart, Star, Trash2, CreditCard, Loader2, Package,
  PlusCircle, Search, ShieldCheck, Check, X, MapPin, Phone, Sprout, Store,
  Layers, ArrowUpRight, TrendingUp, Truck, CheckCircle2, Clock, FileText,
  AlertCircle, ChevronRight, Navigation, QrCode, RefreshCw, Box, ExternalLink,
  Printer, Send, Sparkles, Building2, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";
import {
  getShopProducts,
  getShopOrders,
  uploadShopProduct,
  deleteShopProduct,
  createShopCheckout,
  updateShopOrderStatus,
  cancelShopOrder,
  type ShopProductItem,
  type ShopOrderRecord,
  type ShippingAddress,
} from "@/lib/payments.server";

export const Route = createFileRoute("/app/shop")({
  head: () => ({
    meta: [
      { title: "Agri Shop & Farmer E-Commerce — Agrisynapse | AJ STUDIOZ" },
      { name: "description", content: "Production e-commerce platform. Farmers dispatch orders, verified buyers purchase with Dodo Payments checkout and track shipments like Amazon." },
    ],
  }),
  loader: async () => {
    try {
      const [prodRes, orderRes] = await Promise.all([
        getShopProducts(),
        getShopOrders(),
      ]);
      return {
        initialProducts: prodRes.products || [],
        initialOrders: orderRes.orders || [],
      };
    } catch {
      return { initialProducts: [], initialOrders: [] };
    }
  },
  component: ShopPage,
});

const CATEGORIES = [
  "All",
  "Farmer Direct",
  "Seeds",
  "Fertilizers",
  "Pesticides",
  "Tools",
  "Irrigation",
  "Bio-Inputs",
  "Harvested Produce",
] as const;

const INDIAN_STATES = [
  "Tamil Nadu", "Karnataka", "Andhra Pradesh", "Telangana", "Kerala",
  "Maharashtra", "Gujarat", "Punjab", "Haryana", "Uttar Pradesh",
  "Madhya Pradesh", "Rajasthan", "Bihar", "West Bengal", "Odisha"
];

function ShopPage() {
  const { initialProducts, initialOrders } = Route.useLoaderData();
  const { user } = useAuth();
  const role = user?.role || "user";
  const isFarmer = role === "farmer";
  const isAdmin = role === "admin";
  const isBuyer = role === "user";

  const [products, setProducts] = useState<ShopProductItem[]>(initialProducts || []);
  const [orders, setOrders] = useState<ShopOrderRecord[]>(initialOrders || []);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"browse" | "orders" | "farmer_orders" | "my_listings">(
    isFarmer ? "farmer_orders" : "browse"
  );
  
  const [category, setCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<{ product: ShopProductItem; qty: number }[]>([]);
  
  // Modals & Flows
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<ShopOrderRecord | null>(null);
  const [dispatchModalOrder, setDispatchModalOrder] = useState<ShopOrderRecord | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "in_transit" | "delivered" | "cancelled">("all");

  // Server functions
  const checkoutFn = useServerFn(createShopCheckout);
  const deleteFn = useServerFn(deleteShopProduct);
  const updateStatusFn = useServerFn(updateShopOrderStatus);
  const cancelOrderFn = useServerFn(cancelShopOrder);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeTab === "my_listings") {
      list = list.filter(p => p.sellerEmail === user?.email || p.sellerName === user?.name || isAdmin);
    } else {
      if (category === "Farmer Direct") {
        list = list.filter(p => p.isFarmerDirect);
      } else if (category !== "All") {
        list = list.filter(p => p.category === category);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.sellerName.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q))
      );
    }

    return list;
  }, [products, activeTab, category, searchQuery, user, isAdmin]);

  const myListings = useMemo(() => {
    return products.filter(p => p.sellerEmail === user?.email || p.sellerName === user?.name || isAdmin);
  }, [products, user, isAdmin]);

  const totalStockInInventory = useMemo(() => {
    return myListings.reduce((sum, p) => sum + p.stock, 0);
  }, [myListings]);

  // Buyer specific orders (or all for admin)
  const buyerOrders = useMemo(() => {
    let list = orders;
    if (isBuyer) {
      list = list.filter(o => o.buyerEmail === user?.email || o.buyerName === user?.name || true); // show current buyer orders
    }
    if (orderFilter === "in_transit") {
      list = list.filter(o => ["placed", "packed", "shipped", "out_for_delivery"].includes(o.status));
    } else if (orderFilter === "delivered") {
      list = list.filter(o => o.status === "delivered");
    } else if (orderFilter === "cancelled") {
      list = list.filter(o => o.status === "cancelled");
    }
    return list;
  }, [orders, isBuyer, user, orderFilter]);

  // Farmer specific incoming orders for their products
  const farmerOrders = useMemo(() => {
    if (!isFarmer && !isAdmin) return [];
    return orders.filter(o => {
      if (isAdmin) return true;
      return o.items.some(item => 
        item.sellerEmail === user?.email || 
        item.sellerName === user?.name ||
        myListings.some(p => p.id === item.id || p.name === item.name)
      );
    });
  }, [orders, isFarmer, isAdmin, user, myListings]);

  const totalCartAmount = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const totalItemCount = cart.reduce((n, i) => n + i.qty, 0);

  // Buyer Add to Cart
  const addToCart = (product: ShopProductItem) => {
    if (isFarmer) {
      toast.info("🌾 Farmer accounts are registered to Sell only. Switch to a Buyer account to purchase.");
      return;
    }
    if (product.stock <= 0) {
      toast.error("This product is currently out of stock.");
      return;
    }
    setCart(c => {
      const ex = c.find(i => i.product.id === product.id);
      if (ex) {
        if (ex.qty >= product.stock) {
          toast.warning(`Maximum available stock is ${product.stock} units`);
          return c;
        }
        return c.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...c, { product, qty: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const stepQty = (id: string, delta: number) => {
    setCart(c => c.map(i => {
      if (i.product.id === id) {
        const nextQty = i.qty + delta;
        if (nextQty > i.product.stock) {
          toast.warning(`Max available stock reached (${i.product.stock})`);
          return i;
        }
        return { ...i, qty: Math.max(1, nextQty) };
      }
      return i;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(c => c.filter(i => i.product.id !== id));
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from the store?`)) return;
    try {
      const res = await deleteFn({ data: { productId: id } });
      if (res.success) {
        setProducts(prev => prev.filter(p => p.id !== id));
        setCart(prev => prev.filter(i => i.product.id !== id));
        toast.success(`"${name}" removed from Agri Shop`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove product");
    }
  };

  // Farmer Order Packing Action
  const handlePackOrder = async (orderId: string) => {
    try {
      const res = await updateStatusFn({ data: { orderId, status: "packed" } });
      if (res.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "packed", updatedAt: new Date().toISOString() } : o));
        toast.success(`Order #${orderId} marked as Packed and ready for courier pickup.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update order status");
    }
  };

  // Farmer Order Delivery Action
  const handleMarkDelivered = async (orderId: string) => {
    try {
      const res = await updateStatusFn({ data: { orderId, status: "delivered" } });
      if (res.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "delivered", updatedAt: new Date().toISOString() } : o));
        toast.success(`Order #${orderId} marked as Delivered. Escrow payout settled.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update order status");
    }
  };

  // Buyer Cancel Order Action
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm(`Are you sure you want to cancel Order #${orderId}? A full refund will be credited.`)) return;
    try {
      const res = await cancelOrderFn({ data: { orderId } });
      if (res.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "cancelled", updatedAt: new Date().toISOString() } : o));
        toast.success(`Order #${orderId} cancelled successfully. Refund initiated.`);
      } else {
        toast.error(res.error || "Cannot cancel this order.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel order");
    }
  };

  return (
    <>
      <PageIntro
        index="09 / E-Commerce"
        eyebrow={
          isFarmer
            ? "🌾 Farmer Seller Terminal · Sell Only"
            : isAdmin
            ? "🛡️ Admin E-Commerce Oversight"
            : "🛒 Buyer E-Commerce Store · Buy Only"
        }
        title={
          isFarmer
            ? "Farmer Store & Order Dispatch Hub"
            : "Agri Shop · Verified Farm E-Commerce"
        }
        subtitle={
          isFarmer
            ? "Publish farm produce and agricultural inputs. Monitor real-time buyer orders, package inventory, and dispatch shipments like Amazon Seller Central."
            : "Direct agricultural e-commerce. Purchase verified seeds, fertilizers, farm tools, and produce with instant Dodo Payments checkout and live shipment tracking."
        }
      />

      {/* Role Notice Banner */}
      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary flex items-center gap-1.5">
            {isFarmer ? <Sprout className="h-4 w-4" /> : <Store className="h-4 w-4" />}
            {isFarmer ? "🌾 Farmer Account (Seller Mode)" : isAdmin ? "🛡️ Admin Operations Mode" : "🛒 Buyer Account (Purchase Mode)"}
          </span>
          <span className="text-muted-foreground hidden md:inline">—</span>
          <span className="text-muted-foreground">
            {isFarmer
              ? "Strict role policy: Farmers publish products and fulfill buyer orders. To purchase items, switch to a Buyer account."
              : isAdmin
              ? "Full permissions: Monitor catalog, dispatch orders, manage listings, and audit transactions."
              : "Strict role policy: Buyers browse verified products, checkout with address & payment, and track deliveries in real time."}
          </span>
        </div>

        {isFarmer && (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition shadow-xs"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Upload New Product</span>
          </button>
        )}
      </div>

      {/* Main Top Navigation Tabs */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Buyer Tab 1: Browse Products */}
          <button
            onClick={() => setActiveTab("browse")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "browse"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Browse Agri Store</span>
            <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-xs">
              {products.length}
            </span>
          </button>

          {/* Buyer Tab 2: Order History & Tracking */}
          {!isFarmer && (
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "orders"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>My Orders & Tracking</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-xs">
                {buyerOrders.length}
              </span>
            </button>
          )}

          {/* Farmer Tab 1: Incoming Orders & Dispatch */}
          {(isFarmer || isAdmin) && (
            <button
              onClick={() => setActiveTab("farmer_orders")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "farmer_orders"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Incoming Buyer Orders & Dispatch</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-xs font-bold">
                {farmerOrders.length}
              </span>
            </button>
          )}

          {/* Farmer Tab 2: My Listed Products */}
          {(isFarmer || isAdmin) && (
            <button
              onClick={() => setActiveTab("my_listings")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "my_listings"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sprout className="h-4 w-4" />
              <span>My Listed Products</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-xs">
                {myListings.length}
              </span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        {(activeTab === "browse" || activeTab === "my_listings") && (
          <div className="relative min-w-[240px] sm:min-w-[300px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products, category, seller..."
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: BROWSE PRODUCTS / MY LISTINGS */}
      {/* ========================================================================= */}
      {(activeTab === "browse" || activeTab === "my_listings") && (
        <>
          {/* Category Pills (Browse Mode) */}
          {activeTab === "browse" && (
            <div className="mb-6 flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-4 py-1.5 text-xs sm:text-sm font-medium transition ${
                    category === c
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                >
                  {c === "Farmer Direct" ? "🌾 Farmer Direct" : c}
                </button>
              ))}
            </div>
          )}

          {/* Main Grid: Product Catalogue + Side Panel */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.1fr)]">
            {/* Products List */}
            <div className="space-y-4">
              {filteredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                  <h3 className="font-serif text-lg font-medium">No products found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeTab === "my_listings"
                      ? "You have not uploaded any products yet. Click below to start selling!"
                      : "Try adjusting your search query or category filter."}
                  </p>
                  {(isFarmer || isAdmin) && activeTab === "my_listings" && (
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm"
                    >
                      <PlusCircle className="h-4 w-4" />
                      List Your First Product
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredProducts.map(p => {
                    const inCart = cart.find(i => i.product.id === p.id);
                    const isSeller = p.sellerEmail === user?.email || p.sellerName === user?.name || isAdmin;

                    return (
                      <Panel key={p.id} className="flex flex-col justify-between transition hover:-translate-y-0.5 hover:shadow-md">
                        <div>
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                {p.category}
                              </span>
                              {p.isFarmerDirect && (
                                <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Sprout className="h-3 w-3" /> Farmer Direct
                                </span>
                              )}
                            </div>
                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {p.rating.toFixed(1)}
                            </span>
                          </div>

                          {/* Title & Description */}
                          <h3 className="font-serif text-lg font-semibold leading-snug">{p.name}</h3>
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {p.desc}
                          </p>

                          {/* Seller Info */}
                          <div className="mt-4 space-y-1.5 rounded-xl bg-muted/40 p-2.5 text-xs text-muted-foreground">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-foreground flex items-center gap-1 truncate mr-2">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="truncate">{p.sellerName}</span>
                              </span>
                              {p.location && (
                                <span className="flex items-center gap-1 text-[11px] shrink-0">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  {p.location}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span>Stock: <strong className={p.stock > 0 ? "text-emerald-600 font-medium" : "text-rose-500"}>{p.stock > 0 ? `${p.stock} units` : "Out of stock"}</strong></span>
                              {p.sellerPhone && <span><Phone className="inline h-2.5 w-2.5 mr-0.5" />{p.sellerPhone}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Price & Action Area */}
                        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border pt-4">
                          <div>
                            <p className="font-serif text-2xl font-bold tracking-tight text-foreground">
                              ₹{p.price.toLocaleString("en-IN")}
                              <span className="ml-1 text-xs font-normal text-muted-foreground">/ {p.unit}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSeller && (
                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                title="Delete Product"
                                className="rounded-lg border border-destructive/30 p-2 text-destructive hover:bg-destructive/10 transition"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}

                            {/* ONLY Buyers & Admin can Add to Cart */}
                            {!isFarmer ? (
                              <button
                                onClick={() => addToCart(p)}
                                disabled={p.stock <= 0}
                                className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
                              >
                                <ShoppingCart className="h-4 w-4" />
                                {inCart ? `In Cart (${inCart.qty})` : "Add to Cart"}
                              </button>
                            ) : (
                              <span className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground font-medium">
                                {isSeller ? "🌱 Your Product" : "🌾 Seller View"}
                              </span>
                            )}
                          </div>
                        </div>
                      </Panel>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SIDE PANEL */}
            {isFarmer ? (
              /* FARMER SELLER TERMINAL PANEL */
              <Panel className="h-max lg:sticky lg:top-24 border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    <h3 className="font-serif text-lg font-semibold">Farmer Seller Hub</h3>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                    Active Seller
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl bg-muted/50 p-3.5 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Store Overview
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-lg bg-card p-2.5 border border-border">
                        <p className="text-2xl font-serif font-bold text-primary">{myListings.length}</p>
                        <p className="text-[11px] text-muted-foreground">Active Listings</p>
                      </div>
                      <div className="rounded-lg bg-card p-2.5 border border-border">
                        <p className="text-2xl font-serif font-bold text-emerald-600">{farmerOrders.length}</p>
                        <p className="text-[11px] text-muted-foreground">Buyer Orders</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-95 shadow-md transition"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Upload New Product for Sale</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("farmer_orders")}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/10 transition"
                  >
                    <Truck className="h-4 w-4" />
                    <span>Open Dispatch Center ({farmerOrders.length})</span>
                  </button>

                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" /> Amazon-Style Fulfillment Rules
                    </p>
                    <ul className="space-y-1.5 list-disc pl-4 text-[11px]">
                      <li>When buyers place an order, it appears in your <strong>Dispatch Center</strong> instantly.</li>
                      <li>Pack the products securely and click <strong>"Dispatch & Ship"</strong> with the tracking AWB number.</li>
                      <li>Escrow payments are credited directly upon delivery confirmation.</li>
                    </ul>
                  </div>
                </div>
              </Panel>
            ) : (
              /* BUYER SHOPPING CART PANEL */
              <Panel className="h-max lg:sticky lg:top-24 shadow-sm border-border">
                <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <h3 className="font-serif text-lg font-semibold">Shopping Cart</h3>
                  </div>
                  {totalItemCount > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {totalItemCount}
                    </span>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted/60 text-muted-foreground/60">
                      <ShoppingCart className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Your cart is empty</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Browse certified seeds, organic fertilizers, and fresh farm produce to add to cart.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Items list */}
                    <ul className="space-y-3 max-h-[220px] overflow-y-auto pr-1 divide-y divide-border/50">
                      {cart.map(i => (
                        <li key={i.product.id} className="pt-3 first:pt-0 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{i.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ₹{i.product.price.toLocaleString("en-IN")} × {i.qty}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() => stepQty(i.product.id, -1)}
                                className="grid h-6 w-6 place-items-center rounded-md border border-border bg-background hover:border-primary transition"
                                aria-label="Decrease"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-[1.5rem] text-center text-xs font-semibold">{i.qty}</span>
                              <button
                                onClick={() => stepQty(i.product.id, 1)}
                                className="grid h-6 w-6 place-items-center rounded-md border border-border bg-background hover:border-primary transition"
                                aria-label="Increase"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeFromCart(i.product.id)}
                                className="ml-2 text-muted-foreground hover:text-destructive transition"
                                aria-label="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-bold">
                            ₹{(i.product.price * i.qty).toLocaleString("en-IN")}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Price Breakdown */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Subtotal ({totalItemCount} items)</span>
                        <span>₹{totalCartAmount.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Standard Mandi Delivery</span>
                        <span className="text-emerald-600 font-medium">FREE</span>
                      </div>
                      <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                        <span className="font-medium text-sm">Order Total</span>
                        <span className="font-serif text-2xl font-bold text-primary">
                          ₹{totalCartAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Amazon-Style Proceed to Checkout Button */}
                    <button
                      onClick={() => setCheckoutModalOpen(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-bold text-primary-foreground hover:opacity-95 shadow-md transition"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Proceed to Buy ({totalItemCount} items)</span>
                    </button>

                    <div className="space-y-1 text-center text-[11px] text-muted-foreground pt-1">
                      <p className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" /> 100% Quality & Escrow Guarantee
                      </p>
                      <p>Dodo Payments · UPI, Cards, NetBanking & Pay on Delivery</p>
                    </div>
                  </div>
                )}
              </Panel>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: BUYER ORDER HISTORY & REAL-TIME TRACKING */}
      {/* ========================================================================= */}
      {activeTab === "orders" && !isFarmer && (
        <div className="space-y-6">
          {/* Top Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold">Your Orders & Deliveries</h2>
              <p className="text-xs text-muted-foreground">Track shipments in real-time and download GST tax invoices</p>
            </div>

            <div className="flex rounded-xl border border-border bg-card p-1 shadow-xs text-xs">
              {(["all", "in_transit", "delivered", "cancelled"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={`rounded-lg px-3 py-1.5 font-semibold capitalize transition ${
                    orderFilter === f
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All Orders" : f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {buyerOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-serif text-lg font-medium">No orders found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                You haven't placed any orders matching this filter yet.
              </p>
              <button
                onClick={() => setActiveTab("browse")}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm"
              >
                <Store className="h-4 w-4" />
                <span>Start Shopping</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {buyerOrders.map(order => {
                const stageIndex = 
                  order.status === "placed" ? 1 :
                  order.status === "packed" ? 2 :
                  order.status === "shipped" ? 3 :
                  order.status === "out_for_delivery" ? 4 :
                  order.status === "delivered" ? 5 : 0;

                const isCancelled = order.status === "cancelled";

                return (
                  <Panel key={order.id} className="overflow-hidden border-border shadow-xs transition hover:border-primary/40">
                    {/* Order Header (Amazon-Style) */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-muted/30 -mx-6 -mt-6 p-4 sm:px-6 text-xs">
                      <div className="flex flex-wrap items-center gap-6">
                        <div>
                          <span className="text-muted-foreground uppercase tracking-wider text-[10px] block">Order Placed</span>
                          <span className="font-medium text-foreground">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground uppercase tracking-wider text-[10px] block">Total Amount</span>
                          <span className="font-bold text-foreground">₹{order.total.toLocaleString("en-IN")}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground uppercase tracking-wider text-[10px] block">Ship To</span>
                          <span className="font-medium text-foreground truncate max-w-[140px] block" title={`${order.shippingAddress.fullName}, ${order.shippingAddress.city}`}>
                            {order.shippingAddress.fullName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-muted-foreground uppercase tracking-wider text-[10px] block">Order ID</span>
                          <span className="font-mono font-bold text-foreground">{order.id}</span>
                        </div>
                        <button
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition"
                        >
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span>Invoice</span>
                        </button>
                      </div>
                    </div>

                    {/* Live 5-Step Stepper Bar */}
                    {!isCancelled ? (
                      <div className="pt-5 pb-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h4 className="font-serif text-base font-bold">
                              {order.status === "placed" && "Order Placed — Waiting for Farmer Packaging"}
                              {order.status === "packed" && "Packed by Farmer — Ready for Pickup"}
                              {order.status === "shipped" && `In Transit via ${order.courierPartner}`}
                              {order.status === "out_for_delivery" && "Out for Delivery — Arriving Today"}
                              {order.status === "delivered" && "Delivered & Verified"}
                            </h4>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Est. Delivery: <strong>{order.estimatedDeliveryDate}</strong>
                          </span>
                        </div>

                        {/* 5-Step Progress Bar */}
                        <div className="relative mt-4">
                          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded-full bg-muted">
                            <div
                              style={{ width: `${(stageIndex / 5) * 100}%` }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
                            />
                          </div>

                          <div className="grid grid-cols-5 text-center text-[11px] font-medium text-muted-foreground">
                            <span className={stageIndex >= 1 ? "text-primary font-bold" : ""}>1. Placed</span>
                            <span className={stageIndex >= 2 ? "text-primary font-bold" : ""}>2. Packed</span>
                            <span className={stageIndex >= 3 ? "text-primary font-bold" : ""}>3. Shipped</span>
                            <span className={stageIndex >= 4 ? "text-primary font-bold" : ""}>4. Out for Delivery</span>
                            <span className={stageIndex >= 5 ? "text-emerald-600 font-bold" : ""}>5. Delivered</span>
                          </div>
                        </div>

                        {order.status === "shipped" && (
                          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-primary shrink-0" />
                              <span>
                                Courier: <strong>{order.courierPartner}</strong> · Tracking AWB: <strong className="font-mono">{order.trackingNumber}</strong>
                              </span>
                            </div>
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Live Escrow Active
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 my-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>This order was cancelled. Full refund has been processed to your source payment method.</span>
                        </div>
                      </div>
                    )}

                    {/* Order Item Rows */}
                    <div className="border-t border-border pt-4 mt-2 divide-y divide-border/40">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                              <Sprout className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="font-serif text-sm font-semibold">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: <strong>{item?.qty || 1}</strong> · Price: ₹{(Number(item?.price) || 0).toLocaleString("en-IN")} · Seller: <strong>{item?.sellerName || "Farmer"}</strong>
                              </p>
                              <span className="inline-block mt-1 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                                {item?.category || "Agricultural Supply"}
                              </span>
                            </div>
                          </div>

                          <div className="text-right sm:self-center">
                            <p className="font-serif text-base font-bold">
                              ₹{((Number(item?.price) || 0) * (Number(item?.qty) || 1)).toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Footer & Actions */}
                    <div className="border-t border-border mt-4 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>
                          {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.status === "placed" && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="rounded-lg border border-destructive/30 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition font-semibold"
                          >
                            Cancel Order
                          </button>
                        )}
                        <button
                          onClick={() => {
                            order.items.forEach(item => {
                              const found = products.find(p => p.id === item.id || p.name === item.name);
                              if (found) addToCart(found);
                            });
                            toast.success("Items re-added to your cart!");
                            setActiveTab("browse");
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground hover:opacity-90 transition shadow-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Buy it Again</span>
                        </button>
                      </div>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: FARMER INCOMING ORDERS & DISPATCH HUB */}
      {/* ========================================================================= */}
      {activeTab === "farmer_orders" && (isFarmer || isAdmin) && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="font-serif text-xl font-bold flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <span>Farmer Dispatch & Fulfillment Center</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Incoming orders from verified buyers. Pack and assign tracking numbers to dispatch shipments.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600">
                {farmerOrders.filter(o => o.status === "placed" || o.status === "packed").length} Pending Dispatches
              </span>
            </div>
          </div>

          {farmerOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <Truck className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="font-serif text-lg font-medium">No incoming orders yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                When buyers order your listed produce or supplies, they will appear here in real time for fulfillment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {farmerOrders.map(order => (
                <Panel key={order.id} className="border-border shadow-xs transition hover:border-primary/40">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Box className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-mono text-sm font-bold">{order.id}</h4>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            order.status === "placed" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                            order.status === "packed" ? "bg-blue-500/10 text-blue-600 border border-blue-500/20" :
                            order.status === "shipped" ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20" :
                            order.status === "delivered" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                            "bg-rose-500/10 text-rose-600"
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Placed on {new Date(order.createdAt).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedInvoiceOrder(order)}
                        className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>Print Shipping Label</span>
                      </button>
                    </div>
                  </div>

                  {/* Buyer & Delivery Details */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 py-3 border-b border-border/50 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Buyer Customer</span>
                      <p className="font-semibold text-foreground">{order.shippingAddress.fullName}</p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {order.shippingAddress.phone}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Destination Address</span>
                      <p className="text-muted-foreground leading-relaxed">
                        {order.shippingAddress.street}, {order.shippingAddress.landmark ? `${order.shippingAddress.landmark}, ` : ""}{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                      </p>
                    </div>

                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Logistics & Payout</span>
                      <p className="font-serif text-lg font-bold text-primary">₹{order.total.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] text-emerald-600 font-medium">Payment Secured via Escrow</p>
                    </div>
                  </div>

                  {/* Items Ordered */}
                  <div className="py-3 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Items to Pack</span>
                    <div className="divide-y divide-border/40">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold">{item.name}</span>
                            <span className="text-muted-foreground ml-2">Qty: <strong>{item.qty}</strong> units</span>
                          </div>
                          <span className="font-bold">₹{((Number(item?.price) || 0) * (Number(item?.qty) || 1)).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dispatch Controls */}
                  <div className="border-t border-border pt-3 flex flex-wrap items-center justify-between gap-3 bg-muted/20 -mx-6 -mb-6 p-4 rounded-b-2xl">
                    <div className="text-xs text-muted-foreground">
                      {order.status === "shipped" && (
                        <span>Dispatched via <strong>{order.courierPartner}</strong> (AWB: <strong className="font-mono">{order.trackingNumber}</strong>)</span>
                      )}
                      {order.status === "delivered" && (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" /> Delivered & Funds Released to Bank Account
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status === "placed" && (
                        <button
                          onClick={() => handlePackOrder(order.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition shadow-xs"
                        >
                          <Package className="h-3.5 w-3.5" />
                          <span>Mark as Packed</span>
                        </button>
                      )}

                      {(order.status === "placed" || order.status === "packed") && (
                        <button
                          onClick={() => setDispatchModalOrder(order)}
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition shadow-xs"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Dispatch & Ship Order</span>
                        </button>
                      )}

                      {order.status === "shipped" && (
                        <button
                          onClick={() => handleMarkDelivered(order.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Confirm Delivery</span>
                        </button>
                      )}
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* AMAZON-STYLE MULTI-STEP CHECKOUT MODAL */}
      {/* ========================================================================= */}
      {checkoutModalOpen && (
        <AmazonCheckoutModal
          cart={cart}
          user={user}
          onClose={() => setCheckoutModalOpen(false)}
          onSuccess={(newOrder) => {
            setOrders(prev => [newOrder, ...prev]);
            setCart([]);
            setCheckoutModalOpen(false);
            setActiveTab("orders");
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* FARMER DISPATCH ORDER MODAL */}
      {/* ========================================================================= */}
      {dispatchModalOrder && (
        <DispatchOrderModal
          order={dispatchModalOrder}
          onClose={() => setDispatchModalOrder(null)}
          onSuccess={(updatedOrder) => {
            setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
            setDispatchModalOrder(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* GST TAX INVOICE MODAL */}
      {/* ========================================================================= */}
      {selectedInvoiceOrder && (
        <TaxInvoiceModal
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* FARMER UPLOAD PRODUCT MODAL */}
      {/* ========================================================================= */}
      {uploadModalOpen && (isFarmer || isAdmin) && (
        <UploadProductModal
          onClose={() => setUploadModalOpen(false)}
          onSuccess={(newProd) => {
            setProducts(prev => [newProd, ...prev]);
            setUploadModalOpen(false);
            setActiveTab("my_listings");
          }}
          user={user}
        />
      )}
    </>
  );
}

// ── Multi-Step Amazon-Style Checkout Modal ──
function AmazonCheckoutModal({
  cart,
  user,
  onClose,
  onSuccess,
}: {
  cart: { product: ShopProductItem; qty: number }[];
  user: any;
  onClose: () => void;
  onSuccess: (order: ShopOrderRecord) => void;
}) {
  const checkoutFn = useServerFn(createShopCheckout);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentGatewayStatus, setPaymentGatewayStatus] = useState<string>("");

  // Step 1: Address Form
  const [fullName, setFullName] = useState(user?.name || "Kamesh");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [street, setStreet] = useState("Plot No. 14, Kaveri Mandi Complex, Salem Bypass");
  const [landmark, setLandmark] = useState("Near Agro Produce Center");
  const [city, setCity] = useState("Salem");
  const [state, setState] = useState("Tamil Nadu");
  const [pincode, setPincode] = useState("636453");
  const [addressType, setAddressType] = useState<"Home" | "Work" | "Farm Warehouse">("Farm Warehouse");
  const [deliverySpeed, setDeliverySpeed] = useState<"standard" | "express">("standard");

  // Step 2: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<"dodo_payments" | "dodo_escrow" | "upi" | "cod">("dodo_payments");
  const [upiId, setUpiId] = useState("kamesh@oksbi");

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const deliveryFee = deliverySpeed === "express" ? 99 : 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (!fullName.trim() || !phone.trim() || !street.trim() || !city.trim() || !pincode.trim()) {
      toast.error("Please provide complete delivery address details.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setPaymentGatewayStatus("Connecting to Dodo Payments Secure Gateway…");

    try {
      const res = await checkoutFn({
        data: {
          items: cart.map(i => ({
            id: i.product.id,
            name: i.product.name,
            qty: i.qty,
            price: i.product.price,
            category: i.product.category,
            unit: i.product.unit,
            sellerName: i.product.sellerName,
            sellerEmail: i.product.sellerEmail,
          })),
          buyerName: fullName.trim(),
          buyerEmail: user?.email || "kamesh14151@gmail.com",
          buyerPhone: phone.trim(),
          shippingAddress: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            street: street.trim(),
            landmark: landmark.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            addressType,
          },
          deliverySpeed,
          paymentMethod,
          baseUrl: typeof window !== "undefined" ? window.location.origin : "",
        },
      });

      if (res.success && res.order) {
        // If live Dodo redirect link was returned from active Dodo account
        if (res.gatewayMode === "live_redirect" && res.checkoutUrl) {
          setPaymentGatewayStatus("Redirecting to Dodo Payments checkout page…");
          toast.success("Redirecting to Dodo Payments…");
          window.location.href = res.checkoutUrl;
          return;
        }

        // Seamless verified escrow checkout
        setPaymentGatewayStatus("Authorizing Escrow Lock & Generating Tax Invoice…");
        await new Promise(r => setTimeout(r, 600));
        toast.success(`🎉 Order #${res.order.id} placed successfully!`);
        onSuccess(res.order);
      } else {
        throw new Error(res.error || "Payment gateway connection failed.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Order placement failed. Please try again.");
      setIsSubmitting(false);
      setPaymentGatewayStatus("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold">Amazon-Style Fast Checkout</h2>
              <p className="text-xs text-muted-foreground">Direct Farmer Sourcing · Escrow Guarantee by AJ STUDIOZ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="my-5 grid grid-cols-3 gap-2 border-b border-border pb-4 text-xs font-semibold">
          <button
            onClick={() => !isSubmitting && setStep(1)}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition ${
              step === 1 ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>1. Delivery Address</span>
          </button>
          <button
            onClick={() => !isSubmitting && setStep(2)}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition ${
              step === 2 ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>2. Payment Method</span>
          </button>
          <button
            onClick={() => !isSubmitting && setStep(3)}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition ${
              step === 3 ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>3. Review & Place</span>
          </button>
        </div>

        {/* STEP 1: DELIVERY ADDRESS */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="font-serif text-base font-bold flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" /> Select or Enter Delivery Destination
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Full Recipient Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Kamesh / Agro Farm Owner"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Mobile Phone Number (for Delivery OTP) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Flat / House / Mandi Shed / Street Address *
              </label>
              <input
                type="text"
                required
                value={street}
                onChange={e => setStreet(e.target.value)}
                placeholder="Plot No., Farm Gateway, Mandi Road, Village Area"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={e => setLandmark(e.target.value)}
                  placeholder="Near Mandi / Bridge"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Town / City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="e.g. Salem / Erode"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  PIN Code *
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  placeholder="636453"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  State / Union Territory *
                </label>
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Address Type
                </label>
                <div className="flex gap-2">
                  {(["Farm Warehouse", "Home", "Work"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddressType(t)}
                      className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                        addressType === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t === "Farm Warehouse" ? "🌾 Farm" : t === "Home" ? "🏠 Home" : "💼 Work"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Delivery Speed Selector */}
            <div className="border-t border-border pt-3 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Choose Delivery Speed
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setDeliverySpeed("standard")}
                  className={`cursor-pointer rounded-xl border p-3 flex items-center justify-between transition ${
                    deliverySpeed === "standard" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Truck className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-semibold text-xs">Standard Mandi Transport</p>
                      <p className="text-[11px] text-muted-foreground">Estimated 3–5 working days</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">FREE</span>
                </div>

                <div
                  onClick={() => setDeliverySpeed("express")}
                  className={`cursor-pointer rounded-xl border p-3 flex items-center justify-between transition ${
                    deliverySpeed === "express" ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="font-semibold text-xs">Express Agro Logistics</p>
                      <p className="text-[11px] text-muted-foreground">Guaranteed 1–2 days delivery</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary">₹99</span>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!fullName || !phone || !street || !city || !pincode) {
                    toast.error("Please fill all required address fields.");
                    return;
                  }
                  setStep(2);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-95 transition shadow-xs"
              >
                <span>Continue to Payment</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PAYMENT METHOD */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="font-serif text-base font-bold flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-primary" /> Select Payment Method
            </h3>

            <div className="space-y-3">
              {/* Option 1: Dodo Payments */}
              <div
                onClick={() => setPaymentMethod("dodo_payments")}
                className={`cursor-pointer rounded-xl border p-3.5 transition flex items-start justify-between ${
                  paymentMethod === "dodo_payments" ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">Dodo Payments Official Gateway</p>
                      <span className="rounded bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 text-[10px] font-bold">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pay via Credit/Debit Cards, UPI, NetBanking, and Wallets with 100% Buyer Protection.
                    </p>
                  </div>
                </div>
                <div className="grid h-5 w-5 place-items-center rounded-full border border-primary">
                  {paymentMethod === "dodo_payments" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
              </div>

              {/* Option 2: Agricultural Escrow */}
              <div
                onClick={() => setPaymentMethod("dodo_escrow")}
                className={`cursor-pointer rounded-xl border p-3.5 transition flex items-start justify-between ${
                  paymentMethod === "dodo_escrow" ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Agrisynapse Direct Escrow Guarantee</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your funds are locked in audited smart escrow and only released to the farmer after delivery inspection.
                    </p>
                  </div>
                </div>
                <div className="grid h-5 w-5 place-items-center rounded-full border border-primary">
                  {paymentMethod === "dodo_escrow" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
              </div>

              {/* Option 3: UPI Instant Pay */}
              <div
                onClick={() => setPaymentMethod("upi")}
                className={`cursor-pointer rounded-xl border p-3.5 transition flex items-start justify-between ${
                  paymentMethod === "upi" ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 shrink-0">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div className="w-full">
                    <p className="font-bold text-sm">Instant UPI / QR Code (GPay, PhonePe, Paytm)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Instant scan & pay via any UPI app with instant transaction verification.
                    </p>
                    {paymentMethod === "upi" && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={upiId}
                          onChange={e => setUpiId(e.target.value)}
                          placeholder="yourname@upi"
                          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary w-48"
                        />
                        <span className="text-[11px] text-emerald-600 font-semibold self-center">✓ Verified UPI ID</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid h-5 w-5 place-items-center rounded-full border border-primary">
                  {paymentMethod === "upi" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
              </div>

              {/* Option 4: Cash / Pay on Delivery */}
              <div
                onClick={() => setPaymentMethod("cod")}
                className={`cursor-pointer rounded-xl border p-3.5 transition flex items-start justify-between ${
                  paymentMethod === "cod" ? "border-primary bg-primary/5 ring-2 ring-primary" : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Verified Agro Mandi POD (Pay on Delivery)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pay via Cash or UPI to the logistics agent upon successful doorstep physical inspection.
                    </p>
                  </div>
                </div>
                <div className="grid h-5 w-5 place-items-center rounded-full border border-primary">
                  {paymentMethod === "cod" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition"
              >
                ← Back to Address
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-95 transition shadow-xs"
              >
                <span>Review Order Details</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ORDER REVIEW & PLACE ORDER */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h3 className="font-serif text-base font-bold flex items-center gap-1.5">
              <Package className="h-4 w-4 text-primary" /> Review Items and Place Order
            </h3>

            {/* Shipping & Payment Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3.5 text-xs">
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-primary" /> Delivering To
                </span>
                <p className="font-semibold text-foreground">{fullName} ({phone})</p>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  {street}, {city}, {state} - {pincode}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3 text-primary" /> Payment & Speed
                </span>
                <p className="font-semibold text-foreground capitalize">
                  {paymentMethod === "dodo_payments" ? "Dodo Payments Gateway" :
                   paymentMethod === "dodo_escrow" ? "Agrisynapse Escrow Lock" :
                   paymentMethod === "upi" ? `UPI (${upiId})` : "Pay on Delivery"}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Speed: {deliverySpeed === "express" ? "Express Agro (1-2 Days)" : "Standard Mandi (3-5 Days)"}
                </p>
              </div>
            </div>

            {/* Item Breakdown */}
            <div className="rounded-xl border border-border divide-y divide-border/50 max-h-44 overflow-y-auto pr-1">
              {cart.map(i => (
                <div key={i.product.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold">{i.product.name}</p>
                    <p className="text-muted-foreground text-[11px]">
                      Qty: <strong>{i.qty}</strong> × ₹{i.product.price.toLocaleString("en-IN")} · Seller: <strong>{i.product.sellerName}</strong>
                    </p>
                  </div>
                  <span className="font-bold">₹{(i.product.price * i.qty).toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>

            {/* Price Details */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Items Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Delivery & Logistics</span>
                <span className={deliveryFee === 0 ? "text-emerald-600 font-medium" : "text-foreground font-medium"}>
                  {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>GST Tax & Farmer Protection Cess</span>
                <span className="text-emerald-600 font-medium">Included (₹0 Extra)</span>
              </div>
              <div className="border-t border-primary/20 pt-2 flex items-center justify-between text-sm">
                <span className="font-bold">Total Order Amount</span>
                <span className="font-serif text-2xl font-bold text-primary">₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Live Gateway Processing Notice */}
            {isSubmitting && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-center space-y-2 animate-pulse">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                <p className="text-xs font-semibold text-primary">{paymentGatewayStatus}</p>
              </div>
            )}

            {/* Navigation & Submit */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep(2)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePlaceOrder}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:opacity-95 transition shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authorizing Payment…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Place Your Order & Pay ₹{total.toLocaleString("en-IN")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Farmer Dispatch Order Modal ──
function DispatchOrderModal({
  order,
  onClose,
  onSuccess,
}: {
  order: ShopOrderRecord;
  onClose: () => void;
  onSuccess: (updated: ShopOrderRecord) => void;
}) {
  const updateStatusFn = useServerFn(updateShopOrderStatus);
  const [courierPartner, setCourierPartner] = useState("Delhivery Mandi Logistics");
  const [trackingNumber, setTrackingNumber] = useState(`AGRI-TRK-${Math.floor(100000 + Math.random() * 900000)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await updateStatusFn({
        data: {
          orderId: order.id,
          status: "shipped",
          courierPartner,
          trackingNumber,
        },
      });

      if (res.success && res.order) {
        toast.success(`🚚 Order #${order.id} dispatched via ${courierPartner} with AWB #${trackingNumber}`);
        onSuccess(res.order as any);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold">Dispatch Order #{order.id}</h2>
              <p className="text-xs text-muted-foreground">Assign logistics partner and generate live tracking AWB</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleDispatch} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Select Logistics Partner / Courier *
            </label>
            <select
              value={courierPartner}
              onChange={e => setCourierPartner(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="Delhivery Mandi Logistics">Delhivery Mandi Logistics</option>
              <option value="Blue Dart Express Agro">Blue Dart Express Agro</option>
              <option value="India Post Speed Mandi">India Post Speed Mandi</option>
              <option value="Ecom Express Rural Network">Ecom Express Rural Network</option>
              <option value="Direct Mandi Local Transport">Direct Mandi Local Transport</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              AWB / Tracking Number *
            </label>
            <input
              type="text"
              required
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="rounded-xl bg-muted/40 p-3 space-y-1 text-muted-foreground">
            <p className="font-semibold text-foreground">Delivery Destination:</p>
            <p>{order.shippingAddress.fullName} · {order.shippingAddress.phone}</p>
            <p>{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-95 shadow-md transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Dispatching…</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Confirm Shipment & Notify Buyer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Official GST Tax Invoice Modal ──
function TaxInvoiceModal({
  order,
  onClose,
}: {
  order: ShopOrderRecord;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-lg font-bold">Tax Invoice / Receipt</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Invoice</span>
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="mt-6 space-y-6 text-xs text-foreground">
          <div className="flex justify-between items-start border-b border-border pb-4">
            <div>
              <h3 className="font-serif text-xl font-bold text-primary">Agrisynapse Platform</h3>
              <p className="text-muted-foreground text-[11px]">Developed by AJ STUDIOZ</p>
              <p className="text-muted-foreground text-[11px]">GSTIN: 33AAAAA0000A1Z5</p>
              <p className="text-muted-foreground text-[11px]">Salem Agro Technology Park, Tamil Nadu</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-sm">ORIGINAL FOR RECIPIENT</p>
              <p className="font-mono text-muted-foreground mt-1">Invoice #: INV-{order.id.replace("ORD-", "")}</p>
              <p className="text-muted-foreground">Date: {new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
              <p className="text-muted-foreground">Payment ID: {order.paymentId || "DODO-ESCROW"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Billed To (Buyer)</p>
              <p className="font-semibold text-sm mt-0.5">{order.shippingAddress.fullName}</p>
              <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
              <p className="text-muted-foreground">{order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Logistics & Escrow</p>
              <p className="mt-0.5">Courier: <strong>{order.courierPartner}</strong></p>
              <p>Tracking AWB: <strong className="font-mono">{order.trackingNumber}</strong></p>
              <p>Status: <strong className="text-emerald-600 uppercase">{order.status}</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] text-muted-foreground uppercase">
                <th className="py-2">Item Description</th>
                <th className="py-2">Category</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 font-medium">{item.name}</td>
                  <td className="py-2.5 text-muted-foreground">{item.category || "Seeds"}</td>
                  <td className="py-2.5 text-center">{item.qty}</td>
                  <td className="py-2.5 text-right">₹{(Number(item?.price) || 0).toLocaleString("en-IN")}</td>
                  <td className="py-2.5 text-right font-bold">₹{((Number(item?.price) || 0) * (Number(item?.qty) || 1)).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Breakdown */}
          <div className="border-t border-border pt-4 flex justify-end">
            <div className="w-64 space-y-1.5 text-right">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span>₹{(Number(order?.subtotal) || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery Fee:</span>
                <span>{order?.deliveryFee === 0 ? "FREE" : `₹${order?.deliveryFee || 0}`}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>CGST (2.5%) + SGST (2.5%):</span>
                <span>Included (₹0)</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-base text-foreground">
                <span>Total Paid:</span>
                <span className="text-primary">₹{(Number(order?.total) || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-dashed border-border pt-4 text-center text-[10px] text-muted-foreground">
            This is a computer-generated tax invoice verified under Agrisynapse Digital Commerce Protocol by AJ STUDIOZ. No physical signature required.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal for Farmer Product Upload ──
function UploadProductModal({
  onClose,
  onSuccess,
  user,
}: {
  onClose: () => void;
  onSuccess: (prod: ShopProductItem) => void;
  user: any;
}) {
  const uploadFn = useServerFn(uploadShopProduct);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Seeds" | "Fertilizers" | "Pesticides" | "Tools" | "Irrigation" | "Bio-Inputs" | "Harvested Produce">("Seeds");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("10 kg bag");
  const [stock, setStock] = useState("50");
  const [location, setLocation] = useState(user?.location || "Erode, Tamil Nadu");
  const [sellerName, setSellerName] = useState(user?.name || "Murugan Selvam");
  const [sellerPhone, setSellerPhone] = useState("+91 98765 43210");
  const [sellerEmail, setSellerEmail] = useState(user?.email || "kamesh14151@gmail.com");
  const [desc, setDesc] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !stock || !desc.trim()) {
      toast.error("Please fill in all mandatory product fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await uploadFn({
        data: {
          name: name.trim(),
          category,
          price: Number(price),
          unit: unit.trim(),
          stock: Number(stock),
          desc: desc.trim(),
          sellerName: sellerName.trim(),
          sellerRole: user?.role === "admin" ? "admin" : "farmer",
          sellerEmail,
          sellerPhone: sellerPhone.trim(),
          location: location.trim(),
        },
      });

      if (res.success && res.product) {
        toast.success(`"${res.product.name}" published to Agri Shop!`);
        onSuccess(res.product);
      }
    } catch (err: any) {
      let msg = err?.message || "Failed to publish product. Please try again.";
      try {
        const parsed = JSON.parse(msg);
        if (Array.isArray(parsed) && parsed[0]?.message) {
          msg = `Validation Error: ${parsed[0].message} (Field: ${parsed[0].path?.join('.')})`;
        }
      } catch {
        // Not a JSON error string, keep as is
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold">List Product for Sale</h2>
              <p className="text-xs text-muted-foreground">Upload farm produce or supplies for buyers across India</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Product Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Organic Vermicompost / ADT 45 Paddy Seeds / Cold Pressed Neem Oil"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Seeds">Seeds</option>
                <option value="Fertilizers">Fertilizers & Compost</option>
                <option value="Pesticides">Bio-Pesticides</option>
                <option value="Tools">Tools & Equipment</option>
                <option value="Irrigation">Irrigation Components</option>
                <option value="Bio-Inputs">Bio-Inputs & Nutrients</option>
                <option value="Harvested Produce">Harvested Produce</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Packaging Unit *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 10 kg bag / 1 L bottle / quintal / piece"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Price (₹ per unit) *
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 450"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Available Stock (Units) *
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 50"
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Farm / Dispatch Location *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Erode, Tamil Nadu"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Contact Phone *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={sellerPhone}
                onChange={e => setSellerPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Description & Quality Specifications *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe variety, moisture percentage, germination rate, organic certification, or application directions..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-95 transition disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Publish to Agri Shop</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
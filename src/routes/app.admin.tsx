import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Line, LineChart
} from "recharts";
import {
  Shield, Users, DollarSign, PackageCheck, AlertCircle, RefreshCw,
  CheckCircle2, Store, Lock, ArrowUpRight, Check, X, ShieldAlert, Cpu
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { ADMIN_SIGNUPS, ADMIN_STATS } from "@/lib/mock";
import { useAuth } from "@/lib/auth";
import {
  getAdminPlatformTelemetry,
  updateMarketplaceOrderStatus,
  updateListingStatus,
  type MarketplaceProduceListing,
  type MarketplaceOrder,
} from "@/lib/payments.server";

export const Route = createFileRoute("/app/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console & Oversight — Agrisynapse | AJ STUDIOZ" },
      { name: "description", content: "Platform operations, real-time marketplace monitoring, escrow status, and system controls." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const fetchTelemetry = useServerFn(getAdminPlatformTelemetry);
  const updateOrderFn = useServerFn(updateMarketplaceOrderStatus);
  const updateListingFn = useServerFn(updateListingStatus);

  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"marketplace" | "escrow" | "system">("marketplace");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchTelemetry();
      setTelemetry(data);
    } catch (err) {
      console.error("Admin telemetry fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadData();
    }
  }, [user]);

  if (user?.role !== "admin") {
    return (
      <Panel title="Administrator Access Restricted">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mb-3" />
          <h3 className="font-serif text-xl font-semibold">Restricted Clearance</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            This console is configured for platform administrators. Please sign in with an administrative account.
          </p>
        </div>
      </Panel>
    );
  }

  const handleReleaseEscrow = async (orderId: string) => {
    try {
      const res = await updateOrderFn({ data: { orderId, status: "completed" } });
      if (res.success) {
        toast.success("Admin Override: Escrow successfully released to farmer!");
        loadData();
      }
    } catch {
      toast.error("Failed to release escrow");
    }
  };

  const handleToggleListingStatus = async (listingId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "sold_out" : "active";
      const res = await updateListingFn({ data: { listingId, status: newStatus } });
      if (res.success) {
        toast.success(`Listing marked as ${newStatus}`);
        loadData();
      }
    } catch {
      toast.error("Failed to update listing");
    }
  };

  const gmv = telemetry?.gmv || 148500;
  const escrowHeld = telemetry?.escrowHeld || 46400;
  const totalOrders = telemetry?.totalOrders || 14;
  const activeListings = telemetry?.activeListings || 6;
  const listings: MarketplaceProduceListing[] = telemetry?.listings || [];
  const orders: MarketplaceOrder[] = telemetry?.marketplaceOrders || [];

  return (
    <>
      <PageIntro
        index="14 / Oversight"
        eyebrow="Platform Operations & Marketplace Control"
        title="Network Telemetry & Trade Supervision."
        subtitle="Monitor farmer produce publications, supervise buyer escrow transactions, and enforce platform integrity in real time."
      />

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex justify-between items-start">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total GMV Volume</p>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-3 font-serif text-3xl font-bold">₹{gmv.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">+18.4% trade growth this month</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex justify-between items-start">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Escrow Pool Locked</p>
            <Lock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-3 font-serif text-3xl font-bold">₹{escrowHeld.toLocaleString("en-IN")}</p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">Secured under Dodo Payments Escrow</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex justify-between items-start">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Active Trade Lots</p>
            <Store className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-serif text-3xl font-bold">{activeListings}</p>
          <p className="mt-1 text-xs text-primary font-medium">Across 12 Agricultural Districts</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex justify-between items-start">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Live Telemetry & Gateways</p>
            <Cpu className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-3 font-serif text-2xl font-bold text-emerald-600 dark:text-emerald-400">OPERATIONAL</p>
          <p className="mt-1 text-xs text-muted-foreground">Dodo API & Escrow Layer Online</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border border-border text-xs">
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "marketplace" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🌾 Marketplace Listings ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab("escrow")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "escrow" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🔒 Escrow Transactions & Bids ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "system" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 User Signups & System Health
          </button>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Tab: Marketplace Listings Supervision */}
      {activeTab === "marketplace" && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="font-serif text-lg font-semibold">Harvest Lot Governance</h3>
              <p className="text-xs text-muted-foreground">Review and moderate all farmer produce publications across the network.</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-2">Crop Lot</th>
                  <th className="pb-2">Farmer</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Quantity</th>
                  <th className="pb-2">Price / Unit</th>
                  <th className="pb-2">Grade</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listings.map(l => (
                  <tr key={l.id} className="hover:bg-muted/40 transition">
                    <td className="py-3 font-semibold text-foreground">{l.crop}</td>
                    <td className="py-3 text-muted-foreground">{l.farmer}</td>
                    <td className="py-3 text-muted-foreground">{l.location}</td>
                    <td className="py-3 font-medium">{l.quantity}</td>
                    <td className="py-3 font-serif font-bold">₹{l.price.toLocaleString("en-IN")}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                        Grade {l.grade}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        l.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleToggleListingStatus(l.id, l.status)}
                        className="rounded border border-border px-2 py-1 text-[11px] hover:bg-muted font-medium"
                      >
                        {l.status === "active" ? "Mark Sold" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Escrow Transactions & Bids */}
      {activeTab === "escrow" && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="font-serif text-lg font-semibold">Escrow Ledger & Buyer Transactions</h3>
              <p className="text-xs text-muted-foreground">Admin oversight on locked escrow accounts, fulfillment progress, and settlement releases.</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {orders.map(order => (
              <div key={order.id} className="rounded-xl border border-border/80 bg-background/50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{order.crop}</h4>
                    <span className="text-xs text-muted-foreground">({order.quantity})</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                      order.status === "completed" || order.status === "delivered"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Buyer: <strong>{order.buyerName}</strong> ({order.buyerPhone}) ➔ Farmer: <strong>{order.farmer}</strong>
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">
                    Payment Gateway Ref: <code className="bg-muted px-1 rounded">{order.paymentId}</code> ({order.paymentGateway})
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-serif text-lg font-bold">₹{order.totalAmount.toLocaleString("en-IN")}</p>
                    <p className="text-[11px] text-emerald-600 font-medium">
                      {order.escrowStatus === "released_to_farmer" ? "✓ Funds Released" : "🔒 Escrow Locked"}
                    </p>
                  </div>

                  {order.escrowStatus === "held_in_escrow" && (
                    <button
                      onClick={() => handleReleaseEscrow(order.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                    >
                      Admin Release
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: System Growth & Analytics */}
      {activeTab === "system" && (
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <Panel title="Platform Growth (Farmers vs Buyers)" className="lg:col-span-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ADMIN_SIGNUPS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={40} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="farmers" name="Farmer Signups" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="buyers" name="Buyer Signups" fill="var(--muted-foreground)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Production Gateways & Infrastructure">
            <div className="space-y-4 text-xs">
              <div className="rounded-xl border border-border p-3 space-y-1">
                <div className="flex justify-between font-medium">
                  <span>Razorpay Payment Gateway</span>
                  <span className="text-emerald-500">Live Integrated</span>
                </div>
                <p className="text-muted-foreground">Handles live checkout sessions, HMAC signature verification, and automated receipts.</p>

              </div>

              <div className="rounded-xl border border-border p-3 space-y-1">
                <div className="flex justify-between font-medium">
                  <span>Agricultural Escrow Core</span>
                  <span className="text-emerald-500">Active</span>
                </div>
                <p className="text-muted-foreground">Locks buyer capital until physical crop dispatch & weighment verification.</p>
              </div>

              <div className="rounded-xl border border-border p-3 space-y-1">
                <div className="flex justify-between font-medium">
                  <span>IoT Telemetry Fleet</span>
                  <span className="text-emerald-500">12 Nodes Online</span>
                </div>
                <p className="text-muted-foreground">LoRaWAN soil sensor network reporting every 15 minutes.</p>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}
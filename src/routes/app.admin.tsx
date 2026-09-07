import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Line, LineChart
} from "recharts";
import {
  Shield, Users, DollarSign, PackageCheck, AlertCircle, RefreshCw,
  CheckCircle2, Store, Lock, ArrowUpRight, Check, X, ShieldAlert, Cpu,
  UserPlus, Search, Edit2, Trash2, Mail, Phone, MapPin, Sprout
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { ADMIN_SIGNUPS, ADMIN_STATS } from "@/lib/mock";
import { useAuth, readAccounts, writeAccounts, type Account, type Role } from "@/lib/auth";
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
  const [activeTab, setActiveTab] = useState<"users" | "marketplace" | "escrow" | "system">("users");

  // User management state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Account | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<Role>("farmer");
  const [formPhone, setFormPhone] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formFarmSize, setFormFarmSize] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchTelemetry();
      setTelemetry(data);
      setAccounts(readAccounts());
    } catch (err) {
      console.error("Admin telemetry fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "manager") {
      loadData();
    }
  }, [user]);

  if (user?.role !== "admin" && user?.role !== "manager") {
    return (
      <Panel title="Administrator Access Restricted">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive mb-3" />
          <h3 className="font-serif text-xl font-semibold">Restricted Clearance</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            This console is configured for platform administrators and territory managers. Please sign in with an authorized account.
          </p>
        </div>
      </Panel>
    );
  }

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      return toast.error("Name and Email are required");
    }

    const currentList = readAccounts();
    if (editingUser) {
      // Update existing
      const updated = currentList.map(a => 
        a.email === editingUser.email 
          ? {
              ...a,
              name: formName.trim(),
              role: formRole,
              phone: formPhone.trim(),
              location: formLocation.trim(),
              farmSize: formFarmSize.trim(),
              password: formPassword ? formPassword : a.password,
            }
          : a
      );
      writeAccounts(updated);
      setAccounts(updated);
      toast.success(`User ${formName} updated successfully`);
    } else {
      // Add new
      if (currentList.some(a => a.email.toLowerCase() === formEmail.trim().toLowerCase())) {
        return toast.error("An account with this email already exists");
      }
      const newAcc: Account = {
        id: `usr_${formEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword || "farmer123",
        role: formRole,
        phone: formPhone.trim() || "+91 98000 00000",
        location: formLocation.trim() || "Tamil Nadu, India",
        farmSize: formFarmSize.trim() || "2.5 ha",
      };
      const updated = [...currentList, newAcc];
      writeAccounts(updated);
      setAccounts(updated);
      toast.success(`User ${formName} created successfully`);
    }

    setShowAddModal(false);
    setEditingUser(null);
    resetForm();
  };

  const handleDeleteUser = (email: string) => {
    if (email === user?.email) {
      return toast.error("You cannot delete your own active session account");
    }
    const currentList = readAccounts();
    const updated = currentList.filter(a => a.email !== email);
    writeAccounts(updated);
    setAccounts(updated);
    toast.success("User removed successfully");
  };

  const handleRoleChange = (email: string, newRole: Role) => {
    const currentList = readAccounts();
    const updated = currentList.map(a => a.email === email ? { ...a, role: newRole } : a);
    writeAccounts(updated);
    setAccounts(updated);
    toast.success(`Role updated to ${newRole}`);
  };

  const openEditModal = (acc: Account) => {
    setEditingUser(acc);
    setFormName(acc.name);
    setFormEmail(acc.email);
    setFormPassword("");
    setFormRole(acc.role);
    setFormPhone(acc.phone || "");
    setFormLocation(acc.location || "");
    setFormFarmSize(acc.farmSize || "");
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("farmer");
    setFormPhone("");
    setFormLocation("");
    setFormFarmSize("");
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.location && acc.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (acc.phone && acc.phone.includes(searchQuery));
    const matchesRole = selectedRoleFilter === "all" || acc.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

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
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-card border border-border text-xs">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeTab === "users" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Users & Farmers ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "marketplace" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🌾 Marketplace Listings ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab("escrow")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "escrow" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🔒 Escrow Transactions ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              activeTab === "system" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📊 System Health
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "users" && (
            <button
              onClick={() => {
                resetForm();
                setEditingUser(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add User
            </button>
          )}
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab: Users & Farmers Directory */}
      {activeTab === "users" && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h3 className="font-serif text-lg font-semibold">User & Farmer Accounts Directory</h3>
              <p className="text-xs text-muted-foreground">Manage platform accounts, update permissions, assign roles, and view registered farms.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, email, phone..."
                  className="rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary w-48 sm:w-60"
                />
              </div>

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="all">All Roles</option>
                <option value="farmer">Farmers</option>
                <option value="manager">Managers</option>
                <option value="admin">Admins</option>
                <option value="user">Users</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="pb-2">User Details</th>
                  <th className="pb-2">Role & Access</th>
                  <th className="pb-2">Contact</th>
                  <th className="pb-2">Location & Farm</th>
                  <th className="pb-2">Change Role</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No accounts matched your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => (
                    <tr key={acc.email} className="hover:bg-muted/30 transition">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                            acc.role === "admin" ? "bg-rose-500/15 text-rose-600" :
                            acc.role === "manager" ? "bg-amber-500/15 text-amber-600" :
                            acc.role === "farmer" ? "bg-emerald-500/15 text-emerald-600" :
                            "bg-blue-500/15 text-blue-600"
                          }`}>
                            {acc.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">{acc.name}</p>
                            <p className="text-[11px] text-muted-foreground">{acc.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          acc.role === "admin" ? "bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20" :
                          acc.role === "manager" ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20" :
                          acc.role === "farmer" ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20" :
                          "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20"
                        }`}>
                          {acc.role}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground/70" /> {acc.phone || "—"}</p>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground/70" /> {acc.location || "Tamil Nadu"}</p>
                          {acc.farmSize && <p className="text-[10px] text-muted-foreground/80">Farm: {acc.farmSize}</p>}
                        </div>
                      </td>
                      <td className="py-3">
                        <select
                          value={acc.role}
                          onChange={(e) => handleRoleChange(acc.email, e.target.value as Role)}
                          className="rounded border border-border bg-background px-2 py-1 text-[11px] outline-none"
                        >
                          <option value="farmer">Farmer</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                          <option value="user">User</option>
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(acc)}
                            title="Edit User"
                            className="grid h-7 w-7 place-items-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(acc.email)}
                            title="Delete User"
                            disabled={acc.email === user?.email}
                            className="grid h-7 w-7 place-items-center rounded-lg border border-border hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-lg font-bold text-foreground">
                {editingUser ? "Edit User Account" : "Add New User Account"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingUser(null);
                }}
                className="grid h-7 w-7 place-items-center rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={Boolean(editingUser)}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="user@agrisynapse.in"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Role *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as Role)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="farmer">Farmer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Password {editingUser && "(optional)"}</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUser ? "Leave blank to keep" : "••••••••"}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98400 00000"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Farm Size (e.g. 4 ha)</label>
                  <input
                    type="text"
                    value={formFarmSize}
                    onChange={(e) => setFormFarmSize(e.target.value)}
                    placeholder="3.5 ha"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Location / District</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Salem, Tamil Nadu"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                  }}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                >
                  {editingUser ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Leaf, Tractor, User as UserIcon, Loader2, ArrowRight, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Agrisynapse" },
      { name: "description", content: "Sign in to your Agrisynapse field workspace." },
    ],
  }),
  component: LoginPage,
});

const ROLES = [
  { id: "farmer",  label: "Farmer",  icon: Tractor,    desc: "Manage your fields" },
  { id: "manager", label: "Manager", icon: ShieldAlert, desc: "Regional oversight" },
  { id: "admin",   label: "Admin",   icon: UserIcon,   desc: "System & user controls" },
];

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"farmer" | "manager" | "admin">("farmer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill in all fields"); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const ok = login(email, password, role as any, false);
    if (ok) {
      toast.success("Welcome back!");
      navigate({ to: "/app", replace: true });
    } else {
      toast.error("Invalid credentials");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex" style={{
      background: "radial-gradient(ellipse 70% 65% at -5% 110%, rgba(160,196,230,0.55), transparent 65%), radial-gradient(ellipse 65% 60% at 105% -5%, rgba(195,228,80,0.42), transparent 60%), #f5f6f0",
    }}>

      {/* ── Left panel — brand visual ────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 flex-col relative overflow-hidden">
        <img
          src="/schwoaze-nature-3526840_1920.jpg"
          alt="Farm"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(160deg, rgba(26,26,24,0.75) 0%, rgba(40,70,10,0.65) 100%)",
        }} />

        {/* Content */}
        <div className="relative flex flex-col justify-between h-full p-10">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
              <Leaf className="h-4 w-4 text-white" />
            </span>
            <span className="text-[14px] font-semibold text-white">Agrisynapse</span>
          </div>

          <div>
            <h2 className="text-4xl font-bold tracking-[-0.04em] text-white leading-[1.1]">
              Data Meets<br />
              <span style={{ color: "#c8e44a" }}>Growth.</span>
            </h2>
            <p className="mt-4 text-[14px] text-white/60 max-w-xs leading-relaxed">
              Real-time soil intelligence, IoT telemetry and AI diagnostics — all in one workspace.
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[["72%", "Fields optimal"], ["3 nodes", "Connected"], ["+2.3%", "Weekly growth"]].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-4">
                  <p className="text-lg font-bold text-white">{v}</p>
                  <p className="text-[10px] text-white/55 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px] animate-scale-in">

          {/* Logo — mobile only */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#1a1a18]">
              <Leaf className="h-4 w-4 text-white" />
            </span>
            <span className="text-[14px] font-semibold text-[#1a1a18]">Agrisynapse</span>
          </div>

          <h1 className="text-[26px] font-bold tracking-[-0.04em] text-[#1a1a18]">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[#7a7a72]">
            Sign in to your field workspace.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">

            {/* Role selector */}
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id as any)}
                  className={`flex flex-col items-start rounded-[14px] border p-3.5 text-left transition-all duration-150 ${
                    role === r.id
                      ? "border-[#c8e44a] bg-[rgba(184,217,64,0.10)] shadow-[0_0_0_1px_rgba(184,217,64,0.5)]"
                      : "border-black/[0.08] bg-white/60 hover:bg-white hover:border-black/[0.14]"
                  }`}
                >
                  <span className={`grid h-7 w-7 place-items-center rounded-[8px] mb-2 ${
                    role === r.id ? "bg-[rgba(184,217,64,0.25)]" : "bg-black/[0.06]"
                  }`}>
                    <r.icon className={`h-3.5 w-3.5 ${role === r.id ? "text-[#3d5a00]" : "text-[#7a7a72]"}`} />
                  </span>
                  <p className={`text-[12.5px] font-semibold ${role === r.id ? "text-[#1a1a18]" : "text-[#7a7a72]"}`}>{r.label}</p>
                  <p className="text-[10.5px] text-[#7a7a72] mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[12px] font-semibold text-[#1a1a18] mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "farmer" ? "farmer@agrisynapse.in" : role === "manager" ? "manager@agrisynapse.in" : "admin@agrisynapse.in"}
                className="input-premium w-full px-3.5 py-2.5 text-[13.5px] text-[#1a1a18] placeholder:text-[#7a7a72]"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-[#1a1a18]">Password</label>
                <a href="#" className="text-[11px] text-[#7a7a72] hover:text-[#1a1a18] transition">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-premium w-full px-3.5 py-2.5 text-[13.5px] pr-10 text-[#1a1a18]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7a72] hover:text-[#1a1a18] transition"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Hint */}
            <button
              type="button"
              onClick={() => {
                if (role === "farmer") { setEmail("farmer@agrisynapse.in"); setPassword("farmer123"); }
                else if (role === "manager") { setEmail("manager@agrisynapse.in"); setPassword("manager123"); }
                else if (role === "admin") { setEmail("admin@agrisynapse.in"); setPassword("admin123"); }
              }}
              className="w-full text-left text-[11px] text-[#7a7a72] bg-[rgba(184,217,64,0.10)] hover:bg-[rgba(184,217,64,0.20)] transition border border-[rgba(184,217,64,0.25)] rounded-[10px] px-3 py-2"
            >
              <span className="font-semibold text-[#3d5a00]">Click to auto-fill</span> {role === "farmer" ? "Farmer" : role === "manager" ? "Manager" : "Admin"} demo credentials
            </button>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-[14px] font-semibold mt-2"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><span>Sign in</span><ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-[#7a7a72]">
            Don't have an account?{" "}
            <Link to="/" className="font-semibold text-[#1a1a18] hover:underline">Contact us</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

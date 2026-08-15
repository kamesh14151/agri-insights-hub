import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Leaf, Shield, Tractor, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type Role } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Agrisynapse" },
      { name: "description", content: "Sign in to Agrisynapse as an admin, farmer or buyer to access field intelligence, marketplace and services." },
      { property: "og:title", content: "Sign in — Agrisynapse" },
      { property: "og:description", content: "Role based access for admins, farmers and buyers on the Agrisynapse platform." },
    ],
  }),
  component: LoginPage,
});

const ROLES: { id: Role; label: string; hint: string; icon: typeof Shield; demo: string }[] = [
  { id: "farmer", label: "Farmer", hint: "Fields, sensors, selling", icon: Tractor, demo: "farmer@agrisynapse.in / farmer123" },
  { id: "user", label: "Buyer", hint: "Buy produce & supplies", icon: UserIcon, demo: "user@agrisynapse.in / user123" },
  { id: "admin", label: "Admin", hint: "Platform operations", icon: Shield, demo: "admin@agrisynapse.in / admin123" },
];

function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<Role>("farmer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  const active = ROLES.find((r) => r.id === role)!;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const u = login(email, password, role, remember);
        toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
      } else {
        register({ name, email, password, role, location });
        toast.success("Account created");
      }
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    const [d1, d2] = active.demo.split(" / ");
    setEmail(d1);
    setPassword(d2);
    setMode("login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between border-r border-border p-12">
        <Link to="/" className="flex items-center gap-2 font-serif text-xl">
          <img src="/logo.png" alt="Agrisynapse Logo" className="h-8 w-8 object-contain shrink-0" />
          Agrisynapse
        </Link>
        <div>
          <h2 className="font-serif text-5xl leading-[1.05] tracking-tight">
            The nervous system<br />of the modern farm.
          </h2>
          <p className="mt-6 max-w-md text-muted-foreground leading-relaxed">
            Disease detection, live soil telemetry, crop and market intelligence, a farmer-to-buyer marketplace and on-demand services — in one calm workspace.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-6 text-sm">
          {[["12,480", "Farmers"], ["3,214", "IoT nodes"], ["₹2.9 Cr", "Traded"]].map(([v, l]) => (
            <div key={l}>
              <dt className="font-serif text-2xl">{v}</dt>
              <dd className="text-muted-foreground">{l}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden mb-8 flex items-center gap-2 font-serif text-lg">
            <img src="/logo.png" alt="Agrisynapse Logo" className="h-8 w-8 object-contain shrink-0" />
            Agrisynapse
          </Link>

          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose how you use Agrisynapse.</p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  role === r.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                }`}
              >
                <r.icon className={`mb-2 h-4 w-4 ${role === r.id ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium leading-tight">{r.label}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{r.hint}</p>
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <Field label="Full name" value={name} onChange={setName} placeholder="Murugan Selvam" required />
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@farm.in" required />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />
            {mode === "register" && (
              <Field label="Location" value={location} onChange={setLocation} placeholder="Erode, Tamil Nadu" />
            )}

            {mode === "login" && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-primary" />
                Remember me on this device
              </label>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? `Sign in as ${active.label.toLowerCase()}` : "Create account"}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-primary hover:underline">
              {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
            <button onClick={fillDemo} className="text-muted-foreground hover:text-foreground">
              Use demo {active.label.toLowerCase()}
            </button>
          </div>

          <p className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Demo credentials — {active.demo}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
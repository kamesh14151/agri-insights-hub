import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Leaf, Shield, Tractor, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type Role } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { sendEmailFn } from "@/routes/api.send-email";
import { supabase } from "@/lib/supabase";
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
  const sendEmail = useServerFn(sendEmailFn);
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
        sendEmail({ data: { type: "login", to: u.email, name: u.name } }).catch(console.error);
      } else {
        const u = register({ name, email, password, role, location });
        toast.success("Account created");
        sendEmail({ data: { type: "welcome", to: u.email, name: u.name, role: u.role } }).catch(console.error);
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

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/auth/callback",
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Could not connect to Google");
    }
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

          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className="h-px flex-1 bg-border"></div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Or</span>
            <div className="h-px flex-1 bg-border"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium transition hover:bg-muted"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm">
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
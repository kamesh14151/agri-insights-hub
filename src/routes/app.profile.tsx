import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageIntro, Panel } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Agrisynapse" },
      { name: "description", content: "Manage your Agrisynapse profile: name, contact, location and farm size." },
      { property: "og:title", content: "Profile — Agrisynapse" },
      { property: "og:description", content: "Keep your farm details accurate for better recommendations." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, update } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    location: user?.location ?? "",
    farmSize: user?.farmSize ?? "",
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update(form);
    toast.success("Profile updated");
  };

  return (
    <>
      <PageIntro
        index="12 / You"
        eyebrow="Account"
        title="Your farm on record."
        subtitle="Accurate location and plot size sharpen every recommendation the platform makes for you."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Panel>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/15 font-serif text-2xl text-primary">
              {(user?.name ?? "G").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-serif text-xl">{user?.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] capitalize text-primary">{user?.role}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Edit details">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {([
              ["name", "Full name"],
              ["phone", "Phone"],
              ["location", "Location"],
              ["farmSize", "Farm size"],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            ))}
            <div className="sm:col-span-2">
              <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
                Save changes
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
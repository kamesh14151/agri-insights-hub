import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading your workspace…
      </div>
    );
  }

  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
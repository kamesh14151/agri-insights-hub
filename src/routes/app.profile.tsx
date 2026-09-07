import { createFileRoute, redirect } from "@tanstack/react-router";

// Profile is now accessible via the top-right modal in DashboardShell
export const Route = createFileRoute("/app/profile")({
  beforeLoad: () => {
    throw redirect({ to: "/app", replace: true });
  },
  component: () => null,
});
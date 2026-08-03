import { createFileRoute, redirect } from "@tanstack/react-router";

// Voice Assistant is now the floating widget — redirect old page URL to dashboard
export const Route = createFileRoute("/app/voice")({
  beforeLoad: () => {
    throw redirect({ to: "/app", replace: true });
  },
  component: () => null,
});
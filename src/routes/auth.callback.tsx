import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { sendEmailFn } from "@/lib/email.actions";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const sendEmail = useServerFn(sendEmailFn);

  useEffect(() => {
    (async () => {
      try {
        // Exchange code in URL for a Supabase session
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          // Try exchanging the hash/code from URL
          const { data: exchanged, error: exchErr } =
            await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchErr || !exchanged.session) {
            toast.error("Google sign-in failed. Please try again.");
            navigate({ to: "/login" });
            return;
          }
          const user = exchanged.session.user;
          const isNew = user.created_at === user.updated_at;
          const sessionUser = loginWithGoogle({
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
            email: user.email!,
            role: "user",
            avatarUrl: user.user_metadata?.avatar_url,
          });
          toast.success(`Welcome, ${sessionUser.name.split(" ")[0]}!`);
          if (isNew) {
            sendEmail({ data: { type: "welcome", to: sessionUser.email, name: sessionUser.name, role: sessionUser.role } }).catch(() => {});
          } else {
            sendEmail({ data: { type: "login", to: sessionUser.email, name: sessionUser.name } }).catch(() => {});
          }
          navigate({ to: "/app" });
          return;
        }

        const user = data.session.user;
        const sessionUser = loginWithGoogle({
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email!,
          role: "user",
          avatarUrl: user.user_metadata?.avatar_url,
        });
        toast.success(`Welcome back, ${sessionUser.name.split(" ")[0]}!`);
        sendEmail({ data: { type: "login", to: sessionUser.email, name: sessionUser.name } }).catch(() => {});
        navigate({ to: "/app" });
      } catch {
        toast.error("Authentication error. Please try again.");
        navigate({ to: "/login" });
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
        <p className="text-sm text-muted-foreground font-medium">Completing Google sign-in…</p>
      </div>
    </div>
  );
}

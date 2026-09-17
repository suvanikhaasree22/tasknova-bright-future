import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskNova — a warm little studio for your tasks" },
      {
        name: "description",
        content:
          "Sign in to TaskNova to capture tasks, set due dates, filter what matters and clear your day.",
      },
      { property: "og:title", content: "TaskNova — a warm little studio for your tasks" },
      {
        property: "og:description",
        content: "Capture tasks, set due dates, and clear your day in one cheerful place.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Almost there! Check your email to confirm your account.");
        } else {
          navigate({ to: "/dashboard", replace: true });
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in didn't work. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen bg-background font-body text-foreground">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <div className="pop grid size-11 place-items-center rounded-2xl bg-berry font-display text-xl font-bold text-primary-foreground">
            T
          </div>
          <div>
            <p className="font-display text-xl font-bold leading-none">TaskNova</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Task Studio
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 pb-16 md:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-6">
            <div className="pop-lg relative overflow-hidden rounded-[2rem] bg-berry p-7 text-primary-foreground md:p-9">
              <div className="absolute -right-6 -top-10 size-40 rounded-full bg-sun/30" />
              <div className="absolute -bottom-16 -left-8 size-52 rounded-full bg-coral/30" />
              <div className="relative">
                <p className="mb-1 font-display text-sm font-semibold text-sun">Welcome to</p>
                <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
                  Your day, <span className="text-sun">sorted warmly.</span>
                </h1>
                <p className="mt-4 max-w-md font-medium text-primary-foreground/85">
                  Capture tasks, give them due dates, filter what's late, and tick things off. No
                  clutter, no cold dashboards.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Your tasks", value: "∞", bg: "bg-sun" },
                { label: "Due dates", value: "✓", bg: "bg-mint" },
                { label: "Search", value: "⌕", bg: "bg-clay" },
                { label: "On mobile", value: "☺", bg: "bg-coral text-primary-foreground" },
              ].map((card) => (
                <div key={card.label} className={`pop rounded-3xl p-5 ${card.bg}`}>
                  <p className="font-display text-4xl font-bold leading-none">{card.value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                    {card.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="self-start lg:sticky lg:top-6">
            <div className="pop-lg rounded-[2rem] bg-card p-6">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-mint" />
                <p className="font-display text-lg font-semibold">
                  {mode === "signin" ? "Welcome back" : "Join TaskNova"}
                </p>
              </div>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                Free for personal boards. Your tasks stay yours.
              </p>

              <div className="mt-5 flex rounded-full bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`h-10 flex-1 rounded-full text-sm font-bold ${
                    mode === "signin" ? "bg-ink text-primary-foreground" : "text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`h-10 flex-1 rounded-full text-sm font-bold ${
                    mode === "register" ? "bg-ink text-primary-foreground" : "text-foreground"
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {mode === "register" && (
                  <>
                    <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Your name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Aria Rao"
                      className="mt-1.5 h-12 w-full rounded-2xl bg-background px-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-coral/25"
                    />
                  </>
                )}

                <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aria@studio.co"
                  className="mt-1.5 h-12 w-full rounded-2xl bg-background px-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-coral/25"
                />

                <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 h-12 w-full rounded-2xl bg-background px-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-coral/25"
                />

                <button
                  type="submit"
                  disabled={busy || loading}
                  className="pop pop-press mt-5 w-full rounded-2xl bg-coral py-3.5 font-display font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {mode === "signin" ? "Sign in →" : "Create my board →"}
                </button>
              </form>

              <button
                type="button"
                onClick={handleGoogle}
                className="mt-3 w-full rounded-2xl border-2 border-ink/10 bg-background py-3.5 font-display font-semibold"
              >
                Continue with Google
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

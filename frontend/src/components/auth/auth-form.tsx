"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authApi } from "@/lib/api";
import { setStoredToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/format";
import { Badge, Button, Card, Input } from "@/components/ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLogin = mode === "login";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = isLogin
        ? await authApi.login({
            email,
            password,
          })
        : await authApi.register({
            email,
            password,
            full_name: fullName || undefined,
            timezone,
          });

      setStoredToken(response.access_token);
      router.replace("/dashboard");
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.15),_transparent_28%),linear-gradient(180deg,_rgba(2,6,23,0.88),_rgba(2,6,23,1))]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <Badge tone="success">Personal Execution OS</Badge>
          <div className="space-y-5">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.07em] text-white sm:text-6xl">
              Multi-agent execution, planning, and personal operations in one
              dashboard.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              The backend already exposes auth, execution, agent workflows,
              integrations, approvals, and analytics. This frontend turns that
              surface into a mobile-ready operating layer.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:max-w-3xl">
            {[
              "Goal, task, and plan orchestration",
              "Study, life admin, job search, and health agents",
              "Approvals, notifications, and Google integrations",
              "Analytics, final summaries, and demo seeding",
            ].map((item) => (
              <Card key={item} className="bg-white/6 p-4">
                <p className="text-sm leading-6 text-slate-200">{item}</p>
              </Card>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-xl border-white/12 bg-slate-950/85 p-6 sm:p-8">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
              {isLogin ? "Welcome back" : "Create account"}
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
              {isLogin ? "Sign in to your workspace" : "Provision a new workspace"}
            </h2>
            <p className="text-sm leading-6 text-slate-400">
              {isLogin
                ? "Use the API-issued bearer token flow and continue into the protected dashboard."
                : "Register through the backend auth endpoint, store the token locally, and enter the dashboard."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {!isLogin ? (
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Full name</span>
                <Input
                  placeholder="Atharva W."
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Email</span>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-slate-300">Password</span>
              <Input
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {!isLogin ? (
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Timezone</span>
                <Input
                  placeholder="America/New_York"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                />
              </label>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <Button className="w-full" size="lg" type="submit" disabled={submitting}>
              {submitting
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
            <span>
              {isLogin ? "Need an account?" : "Already have an account?"}
            </span>
            <Link
              href={isLogin ? "/register" : "/login"}
              className="font-medium text-cyan-200 transition hover:text-cyan-100"
            >
              {isLogin ? "Register" : "Sign in"}
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

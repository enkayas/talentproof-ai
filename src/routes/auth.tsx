import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2, Mail, Lock, Building2 } from "lucide-react";

type AuthSearch = { mode?: "login" | "signup"; redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search.mode === "signup" ? "signup" : "login",
    redirect: typeof search.redirect === "string" ? search.redirect : "/dashboard",
  }),
  head: () => ({
    meta: [
      { title: "Recruiter Login & Sign Up — TalentFirst" },
      {
        name: "description",
        content:
          "Log in or create your TalentFirst recruiter account. Start screening freshers on proof, not keywords.",
      },
    ],
  }),
  component: AuthPage,
});

const PURPLE_GLOW =
  "radial-gradient(50% 60% at 50% 30%, color-mix(in oklab, var(--accent-purple) 55%, transparent) 0%, transparent 70%)";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex h-7 w-10 items-center justify-center rounded-full border border-foreground/80">
        <div className="h-2 w-2 rounded-full bg-foreground" />
      </div>
      <span className="text-xl font-semibold tracking-tight">TalentFirst</span>
    </Link>
  );
}

function AuthPage() {
  const { mode: initialMode, redirect } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(initialMode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // TODO: wire to Supabase auth (signInWithPassword / signUp) once
      // VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY are available.
      await new Promise((r) => setTimeout(r, 600));
      navigate({ to: redirect ?? "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-70"
        style={{ background: PURPLE_GLOW }}
      />
      <header className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Logo />
        <Link
          to="/"
          className="text-sm text-foreground/70 transition hover:text-foreground"
        >
          ← Back to home
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex max-w-md flex-col items-center px-6 pb-24 pt-8 sm:pt-12">
        <h1 className="text-center font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
          {isSignup ? (
            <>
              Start hiring on{" "}
              <span className="italic text-[var(--accent-purple)]">proof.</span>
            </>
          ) : (
            <>
              Welcome <span className="italic text-[var(--accent-purple)]">back.</span>
            </>
          )}
        </h1>
        <p className="mt-4 text-center text-base text-foreground/70">
          {isSignup
            ? "Create your recruiter account. Free for early-stage teams."
            : "Log in to your recruiter dashboard."}
        </p>

        <div className="mt-10 w-full rounded-2xl border border-border bg-card/60 p-2 backdrop-blur">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-background/40 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                !isSignup
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-lg py-2 text-sm font-medium transition ${
                isSignup
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 p-6">
            {isSignup && (
              <Field
                icon={<Building2 className="h-4 w-4" />}
                label="Company"
                type="text"
                placeholder="Acme Inc."
                value={company}
                onChange={setCompany}
                required
              />
            )}
            <Field
              icon={<Mail className="h-4 w-4" />}
              label="Work email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={setEmail}
              required
            />
            <Field
              icon={<Lock className="h-4 w-4" />}
              label="Password"
              type="password"
              placeholder={isSignup ? "At least 8 characters" : "Your password"}
              value={password}
              onChange={setPassword}
              required
              minLength={isSignup ? 8 : undefined}
            />

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignup ? "Create account" : "Log in"}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>

            <p className="pt-2 text-center text-xs text-foreground/60">
              {isSignup ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  New to TalentFirst?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Create an account
                  </button>
                </>
              )}
            </p>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-foreground/50">
          By continuing you agree to our Terms and Privacy Policy.
        </p>
      </section>
    </main>
  );
}

function Field({
  icon,
  label,
  type,
  placeholder,
  value,
  onChange,
  required,
  minLength,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground/70">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5 transition focus-within:border-[var(--accent-purple)]">
        <span className="text-foreground/50">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
        />
      </div>
    </label>
  );
}

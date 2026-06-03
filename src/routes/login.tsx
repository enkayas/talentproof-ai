import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Recruiter Login — TalentFirst" },
      { name: "description", content: "Log in to your TalentFirst recruiter dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recruiter Login</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder login screen. Wire up authentication when ready.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex text-sm font-medium text-primary hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Recruiter Dashboard — TalentFirst" },
      { name: "description", content: "Create a job screening link and review your ranked leaderboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create a Job Link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Placeholder dashboard. The full builder lands here next.
        </p>
        <Link to="/" className="mt-6 inline-flex text-sm font-medium text-primary hover:underline">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}

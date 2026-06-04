import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Link2,
  PlusCircle,
  Users,
  LogOut,
  Copy,
  Trophy,
  Check,
  Plus,
  Sparkles,
} from "lucide-react";
import { CreateLinkWizard } from "@/components/CreateLinkWizard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Recruiter Dashboard — TalentFirst" },
      {
        name: "description",
        content:
          "Manage your active job screening links, review applicant volume, and unlock top-ranked candidates.",
      },
    ],
  }),
  component: DashboardPage,
});

const PURPLE_GLOW =
  "radial-gradient(50% 60% at 80% 0%, color-mix(in oklab, var(--accent-purple) 55%, transparent) 0%, transparent 70%)";

type NavKey = "active" | "create" | "shortlist";

const NAV_ITEMS: { key: NavKey; label: string; icon: typeof Link2; badge?: number }[] = [
  { key: "active", label: "Active Links", icon: Link2 },
  { key: "create", label: "Create New Link", icon: PlusCircle },
  { key: "shortlist", label: "Shortlist Hub", icon: Users, badge: 12 },
];

const JOBS = [
  { title: "Social Media Intern", applicants: 42, top: 94 },
  { title: "Customer Success Associate", applicants: 65, top: 96 },
  { title: "Content Writer", applicants: 18, top: 89 },
];

const SCORERS = [
  { id: 482, role: "Customer Success Associate", score: 96 },
  { id: 479, role: "Social Media Intern", score: 92 },
];

function DashboardPage() {
  const [active, setActive] = useState<NavKey>("active");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-64 bg-background/80 backdrop-blur border-r border-border z-20">
        <div className="px-6 py-6 flex items-center gap-2.5 border-b border-border">
          <div className="flex h-9 w-12 items-center justify-center rounded-full border border-foreground/80">
            <div className="h-2 w-2 rounded-full bg-foreground" />
          </div>
          <div>
            <div className="text-foreground font-semibold tracking-tight">TalentFirst</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Recruiter Suite
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  isActive
                    ? "bg-accent-purple/15 text-foreground border-accent-purple/30"
                    : "text-foreground/60 hover:text-foreground hover:bg-card border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge != null && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-accent-purple text-background"
                        : "bg-card text-foreground/80"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 pt-4 border-t border-border">
          <div className="px-3 py-2 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-accent-purple/30 flex items-center justify-center text-sm font-semibold text-foreground">
              A
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">Acme Corp</div>
              <div className="text-xs text-muted-foreground truncate">HR · Recruiter</div>
            </div>
          </div>
          <Link
            to="/"
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground/60 hover:text-foreground hover:bg-card transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 min-w-0 relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: PURPLE_GLOW }}
        />

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-6 py-4 border-b border-border relative">
          <div className="flex h-8 w-10 items-center justify-center rounded-full border border-foreground/80">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
          </div>
          <span className="font-semibold">TalentFirst</span>
        </div>

        <div className="relative px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
          {active === "create" ? (
            <>
              <header className="mb-10 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                    New Screening
                  </p>
                  <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-foreground">
                    Create a <span className="italic text-accent-purple">link</span>
                  </h1>
                </div>
                <button
                  onClick={() => setActive("active")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </header>
              <CreateLinkWizard />
            </>
          ) : (
            <>
              {/* Header */}
              <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
                <div>
                  <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-foreground">
                    Welcome back,{" "}
                    <span className="italic text-accent-purple">Recruiter</span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">{today}</p>
                </div>
                <button
                  onClick={() => setActive("create")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4" />
                  Create New Link
                </button>
              </header>

              {/* Metric ribbon */}
              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                <MetricCard label="Active Links" value="4" />
                <MetricCard label="Applicants Evaluated" value="1,240" />
                <MetricCard label="Unlocked Candidates" value="12" accent />
              </section>

              {/* Active Job Links */}
              <section className="mb-12">
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-foreground">
                    Active Job <span className="italic text-accent-purple">Links</span>
                  </h2>
                  <span className="text-xs text-muted-foreground">{JOBS.length} live</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {JOBS.map((job) => (
                    <JobCard key={job.title} {...job} />
                  ))}
                </div>
              </section>

              {/* Recent High-Scorers */}
              <section>
                <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-foreground mb-5">
                  Recent <span className="italic text-accent-purple">High-Scorers</span>{" "}
                  <span className="text-muted-foreground text-base align-middle">(Top 10%)</span>
                </h2>
                <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                  {SCORERS.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-foreground/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-accent-purple/15 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-accent-purple" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground">
                        Applicant #{s.id}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        applied to {s.role}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-purple text-background text-xs font-bold tabular-nums">
                    <Trophy className="h-3 w-3" />
                    {s.score}/100
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 hover:border-accent-purple/40 transition-colors">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={`mt-3 font-serif text-5xl tabular-nums tracking-tight ${
          accent ? "text-accent-purple italic" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function JobCard({
  title,
  applicants,
  top,
}: {
  title: string;
  applicants: number;
  top: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `https://talentfirst.app/apply/${title.toLowerCase().replace(/\s+/g, "-")}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col hover:border-accent-purple/40 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-serif text-xl leading-snug text-foreground">{title}</h3>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-purple/15 border border-accent-purple/30 text-accent-purple text-[11px] font-semibold shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
          Live
        </span>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        <span className="font-semibold text-foreground tabular-nums">{applicants}</span>{" "}
        Applicants
      </div>

      <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/5 border border-border text-foreground text-xs font-medium mb-6">
        <Trophy className="h-3 w-3 text-accent-purple" />
        Highest Score: {top}/100
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-border">
        <button
          onClick={handleCopy}
          aria-label="Copy link"
          className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-accent-purple" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
        <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity">
          View Leaderboard
          <Trophy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

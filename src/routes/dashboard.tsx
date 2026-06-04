import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutGrid,
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
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-200 border-r border-slate-800">
        <div className="px-6 py-6 flex items-center gap-2.5 border-b border-slate-800">
          <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <LayoutGrid className="h-5 w-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white font-semibold tracking-tight">TalentFirst</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
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
                className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge != null && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-emerald-500 text-slate-900"
                        : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 pt-4 border-t border-slate-800">
          <div className="px-3 py-2 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-white">
              A
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">Acme Corp</div>
              <div className="text-xs text-slate-500 truncate">HR · Recruiter</div>
            </div>
          </div>
          <Link
            to="/"
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-6 py-4 bg-slate-900 text-white">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
          </div>
          <span className="font-semibold">TalentFirst</span>
        </div>

        <div className="px-6 md:px-10 py-8 md:py-10 max-w-7xl mx-auto">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                Welcome back, Recruiter
              </h1>
              <p className="text-sm text-slate-500 mt-1">{today}</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
              <Plus className="h-4 w-4" />
              Create New Link
            </button>
          </header>

          {/* Metric ribbon */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <MetricCard label="Active Links" value="4" />
            <MetricCard label="Applicants Evaluated" value="1,240" />
            <MetricCard label="Unlocked Candidates" value="12" accent />
          </section>

          {/* Active Job Links */}
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Active Job Links
              </h2>
              <span className="text-xs text-slate-500">{JOBS.length} live</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {JOBS.map((job) => (
                <JobCard key={job.title} {...job} />
              ))}
            </div>
          </section>

          {/* Recent High-Scorers */}
          <section>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-4">
              Recent High-Scorers{" "}
              <span className="text-slate-400 font-medium text-sm">(Top 10%)</span>
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {SCORERS.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        Applicant #{s.id}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        applied to {s.role}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500 text-white text-xs font-bold tabular-nums">
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
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">
        {label}
      </div>
      <div
        className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${
          accent ? "text-emerald-600" : "text-slate-900"
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
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-slate-900 leading-snug">{title}</h3>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[11px] font-semibold shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      <div className="text-sm text-slate-600 mb-3">
        <span className="font-semibold text-slate-900 tabular-nums">{applicants}</span>{" "}
        Applicants
      </div>

      <div className="inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-xs font-medium mb-5">
        <Trophy className="h-3 w-3 text-emerald-400" />
        Highest Score: {top}/100
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={handleCopy}
          aria-label="Copy link"
          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors">
          View Leaderboard
          <Trophy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Link2,
  PlusCircle,
  Users,
  LogOut,
  Copy,
  Check,
  Plus,
  Sparkles,
  Loader2,
  ArrowRight,
  Archive,
  FolderArchive,
  Bookmark,
  MessageCircle,
  Mail,
  Inbox,
  Trash2,
} from "lucide-react";
import { CreateLinkWizard } from "@/components/CreateLinkWizard";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadErrorPanel } from "@/components/LoadErrorPanel";
import { ScoreBadge } from "@/components/ScoreBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { deleteArchivedJob } from "@/lib/jobs.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
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

type NavKey = "active" | "past" | "create" | "shortlist";

const NAV_ITEMS: { key: NavKey; label: string; icon: typeof Link2 }[] = [
  { key: "active", label: "Active Links", icon: Link2 },
  { key: "past", label: "Past Jobs", icon: FolderArchive },
  { key: "create", label: "Create New Link", icon: PlusCircle },
  { key: "shortlist", label: "Shortlist Hub", icon: Users },
];


type JobRow = {
  id: string;
  job_title: string;
  created_at: string;
  submission_count: number;
  status: string;
};


function DashboardPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<NavKey>("active");
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [shortlistedCount, setShortlistedCount] = useState<number | null>(null);
  const { user } = useCurrentUser();
  const email = user?.email ?? "";

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  // P8: single RPC call returns jobs + submission counts (server-side aggregation).
  const loadJobs = async () => {
    setLoadingJobs(true);
    setJobsError(null);
    try {
      const { data, error } = await supabase.rpc("jobs_with_counts");
      if (error) throw error;
      setJobs(
        (data ?? []).map((j) => ({
          id: j.id,
          job_title: j.job_title,
          created_at: j.created_at,
          status: j.status ?? "live",
          submission_count: Number(j.submission_count ?? 0),
        })),
      );
    } catch (e) {
      setJobsError(
        e instanceof Error ? e.message : "Could not load your jobs. Please try again.",
      );
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadShortlistedCount = async () => {
    try {
      const { count, error } = await supabase
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("is_shortlisted", true);
      if (error) throw error;
      setShortlistedCount(count ?? 0);
    } catch {
      setShortlistedCount(null);
    }
  };

  // P1: single effect — fires on mount and when switching back to a tab that lists jobs.
  useEffect(() => {
    if (active === "active" || active === "past") loadJobs();
    if (active === "active") loadShortlistedCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  // P4: memoize derived collections
  const { activeJobs, pastJobs, totalSubs } = useMemo(() => {
    const a = jobs.filter((j) => j.status !== "closed");
    const p = jobs.filter((j) => j.status === "closed");
    return {
      activeJobs: a,
      pastJobs: p,
      totalSubs: a.reduce((n, j) => n + j.submission_count, 0),
    };
  }, [jobs]);


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
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 pt-4 border-t border-border">
          <div className="px-3 py-2 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-accent-purple/30 flex items-center justify-center text-sm font-semibold text-foreground">
              {(email[0] ?? "R").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {email || "Recruiter"}
              </div>
              <div className="text-xs text-muted-foreground truncate">HR · Recruiter</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground/60 hover:text-foreground hover:bg-card transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 min-w-0 relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: PURPLE_GLOW }}
        />

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
          ) : active === "past" ? (
            <>
              <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2 inline-flex items-center gap-2">
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </p>
                  <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-foreground">
                    Past <span className="italic text-accent-purple">Jobs</span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Historical screenings — read-only. Submissions, answers, and
                    CSV exports remain available.
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {pastJobs.length} archived
                </span>
              </header>

              {loadingJobs ? (
                <JobCardSkeletonGrid />
              ) : jobsError ? (
                <LoadErrorPanel message={jobsError} onRetry={loadJobs} />
              ) : pastJobs.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                  <FolderArchive className="h-6 w-6 text-foreground/40 mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">
                    No past jobs yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Closed screening links will appear here for permanent
                    record-keeping.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pastJobs.map((job) => (
                    <JobCard key={job.id} job={job} archived />
                  ))}
                </div>
              )}
            </>
          ) : active === "shortlist" ? (
            <ShortlistHub />
          ) : (
            <>
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

              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                <MetricCard label="Active Links" value={String(activeJobs.length)} />
                <MetricCard label="Total Applicants" value={String(totalSubs)} />
                <MetricCard
                  label="Shortlisted"
                  value={shortlistedCount === null ? null : String(shortlistedCount)}
                  accent
                />
              </section>

              <section className="mb-12">
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-foreground">
                    Active Job <span className="italic text-accent-purple">Links</span>
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {activeJobs.length} live
                  </span>
                </div>

                {loadingJobs ? (
                  <JobCardSkeletonGrid />
                ) : jobsError ? (
                  <LoadErrorPanel message={jobsError} onRetry={loadJobs} />
                ) : activeJobs.length === 0 ? (
                  <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                    <Sparkles className="h-6 w-6 text-accent-purple mx-auto mb-3" />
                    <p className="text-foreground font-medium mb-1">No active links</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      {pastJobs.length > 0
                        ? "All screenings are archived. Create a new link or browse Past Jobs."
                        : "Create your first link to start receiving applications."}
                    </p>
                    <button
                      onClick={() => setActive("create")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Link
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activeJobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                )}
              </section>

            </>
          )}
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
  value: string | null;
  accent?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 hover:border-accent-purple/40 transition-colors">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      {value === null ? (
        <div className="mt-3 h-12 w-20 rounded-md bg-foreground/10 animate-pulse" />
      ) : (
        <div
          className={`mt-3 font-serif text-5xl tabular-nums tracking-tight ${
            accent ? "text-accent-purple italic" : "text-foreground"
          }`}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function JobCard({ job, archived = false }: { job: JobRow; archived?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/apply/${job.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const CAP = 100;
  const pct = Math.min(100, (job.submission_count / CAP) * 100);
  const isFull = job.submission_count >= CAP;
  const isClosed = job.status === "closed";

  return (
    <div
      className={`bg-card border rounded-2xl p-6 flex flex-col transition-all ${
        archived
          ? "border-border/60 opacity-75 grayscale-[40%] hover:opacity-95 hover:grayscale-0 hover:border-border"
          : "border-border hover:border-accent-purple/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3
          className={`font-serif text-xl leading-snug line-clamp-2 ${
            archived ? "text-foreground/80" : "text-foreground"
          }`}
        >
          {job.job_title}
        </h3>
        {archived || isClosed ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-foreground/10 border border-border text-foreground/60 text-[11px] font-semibold shrink-0">
            <Archive className="h-3 w-3" />
            Archived
          </span>
        ) : isFull ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-semibold shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Matured / Full
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-purple/15 border border-accent-purple/30 text-accent-purple text-[11px] font-semibold shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
            Live
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="text-sm text-foreground/80">
            <span className="font-semibold text-foreground tabular-nums">
              {job.submission_count}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {" "}/ {CAP}
            </span>{" "}
            <span className="text-muted-foreground">
              {job.submission_count === 1 ? "Applicant" : "Applicants"}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              archived
                ? "bg-foreground/30"
                : isFull
                ? "bg-amber-400"
                : pct >= 75
                ? "bg-accent-purple"
                : "bg-accent-purple/70"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>


      <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-border">
        {archived ? (
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
            <Archive className="h-3 w-3" />
            Read-only
          </span>
        ) : (
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
        )}
        <Link
          to="/jobs/$jobId"
          params={{ jobId: job.id }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-90 ${
            archived
              ? "bg-foreground/80 text-background"
              : "bg-foreground text-background"
          }`}
        >
          View Submissions
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

type ShortlistRow = {
  id: string;
  candidate_name: string;
  email: string;
  whatsapp: string | null;
  linkedin: string | null;
  qa_score: number | null;
  created_at: string;
  job_id: string;
  job_title: string;
};

function ShortlistHub() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ShortlistRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // P10: single join via RLS — recruiter only sees their own jobs' submissions.
        const { data: subs, error: subsErr } = await supabase
          .from("submissions")
          .select(
            "id, candidate_name, email, whatsapp, linkedin, qa_score, created_at, job_id, jobs!inner(job_title)",
          )
          .eq("is_shortlisted", true)
          .order("qa_score", { ascending: false, nullsFirst: false });
        if (subsErr) throw subsErr;
        if (cancelled) return;
        setRows(
          (subs ?? []).map((s) => {
            const joined = (s as { jobs?: { job_title?: string } | null }).jobs;
            return {
              id: s.id,
              candidate_name: s.candidate_name,
              email: s.email,
              whatsapp: s.whatsapp,
              linkedin: s.linkedin,
              qa_score: s.qa_score === null ? null : Number(s.qa_score),
              created_at: s.created_at,
              job_id: s.job_id,
              job_title: joined?.job_title ?? "Untitled role",
            };
          }),
        );
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not load shortlisted candidates.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // P4: memoize grouping
  const groups = useMemo(() => {
    const grouped = rows.reduce<
      Record<string, { jobId: string; title: string; items: ShortlistRow[] }>
    >((acc, r) => {
      if (!acc[r.job_id])
        acc[r.job_id] = { jobId: r.job_id, title: r.job_title, items: [] };
      acc[r.job_id].items.push(r);
      return acc;
    }, {});
    return Object.values(grouped);
  }, [rows]);

  return (
    <>
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.18em] text-accent-purple mb-2 inline-flex items-center gap-2">
          <Bookmark className="h-3.5 w-3.5" />
          Shortlist
        </p>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-foreground">
          Shortlist <span className="italic text-accent-purple">Hub</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
          Central command for all manually approved, high-capability candidate
          profiles across your active and past roles.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent-purple" />
        </div>
      ) : error ? (
        <LoadErrorPanel
          message={error}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : groups.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center max-w-xl mx-auto">
          <Inbox className="h-6 w-6 text-foreground/40 mx-auto mb-3" />
          <p className="text-foreground font-medium mb-1">
            No candidates shortlisted yet
          </p>
          <p className="text-sm text-muted-foreground">
            Open an active job leaderboard to highlight your top capability matches.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section
              key={g.jobId}
              className="bg-card border border-border rounded-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-border bg-foreground/[0.03]">
                <div className="min-w-0">
                  <h2 className="font-serif text-xl tracking-tight text-foreground truncate">
                    {g.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {g.items.length}{" "}
                    {g.items.length === 1 ? "Candidate" : "Candidates"} Selected
                  </p>
                </div>
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: g.jobId }}
                  className="text-xs font-medium text-accent-purple hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  Open leaderboard
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-px bg-border">
                {g.items.map((c) => (
                  <ShortlistCandidateCard key={c.id} c={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}


function ShortlistCandidateCard({ c }: { c: ShortlistRow }) {
  const waDigits = (c.whatsapp ?? "").replace(/[^\d]/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : null;
  return (
    <div className="bg-card p-5 flex flex-col gap-3 hover:bg-foreground/[0.02] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">
            {c.candidate_name}
          </div>
          <div className="text-xs text-muted-foreground truncate">{c.email}</div>
        </div>
        <ScoreBadge score={c.qa_score} variant="pill" />
      </div>

      <div className="flex items-center gap-2 mt-1">
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        ) : (
          <a
            href={`mailto:${c.email}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/5 border border-border text-foreground/70 text-xs font-medium hover:text-foreground transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Email
          </a>
        )}
        <Link
          to="/jobs/$jobId"
          params={{ jobId: c.job_id }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-purple/15 border border-accent-purple/30 text-accent-purple text-xs font-medium hover:bg-accent-purple/25 transition-colors"
        >
          View Full Profile
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}


function JobCardSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-2xl p-6 flex flex-col"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-1/2 mb-3" />
          <Skeleton className="h-1.5 w-full mb-6" />
          <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-border">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  ExternalLink,
  Inbox,
  Download,
  Sparkles,
  RefreshCw,
  Lock,
  X,
  Star,
  Bookmark,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { scoreSubmission } from "@/lib/score-submission.functions";
import { closeJob as closeJobFn, toggleShortlist as toggleShortlistFn } from "@/lib/jobs.functions";
import { ScoreBadge } from "@/components/ScoreBadge";


export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({
    meta: [{ title: "Submissions — TalentFirst" }],
  }),
  component: SubmissionsPage,
});

type Job = {
  id: string;
  job_title: string;
  questions: string[];
  require_link: boolean;
  require_cv: boolean;
  status: string;
};


type CvAnalysis = {
  key_matches?: string[];
  cv_summary?: string;
  error?: string;
};

// P7: heavy fields (cv_text, cv_analysis, ai_reasoning) are loaded lazily when
// a row is expanded. The list query stays lightweight and the 6s poll only
// re-downloads scoreboard data.
type SubmissionDetails = {
  cv_text: string | null;
  cv_file_path: string | null;
  cv_analysis: CvAnalysis | null;
  ai_reasoning: string | null;
  answers: string[];
  portfolio_link: string | null;
};

type Submission = {
  id: string;
  candidate_name: string;
  email: string;
  whatsapp: string | null;
  linkedin: string | null;
  qa_score: number | null;
  cv_score: number | null;
  created_at: string;
  is_shortlisted: boolean;
  details?: SubmissionDetails;
  detailsLoading?: boolean;
  detailsError?: string | null;
};

function SubmissionsPage() {
  const { jobId } = useParams({ from: "/_authenticated/jobs/$jobId" });
  const [job, setJob] = useState<Job | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState<Set<string>>(new Set());
  const [rescoring, setRescoring] = useState<Set<string>>(new Set());
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closing, setClosing] = useState(false);

  const toggleContact = useCallback((id: string) => {
    setContactOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const closeApplication = async () => {
    if (!job) return;
    setClosing(true);
    const res = await closeJobFn({ data: { jobId: job.id } });
    setClosing(false);
    if (res.ok) {
      setJob({ ...job, status: "closed" });
      setShowCloseModal(false);
    } else {
      toast.error("Could not close the job.");
    }
  };

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [jobRes, subsRes] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, job_title, questions, require_link, require_cv, status")
          .eq("id", jobId)
          .maybeSingle(),
        // P7: list query is lightweight — heavy CV/analysis fields are fetched
        // on demand when a row is expanded.
        supabase
          .from("submissions")
          .select(
            "id, candidate_name, email, whatsapp, linkedin, qa_score, cv_score, created_at, is_shortlisted",
          )
          .eq("job_id", jobId)
          .order("qa_score", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);

      if (jobRes.error) throw jobRes.error;
      if (subsRes.error) throw subsRes.error;
      const jobData = jobRes.data;
      const subsData = subsRes.data;

      if (jobData) {
        setJob({
          id: jobData.id,
          job_title: jobData.job_title,
          questions: Array.isArray(jobData.questions)
            ? (jobData.questions as string[])
            : [],
          require_link: !!jobData.require_link,
          require_cv: !!jobData.require_cv,
          status: (jobData as { status?: string }).status ?? "live",
        });
      }

      // Preserve any already-loaded details across polls.
      setSubs((prev) => {
        const detailsById = new Map(prev.map((p) => [p.id, p.details]));
        return (subsData ?? []).map((s) => {
          const row = s as Record<string, unknown>;
          return {
            id: s.id,
            candidate_name: s.candidate_name,
            email: s.email,
            whatsapp: s.whatsapp,
            linkedin: s.linkedin,
            qa_score: s.qa_score === null ? null : Number(s.qa_score),
            cv_score:
              row.cv_score === null || row.cv_score === undefined
                ? null
                : Number(row.cv_score),
            created_at: s.created_at,
            is_shortlisted: !!row.is_shortlisted,
            details: detailsById.get(s.id),
          } as Submission;
        });
      });
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : "Could not load submissions. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // P7: lazy detail fetch for a single submission row.
  const loadDetails = useCallback(async (id: string) => {
    setSubs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, detailsLoading: true, detailsError: null } : s)),
    );
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("answers, portfolio_link, cv_text, cv_file_path, cv_analysis, ai_reasoning")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const row = (data ?? {}) as Record<string, unknown>;
      const details: SubmissionDetails = {
        answers: Array.isArray(row.answers) ? (row.answers as string[]) : [],
        portfolio_link: (row.portfolio_link as string | null) ?? null,
        cv_text: (row.cv_text as string | null) ?? null,
        cv_file_path: (row.cv_file_path as string | null) ?? null,
        cv_analysis: (row.cv_analysis as CvAnalysis | null) ?? null,
        ai_reasoning: (row.ai_reasoning as string | null) ?? null,
      };
      setSubs((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, details, detailsLoading: false } : s,
        ),
      );
    } catch (e) {
      setSubs((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                detailsLoading: false,
                detailsError:
                  e instanceof Error ? e.message : "Could not load details.",
              }
            : s,
        ),
      );
    }
  }, []);

  // Keep a ref of latest subs so stable callbacks can read current data without re-creating.
  const subsRef = useRef<Submission[]>(subs);
  useEffect(() => {
    subsRef.current = subs;
  }, [subs]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = prev === id ? null : id;
      if (next) {
        const row = subsRef.current.find((s) => s.id === id);
        if (row && !row.details && !row.detailsLoading) loadDetails(id);
      }
      return next;
    });
  }, [loadDetails]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // P2/P3: derive a stable boolean so the poll interval doesn't re-arm on every state change.
  const hasPending = subs.some((s) => s.qa_score === null);
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(() => {
      load();
    }, 6000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPending]);

  // Auto-retry: if a submission has been "Evaluating…" for >60s, kick off
  // scoreSubmission once. Backfills existing stuck rows on first load too.
  // Guarded by a ref Set so each row is only retried once per session.
  const retriedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!hasPending) return;
    const stuck = subs.filter((s) => {
      if (s.qa_score !== null) return false;
      if (retriedRef.current.has(s.id)) return false;
      const ageMs = Date.now() - new Date(s.created_at).getTime();
      return ageMs > 60_000;
    });
    if (stuck.length === 0) return;
    for (const s of stuck) {
      retriedRef.current.add(s.id);
      scoreSubmission({ data: { submissionId: s.id } })
        .then(() => load())
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPending]);

  // Track latest `expanded` in a ref so rescore stays referentially stable.
  const expandedRef = useRef<string | null>(null);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  const rescore = useCallback(async (id: string) => {
    setRescoring((prev) => new Set(prev).add(id));
    // Optimistically clear scores so badges flip to "Evaluating…" and invalidate
    // the lazy-loaded drawer details so they re-fetch on next expand.
    setSubs((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, qa_score: null, cv_score: null, details: undefined }
          : s,
      ),
    );
    try {
      await scoreSubmission({ data: { submissionId: id } });
      await load();
      if (expandedRef.current === id) loadDetails(id);
    } catch {
      toast.error("Re-scoring failed. Please try again.");
      await load();
    } finally {
      setRescoring((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [load, loadDetails]);

  const toggleShortlist = useCallback(async (id: string, current: boolean) => {
    const next = !current;
    setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, is_shortlisted: next } : s)));
    const res = await toggleShortlistFn({ data: { submissionId: id, value: next } });
    if (!res.ok) {
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, is_shortlisted: current } : s)));
      toast.error("Could not update shortlist.");
      return;
    }
    toast.success(next ? "Candidate added to Shortlist Hub." : "Removed from shortlist.");
  }, []);


  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    if (!job) return;
    setExporting(true);
    try {
      // P7 coupling: fetch full payload on click rather than keeping it in memory.
      const { data, error } = await supabase
        .from("submissions")
        .select(
          "id, candidate_name, email, whatsapp, linkedin, answers, portfolio_link, cv_text, ai_reasoning, qa_score, created_at",
        )
        .eq("job_id", job.id)
        .order("qa_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const headers = [
        "Submitted At",
        "Score",
        "Name",
        "Email",
        "WhatsApp",
        "LinkedIn",
        ...job.questions.map((q, i) => `Q${i + 1}: ${q}`),
        ...(job.require_link ? ["Portfolio Link"] : []),
        ...(job.require_cv ? ["CV Text"] : []),
        "AI Reasoning",
      ];
      const rows = (data ?? []).map((s) => {
        const answers = Array.isArray(s.answers) ? (s.answers as string[]) : [];
        return [
          new Date(s.created_at).toISOString(),
          s.qa_score === null ? "" : String(Math.round(Number(s.qa_score))),
          s.candidate_name,
          s.email,
          s.whatsapp ?? "",
          s.linkedin ?? "",
          ...job.questions.map((_, i) => answers[i] ?? ""),
          ...(job.require_link ? [s.portfolio_link ?? ""] : []),
          ...(job.require_cv ? [s.cv_text ?? ""] : []),
          s.ai_reasoning ?? "",
        ];
      });
      const csv = [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const v = String(cell ?? "");
              return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
            })
            .join(","),
        )
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${job.id}-submissions.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <SubmissionsSkeleton />;
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center bg-card border border-destructive/30 rounded-2xl p-8">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 mb-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <h1 className="font-serif text-2xl mb-2">Couldn't load submissions</h1>
          <p className="text-sm text-muted-foreground mb-5 break-words">{loadError}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-foreground/5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl mb-3">Job not found</h1>
          <p className="text-muted-foreground mb-6">
            This link doesn't exist or you don't own it.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-accent-purple mb-2">
              Submissions
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
                {job.job_title}
              </h1>
              {job.status === "closed" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground/10 border border-border text-foreground/60 text-[11px] font-semibold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                  Closed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-purple/15 border border-accent-purple/30 text-accent-purple text-[11px] font-semibold uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {subs.length} {subs.length === 1 ? "candidate" : "candidates"} applied
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {subs.length > 0 && (
              <button
                onClick={exportCsv}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-foreground hover:bg-card text-sm font-medium transition-colors disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export CSV
              </button>
            )}
            {job.status !== "closed" && (
              <button
                onClick={() => setShowCloseModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-rose-500/90 hover:bg-rose-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-rose-500/20"
              >
                <Lock className="h-4 w-4" />
                Close Application
              </button>
            )}
          </div>
        </header>

        {showCloseModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
            onClick={() => !closing && setShowCloseModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl"
            >
              <button
                onClick={() => !closing && setShowCloseModal(false)}
                className="absolute top-4 right-4 text-foreground/40 hover:text-foreground transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/15 mb-4">
                <Lock className="h-5 w-5 text-rose-400" />
              </div>
              <h3 className="font-serif text-2xl tracking-tight mb-2">
                Close this application?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Candidates will no longer be able to submit responses to this
                link. You can still view all existing submissions. This cannot
                be undone from the dashboard.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCloseModal(false)}
                  disabled={closing}
                  className="px-4 py-2 rounded-full text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={closeApplication}
                  disabled={closing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-500/90 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {closing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  Confirm Close
                </button>
              </div>
            </div>
          </div>
        )}



        {subs.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
            <Inbox className="h-7 w-7 text-foreground/40 mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">No submissions yet</p>
            <p className="text-sm text-muted-foreground">
              Share your link to start collecting applications.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[64px_minmax(0,2.4fr)_1fr_1fr_1fr_1.4fr] gap-4 px-6 py-3 border-b border-border bg-foreground/5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              <div className="text-left">Rank</div>
              <div className="text-left">Candidate</div>
              <div className="text-left">Submitted</div>
              <div className="text-center">Answer Score</div>
              <div className="text-center">CV Score</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="divide-y divide-border">
              {subs.map((s, idx) => {
                const open = expanded === s.id;
                const isElite = s.qa_score !== null && s.qa_score >= 80;
                const isTop = idx === 0 && s.qa_score !== null;
                return (
                  <div
                    key={s.id}
                    className={`px-6 py-4 transition-colors ${
                      isElite
                        ? "bg-emerald-500/[0.04] shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25),0_0_24px_-8px_rgba(16,185,129,0.35)]"
                        : ""
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[64px_minmax(0,2.4fr)_1fr_1fr_1fr_1.4fr] gap-2 md:gap-4 items-center">
                      <div className="flex items-center gap-1.5">
                        {isTop ? (
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-400/15 border border-amber-400/40">
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center h-7 min-w-7 px-2 rounded-full bg-foreground/5 border border-border text-[11px] font-semibold tabular-nums text-foreground/70">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {s.candidate_name}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <button
                            onClick={() => toggleContact(s.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-border text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
                          >
                            <Mail className="h-3 w-3" />
                            {contactOpen.has(s.id) ? "Hide contact" : "Contact"}
                          </button>
                          {s.linkedin && (
                            <a
                              href={
                                s.linkedin.startsWith("http")
                                  ? s.linkedin
                                  : `https://${s.linkedin}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-accent-purple hover:underline inline-flex items-center gap-1"
                            >
                              LinkedIn <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {contactOpen.has(s.id) && (
                          <div className="mt-2 space-y-1 text-xs text-foreground/80">
                            <div className="inline-flex items-center gap-2 min-w-0 max-w-full">
                              <Mail className="h-3 w-3 text-foreground/40 shrink-0" />
                              <a
                                href={`mailto:${s.email}`}
                                className="truncate hover:text-foreground"
                              >
                                {s.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-foreground/40 shrink-0" />
                              <span>{s.whatsapp || "—"}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums text-left">
                        {new Date(s.created_at).toLocaleString(undefined, {
                          dateStyle: "short",
                        })}
                      </div>
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={s.qa_score} />
                      </div>
                      <div className="flex items-center justify-center">
                        <ScoreBadge score={s.cv_score} />
                      </div>

                      <div className="flex md:justify-end items-center gap-2">
                        {s.qa_score !== null && (
                          <button
                            onClick={() => rescore(s.id)}
                            disabled={rescoring.has(s.id)}
                            title="Re-evaluate with AI"
                            aria-label="Re-evaluate with AI"
                            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-foreground/50 hover:text-accent-purple hover:bg-accent-purple/10 transition-colors disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`h-4 w-4 ${
                                rescoring.has(s.id) ? "animate-spin" : ""
                              }`}
                            />
                          </button>
                        )}
                        <button
                          onClick={() => toggleShortlist(s.id, s.is_shortlisted)}
                          title={s.is_shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                          aria-label={s.is_shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                          aria-pressed={s.is_shortlisted}
                          className={`inline-flex items-center justify-center h-9 w-9 rounded-full transition-colors ${
                            s.is_shortlisted
                              ? "text-accent-purple bg-accent-purple/10 hover:bg-accent-purple/15"
                              : "text-foreground/40 hover:text-accent-purple hover:bg-accent-purple/10"
                          }`}
                        >
                          <Bookmark
                            className="h-5 w-5"
                            fill={s.is_shortlisted ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          onClick={() => handleToggleExpand(s.id)}
                          className="text-xs font-medium text-accent-purple hover:underline whitespace-nowrap"
                        >
                          {open ? "Hide" : "View"} answers
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div className="mt-5 pl-0 md:pl-2 border-l-2 border-accent-purple/30">
                        {/* AI Evaluation Report (always visible above the tabs) */}
                        <div className="pl-4 mb-5">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-xs uppercase tracking-wider text-accent-purple inline-flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3" />
                              AI Evaluation Report
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase tracking-wider text-foreground/40">Answers</span>
                              <ScoreBadge score={s.qa_score} />
                              <span className="text-[10px] uppercase tracking-wider text-foreground/40 ml-2">CV</span>
                              <ScoreBadge score={s.cv_score} />
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-accent-purple/10 to-background/40 border border-accent-purple/20 rounded-xl p-4">
                            {s.details?.ai_reasoning ? (
                              <p className="text-foreground/85 whitespace-pre-wrap leading-relaxed text-sm">
                                {s.details.ai_reasoning}
                              </p>
                            ) : (
                              <p className="text-foreground/50 italic text-sm inline-flex items-center gap-2">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {s.detailsLoading
                                  ? "Loading evaluation…"
                                  : "Evaluation in progress…"}
                              </p>
                            )}
                          </div>
                        </div>

                        <CandidateDrawerTabs
                          submission={s}
                          questions={job.questions}
                          requireLink={job.require_link}
                          requireCv={job.require_cv}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CandidateDrawerTabs({
  submission: s,
  questions,
  requireLink,
  requireCv,
}: {
  submission: Submission;
  questions: string[];
  requireLink: boolean;
  requireCv: boolean;
}) {
  const [tab, setTab] = useState<"answers" | "cv">("answers");
  const details = s.details;
  const detailsLoading = s.detailsLoading || !details;
  const answers = details?.answers ?? [];
  const portfolioLink = details?.portfolio_link ?? null;
  const cvText = details?.cv_text ?? null;
  const cvFilePath = details?.cv_file_path ?? null;
  const analysis = details?.cv_analysis ?? null;
  const summary = analysis?.cv_summary ?? "";
  const matches: string[] = Array.isArray(analysis?.key_matches)
    ? (analysis!.key_matches as string[])
    : [];
  const cvLoading = detailsLoading || s.cv_score === null;

  return (
    <div className="pl-4">
      {/* Tab bar */}
      <div className="inline-flex p-1 rounded-full bg-foreground/5 border border-border mb-5">
        <button
          onClick={() => setTab("answers")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
            tab === "answers"
              ? "bg-accent-purple text-white shadow"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          Screening Answers
        </button>
        <button
          onClick={() => setTab("cv")}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
            tab === "cv"
              ? "bg-accent-purple text-white shadow"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          CV Overview
        </button>
      </div>

      {s.detailsError && (
        <p className="text-sm text-destructive mb-4">{s.detailsError}</p>
      )}

      {tab === "answers" && (
        <div className="space-y-5">
          {questions.map((q, i) => (
            <div key={i}>
              <p className="text-xs uppercase tracking-wider text-accent-purple mb-1.5">
                Q{i + 1}
              </p>
              <p className="text-sm text-foreground/70 mb-2">{q}</p>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed bg-background/40 border border-border rounded-xl p-4">
                {detailsLoading ? (
                  <span className="text-foreground/40 italic inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </span>
                ) : (
                  answers[i] || (
                    <span className="text-foreground/40 italic">No answer</span>
                  )
                )}
              </p>
            </div>
          ))}
          {requireLink && (
            <div>
              <p className="text-xs uppercase tracking-wider text-accent-purple mb-1.5">
                Portfolio
              </p>
              {portfolioLink ? (
                <a
                  href={
                    portfolioLink.startsWith("http")
                      ? portfolioLink
                      : `https://${portfolioLink}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-purple hover:underline break-all"
                >
                  {portfolioLink}
                </a>
              ) : (
                <span className="text-foreground/40 italic">—</span>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "cv" && (
        <div className="space-y-5">
          {/* Professional Profile */}
          <div>
            <p className="text-xs uppercase tracking-wider text-accent-purple mb-2">
              Professional Profile
            </p>
            {cvLoading ? (
              <div className="bg-background/40 border border-border rounded-xl p-4">
                <p className="text-foreground/50 italic text-sm inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating CV summary…
                </p>
              </div>
            ) : summary ? (
              <blockquote className="relative bg-gradient-to-br from-accent-purple/10 to-background/40 border-l-4 border-accent-purple rounded-r-xl pl-5 pr-4 py-4 text-foreground/90 leading-relaxed text-[15px] italic">
                {summary}
              </blockquote>
            ) : (
              <p className="text-foreground/40 italic text-sm">No summary generated.</p>
            )}
          </div>

          {/* Key Match Highlights */}
          <div>
            <p className="text-xs uppercase tracking-wider text-accent-purple mb-2">
              Key Match Highlights
            </p>
            {cvLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-4 w-full max-w-md rounded bg-foreground/5 animate-pulse"
                  />
                ))}
              </div>
            ) : matches.length > 0 ? (
              <ul className="space-y-2">
                {matches.map((m: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-foreground/90 leading-relaxed"
                  >
                    <CheckCircle2 className="h-4 w-4 text-accent-purple shrink-0 mt-0.5" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-foreground/40 italic text-sm">
                {analysis?.error
                  ? "AI could not extract highlights for this CV."
                  : "No highlights available."}
              </p>
            )}
          </div>

          {/* Open CV PDF */}
          {requireCv && (
            <div className="pt-2">
              {detailsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />
              ) : cvFilePath ? (
                <OpenCvButton submissionId={s.id} />
              ) : cvText ? (
                <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-background/40 border border-border rounded-xl p-4 font-sans">
                  {cvText}
                </pre>
              ) : (
                <span className="text-foreground/40 italic text-sm">
                  No CV uploaded.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OpenCvButton({ submissionId }: { submissionId: string }) {
  const [loading, setLoading] = useState(false);
  const openCv = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        return;
      }
      const res = await fetch(`/api/cv/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error("Could not open resume file.");
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      toast.error("Could not open resume file.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button
      onClick={openCv}
      disabled={loading}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-purple hover:bg-accent-purple/90 text-white text-sm font-semibold shadow-lg shadow-accent-purple/20 transition-colors disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      Open Original CV PDF
      <ExternalLink className="h-3.5 w-3.5 opacity-80" />
    </button>
  );
}

function SubmissionsSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        <Skeleton className="h-4 w-32 mb-6" />
        <div className="mb-10 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[64px_minmax(0,2.4fr)_1fr_1fr_1fr_1.4fr] gap-4 px-6 py-3 border-b border-border bg-foreground/5">
            {["Rank", "Candidate", "Submitted", "Answer Score", "CV Score", "Actions"].map((h) => (
              <Skeleton key={h} className="h-3 w-20" />
            ))}
          </div>
          <div className="divide-y divide-border">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="px-6 py-4 grid grid-cols-1 md:grid-cols-[64px_minmax(0,2.4fr)_1fr_1fr_1fr_1.4fr] gap-2 md:gap-4 items-center"
              >
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                <div className="flex md:justify-end items-center gap-2">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

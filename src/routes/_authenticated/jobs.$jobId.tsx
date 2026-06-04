import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mail, Phone, ExternalLink, Inbox, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
};

type Submission = {
  id: string;
  candidate_name: string;
  email: string;
  whatsapp: string | null;
  linkedin: string | null;
  answers: string[];
  portfolio_link: string | null;
  cv_text: string | null;
  created_at: string;
};

function SubmissionsPage() {
  const { jobId } = useParams({ from: "/_authenticated/jobs/$jobId" });
  const [job, setJob] = useState<Job | null>(null);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: jobData }, { data: subsData }] = await Promise.all([
        supabase
          .from("jobs")
          .select("id, job_title, questions, require_link, require_cv")
          .eq("id", jobId)
          .maybeSingle(),
        supabase
          .from("submissions")
          .select(
            "id, candidate_name, email, whatsapp, linkedin, answers, portfolio_link, cv_text, created_at",
          )
          .eq("job_id", jobId)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (jobData) {
        setJob({
          id: jobData.id,
          job_title: jobData.job_title,
          questions: Array.isArray(jobData.questions)
            ? (jobData.questions as string[])
            : [],
          require_link: !!jobData.require_link,
          require_cv: !!jobData.require_cv,
        });
      }
      setSubs(
        (subsData ?? []).map((s) => ({
          ...s,
          answers: Array.isArray(s.answers) ? (s.answers as string[]) : [],
        })),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const exportCsv = () => {
    if (!job) return;
    const headers = [
      "Submitted At",
      "Name",
      "Email",
      "WhatsApp",
      "LinkedIn",
      ...job.questions.map((q, i) => `Q${i + 1}: ${q}`),
      ...(job.require_link ? ["Portfolio Link"] : []),
      ...(job.require_cv ? ["CV Text"] : []),
    ];
    const rows = subs.map((s) => [
      new Date(s.created_at).toISOString(),
      s.candidate_name,
      s.email,
      s.whatsapp ?? "",
      s.linkedin ?? "",
      ...job.questions.map((_, i) => s.answers[i] ?? ""),
      ...(job.require_link ? [s.portfolio_link ?? ""] : []),
      ...(job.require_cv ? [s.cv_text ?? ""] : []),
    ]);
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent-purple" />
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
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
              {job.job_title}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {subs.length} {subs.length === 1 ? "candidate" : "candidates"} applied
            </p>
          </div>
          {subs.length > 0 && (
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-foreground hover:bg-card text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}
        </header>

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
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-border bg-foreground/5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              <div className="col-span-3">Candidate</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">WhatsApp</div>
              <div className="col-span-2">Submitted</div>
              <div className="col-span-2 text-right">Answers</div>
            </div>

            <div className="divide-y divide-border">
              {subs.map((s) => {
                const open = expanded === s.id;
                return (
                  <div key={s.id} className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center">
                      <div className="md:col-span-3">
                        <div className="font-medium text-foreground">
                          {s.candidate_name}
                        </div>
                        {s.linkedin && (
                          <a
                            href={
                              s.linkedin.startsWith("http")
                                ? s.linkedin
                                : `https://${s.linkedin}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent-purple hover:underline inline-flex items-center gap-1 mt-0.5"
                          >
                            LinkedIn <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="md:col-span-3 text-sm text-foreground/80 inline-flex items-center gap-2 min-w-0">
                        <Mail className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
                        <a href={`mailto:${s.email}`} className="truncate hover:text-foreground">
                          {s.email}
                        </a>
                      </div>
                      <div className="md:col-span-2 text-sm text-foreground/80 inline-flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
                        {s.whatsapp || "—"}
                      </div>
                      <div className="md:col-span-2 text-xs text-muted-foreground tabular-nums">
                        {new Date(s.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                      <div className="md:col-span-2 md:text-right">
                        <button
                          onClick={() => setExpanded(open ? null : s.id)}
                          className="text-xs font-medium text-accent-purple hover:underline"
                        >
                          {open ? "Hide" : "View"} answers
                        </button>
                      </div>
                    </div>

                    {open && (
                      <div className="mt-5 space-y-5 pl-0 md:pl-2 border-l-2 border-accent-purple/30 md:ml-0">
                        {job.questions.map((q, i) => (
                          <div key={i} className="pl-4">
                            <p className="text-xs uppercase tracking-wider text-accent-purple mb-1.5">
                              Q{i + 1}
                            </p>
                            <p className="text-sm text-foreground/70 mb-2">{q}</p>
                            <p className="text-foreground whitespace-pre-wrap leading-relaxed bg-background/40 border border-border rounded-xl p-4">
                              {s.answers[i] || (
                                <span className="text-foreground/40 italic">
                                  No answer
                                </span>
                              )}
                            </p>
                          </div>
                        ))}
                        {job.require_link && (
                          <div className="pl-4">
                            <p className="text-xs uppercase tracking-wider text-accent-purple mb-1.5">
                              Portfolio
                            </p>
                            {s.portfolio_link ? (
                              <a
                                href={
                                  s.portfolio_link.startsWith("http")
                                    ? s.portfolio_link
                                    : `https://${s.portfolio_link}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent-purple hover:underline break-all"
                              >
                                {s.portfolio_link}
                              </a>
                            ) : (
                              <span className="text-foreground/40 italic">—</span>
                            )}
                          </div>
                        )}
                        {job.require_cv && (
                          <div className="pl-4">
                            <p className="text-xs uppercase tracking-wider text-accent-purple mb-1.5">
                              CV
                            </p>
                            <pre className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-background/40 border border-border rounded-xl p-4 font-sans">
                              {s.cv_text || "—"}
                            </pre>
                          </div>
                        )}
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

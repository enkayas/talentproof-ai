import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  PartyPopper,
  AlertCircle,
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitApplication } from "@/lib/score-submission.functions";

export const Route = createFileRoute("/apply/$jobSlug")({
  head: () => ({
    meta: [
      { title: "Apply — NOT. JOBLESS." },
      {
        name: "description",
        content:
          "Submit your application. Evaluated on clarity, logic, and substance — not keywords.",
      },
    ],
  }),
  component: ApplyPage,
});

type Job = {
  id: string;
  job_title: string;
  questions: string[];
  require_link: boolean;
  require_cv: boolean;
  status: string;
};


const WORD_LIMIT = 150;
const countWords = (s: string) =>
  s.trim() === "" ? 0 : s.trim().split(/\s+/).length;

function clampToWordLimit(input: string, limit: number) {
  const tokens = input.split(/(\s+)/); // keep whitespace
  let count = 0;
  const out: string[] = [];
  for (const tok of tokens) {
    if (/^\s+$/.test(tok) || tok === "") {
      out.push(tok);
      continue;
    }
    if (count >= limit) break;
    out.push(tok);
    count++;
  }
  return out.join("");
}

function ApplyPage() {
  const { jobSlug } = useParams({ from: "/apply/$jobSlug" });

  const [job, setJob] = useState<Job | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);

  // form state
  const [step, setStep] = useState(0); // 0 = identity, 1..N = questions, N+1 = proof, N+2 = submitting, N+3 = success
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; whatsapp?: boolean }>({});
  const [answers, setAnswers] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploadProgress, setCvUploadProgress] = useState(0);
  const [cvUploading, setCvUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingJob(true);
    setFetchError(null);
    setNotFound(false);
    (async () => {
      try {
        const [jobRes, countRes] = await Promise.all([
          supabase
            .from("jobs")
            .select("id, job_title, questions, require_link, require_cv, status")
            .eq("id", jobSlug)
            .maybeSingle(),
          supabase
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .eq("job_id", jobSlug),
        ]);

        if (cancelled) return;
        if (jobRes.error) throw jobRes.error;
        if (countRes.error) throw countRes.error;
        if (!jobRes.data) {
          setNotFound(true);
          setLoadingJob(false);
          return;
        }
        const data = jobRes.data;
        const normalized: Job = {
          id: data.id,
          job_title: data.job_title,
          questions: Array.isArray(data.questions)
            ? (data.questions as string[])
            : [],
          require_link: !!data.require_link,
          require_cv: !!data.require_cv,
          status: (data as { status?: string }).status ?? "live",
        };

        setJob(normalized);
        setSubmissionCount(countRes.count ?? 0);
        setAnswers(new Array(normalized.questions.length).fill(""));
      } catch (e) {
        if (!cancelled) {
          setFetchError(
            e instanceof Error
              ? e.message
              : "Couldn't load this application. Please check your connection.",
          );
        }
      } finally {
        if (!cancelled) setLoadingJob(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobSlug, reloadKey]);


  const questionsCount = job?.questions.length ?? 0;
  const hasProofStep = !!(job?.require_link || job?.require_cv);
  const identityStepIdx = 0;
  const questionStartIdx = 1;
  const questionEndIdx = questionsCount; // last question step
  const proofStepIdx = hasProofStep ? questionEndIdx + 1 : -1;
  const submittingStepIdx = hasProofStep ? proofStepIdx + 1 : questionEndIdx + 1;
  const successStepIdx = submittingStepIdx + 1;

  const totalDisplaySteps = useMemo(() => {
    // visible steps: identity + questions + (proof?)
    return 1 + questionsCount + (hasProofStep ? 1 : 0);
  }, [questionsCount, hasProofStep]);

  const currentDisplayStep = Math.min(step + 1, totalDisplaySteps);

  const identityValid =
    name.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    whatsapp.trim().length > 0;

  const currentAnswerIdx = step - questionStartIdx;
  const currentAnswerValid =
    currentAnswerIdx >= 0 &&
    currentAnswerIdx < questionsCount &&
    countWords(answers[currentAnswerIdx] ?? "") > 0;

  const proofValid =
    (!job?.require_link || portfolio.trim().length > 0) &&
    (!job?.require_cv || cvFile !== null);

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    setSubmitError(null);
    setStep(submittingStepIdx);
    try {
      let cvFilePath: string | null = null;

      if (job?.require_cv && cvFile) {
        setCvUploading(true);
        setCvUploadProgress(15);
        const ext = (cvFile.name.split(".").pop() || "pdf").toLowerCase();
        const safeName = name.trim().replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9-]/g, "");
        const path = `${jobSlug}/${Date.now()}-${safeName || "candidate"}.${ext}`;
        setCvUploadProgress(45);
        const { error: uploadError } = await supabase.storage
          .from("cv-resumes")
          .upload(path, cvFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: cvFile.type || undefined,
          });
        setCvUploadProgress(100);
        setCvUploading(false);
        if (uploadError) {
          toast.error("Could not upload your resume. Please try again.");
          setSubmitError("Resume upload failed. Please try again.");
          setStep(proofStepIdx);
          return;
        }
        cvFilePath = path;
      }

      const result = await submitApplication({
        data: {
          jobId: jobSlug,
          candidate_name: name.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim() || null,
          linkedin: linkedin.trim() || null,
          answers,
          portfolio_link: job?.require_link ? portfolio.trim() : null,
          cv_text: null,
          cv_file_path: cvFilePath,
        },
      });
      if (!result?.ok) {
        setSubmitError("Something went wrong. Please try again.");
        setStep(hasProofStep ? proofStepIdx : questionEndIdx);
        return;
      }
      setStep(successStepIdx);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
      setStep(hasProofStep ? proofStepIdx : questionEndIdx);
    }
  };

  // ---------- render ----------

  if (loadingJob) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent-purple" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mb-6">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-3">
            Couldn't load this application
          </h1>
          <p className="text-muted-foreground mb-6 break-words">{fetchError}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 mb-6">
            <AlertCircle className="h-6 w-6 text-foreground/60" />
          </div>
          <h1 className="font-serif text-3xl text-foreground mb-3">
            Link not found
          </h1>
          <p className="text-muted-foreground">
            This application link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (job.status === "closed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 mb-6">
            <AlertCircle className="h-6 w-6 text-foreground/60" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3">
            Applications <span className="italic text-accent-purple">Closed.</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            The recruiter is no longer accepting submissions for this position.
          </p>
        </div>
      </div>
    );
  }

  if (submissionCount >= 100) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-purple/10 mb-6">
            <AlertCircle className="h-6 w-6 text-accent-purple" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-3">
            Application{" "}
            <span className="italic text-accent-purple">Limit Reached.</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            This position has automatically closed after hitting its maximum
            capacity of 100 early-bird candidate responses.
          </p>
        </div>
      </div>
    );
  }





  const isIdentity = step === identityStepIdx;
  const isQuestion = step >= questionStartIdx && step <= questionEndIdx;
  const isProof = step === proofStepIdx;
  const isSubmitting = step === submittingStepIdx;
  const isSuccess = step === successStepIdx;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* progress */}
      {!isSubmitting && !isSuccess && (
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
          <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-[0.18em] text-accent-purple">
                Step {currentDisplayStep} of {totalDisplaySteps}
              </span>
              <span className="text-xs text-muted-foreground truncate ml-3">
                {job.job_title}
              </span>
            </div>
            <div className="h-1 w-full bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-purple transition-all duration-500 ease-out"
                style={{
                  width: `${(currentDisplayStep / totalDisplaySteps) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-5 sm:px-8 pt-10 pb-24">
        {/* IDENTITY */}
        {isIdentity && (
          <section
            key="identity"
            className="animate-in fade-in slide-in-from-right-4 duration-500"
          >
            <h1 className="font-serif text-3xl sm:text-5xl tracking-tight mb-3">
              Let's start with your{" "}
              <span className="italic text-accent-purple">contact info.</span>
            </h1>
            <p className="text-muted-foreground mb-10">
              Applying for <span className="text-foreground">{job.job_title}</span>
            </p>

            <div className="space-y-7">
              <Field
                label="Full Name"
                value={name}
                onChange={setName}
                placeholder="Ada Lovelace"
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                error={
                  touched.name && name.trim().length === 0
                    ? "Please enter your name."
                    : null
                }
              />
              <Field
                label="Email Address"
                value={email}
                onChange={setEmail}
                placeholder="you@email.com"
                type="email"
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                error={
                  touched.email && !/^\S+@\S+\.\S+$/.test(email.trim())
                    ? "Enter a valid email address."
                    : null
                }
              />
              <Field
                label="WhatsApp Number"
                value={whatsapp}
                onChange={setWhatsapp}
                placeholder="+91 98765 43210"
                type="tel"
                onBlur={() => setTouched((t) => ({ ...t, whatsapp: true }))}
                error={
                  touched.whatsapp && whatsapp.trim().length === 0
                    ? "WhatsApp number is required."
                    : null
                }
              />
              <Field
                label="LinkedIn Profile URL"
                value={linkedin}
                onChange={setLinkedin}
                placeholder="linkedin.com/in/your-handle"
              />
            </div>

            <NavBar
              onNext={goNext}
              nextLabel="Continue"
              nextDisabled={!identityValid}
            />
          </section>
        )}

        {/* QUESTIONS */}
        {isQuestion && (
          <QuestionStep
            key={`q-${currentAnswerIdx}`}
            index={currentAnswerIdx}
            total={questionsCount}
            question={job.questions[currentAnswerIdx]}
            value={answers[currentAnswerIdx] ?? ""}
            onChange={(v) => {
              const clamped = clampToWordLimit(v, WORD_LIMIT);
              setAnswers((prev) => {
                const next = [...prev];
                next[currentAnswerIdx] = clamped;
                return next;
              });
            }}
            onBack={goBack}
            onNext={() => {
              if (currentAnswerIdx < questionsCount - 1) {
                goNext();
              } else if (hasProofStep) {
                goNext();
              } else {
                handleSubmit();
              }
            }}
            nextDisabled={!currentAnswerValid}
            nextLabel={
              currentAnswerIdx < questionsCount - 1
                ? "Next Question"
                : hasProofStep
                ? "Continue"
                : "Submit Application"
            }
          />
        )}

        {/* PROOF */}
        {isProof && (
          <section
            key="proof"
            className="animate-in fade-in slide-in-from-right-4 duration-500"
          >
            <h2 className="font-serif text-3xl sm:text-5xl tracking-tight mb-3">
              A little more <span className="italic text-accent-purple">proof.</span>
            </h2>
            <p className="text-muted-foreground mb-10">
              Show us what you've built or what you bring.
            </p>

            <div className="space-y-8">
              {job.require_link && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Portfolio or Work Link
                  </label>
                  <input
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="Paste a URL to your GitHub, Behance, Notion, or Google Drive folder"
                    className="w-full bg-transparent border-0 border-b border-border focus:border-accent-purple text-lg sm:text-xl py-3 outline-none transition-colors placeholder:text-foreground/30"
                  />
                </div>
              )}

              {job.require_cv && (
                <CvUpload
                  file={cvFile}
                  onFile={setCvFile}
                  uploading={cvUploading}
                  progress={cvUploadProgress}
                />
              )}
            </div>

            {submitError && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-destructive flex-1">{submitError}</p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-foreground/5 transition-colors self-start sm:self-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            )}

            <NavBar
              onBack={goBack}
              onNext={handleSubmit}
              nextLabel="Submit Application"
              nextDisabled={!proofValid}
            />
          </section>
        )}

        {/* SUBMITTING */}
        {isSubmitting && (
          <section className="flex flex-col items-center justify-center text-center py-24 animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-accent-purple/30 blur-2xl" />
              <div className="relative h-16 w-16 rounded-full bg-accent-purple/15 flex items-center justify-center">
                <Loader2 className="h-7 w-7 text-accent-purple animate-spin" />
              </div>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl max-w-md">
              Securing your entry and sending your answers to the{" "}
              <span className="italic text-accent-purple">evaluation engine…</span>
            </h2>
          </section>
        )}

        {/* SUCCESS */}
        {isSuccess && (
          <section className="text-center py-16 animate-in fade-in zoom-in-95 duration-700">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 mb-6">
              <PartyPopper className="h-7 w-7 text-emerald-400" />
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl tracking-tight mb-5">
              Application Submitted{" "}
              <span className="italic text-accent-purple">Successfully!</span> 🚀
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Thank you for proving your capability. We have bypassed traditional
              keyword filters. Your responses are being evaluated based on
              clarity, logic, and substance. If your score matches the
              recruiter's Top 10% shortlist, they will unlock your contact
              details and reach out to you directly.
            </p>
            <div className="mt-10 inline-flex items-center gap-2 text-xs text-foreground/50">
              <Sparkles className="h-4 w-4 text-accent-purple" />
              You can safely close this window.
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  onBlur,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  onBlur?: () => void;
  error?: string | null;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground mb-2 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`w-full bg-transparent border-0 border-b text-lg sm:text-xl py-3 outline-none transition-colors placeholder:text-foreground/30 ${
          error
            ? "border-destructive focus:border-destructive"
            : "border-border focus:border-accent-purple"
        }`}
      />
      {error && (
        <span className="block text-xs text-destructive mt-1.5">{error}</span>
      )}
    </label>
  );
}

function QuestionStep({
  index,
  total,
  question,
  value,
  onChange,
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
}: {
  index: number;
  total: number;
  question: string;
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  nextLabel: string;
}) {
  const words = countWords(value);
  const remaining = WORD_LIMIT - words;
  return (
    <section className="animate-in fade-in slide-in-from-right-4 duration-500">
      <p className="text-xs uppercase tracking-[0.18em] text-accent-purple mb-3">
        Question {index + 1} of {total}
      </p>
      <h2 className="font-serif text-2xl sm:text-4xl tracking-tight leading-tight mb-8">
        {question}
      </h2>

      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => {
          // Let onChange clamp; nothing to do here, but prevents default no-op
          // pasting beyond limit will be truncated by clampToWordLimit
          void e;
        }}
        rows={8}
        placeholder="Take your time. Clear thinking beats long answers."
        className="w-full bg-card border border-border rounded-2xl p-5 text-base sm:text-lg outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all placeholder:text-foreground/40 resize-none"
      />
      <div className="flex justify-between items-center text-xs mt-2">
        <span className="text-foreground/40">Max {WORD_LIMIT} words</span>
        <span
          className={
            remaining <= 10
              ? "text-amber-400"
              : "text-foreground/50"
          }
        >
          {words}/{WORD_LIMIT} words
        </span>
      </div>

      <NavBar
        onBack={onBack}
        onNext={onNext}
        nextLabel={nextLabel}
        nextDisabled={nextDisabled}
      />
    </section>
  );
}

function NavBar({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-10 mt-10 border-t border-border">
      {onBack ? (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
      >
        {nextLabel}
        {nextLabel.toLowerCase().includes("submit") ? (
          <Check className="h-4 w-4" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

const MAX_CV_BYTES = 5 * 1024 * 1024;
const ALLOWED_CV_EXT = ["pdf", "doc", "docx"];

function CvUpload({
  file,
  onFile,
  uploading,
  progress,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  uploading: boolean;
  progress: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | null) => {
    if (!f) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_CV_EXT.includes(ext)) {
      toast.error("Only PDF or Word documents (.pdf, .doc, .docx) are allowed.");
      return;
    }
    if (f.size > MAX_CV_BYTES) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }
    onFile(f);
  };

  return (
    <div>
      <label className="block text-sm text-foreground mb-1 font-medium">
        Upload Resume / CV
      </label>
      <p className="text-xs text-foreground/50 mb-3">
        Supports PDF or Word documents (.pdf, .doc, .docx) up to 5MB.
      </p>

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`group w-full rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all ${
            dragOver
              ? "border-accent-purple bg-accent-purple/5"
              : "border-border bg-card hover:border-accent-purple/60 hover:bg-accent-purple/[0.03]"
          }`}
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-purple/15 mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="h-5 w-5 text-accent-purple" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Drag & drop your resume here
          </p>
          <p className="text-xs text-foreground/50 mt-1">
            or <span className="text-accent-purple">click to browse</span>
          </p>
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <FileText className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {file.name}
            </p>
            <p className="text-xs text-foreground/50">
              {(file.size / 1024).toFixed(0)} KB
              {uploading ? " · Uploading…" : " · Ready to submit"}
            </p>
            {uploading && (
              <div className="mt-2 h-1 w-full rounded-full bg-foreground/10 overflow-hidden">
                <div
                  className="h-full bg-accent-purple transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={() => onFile(null)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              aria-label="Remove file"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

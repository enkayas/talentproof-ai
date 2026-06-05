import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  PartyPopper,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitApplication } from "@/lib/score-submission.functions";

export const Route = createFileRoute("/apply/$jobSlug")({
  head: () => ({
    meta: [
      { title: "Apply — TalentFirst" },
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

  // form state
  const [step, setStep] = useState(0); // 0 = identity, 1..N = questions, N+1 = proof, N+2 = submitting, N+3 = success
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState("");
  const [cvText, setCvText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_title, questions, require_link, require_cv")
        .eq("id", jobSlug)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoadingJob(false);
        return;
      }
      const normalized: Job = {
        id: data.id,
        job_title: data.job_title,
        questions: Array.isArray(data.questions)
          ? (data.questions as string[])
          : [],
        require_link: !!data.require_link,
        require_cv: !!data.require_cv,
      };
      setJob(normalized);
      setAnswers(new Array(normalized.questions.length).fill(""));
      setLoadingJob(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [jobSlug]);

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
    (!job?.require_cv || cvText.trim().length > 0);

  const goNext = () => setStep((s) => s + 1);
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    setSubmitError(null);
    setStep(submittingStepIdx);
    try {
      const result = await submitApplication({
        data: {
          jobId: jobSlug,
          candidate_name: name.trim(),
          email: email.trim(),
          whatsapp: whatsapp.trim() || null,
          linkedin: linkedin.trim() || null,
          answers,
          portfolio_link: job?.require_link ? portfolio.trim() : null,
          cv_text: job?.require_cv ? cvText.trim() : null,
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
              />
              <Field
                label="Email Address"
                value={email}
                onChange={setEmail}
                placeholder="you@email.com"
                type="email"
              />
              <Field
                label="WhatsApp Number"
                value={whatsapp}
                onChange={setWhatsapp}
                placeholder="+91 98765 43210"
                type="tel"
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
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Paste Raw Resume Text
                  </label>
                  <p className="text-xs text-foreground/50 mb-3">
                    We evaluate on capability first. Paste your resume text
                    directly here to bypass rigid ATS layout bugs.
                  </p>
                  <textarea
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    rows={10}
                    placeholder="Paste your resume here…"
                    className="w-full bg-card border border-border rounded-2xl p-5 text-base outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all placeholder:text-foreground/40 resize-none"
                  />
                </div>
              )}
            </div>

            {submitError && (
              <p className="text-sm text-red-400 mt-6">{submitError}</p>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-muted-foreground mb-2 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 border-b border-border focus:border-accent-purple text-lg sm:text-xl py-3 outline-none transition-colors placeholder:text-foreground/30"
      />
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

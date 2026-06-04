import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { generateQuestions } from "@/lib/generate-questions.functions";
import { supabase } from "@/integrations/supabase/client";

type Step = 1 | 2 | 3 | 4;

function randomSuffix(len = 4) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function CreateLinkWizard() {
  const navigate = useNavigate();
  const generate = useServerFn(generateQuestions);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [customDraft, setCustomDraft] = useState<string | null>(null);
  const [reqLink, setReqLink] = useState(true);
  const [reqCv, setReqCv] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const generatedUrl = jobId ? `talentfirst.ai/apply/${jobId}` : "";

  const handleGenerate = async () => {
    if (!title.trim() || !desc.trim()) return;
    setLoading(true);
    setStep(2);
    try {
      const result = await generate({ data: { jobTitle: title, jobDescription: desc } });
      setQuestions(result.questions);
    } catch {
      setQuestions([
        "Describe a recent project where you adapted to last-minute changes.",
        "Walk us through how you'd respond to a frustrated customer.",
        "Share a piece of writing you're proud of and explain why.",
        "How do you decide what to prioritize when everything feels urgent?",
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (next.size < 5) next.add(i);
      return next;
    });
  };

  const addCustom = () => {
    if (!customDraft || !customDraft.trim()) {
      setCustomDraft("");
      return;
    }
    const newIdx = questions.length;
    setQuestions([...questions, customDraft.trim()]);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.size < 5) next.add(newIdx);
      return next;
    });
    setCustomDraft(null);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${generatedUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* progress */}
      <div className="flex items-center gap-2 mb-10">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
              step >= n ? "bg-accent-purple" : "bg-foreground/10"
            }`}
          />
        ))}
      </div>

      <div className="relative min-h-[420px]">
        {/* STEP 1 */}
        {step === 1 && (
          <section className="animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-xs uppercase tracking-[0.18em] text-accent-purple mb-3">
              Step 1 of 4
            </p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight text-foreground mb-8">
              What role are we <span className="italic text-accent-purple">hiring</span> for?
            </h2>

            <label className="block mb-6">
              <span className="text-sm text-muted-foreground mb-2 block">Job Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Content Writing Intern"
                className="w-full bg-transparent border-0 border-b border-border focus:border-accent-purple text-2xl font-serif py-3 outline-none transition-colors placeholder:text-foreground/30"
              />
            </label>

            <label className="block mb-10">
              <span className="text-sm text-muted-foreground mb-2 block">
                Paste Job Description
              </span>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={6}
                placeholder="Paste the raw job description or key responsibilities here. Our AI will automatically extract core competencies..."
                className="w-full bg-card border border-border rounded-2xl p-5 text-base text-foreground outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20 transition-all placeholder:text-foreground/40 resize-none"
              />
            </label>

            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={!title.trim() || !desc.trim()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              >
                Next: Generate Questions
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <section className="animate-in fade-in slide-in-from-right-4 duration-500">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 rounded-full bg-accent-purple/30 blur-2xl" />
                  <div className="relative h-16 w-16 rounded-full bg-accent-purple/15 flex items-center justify-center">
                    <Loader2 className="h-7 w-7 text-accent-purple animate-spin" />
                  </div>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl text-foreground max-w-md">
                  AI is identifying core competencies and writing your{" "}
                  <span className="italic text-accent-purple">tailored questions…</span>
                </h2>
              </div>
            ) : (
              <>
                <p className="text-xs uppercase tracking-[0.18em] text-accent-purple mb-3">
                  Step 2 of 4
                </p>
                <h2 className="font-serif text-4xl md:text-5xl tracking-tight text-foreground mb-3">
                  Select your <span className="italic text-accent-purple">competency</span>{" "}
                  questions.
                </h2>
                <p className="text-sm text-muted-foreground mb-8">
                  Select up to 5 questions. Shorter forms increase applicant completion by 80%.
                </p>

                <div className="space-y-3 mb-4">
                  {questions.map((q, i) => {
                    const isSel = selected.has(i);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleSelect(i)}
                        className={`w-full text-left flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 ${
                          isSel
                            ? "border-emerald-400 bg-emerald-400/5 ring-2 ring-emerald-400/30"
                            : "border-border bg-card hover:border-foreground/30"
                        }`}
                      >
                        <div
                          className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isSel
                              ? "bg-emerald-400 border-emerald-400"
                              : "border-foreground/30"
                          }`}
                        >
                          {isSel && <Check className="h-3.5 w-3.5 text-background" />}
                        </div>
                        <span className="text-foreground text-base leading-relaxed">{q}</span>
                      </button>
                    );
                  })}
                </div>

                {customDraft !== null ? (
                  <div className="p-5 rounded-2xl border border-accent-purple/40 bg-card mb-6">
                    <textarea
                      autoFocus
                      value={customDraft}
                      onChange={(e) => setCustomDraft(e.target.value)}
                      rows={2}
                      placeholder="Write your own question…"
                      className="w-full bg-transparent outline-none text-foreground placeholder:text-foreground/40 resize-none"
                    />
                    <div className="flex gap-2 justify-end mt-2">
                      <button
                        onClick={() => setCustomDraft(null)}
                        className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addCustom}
                        className="text-xs px-3 py-1.5 rounded-full bg-foreground text-background"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setCustomDraft("")}
                    className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground mb-8 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Custom Question
                  </button>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={selected.size === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    Next: Set Deliverables
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <section className="animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-xs uppercase tracking-[0.18em] text-accent-purple mb-3">
              Step 3 of 4
            </p>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight text-foreground mb-10">
              What extra <span className="italic text-accent-purple">proof</span> do you need?
            </h2>

            <div className="space-y-4 mb-10">
              <ToggleRow
                label="Require Previous Work Link"
                description="Candidates must provide a URL to a portfolio, personal blog, or shared folder."
                checked={reqLink}
                onChange={setReqLink}
              />
              <ToggleRow
                label="Require Text-CV Upload"
                description="Candidates copy-paste raw resume text. AI will calculate a separate background keyword match score."
                checked={reqCv}
                onChange={setReqCv}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Next: Publish Link
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <section className="animate-in fade-in zoom-in-95 duration-700 text-center py-10">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent-purple/15 mb-6">
              <PartyPopper className="h-7 w-7 text-accent-purple" />
            </div>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight text-foreground mb-4">
              Your Screening Link is{" "}
              <span className="italic text-accent-purple">Live!</span> 🎉
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-10">
              Share this custom link on LinkedIn, WhatsApp, or college placement groups.
              Applications will be instantly ranked by AI on your dashboard.
            </p>

            <div className="max-w-xl mx-auto flex items-center gap-2 p-2 pl-5 rounded-full bg-card border border-border mb-8">
              <Link2 className="h-4 w-4 text-accent-purple shrink-0" />
              <span className="flex-1 text-left text-sm text-foreground truncate font-mono">
                {generatedUrl}
              </span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy Link
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Go to Dashboard
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full text-left flex items-start gap-5 p-6 rounded-2xl border transition-all ${
        checked
          ? "border-accent-purple/50 bg-accent-purple/5"
          : "border-border bg-card hover:border-foreground/30"
      }`}
    >
      <div className="flex-1">
        <div className="font-serif text-xl text-foreground mb-1">{label}</div>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div
        className={`relative h-7 w-12 rounded-full transition-colors shrink-0 mt-1 ${
          checked ? "bg-accent-purple" : "bg-foreground/15"
        }`}
      >
        <div
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform duration-300 ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}

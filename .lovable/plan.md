# AI Rubric Scoring for Candidate Submissions

Add an AI-evaluated score + reasoning for every candidate submission, surface it in the submissions table with colored badges, and show the reasoning inside the existing "View answers" drawer.

## 1. Database

Migration on `public.submissions`:
- Add `ai_reasoning text` (nullable).
- `qa_score` already exists (numeric, nullable) — reuse it. NULL = still evaluating.
- No new RLS needed; existing "Job owners can view their submissions" already covers the new column.

## 2. Server function: score a submission with Lovable AI

New file `src/lib/score-submission.functions.ts` exposing `scoreSubmission({ submissionId })`:
- Uses `supabaseAdmin` (loaded inside the handler) so it can read the submission + parent job and write back `qa_score` / `ai_reasoning` regardless of who triggered it.
- Builds a rubric prompt from the job's `questions[]` and the candidate's `answers[]` (plus portfolio link / CV text if present).
- Calls Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) using `LOVABLE_API_KEY` and `google/gemini-2.5-flash` with a JSON response shape: `{ score: 0–100, reasoning: "2 short sentences" }`.
- Rubric: penalises generic / AI-sounding fluff, rewards specific examples, role relevance, and clarity.
- Writes the result back to the submissions row.
- Idempotent — if `qa_score` is already set, returns early (so re-runs don't spend tokens).

## 3. Trigger scoring after a candidate submits

In `src/routes/apply.$jobSlug.tsx`, after the existing `submissions.insert(...)` succeeds:
- Fire-and-forget call to `scoreSubmission({ submissionId })` (don't block the candidate's thank-you screen).
- Failures are swallowed; the row simply stays NULL and the dashboard keeps showing "Evaluating…".

## 4. Submissions table UI (`src/routes/_authenticated/jobs.$jobId.tsx`)

Type + query:
- Add `ai_reasoning: string | null` to the `Submission` type.
- Include `qa_score, ai_reasoning` in the `.select(...)`.

Header grid — change from `grid-cols-12` to a new split that inserts SCORE between SUBMITTED and ANSWERS:
- Candidate (3) · Email (3) · WhatsApp (2) · Submitted (2) · **Score (1)** · Answers (1, right-aligned).

New `<ScoreBadge score={qa_score} />` component (inline in the file):
- `null` → slate chip with `Loader2` spinning + "Evaluating…", `animate-pulse`, classes `bg-slate-800/60 text-slate-300 border border-slate-700/60`.
- `>= 80` → `bg-emerald-950/40 text-emerald-400 border border-emerald-800/50`, label `{score}/100`.
- `50–79` → `bg-amber-950/40 text-amber-400 border border-amber-800/50`, label `{score}/100`.
- `< 50` → `bg-rose-950/40 text-rose-400 border border-rose-800/50`, label `{score}/100`.
- All rounded-full, `px-2.5 py-1`, `text-xs font-medium tabular-nums`, consistent with the existing purple/slate aesthetic.

Score is rendered as `Math.round(qa_score)`.

Expanded answers panel — add a new block above the question list:
- Container titled **"AI Evaluation Report"** with the same `bg-background/40 border border-border rounded-xl p-4` styling as the existing answer cards.
- Heading uses the same `text-xs uppercase tracking-wider text-accent-purple` pattern as Q1/Q2 labels for consistency.
- Body renders `ai_reasoning` (plain text, `whitespace-pre-wrap`). If null, shows "Evaluation in progress…" in muted italic.
- Inline mini score badge (same component) next to the title so the rubric verdict is visible at a glance.

CSV export — add a `Score` column right after `Submitted At` so exports include it too.

## 5. Backfill (optional, manual)

After deploy, existing rows have `qa_score = null` and will sit on "Evaluating…" forever. Add a small "Re-score" button (lightning icon) on each row that calls `scoreSubmission` on demand. No bulk job needed.

## Files touched

- new: `supabase/migrations/<ts>_add_ai_reasoning.sql`
- new: `src/lib/score-submission.functions.ts`
- edit: `src/routes/apply.$jobSlug.tsx` (fire-and-forget scoring after insert)
- edit: `src/routes/_authenticated/jobs.$jobId.tsx` (column, badge, AI Evaluation Report, CSV, re-score button)

## Out of scope

- Custom per-job rubrics (uses one generic rubric).
- Re-scoring all historical rows automatically.
- Streaming reasoning / realtime score updates (recruiter refreshes the page to see results — typically <5s after submission).

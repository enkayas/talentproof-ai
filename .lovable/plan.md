## Goal

Actually run the cynical-recruiter QA rubric against candidate answers and store its score + reasoning separately from the CV evaluation.

## 1. Schema migration
Add one nullable column to `submissions`:
- `qa_analysis` JSONB — mirrors `cv_analysis`; will hold `{ final_score, analysis_reasoning }` on success or `{ error, analysis_reasoning, logged_at }` on fallback.

No other schema changes; `qa_score` already exists.

## 2. `src/lib/score-submission.functions.ts` changes

### Replace the unused `SYSTEM_PROMPT` constant
Rename to `QA_SYSTEM_PROMPT` and set its body verbatim to the cynical-recruiter rubric supplied by the user. Keep the CV prompt (`systemPrompt` built inside `runScoring`) untouched — the two rubrics stay fully isolated.

### Add a new `runQaScoring(job, sub)` helper
- Pull `job.questions` (already fetched) and `sub.answers`.
- If `answers` is empty or every entry is blank → return `{ ok: false, skipped: true }` and write `qa_score: null`, `qa_analysis: null`.
- Otherwise format a transcript like:
  ```
  Q1: <question label>
  A1: <answer>

  Q2: ...
  ```
- POST to `https://ai.gateway.lovable.dev/v1/chat/completions` with `model: google/gemini-2.5-flash`, `messages: [{role:"system", content: QA_SYSTEM_PROMPT}, {role:"user", content: transcript}]`.
- Parse `{ final_score, analysis_reasoning }`; clamp score 0–100; on any gateway/parse failure return fallback `{ final_score: 0, analysis_reasoning: "AI evaluation failed.", error: true }`.

### Wire it into `runScoring`
- Run CV scoring as today.
- Run `runQaScoring` (sequential is fine; can be `Promise.all` with the CV call if we restructure, but sequential keeps the diff small).
- Single `submissions` update writes:
  - `qa_score` = QA final_score (or `null` when skipped)
  - `qa_analysis` = `{ final_score, analysis_reasoning }` on success / fallback shape on error / `null` when skipped
  - `cv_score`, `cv_analysis`, `ai_reasoning` — unchanged (CV-only)
- Return value extends current shape with `qa: { score, reasoning, fallback }`.

### Bug fix
Stop the current `qa_score: safeResponse.cv_score` line — `qa_score` must come from QA, not CV.

## 3. Out of scope
- No UI changes. The dashboard already reads `qa_score` as "ANSWER SCORE" and will start showing the real value automatically. Rendering `qa_analysis` in the Screening Answers tab can come in a follow-up.
- CV scoring logic, prompt, and storage are untouched.
- Candidate-facing submission flow untouched.

## Technical notes
- Migration: `ALTER TABLE public.submissions ADD COLUMN qa_analysis jsonb;` — no GRANTs needed (column on existing table; RLS unchanged).
- After the migration runs, `src/integrations/supabase/types.ts` regenerates; the new `qa_analysis` field becomes type-safe in the update call.
- Truncate transcript at ~30k chars defensively before sending (each answer is already max 5000 chars × 50 answers cap, so this is a guard).
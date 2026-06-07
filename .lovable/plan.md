
# CV Pipeline Scaffolding (Mock AI Response)

Goal: prepare the data pipeline that a future AI call will use. No scoring logic yet — just fetch the inputs, log them, return a hardcoded mock.

## 1. Schema change

Add a `job_description` column to `jobs`:

- `job_description text` — nullable, no default (existing rows stay NULL).
- No RLS changes needed; existing "Anyone can read jobs" / owner policies already cover the new column.

This is a separate migration tool call; the rest of the work follows after it's approved.

## 2. Refactor `runScoring` in `src/lib/score-submission.functions.ts`

Inside the existing `runScoring(submissionId)` (already used by both `scoreSubmission` and `submitApplication`), replace the Lovable AI call with this scaffolding:

1. Load submission row (already done) — also keep `cv_file_path` in the select.
2. Load job row — extend select to `job_title, job_description, questions`.
3. If `cv_file_path` is present:
   - `supabaseAdmin.storage.from("cv-resumes").download(cv_file_path)`
   - Convert the returned `Blob` to an `ArrayBuffer`, then to a Node `Buffer`, then `.toString("base64")` → `base64Pdf`.
   - On download error: log and continue with `base64Pdf = ""`.
4. `console.log` for verification:
   - `job_title`
   - `job_description` (or `"(none)"` when null)
   - `base64Pdf.slice(0, 50)`
5. Build and return the mock response, and persist it to the row so the recruiter UI shows something:
   ```ts
   const mockAiResponse = {
     cv_score: 70,
     key_matches: ["Placeholder match"],
     cv_summary: "Placeholder summary",
   };
   ```
   - Write `qa_score = mockAiResponse.cv_score` and `ai_reasoning = mockAiResponse.cv_summary` to `submissions` (keeps the existing leaderboard / "Evaluating…" badge behavior working end-to-end).
   - Return `{ ok: true, mockAiResponse }` from the handler.

Idempotency guard (`if qa_score is set, return early`) stays as-is.

## 3. Out of scope (explicit)

- No Lovable AI / Gemini call.
- No real OCR or text extraction.
- No new `key_matches` / `cv_summary` columns — mock object is returned in-memory only; only `qa_score` + `ai_reasoning` are persisted (already exist).
- No UI changes in `jobs.$jobId.tsx`.
- No changes to `submitApplication`'s insert payload, the apply form, or storage policies.

## Files touched

- new: `supabase/migrations/<ts>_add_job_description.sql`
- edit: `src/lib/score-submission.functions.ts` (replace AI call inside `runScoring` with download + log + mock return)

## Verification

After implementing, submit a test application with a PDF and check server function logs (`stack_modern--server-function-logs`) for the three log lines plus a `qa_score = 70` row in `submissions`.

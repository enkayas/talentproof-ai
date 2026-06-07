## Security Audit Results

### Baseline (all good)
- RLS is enabled on both `jobs` and `submissions`; the supabase linter finds zero issues.
- No roles are stored on a profiles table; the app has no role system (single-tenant: each recruiter owns their own jobs via `jobs.owner_id = auth.uid()`), so `user_roles` / `has_role()` is not required.
- `jobs.SELECT` is public-by-design (apply page reads job + questions anonymously); no other table allows anonymous read.
- `SUPABASE_SERVICE_ROLE_KEY` is only used in `client.server.ts` (server-only) and `auth-middleware.ts`; no service-role key in client bundles. Bearer tokens are attached via the integration-managed `attachSupabaseAuth` middleware.
- Storage bucket `cv-resumes` is private with owner-scoped policies.

### Gaps to fix

1. **`scoreSubmission` has no auth** (error). The serverFn is callable anonymously with any UUID — lets attackers burn AI credits, corrupt `qa_score` / `cv_score`, and indirectly read CV/answer data.
   - Add `requireSupabaseAuth` middleware and verify `context.userId === jobs.owner_id` for the submission's job before running `runScoring`.

2. **`submitApplication` bypasses RLS for the public insert** (error). Anyone can POST submissions to closed jobs, past the 100-cap, or against fake job ids.
   - Inside the handler, before insert: load the job with `supabaseAdmin`, reject when `status !== 'live'`, and reject when `count(submissions where job_id=…) >= 100`.

3. **Open redirect on `/auth`** (warn). `redirect` search param is taken verbatim. Craft `/auth?redirect=https://attacker.com` → post-login phishing.
   - In `validateSearch`, only accept a `redirect` that starts with `/` and not `//`; otherwise drop to `/dashboard`. Also drop the unsafe `as "/dashboard"` casts at the navigate sites.

4. **`submissions` UPDATE policy is too broad** (warn). Recruiters can hand-edit `qa_score`, `cv_score`, `cv_analysis`, `ai_reasoning`. Score integrity matters here because the dashboard ranks on these.
   - Replace the existing owner-update policy with one restricted to recruiter-editable columns only: `is_shortlisted`. AI score writes happen through `supabaseAdmin` from `scoreSubmission`, so RLS scoping does not break them.
   - Implementation: keep the policy USING/WITH CHECK ownership, but enforce column scope with a row-level trigger that raises if any of the AI columns change for non-service-role callers. (Postgres RLS itself has no column-level UPDATE restriction we can express through Supabase migration cleanly, so a `BEFORE UPDATE` trigger is the correct mechanism.)

5. **Missing UPDATE policy on `storage.objects` for `cv-resumes`** (warn). Add an explicit no-op policy: reject UPDATE for the `cv-resumes` bucket for all non-service-role callers (admin client bypasses RLS, so backend file ops still work).

6. **Defense-in-depth: move `closeApplication` and `toggleShortlist` mutations off the anon client** (warn). Today `src/routes/_authenticated/jobs.$jobId.tsx` calls `supabase.from('jobs').update(...)` and `supabase.from('submissions').update({ is_shortlisted })` directly from the component, relying purely on RLS.
   - Add two serverFns in `src/lib/jobs.functions.ts`: `closeJob({ jobId })` and `toggleShortlist({ submissionId, value })`, both gated by `requireSupabaseAuth` + explicit `owner_id === context.userId` check, then call them from the page via `useServerFn`.

### Technical changes

**Migration (single file):**
- `BEFORE UPDATE` trigger on `public.submissions` that, when `current_setting('role') <> 'service_role'`, raises if any of `qa_score`, `cv_score`, `qa_analysis`, `cv_analysis`, `ai_reasoning` is being changed. (Recruiter UPDATEs through RLS only touch `is_shortlisted`.)
- `CREATE POLICY "Block direct updates on cv-resumes"` on `storage.objects` for UPDATE — `USING (bucket_id <> 'cv-resumes')`, so non-bucket files behave normally and `cv-resumes` rejects UPDATE; admin client bypasses RLS.

**Code:**
- `src/lib/score-submission.functions.ts`: add `requireSupabaseAuth` middleware to `scoreSubmission`; verify ownership via `jobs.owner_id`. In `submitApplication`, add `live`-status + 100-cap checks before `insert`.
- `src/lib/jobs.functions.ts` (new): `closeJob` and `toggleShortlist` serverFns with `requireSupabaseAuth` + ownership checks.
- `src/routes/_authenticated/jobs.$jobId.tsx`: replace the two direct `supabase.from(...).update(...)` calls with the new serverFns via `useServerFn`.
- `src/routes/auth.tsx`: tighten `validateSearch` (relative-path only); drop the `as "/dashboard"` casts and use the validated value directly.

### Out of scope
- No new auth providers, no role system (single-owner model is appropriate for this app).
- No rate limiting (would require a new table or KV; flagged as a future hardening step but not part of this pass).
- Storage SELECT/INSERT/DELETE policies on `cv-resumes` already look correct per the linter and prior migration; leaving untouched.

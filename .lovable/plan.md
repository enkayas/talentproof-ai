# Performance Audit — Findings Only

Scope: read-only review of routes, components, DB queries, and indexes. No functionality changes are proposed here; this is a prioritized list of issues with suggested remediations for a follow-up pass.

## 1. Unnecessary re-renders & wasted work

**H1. `dashboard.tsx` double-fetches jobs on mount.** Two `useEffect`s both call `loadJobs()`: one on mount, one when `active` changes (initial value `"active"` triggers it). Result: dashboard fires the jobs+submissions query twice every time it mounts.
- Fix: collapse into a single effect, or guard the second with a "was-create" ref.

**H2. `dashboard.tsx` `loadJobs` makes N+1-style aggregation in the client.** Pulls every submission row (`job_id` only) for every job the recruiter owns just to count them. With 100 caps × many jobs this grows linearly per dashboard view.
- Fix: a Postgres view / RPC returning `(job_id, count)` via `group by`, or a `jobs_with_counts` view used in a single `select`.

**H3. `jobs.$jobId.tsx` polling loop re-creates an interval on every `subs` change.** The polling effect depends on `subs`; every poll updates `subs`, which clears + re-arms the interval. Works, but means the interval drifts and `load()` runs more often than intended while data is flowing in.
- Fix: depend on a derived boolean `hasPending = subs.some(s => s.qa_score === null)` instead of `subs`, or use a ref.

**H4. Stuck-submission auto-retry effect also depends on `subs`.** Same problem as H3 — re-runs the filter on every state change. Cheap today, but couples re-render cost to row count.
- Fix: same — derive a stable dep, or move the check into the same polling tick.

**H5. No memoization of derived data.**
- `dashboard.tsx`: `activeJobs`, `pastJobs`, `totalSubs` recomputed on every render.
- `ShortlistHub`: `grouped` / `groups` recomputed on every render and allocates a new `Map`/object.
- `jobs.$jobId.tsx`: `exportCsv` rebuilds headers/rows inline; `ScoreBadge` / row components are not memoized — toggling one row's `expanded`/`contactOpen` re-renders the entire submissions list.
- Fix: `useMemo` for derived collections; `React.memo` for `JobCard`, `ShortlistCandidateCard`, and the submission row component.

**H6. `JobCardSkeletonGrid` and skeleton arrays use inline `[0,1,2]` literals.** Negligible, but pair with H5 — memoize skeletons as module-level constants.

**H7. `Set`-based local state churn.** `contactOpen`, `rescoring` clone a `Set` on every toggle and re-render the whole table. Acceptable today; if list grows, switch to per-row state via memoized row component.

## 2. Database queries & indexes

**D1. Submissions over-selects on the recruiter detail page.** `jobs.$jobId.tsx` selects `cv_text` and full `cv_analysis` / `ai_reasoning` JSON for the leaderboard render even though those fields are only revealed when a row is expanded.
- Fix: split into two queries — a lightweight list query (`id, candidate_name, email, qa_score, cv_score, created_at, is_shortlisted, whatsapp, linkedin, portfolio_link`) and a per-row fetch on expand for `cv_text`/`cv_analysis`/`ai_reasoning`. Same data, dramatically less payload.

**D2. CSV export uses already-loaded rows.** Once D1 lands, `exportCsv` will need its own full-detail fetch (acceptable — only runs on click). Note this as a coupled change.

**D3. `submissions` indexes are minimal.** Only `submissions_pkey` and `submissions_job_id_idx` exist. Recurring queries that would benefit from composite indexes:
  - leaderboard order: `(job_id, qa_score desc nullsfirst false, created_at desc)`
  - shortlist hub filter: partial index `where is_shortlisted = true` on `(job_id, qa_score desc)`
  - stuck-row scan: implicit `created_at` filter — covered by leaderboard composite.
- Fix: add the two indexes above in a migration.

**D4. Anonymous public-read on `jobs` table.** `Anyone can read jobs` policy allows `select *` from anywhere; `select` lists the full row including `questions` JSON. Apply page only needs `id, job_title, job_description, questions, require_link, require_cv, status`. Already minimal in code — flag only as a reminder.

**D5. ShortlistHub does a two-step query (`jobs` then `submissions in (...ids)`).** Could be a single join via an RPC or a `submissions` query joined with `jobs!inner(job_title)` filtered server-side by owner via RLS — fewer round trips.

## 3. Images & assets

**I1. No `<img>` tags found** in the app surfaces — current pages use CSS-only visuals. Nothing to lazy-load today. When images are added (e.g., recruiter avatar, candidate photos, marketing hero on `index.tsx`), apply the standard rules: explicit `width`/`height`, `loading="lazy"` for below-the-fold, `decoding="async"`, AVIF/WebP via `vite-imagetools` for bundled assets, LCP preload in route `head().links`.

**I2. `lucide-react` icon imports are fine** (tree-shaken), but `dashboard.tsx` and `jobs.$jobId.tsx` each import ~20 icons in one barrel — keep as-is; flagged only so future additions stay deliberate.

## 4. Duplicate code / consolidation opportunities

**C1. `ScoreBadge` (jobs.$jobId.tsx) and `ScorePill` (dashboard.tsx) are near-identical.** Same threshold logic (80 / 50), same tone palette, slight visual differences.
- Fix: one shared `src/components/ScoreBadge.tsx` with `variant="pill" | "badge"` and `size` props.

**C2. `LoadErrorPanel` is defined inline in `dashboard.tsx`.** `jobs.$jobId.tsx` and `apply.$jobSlug.tsx` each ship their own error panel JSX with the same shape (icon + title + message + retry button).
- Fix: promote to `src/components/LoadErrorPanel.tsx` and reuse.

**C3. Skeleton blocks duplicated.** `JobCardSkeletonGrid` (dashboard) and `SubmissionsSkeleton` (jobs page) follow the same pattern. Acceptable as-is, but a shared `SkeletonGrid` primitive would cut ~60 lines.

**C4. Score color tone logic duplicated in three places** (`ScoreBadge`, `ScorePill`, and an inline span in jobs page if any). Extract to `getScoreTone(score)` util.

**C5. Auth/user-id fetch pattern repeated.** `dashboard.tsx` and `ShortlistHub` both call `supabase.auth.getUser()` and branch on missing uid. A small `useCurrentUser()` hook (or move loads into server functions that already enforce auth) would remove the duplication and avoid one extra round trip per mount.

**C6. CSV escaping helper inline in `exportCsv`.** Single-use today; flag only if exports expand.

## 5. Misc / smaller wins

**M1. `today` string in `dashboard.tsx`** is recomputed on every render with `toLocaleDateString`. Move into `useMemo(() => …, [])`.

**M2. `font-serif` + custom radial gradient on dashboard** are fine; no perf concern. Listed for completeness.

**M3. `useEffect` cleanup in `jobs.$jobId.tsx`** uses a `cancelled` flag but `load()` writes through `setState` unconditionally — flag, not a perf issue but a latent stale-update path.

## Suggested priority order for a follow-up fix pass

1. H1 (double fetch) — quick win, halves dashboard query load.
2. D1 + D3 (split submissions select, add composite indexes) — biggest payoff for recruiters with many candidates.
3. H2 (server-side job counts via view/RPC) — removes the per-dashboard linear submissions scan.
4. C1 + C2 (shared `ScoreBadge`, `LoadErrorPanel`) — cleanup, enables consistent future changes.
5. H3 + H4 + H5 (memoization, stable polling deps) — polish.
6. D5, C5 — when touching auth/data layer next.

No code is changed in this audit; each item above is a separate, optional follow-up.


# Error Handling & Loading State Audit

Audit against the 5 criteria. No existing functionality changes — only adding try/catch, inline errors, retry CTAs, and skeletons/spinners where missing.

## Current State

### ✅ Already in place
- **404 page for invalid routes** — `NotFoundComponent` in `src/routes/__root.tsx` covers unmatched URLs; `apply.$jobSlug.tsx` and `jobs.$jobId.tsx` show in-page "not found" UIs for missing records.
- **Root error boundary** — `ErrorComponent` in `__root.tsx` with "Try again" (calls `router.invalidate()` + `reset()`).
- **Loading spinners (partial)** — `Loader2` is used on dashboard jobs list, Shortlist Hub, submissions page, apply page, auth submit button, CreateLinkWizard step 2 generation, publish, and submission flow.
- **Form validation (partial)** — Apply flow disables Next/Submit until each step's fields are valid; auth form uses HTML5 `required`/`minLength`.
- **Some error toasts** — `jobs.$jobId.tsx` toasts on close/shortlist failure; apply flow shows `submitError` inline.

### ⚠️ Gaps found

| # | Location | Gap |
|---|---|---|
| 1 | `dashboard.tsx` `loadJobs` (lines 74-119) | No try/catch around `supabase.from("jobs")...` / `submissions` queries. Silent failure: spinner stops, list renders empty as if no data. No retry. |
| 2 | `dashboard.tsx` `ShortlistHub` (lines 521-566) | Same — no try/catch, no error state, no retry. |
| 3 | `jobs.$jobId.tsx` `load()` (lines 127-177) | No try/catch around the parallel `jobs`/`submissions` fetch. On network failure `loading` stays `true` forever (infinite spinner). No "Retry" CTA. |
| 4 | `jobs.$jobId.tsx` `rescore()` (line 234) / `exportCsv` | `rescore` has a `try/finally` but no `catch` user message on failure (only clears the rescoring set). `exportCsv` has no try/catch around Blob/URL ops. |
| 5 | `apply.$jobSlug.tsx` initial job fetch (lines 84-124) | On `error` it shows the generic "Link not found" page — collapses real network errors into a 404. No distinction + no retry. |
| 6 | `apply.$jobSlug.tsx` identity step | No inline validation messages — invalid email/empty name only disable the button silently. User doesn't know *why*. |
| 7 | `CreateLinkWizard.tsx` `handleGenerate` (line 51) | `catch` silently swaps in 4 hard-coded fallback questions and never tells the user AI generation failed. |
| 8 | `CreateLinkWizard.tsx` `handlePublish` | Surfaces `publishError` inline ✅ but no retry button — user must re-click Publish manually (acceptable, but no toast either). |
| 9 | `auth.tsx` form | Errors shown inline ✅ but no field-level validation (e.g. invalid-email styling) beyond browser default. |
| 10 | Loading states — skeletons vs spinners | Everywhere uses a centered single `Loader2` spinner. Dashboard job cards and submissions table would benefit from **skeleton rows** matching their final layout (reduces layout shift, feels faster). Optional polish. |
| 11 | Per-route error/notFound boundaries | Only `__root.tsx` defines them. Per `tanstack-errors-notfound`, **every route with a loader** must define both. None of our routes use loaders yet (they all `useEffect` + fetch), so this is N/A today — but the route files still have no `errorComponent`/`notFoundComponent`. Low priority unless we move to loaders. |
| 12 | Network failure retry CTA | No fetch in the app currently shows a "Retry" button on failure — refresh is the only recourse. |

## Plan (UI-only fixes, no logic changes)

### A. Dashboard (`src/routes/_authenticated/dashboard.tsx`)
1. Wrap `loadJobs` body in `try/catch`. Add `jobsError: string | null` state. On error: stop spinner, render an inline error card with **"Try again"** button that re-invokes `loadJobs()`.
2. Same treatment for `ShortlistHub` effect — add `error` state + retry button.
3. Replace the centered spinner in the Active Links / Past Jobs grids with **3 skeleton `JobCard` placeholders** (same `rounded-2xl border p-6` shell with `animate-pulse` blocks). Spinner stays for Shortlist Hub (lower visual weight).

### B. Submissions page (`src/routes/_authenticated/jobs.$jobId.tsx`)
4. Wrap `load()` in `try/catch`. Add `loadError` state. On error: render an error panel with **"Retry"** button (calls `load()`).
5. Add a `toast.error("Re-scoring failed. Please try again.")` in `rescore()`'s `catch` (currently absent). Keep optimistic UI as-is.
6. Wrap `exportCsv` Blob creation in `try/catch` with `toast.error("Could not export CSV.")` on failure.
7. Replace pre-data spinner with a **skeleton table** (header row + 4 skeleton rows matching the existing 6-column grid template — adheres to the unified-grid rule).

### C. Apply page (`src/routes/apply.$jobSlug.tsx`)
8. Split fetch error vs missing-record: track `fetchError` separately from `notFound`. On fetch failure render a "Couldn't load this application" card with **"Try again"** button (re-runs the effect via a `reloadKey` state bump).
9. Add inline field error messages on identity step:
   - Below Email: `Enter a valid email` when touched & invalid.
   - Below Name: `Required` when touched & empty.
   - Below WhatsApp: `Required` when touched & empty.
   Use `touched` flags per field so messages only appear after blur. Button disabled logic unchanged.
10. Submit flow already surfaces `submitError` ✅ — add a **"Try again"** button next to it on the proof step that re-runs `handleSubmit()` (currently user must press Submit again, which works but isn't discoverable).

### D. Create Link Wizard (`src/components/CreateLinkWizard.tsx`)
11. In `handleGenerate` `catch`: show a `toast.error("AI couldn't generate questions. Using starter set — edit or add your own.")` so the fallback isn't silent. Keep fallback behavior.
12. In `handlePublish`: keep inline `publishError` and add a "Try again" button next to it that re-invokes `handlePublish()`.

### E. Auth page (`src/routes/auth.tsx`)
13. Add inline `aria-invalid` styling + helper text for invalid email format on blur (touched flag). Keep server `error` panel as-is. No logic changes.

### F. Skeletons — shared
14. Create one new component `src/components/ui/skeleton-row.tsx` (or reuse existing shadcn `Skeleton` if present in `src/components/ui/`) for consistent `animate-pulse` blocks used by dashboard cards + submissions table.

### Out of scope (explicitly NOT changed)
- Moving fetches into TanStack loaders / `useQuery`. (Would change architecture — separate task.)
- Adding per-route `errorComponent` / `notFoundComponent` (only required when loaders exist).
- Any backend, RLS, or server function change.
- Visual redesign of existing spinners that are already adequate (auth button, publish button, modal confirm).

## Files to be edited
- `src/routes/_authenticated/dashboard.tsx` — try/catch + retry + skeletons (items 1-3)
- `src/routes/_authenticated/jobs.$jobId.tsx` — try/catch + retry + skeleton table + toasts (items 4-7)
- `src/routes/apply.$jobSlug.tsx` — fetch error vs 404 split, field-level validation, retry (items 8-10)
- `src/components/CreateLinkWizard.tsx` — toast on AI fallback, retry button on publish (items 11-12)
- `src/routes/auth.tsx` — inline email validation hint (item 13)
- `src/components/ui/skeleton-row.tsx` (new, only if no existing `Skeleton` component)

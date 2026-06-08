import { z } from "zod";

/**
 * Boundary schemas for data crossing the network → React state edge.
 *
 * Postgres types that DO NOT round-trip cleanly through JSON:
 *  - `timestamptz` → ISO 8601 string (never a JS `Date`)
 *  - `numeric` / `bigint` → string when value exceeds JS-safe range; otherwise
 *    PostgREST may still emit as string. Always coerce.
 *  - `jsonb` → arbitrary unknown until parsed.
 *
 * Every supabase call that feeds component state should `.parse()` through
 * one of these schemas so the rest of the app can rely on native JS types.
 */

// ISO timestamp string — kept as string because most UI uses `new Date(s)` or
// `Intl.DateTimeFormat`. Validates format so a malformed value fails loudly
// at the boundary instead of silently producing `Invalid Date` deep in render.
export const IsoTimestamp = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s)), {
    message: "Invalid ISO timestamp",
  });

// Numeric / bigint columns arrive as `number | string | null` depending on
// magnitude and PostgREST settings. Coerce to a finite number or null.
export const NullableNumber = z
  .union([z.number(), z.string(), z.null()])
  .transform((v) => {
    if (v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

export const Int = z
  .union([z.number(), z.string()])
  .transform((v) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  });

export const NullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v == null ? null : v));

// ────────────────────────────────────────────────────────────────────────────
// jobs_with_counts() RPC row (dashboard)
// ────────────────────────────────────────────────────────────────────────────
export const JobRowSchema = z.object({
  id: z.string(),
  job_title: z.string(),
  created_at: IsoTimestamp,
  status: z
    .union([z.string(), z.null()])
    .transform((v) => v ?? "live"),
  submission_count: Int, // bigint → string from PostgREST
});
export type JobRow = z.infer<typeof JobRowSchema>;

// ────────────────────────────────────────────────────────────────────────────
// submissions list row (jobs.$jobId page)
// ────────────────────────────────────────────────────────────────────────────
export const SubmissionListRowSchema = z.object({
  id: z.string().uuid(),
  candidate_name: z.string(),
  email: z.string(),
  whatsapp: NullableString,
  linkedin: NullableString,
  qa_score: NullableNumber, // numeric
  cv_score: NullableNumber, // integer (still safer to coerce)
  created_at: IsoTimestamp,
  is_shortlisted: z.coerce.boolean(),
});
export type SubmissionListRow = z.infer<typeof SubmissionListRowSchema>;

// Lazy-loaded details (jsonb fields parsed loosely; UI defends with optional chaining).
const CvAnalysisSchema = z
  .object({
    key_matches: z.array(z.string()).optional(),
    cv_summary: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough()
  .nullable();

export const SubmissionDetailsSchema = z.object({
  answers: z
    .union([z.array(z.string()), z.null(), z.undefined()])
    .transform((v) => (Array.isArray(v) ? v : [])),
  portfolio_link: NullableString,
  cv_text: NullableString,
  cv_file_path: NullableString,
  cv_analysis: CvAnalysisSchema,
  ai_reasoning: NullableString,
});

// ────────────────────────────────────────────────────────────────────────────
// shortlist row (joined with jobs.job_title)
// ────────────────────────────────────────────────────────────────────────────
export const ShortlistRowSchema = z.object({
  id: z.string().uuid(),
  candidate_name: z.string(),
  email: z.string(),
  whatsapp: NullableString,
  linkedin: NullableString,
  qa_score: NullableNumber,
  created_at: IsoTimestamp,
  job_id: z.string(),
  jobs: z
    .union([z.object({ job_title: z.string().optional() }).passthrough(), z.null()])
    .optional(),
});

// ────────────────────────────────────────────────────────────────────────────
// profile (server fn `getMyProfile` return.profile)
// ────────────────────────────────────────────────────────────────────────────
export const ProfileSchema = z
  .object({
    id: z.string().uuid(),
    display_name: NullableString,
    job_title: NullableString,
    company: NullableString,
    avatar_path: NullableString,
    updated_at: IsoTimestamp,
  })
  .nullable();
export type Profile = z.infer<typeof ProfileSchema>;

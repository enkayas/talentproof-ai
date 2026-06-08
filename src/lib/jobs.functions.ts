import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CloseJobInput = z.object({ jobId: z.string().min(1).max(200) });
const ToggleShortlistInput = z.object({
  submissionId: z.string().uuid(),
  value: z.boolean(),
});
const ScoreOwnershipInput = z.object({ submissionId: z.string().uuid() });

export const closeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CloseJobInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, owner_id, status")
      .eq("id", data.jobId)
      .maybeSingle();
    if (jobErr || !job) return { ok: false as const, reason: "not-found" };
    if (job.owner_id !== userId) return { ok: false as const, reason: "forbidden" };

    const { error } = await supabase
      .from("jobs")
      .update({ status: "closed" })
      .eq("id", data.jobId);
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const };
  });

export const deleteArchivedJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CloseJobInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, owner_id")
      .eq("id", data.jobId)
      .maybeSingle();
    if (jobErr || !job) return { ok: false as const, reason: "not-found" };
    if (job.owner_id !== userId) return { ok: false as const, reason: "forbidden" };

    // No FK cascade on submissions.job_id — delete dependent rows first.
    const { error: subsErr } = await supabase
      .from("submissions")
      .delete()
      .eq("job_id", data.jobId);
    if (subsErr) return { ok: false as const, reason: subsErr.message };

    const { error } = await supabase.from("jobs").delete().eq("id", data.jobId);
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const };
  });

export const toggleShortlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ToggleShortlistInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify ownership of the submission's job before mutating.
    const { data: sub } = await supabase
      .from("submissions")
      .select("id, job_id")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (!sub) return { ok: false as const, reason: "not-found" };

    const { data: job } = await supabase
      .from("jobs")
      .select("owner_id")
      .eq("id", sub.job_id)
      .maybeSingle();
    if (!job || job.owner_id !== userId) {
      return { ok: false as const, reason: "forbidden" };
    }

    const { error } = await supabase
      .from("submissions")
      .update({ is_shortlisted: data.value })
      .eq("id", data.submissionId);
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const };
  });

/**
 * Verifies that the authenticated user owns the job this submission belongs to.
 * Returns the submission_id when authorized. Used to guard scoreSubmission.
 */
export const assertSubmissionOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ScoreOwnershipInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from("submissions")
      .select("id, job_id")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (!sub) return { ok: false as const, reason: "not-found" };
    const { data: job } = await supabase
      .from("jobs")
      .select("owner_id")
      .eq("id", sub.job_id)
      .maybeSingle();
    if (!job || job.owner_id !== userId) {
      return { ok: false as const, reason: "forbidden" };
    }
    return { ok: true as const };
  });

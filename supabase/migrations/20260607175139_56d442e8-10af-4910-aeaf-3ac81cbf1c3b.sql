CREATE INDEX IF NOT EXISTS submissions_job_id_qa_score_created_at_idx
  ON public.submissions (job_id, qa_score DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS submissions_shortlisted_idx
  ON public.submissions (job_id, qa_score DESC NULLS LAST)
  WHERE is_shortlisted = true;
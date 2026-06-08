
-- 1) Enforce submission cap at the database layer (defense in depth)
CREATE OR REPLACE FUNCTION public.enforce_submission_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count bigint;
BEGIN
  SELECT count(*) INTO current_count
  FROM public.submissions
  WHERE job_id = NEW.job_id;

  IF current_count >= 100 THEN
    RAISE EXCEPTION 'Submission cap reached for this job'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_submission_cap_trg ON public.submissions;
CREATE TRIGGER enforce_submission_cap_trg
BEFORE INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_cap();

-- 2) Column-level defense-in-depth: revoke UPDATE on AI score fields from
--    non-service roles. The existing guard_submissions_score_columns trigger
--    remains, but Postgres will now block these column writes at the privilege
--    layer even if the trigger is ever dropped.
REVOKE UPDATE (qa_score, cv_score, qa_analysis, cv_analysis, ai_reasoning)
  ON public.submissions FROM authenticated, anon, PUBLIC;

-- service_role retains full ALL privileges already granted.

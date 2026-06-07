-- 1. Trigger: block recruiter UPDATEs that try to modify AI score fields.
-- service_role (admin client) bypasses RLS and runs as service_role; this trigger
-- explicitly allows it. The anon/authenticated path may only edit is_shortlisted.
CREATE OR REPLACE FUNCTION public.guard_submissions_score_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.qa_score IS DISTINCT FROM OLD.qa_score
     OR NEW.cv_score IS DISTINCT FROM OLD.cv_score
     OR NEW.qa_analysis IS DISTINCT FROM OLD.qa_analysis
     OR NEW.cv_analysis IS DISTINCT FROM OLD.cv_analysis
     OR NEW.ai_reasoning IS DISTINCT FROM OLD.ai_reasoning THEN
    RAISE EXCEPTION 'AI score fields are read-only for non-service-role updates';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_submissions_score_columns ON public.submissions;
CREATE TRIGGER guard_submissions_score_columns
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_submissions_score_columns();

-- 2. Storage: explicitly forbid UPDATE on cv-resumes for non-service-role callers.
-- Admin client bypasses RLS, so backend file operations still work.
DROP POLICY IF EXISTS "Block direct updates on cv-resumes" ON storage.objects;
CREATE POLICY "Block direct updates on cv-resumes"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id <> 'cv-resumes')
WITH CHECK (bucket_id <> 'cv-resumes');
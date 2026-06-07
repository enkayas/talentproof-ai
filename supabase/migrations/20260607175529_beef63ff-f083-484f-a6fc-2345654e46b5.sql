CREATE OR REPLACE FUNCTION public.jobs_with_counts()
RETURNS TABLE (
  id text,
  job_title text,
  created_at timestamptz,
  status text,
  submission_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.id, j.job_title, j.created_at, j.status,
         COUNT(s.id)::bigint AS submission_count
  FROM public.jobs j
  LEFT JOIN public.submissions s ON s.job_id = j.id
  WHERE j.owner_id = auth.uid()
  GROUP BY j.id, j.job_title, j.created_at, j.status
  ORDER BY j.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.jobs_with_counts() TO authenticated;

DROP POLICY IF EXISTS "Anyone can upload CV resumes" ON storage.objects;

CREATE POLICY "Anyone can upload CV resumes to live jobs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'cv-resumes'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND lower(coalesce(storage.extension(name), '')) IN ('pdf','doc','docx')
  AND coalesce((metadata->>'size')::bigint, 0) <= 10485760
  AND EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = (storage.foldername(name))[1]
      AND jobs.status = 'live'
      AND jobs.require_cv = true
  )
);

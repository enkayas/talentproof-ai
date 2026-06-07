## Problem

The "Open Original CV PDF" button generates a signed URL like `https://pdyihlhdquplgsqutjmx.supabase.co/storage/v1/object/sign/...`. Many Chrome extensions (uBlock Origin, Privacy Badger, AdGuard, Brave Shields) and some corporate firewalls block requests to raw `*.supabase.co` hostnames, which triggers `ERR_BLOCKED_BY_CLIENT`. The PDF itself is fine — only the hostname is being filtered.

## Fix: serve the PDF from our own domain

Add an authenticated server route that streams the CV bytes back through the app's own origin, so the browser never sees a `supabase.co` URL.

### 1. New server route `src/routes/api/cv.$submissionId.ts`
- `GET` handler.
- Verify the caller's Supabase bearer token (read `Authorization` header, call `supabase.auth.getUser` against the publishable-key client) — must be a signed-in recruiter.
- Look up the submission with `supabaseAdmin`, confirm the recruiter owns the parent job (`jobs.user_id === userId`), then `supabaseAdmin.storage.from("cv-resumes").download(cv_file_path)`.
- Return the PDF bytes with `Content-Type: application/pdf` and `Content-Disposition: inline; filename="<candidate>.pdf"`. 401/403/404 on auth or ownership failures.

### 2. Update `OpenCvButton` in `src/routes/_authenticated/jobs.$jobId.tsx`
- Stop calling `supabase.storage.createSignedUrl`.
- On click: fetch `/api/cv/<submissionId>` with the user's `Authorization: Bearer <access_token>` header, turn the response into a `Blob`, then `window.open(URL.createObjectURL(blob))`. Revoke the object URL after a short timeout.
- Keep existing loading/disabled states and toast on failure.

### Why this works
The browser only ever loads `https://<app-domain>/api/cv/...`, which extension blocklists don't touch. The service-role download happens server-side, and the route enforces recruiter ownership so it's no less secure than the previous signed URL.

### Out of scope
No schema changes, no edits to the candidate-facing upload flow, no changes to scoring logic.
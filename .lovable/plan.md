## Goal
Replace the hardcoded sidebar identity (email + "HR · Recruiter") with a real, editable recruiter profile, reachable by clicking the sidebar profile row.

## Database

**New table `public.profiles`** (one row per auth user)
- `id` (uuid, PK, FK → `auth.users(id)` ON DELETE CASCADE)
- `display_name` (text, nullable)
- `job_title` (text, nullable)
- `company` (text, nullable)
- `avatar_path` (text, nullable — Storage object path, not a URL)
- `created_at`, `updated_at` (timestamptz, defaults; updated_at via trigger)

**Grants & RLS**
- `GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;` + `GRANT ALL ... TO service_role;`
- RLS enabled. Policies (all scoped to `auth.uid() = id`):
  - SELECT own row
  - INSERT own row
  - UPDATE own row
- No anon access, no DELETE (cascades from auth.users handle removal).

**Auto-create on signup**
- `handle_new_user()` trigger on `auth.users` INSERT → inserts empty `profiles` row with `id = NEW.id`. SECURITY DEFINER, `search_path = public`.
- Backfill existing users in the migration: `INSERT ... SELECT id FROM auth.users ON CONFLICT DO NOTHING`.

**Avatar storage**
- Private bucket `avatars` (created via `storage_create_bucket`, public=false).
- RLS on `storage.objects` for bucket `avatars`: owner-scoped read/insert/update/delete using `(storage.foldername(name))[1] = auth.uid()::text` — files live at `avatars/{userId}/{filename}`.
- Client gets a short-lived signed URL via `supabase.storage.from('avatars').createSignedUrl(path, 3600)` whenever the avatar is rendered. (Private bucket keeps avatars off the public web.)

## Server functions (`src/lib/profile.functions.ts`)

All use `requireSupabaseAuth` middleware; RLS enforces ownership as a second layer.

- `getMyProfile()` → returns `{ profile, avatarUrl }` where `avatarUrl` is a fresh signed URL (or null).
- `updateMyProfile({ display_name?, job_title?, company? })` → validates via Zod (trimmed strings, max 80 / 80 / 120 chars), upserts row.
- `setMyAvatar({ path })` → validates the path starts with `{userId}/`, updates `avatar_path`. Upload itself happens client-side directly to Storage; this fn only records the path. Replacing avatar deletes the prior object.
- `clearMyAvatar()` → removes object + nulls `avatar_path`.

## Client

**Hook `useProfile()`** (`src/hooks/useProfile.ts`)
- Subscribes via TanStack Query: `useQuery({ queryKey: ['profile', userId], queryFn: getMyProfile })`.
- Exposes `profile`, `avatarUrl`, `isLoading`, plus a `mutate(updates)` helper that invalidates the query.

**New route `src/routes/_authenticated/profile.tsx`**
- Card layout: avatar (with upload / remove), Display name, Job title, Company, plus read-only Email from `useCurrentUser`.
- Inputs are shadcn `Input` / `Label`; "Save changes" button runs `updateMyProfile` via `useMutation` + `toast.success`.
- Avatar upload: file input → `supabase.storage.from('avatars').upload('{userId}/{uuid}.{ext}', file, { upsert: true })` → call `setMyAvatar({ path })` → refetch.
- Loading: skeletons matching field heights. Errors: `LoadErrorPanel`.
- Includes `head()` with `title: "Profile — TalentFirst"` and a description.

**Sidebar update (`src/routes/_authenticated/dashboard.tsx`)**
- The profile row (avatar + name + role) becomes a `<Link to="/profile">` styled as the current card. Hover: subtle bg shift to signal it's clickable. Logout button stays directly below, unchanged.
- Display logic:
  - Name = `profile.display_name || email`
  - Subtitle = `profile.job_title || 'Recruiter'` + (` · ${profile.company}` if set)
  - Avatar initial = first char of `display_name || email`; if `avatarUrl` present, render `<img>` instead.
- The page also stops hardcoding "HR · Recruiter".

## Files

New
- `src/routes/_authenticated/profile.tsx`
- `src/lib/profile.functions.ts`
- `src/hooks/useProfile.ts`
- Migration: `profiles` table + RLS + `handle_new_user` trigger + backfill + storage.objects policies for `avatars` bucket.

Edited
- `src/routes/_authenticated/dashboard.tsx` — sidebar profile row becomes a Link, pulls from `useProfile()`.

External tool calls (during build)
- `supabase--storage_create_bucket` `{ name: "avatars", public: false }` before the migration that adds storage.objects policies.

## Out of scope for v1
- Roles / multi-tenant org model (we'll add `company` as free text now; a real `organizations` table can come later).
- Public/shareable recruiter profile pages.
- Onboarding redirect — new users get a blank row and can edit any time.

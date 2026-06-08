import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, Trash2, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadErrorPanel } from "@/components/LoadErrorPanel";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  updateMyProfile,
  setMyAvatar,
  clearMyAvatar,
} from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — TalentFirst" },
      {
        name: "description",
        content:
          "Edit your recruiter profile — display name, job title, company, and avatar.",
      },
    ],
  }),
  component: ProfilePage,
});

const MAX_AVATAR_BYTES = 4 * 1024 * 1024; // 4 MB

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { profile, avatarUrl, isLoading, error, refetch, invalidate } = useProfile();

  const update = useServerFn(updateMyProfile);
  const setAvatar = useServerFn(setMyAvatar);
  const clearAvatar = useServerFn(clearMyAvatar);

  const [displayName, setDisplayName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setJobTitle(profile.job_title ?? "");
      setCompany(profile.company ?? "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await update({
        data: {
          display_name: displayName.trim().slice(0, 80),
          job_title: jobTitle.trim().slice(0, 80),
          company: company.trim().slice(0, 120),
        },
      });
      if (!res.ok) {
        toast.error("Could not save profile", { description: res.reason });
        return;
      }
      toast.success("Profile saved");
      invalidate();
    } catch (e) {
      toast.error("Could not save profile", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be under 4 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase().slice(0, 5);
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const res = await setAvatar({ data: { path } });
      if (!res.ok) {
        toast.error("Could not update avatar", { description: res.reason });
        return;
      }
      toast.success("Avatar updated");
      invalidate();
    } catch (e) {
      toast.error("Avatar upload failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    setUploading(true);
    try {
      const res = await clearAvatar();
      if (!res.ok) {
        toast.error("Could not remove avatar", { description: res.reason });
        return;
      }
      toast.success("Avatar removed");
      invalidate();
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const initial = (profile?.display_name?.[0] ?? user?.email?.[0] ?? "R").toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-2xl mx-auto px-6 py-10 md:py-16">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Account
          </p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight">
            Your <span className="italic text-accent-purple">profile</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            How you appear across the recruiter suite.
          </p>
        </header>

        {error ? (
          <LoadErrorPanel
            message={error instanceof Error ? error.message : "Could not load profile."}
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-8"
          >
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full bg-accent-purple/30 flex items-center justify-center text-2xl font-semibold text-foreground overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarPick}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-foreground/5 transition-colors disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {avatarUrl ? "Change avatar" : "Upload avatar"}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleAvatarRemove}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-colors disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email ?? ""}
                  disabled
                  className="bg-muted/40"
                />
                <p className="text-xs text-muted-foreground">
                  Email is managed by your login.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">Display name</Label>
                <Input
                  id="display_name"
                  value={displayName}
                  maxLength={80}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_title">Job title</Label>
                <Input
                  id="job_title"
                  value={jobTitle}
                  maxLength={80}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Recruiter"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={company}
                  maxLength={120}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Inc."
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

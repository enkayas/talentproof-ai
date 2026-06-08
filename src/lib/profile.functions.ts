import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UpdateInput = z.object({
  display_name: z.string().trim().max(80).nullable().optional(),
  job_title: z.string().trim().max(80).nullable().optional(),
  company: z.string().trim().max(120).nullable().optional(),
});

const SetAvatarInput = z.object({
  path: z.string().min(1).max(512),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, display_name, job_title, company, avatar_path, updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let avatarUrl: string | null = null;
    if (profile?.avatar_path) {
      const { data: signed } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_path, 60 * 60);
      avatarUrl = signed?.signedUrl ?? null;
    }

    // Boundary parse — guarantees serializable, deterministic shape on the wire.
    const { ProfileSchema } = await import("@/lib/schemas");
    const parsed = ProfileSchema.parse(profile ?? null);
    return { profile: parsed, avatarUrl };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, string | null> = {};
    for (const k of ["display_name", "job_title", "company"] as const) {
      if (k in data) {
        const v = data[k];
        patch[k] = v && v.length > 0 ? v : null;
      }
    }
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...patch }, { onConflict: "id" });
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const };
  });

export const setMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SetAvatarInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.path.startsWith(`${userId}/`)) {
      return { ok: false as const, reason: "forbidden" };
    }

    // Delete previous avatar object, if any.
    const { data: prev } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", userId)
      .maybeSingle();
    if (prev?.avatar_path && prev.avatar_path !== data.path) {
      await supabase.storage.from("avatars").remove([prev.avatar_path]);
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, avatar_path: data.path }, { onConflict: "id" });
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const };
  });

export const clearMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: prev } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", userId)
      .maybeSingle();
    if (prev?.avatar_path) {
      await supabase.storage.from("avatars").remove([prev.avatar_path]);
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", userId);
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const };
  });

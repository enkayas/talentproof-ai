import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { getMyProfile } from "@/lib/profile.functions";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useProfile() {
  const { user, loading: authLoading } = useCurrentUser();
  const fetchProfile = useServerFn(getMyProfile);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", user?.id ?? "anon"],
    queryFn: () => fetchProfile(),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const invalidate = useCallback(() => {
    if (user?.id) qc.invalidateQueries({ queryKey: ["profile", user.id] });
  }, [qc, user?.id]);

  return {
    profile: query.data?.profile ?? null,
    avatarUrl: query.data?.avatarUrl ?? null,
    isLoading: authLoading || query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}

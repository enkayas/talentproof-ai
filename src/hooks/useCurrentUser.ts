import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type State = {
  user: User | null;
  loading: boolean;
};

/**
 * Subscribes to the current Supabase auth session. The first mount kicks off
 * a single `getUser()` call; subsequent mounts read the live state piped in
 * by `onAuthStateChange`, so there's no extra round trip per component.
 */
export function useCurrentUser(): State {
  const [state, setState] = useState<State>({ user: null, loading: true });

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setState({ user: data.user ?? null, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

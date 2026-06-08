import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type State = {
  user: User | null;
  loading: boolean;
};

// Module-level cache of the last known user. Once any component has resolved
// the session, subsequent mounts (e.g. navigating /dashboard <-> /profile)
// start with the cached user instead of flipping loading: true -> false again,
// which is what produced the visible "double refresh" on navigation.
let cachedUser: User | null = null;
let primed = false;
const listeners = new Set<(u: User | null) => void>();

function broadcast(u: User | null) {
  cachedUser = u;
  primed = true;
  for (const fn of listeners) fn(u);
}

// Subscribe once for the lifetime of the tab. The first INITIAL_SESSION event
// hydrates the cache from localStorage without a network round-trip.
let globalSubInitialized = false;
function ensureGlobalSub() {
  if (globalSubInitialized) return;
  globalSubInitialized = true;
  supabase.auth.getSession().then(({ data }) => {
    broadcast(data.session?.user ?? null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    broadcast(session?.user ?? null);
  });
}

/**
 * Returns the current Supabase user. After the first resolution in any
 * component, subsequent mounts read synchronously from the module cache, so
 * navigation no longer triggers a loading flash.
 */
export function useCurrentUser(): State {
  ensureGlobalSub();
  const [state, setState] = useState<State>(() => ({
    user: cachedUser,
    loading: !primed,
  }));

  useEffect(() => {
    // Sync to cache in case it primed between render and effect.
    if (primed) setState({ user: cachedUser, loading: false });
    const fn = (u: User | null) => setState({ user: u, loading: false });
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  return state;
}

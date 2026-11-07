import { createContext, useContext, useEffect, useState } from 'react';

import { fetchProfile, type Profile } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

export type Partner = Profile & { id: string };
export type ActiveReview = { id: string; partner: Partner };

type ActiveReviewState = {
  // undefined while still loading or after a failed load, null when not in a review.
  review: ActiveReview | null | undefined;
  failed: boolean;
  refresh: () => Promise<void>;
};

export const ActiveReviewContext = createContext<ActiveReviewState | null>(null);

async function fetchActiveReview(userId: string): Promise<ActiveReview | null> {
  const { data: review, error } = await supabase
    .from('reviews')
    .select('id, user_a, user_b')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq('status', 'in_progress')
    .maybeSingle();
  if (error) throw error;
  if (!review) return null;

  const partnerId: string = review.user_a === userId ? review.user_b : review.user_a;
  return {
    id: review.id,
    partner: { id: partnerId, ...((await fetchProfile(partnerId)) ?? { name: null, picture_url: null }) },
  };
}

// Loads the logged-in user's live review and keeps it live. Used once in _layout.tsx, shared through ActiveReviewContext.
// Kept apart from the profile so a review problem never blocks the app.
export function useActiveReviewState(userId: string | undefined): ActiveReviewState {
  // Tagged with its user, like loadedFor in use-profile, so a new login never sees the last user's review.
  const [state, setState] = useState<{ userId: string; review?: ActiveReview | null; failed?: boolean }>();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = () =>
      fetchActiveReview(userId)
        .then((r) => {
          if (active) setState({ userId, review: r });
        })
        .catch((e) => {
          console.error('Error loading review:', e);
          // Keep a review we already know about; only flag the failure if we have nothing to show.
          if (active) setState((prev) => (prev?.userId === userId && prev.review !== undefined ? prev : { userId, failed: true }));
        });

    load();
    // INSERT: the partner entered our code. UPDATE: one of us left. Policies on reviews mean only our own rows arrive.
    const channel = supabase
      .channel(`reviews:${userId}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, load)
      .subscribe((status) => {
        // Reload on every (re)connect: events sent while disconnected are lost.
        if (status === 'SUBSCRIBED') load();
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function refresh() {
    if (!userId) return;
    setState({ userId, review: await fetchActiveReview(userId) });
  }

  const mine = userId && state?.userId === userId ? state : undefined;
  return {
    review: mine?.review,
    failed: !!mine?.failed,
    refresh,
  };
}

// Read the shared live review from any screen.
export function useActiveReview() {
  const state = useContext(ActiveReviewContext);
  if (!state) throw new Error('useActiveReview must be used inside ActiveReviewContext');
  return state;
}

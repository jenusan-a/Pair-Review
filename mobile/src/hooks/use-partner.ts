import { createContext, useContext, useEffect, useState } from 'react';

import { fetchProfile, type Profile } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

export type Partner = Profile & { id: string };

type PartnerState = {
  // undefined while still loading or after a failed load, null when not paired.
  partner: Partner | null | undefined;
  failed: boolean;
  refresh: () => Promise<void>;
};

export const PartnerContext = createContext<PartnerState | null>(null);

async function fetchPartner(userId: string): Promise<Partner | null> {
  const { data: pair, error } = await supabase
    .from('pairs')
    .select('user_a, user_b')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .maybeSingle();
  if (error) throw error;
  if (!pair) return null;

  const id: string = pair.user_a === userId ? pair.user_b : pair.user_a;
  return { id, ...((await fetchProfile(id)) ?? { name: null, picture_url: null }) };
}

// Loads who the logged-in user is paired with and keeps it live. Used once in _layout.tsx, shared through PartnerContext.
// Kept apart from the profile so a pairing problem never blocks the app.
export function usePartnerState(userId: string | undefined): PartnerState {
  // Tagged with its user, like loadedFor in use-profile, so a new login never sees the last user's partner.
  const [state, setState] = useState<{ userId: string; partner?: Partner | null; failed?: boolean }>();

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = () =>
      fetchPartner(userId)
        .then((p) => {
          if (active) setState({ userId, partner: p });
        })
        .catch((e) => {
          console.error('Error loading partner:', e);
          // Keep a partner we already know about; only flag the failure if we have nothing to show.
          if (active) setState((prev) => (prev?.userId === userId && prev.partner !== undefined ? prev : { userId, failed: true }));
        });

    load();
    // Tells this phone the moment its partner enters its code. Policies on pairs mean only our own rows arrive.
    const channel = supabase
      .channel(`pairs:${userId}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pairs' }, load)
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
    setState({ userId, partner: await fetchPartner(userId) });
  }

  const mine = userId && state?.userId === userId ? state : undefined;
  return {
    partner: mine?.partner,
    failed: !!mine?.failed,
    refresh,
  };
}

// Read the shared partner from any screen.
export function usePartner() {
  const state = useContext(PartnerContext);
  if (!state) throw new Error('usePartner must be used inside PartnerContext');
  return state;
}

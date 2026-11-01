import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/utils/supabase';

export type Profile = { name: string | null; picture_url: string | null };

type ProfileState = {
  userId: string | undefined;
  profile: Profile | null;
  loading: boolean;
  profileComplete: boolean;
  refresh: () => Promise<void>;
};

export const ProfileContext = createContext<ProfileState | null>(null);

async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, picture_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) console.error('Error loading profile:', error.message);
  return data;
}

// Loads the logged-in user's profile row. Used once in _layout.tsx, which shares it through ProfileContext.
export function useProfileState(userId: string | undefined): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  // Which user `profile` belongs to, so a new login counts as loading until its own row arrives.
  const [loadedFor, setLoadedFor] = useState<string>();

  useEffect(() => {
    if (!userId) return;
    loadProfile(userId).then((data) => {
      setProfile(data);
      setLoadedFor(userId);
    });
  }, [userId]);

  async function refresh() {
    if (!userId) return;
    setProfile(await loadProfile(userId));
  }

  const current = userId && loadedFor === userId ? profile : null;
  return {
    userId,
    profile: current,
    loading: !!userId && loadedFor !== userId,
    profileComplete: !!current?.name?.trim(),
    refresh,
  };
}

// Read the shared profile from any screen.
export function useProfile() {
  const state = useContext(ProfileContext);
  if (!state) throw new Error('useProfile must be used inside ProfileContext');
  return state;
}

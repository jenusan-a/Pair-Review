import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/utils/supabase';

export type Profile = { name: string | null; picture_url: string | null };

type ProfileState = {
  userId: string | undefined;
  profile: Profile | null;
  loading: boolean;
  profileComplete: boolean;
  loadFailed: boolean;
  refresh: () => Promise<void>;
  retry: () => void;
};

export const ProfileContext = createContext<ProfileState | null>(null);

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, picture_url')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}



// Loads the logged-in user's profile row. Used once in _layout.tsx, which shares it through ProfileContext.
export function useProfileState(userId: string | undefined): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  // Which user `profile` belongs to, so a new login counts as loading until its own row arrives.
  const [loadedFor, setLoadedFor] = useState<string>();
  const [failedFor, setFailedFor] = useState<string>()
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId)
      .then((data) => {
        setProfile(data);
        setLoadedFor(userId);
        setFailedFor(undefined);
      })
      .catch((e) => {
        console.error('Error loading profile:', e);
        setFailedFor(userId);
      });
  }, [userId, attempt]);

  

  async function refresh() {
    if (!userId) return;
    const data = await fetchProfile(userId);
    if (data) setProfile(data);
  }

  const current = userId && loadedFor === userId ? profile : null;
  return {
    userId,
    profile: current,
    loading: !!userId && loadedFor !== userId && failedFor !== userId,
    retry: () => setAttempt((n) => n+1),
    loadFailed: !!userId && failedFor === userId,
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

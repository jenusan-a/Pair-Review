import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { ProfileContext, useProfileState } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useSession();
  const profile = useProfileState(session?.user.id);
  const ready = !loading && !profile.loading;

  // Keep the splash screen up until we know whether you're logged in and have a profile.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ProfileContext.Provider value={profile}>
      <KeyboardProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!session && profile.profileComplete}>
            <Stack.Screen name="index" />
            <Stack.Screen name="profile" />
          </Stack.Protected>
          <Stack.Protected guard={!!session && !profile.profileComplete}>
            <Stack.Screen name="set-profile" />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </KeyboardProvider>
    </ProfileContext.Provider>
  );
}

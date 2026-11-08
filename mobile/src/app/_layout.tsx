import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { GradientScreen } from '@/components/gradient-screen';
import { PrimaryButton } from '@/components/primary-button';
import { Text } from '@/components/text';
import { ActiveReviewContext, useActiveReviewState } from '@/hooks/use-active-review';
import { ProfileContext, useProfileState } from '@/hooks/use-profile';
import { useSession } from '@/hooks/use-session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { session, loading } = useSession();
  const profile = useProfileState(session?.user.id);
  const activeReview = useActiveReviewState(session?.user.id);
  const ready = !loading && !profile.loading;

  // Keep the splash screen up until we know whether you're logged in and have a profile.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  // A failed load isn't the same as having no profile, so don't let the guards send them to set-profile.
  if (profile.loadFailed) {
    return (
      <KeyboardProvider>
        <GradientScreen className="justify-center px-8">
          <Text className="mb-6 text-center text-white">Couldn&apos;t load your profile.</Text>
          <PrimaryButton title="TRY AGAIN" onPress={profile.retry} />
        </GradientScreen>
      </KeyboardProvider>
    );
  }

  return (
    <ProfileContext.Provider value={profile}>
      <ActiveReviewContext.Provider value={activeReview}>
        <KeyboardProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session && profile.profileComplete}>
              <Stack.Screen name="index" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="review" />
            </Stack.Protected>
            <Stack.Protected guard={!!session && !profile.profileComplete}>
              <Stack.Screen name="set-profile" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="login" />
            </Stack.Protected>
          </Stack>
        </KeyboardProvider>
      </ActiveReviewContext.Provider>
    </ProfileContext.Provider>
  );
}

import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { GradientScreen } from '@/components/gradient-screen';
import { PrimaryButton } from '@/components/primary-button';
import { Text } from '@/components/text';
import { useActiveReview } from '@/hooks/use-active-review';

// Decides which review page you can be on: the code page with no live review, the review page with one.
// When Realtime starts or ends a review, the guards flip and Expo Router moves you, like the login guards in app/_layout.tsx.
export default function ReviewLayout() {
  const { review, failed, refresh } = useActiveReview();
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await refresh();
    } catch (e) {
      console.error('Error loading review:', e);
    } finally {
      setRetrying(false);
    }
  }

  // The guards can't pick a page until we know whether there's a live review.
  if (failed || review === undefined) {
    return (
      <GradientScreen>
        <BackButton />
        <View className="flex-1 justify-center px-8 pb-6">
          {failed ? (
            <>
              <Text className="mb-6 text-center text-white">Couldn&apos;t check for a review in progress.</Text>
              <PrimaryButton title="TRY AGAIN" onPress={retry} loading={retrying} />
            </>
          ) : (
            <ActivityIndicator color="white" />
          )}
        </View>
      </GradientScreen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!review}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={!!review}>
        <Stack.Screen name="active" />
      </Stack.Protected>
    </Stack>
  );
}

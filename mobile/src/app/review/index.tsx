import { View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { GradientScreen } from '@/components/gradient-screen';
import { PairWithCode } from '@/components/pair-with-code';
import { useActiveReview } from '@/hooks/use-active-review';

// Shown when you're not in a review. Redeeming a code starts one, and review/_layout.tsx moves you to active.tsx.
export default function PairPage() {
  const { refresh } = useActiveReview();

  return (
    <GradientScreen>
      <BackButton />
      <View className="flex-1 justify-center px-8 pb-6">
        <PairWithCode onPaired={refresh} />
      </View>
    </GradientScreen>
  );
}

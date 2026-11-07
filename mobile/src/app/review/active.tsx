import { useState } from 'react';
import { Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { GradientScreen } from '@/components/gradient-screen';
import { PrimaryButton } from '@/components/primary-button';
import { useActiveReview } from '@/hooks/use-active-review';
import { supabase } from '@/utils/supabase';

// The live review. Leaving ends it for both people, and review/_layout.tsx sends you back to the code page.
export default function ActiveReviewPage() {
  const { review, refresh } = useActiveReview();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');

  // Briefly null while the guard moves us away after the review ends.
  if (!review) return null;
  const reviewId = review.id;

  async function leave() {
    setError('');
    setLeaving(true);
    try {
      const { error: leaveError } = await supabase.rpc('leave_review', { p_review_id: reviewId });
      if (leaveError) {
        setError(leaveError.message);
        return;
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLeaving(false);
    }
  }

  return (
    <GradientScreen>
      <BackButton />
      <View className="flex-1 justify-center px-8 pb-6">
        <Text className="text-center text-3xl font-bold text-white">Reviewing with {review.partner.name || 'your partner'}</Text>
        {/* shortcut: placeholder until review modes exist */}
        <Text className="mb-8 mt-1.5 text-center text-[15px] text-white/80">Choosing a mode comes next.</Text>
        {error ? <Text className="mb-3.5 text-center text-white">{error}</Text> : null}
        <PrimaryButton title="LEAVE" onPress={leave} loading={leaving} />
      </View>
    </GradientScreen>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbienceStep, ambienceMissing, emptyAmbience, type Ambience } from '@/components/ambience-step';
import { Text } from '@/components/text';
import { useActiveReview } from '@/hooks/use-active-review';
import { supabase } from '@/utils/supabase';
import { BRAND, FADE_MS, FONT } from '@/utils/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// In order. A step's index is what's saved as review_answers.step, so only ever add to the end.
const STEPS = [{ title: 'Ambience' }] as const;

// The live review, one step at a time in lockstep: Next sends your answers and marks you ready,
// and you both move on once your partner taps Next too. Leaving ends it for both people.
export default function ActiveReviewPage() {
  const { review, refresh } = useActiveReview();
  // shortcut: lost if the app is killed before Next; finished steps are safe on the server.
  const [ambience, setAmbience] = useState<Ambience>(emptyAmbience);
  const [busy, setBusy] = useState<'next' | 'skip' | 'edit' | 'leave'>();
  const [error, setError] = useState('');

  // Briefly null while the guard moves us away after the review ends.
  if (!review) return null;
  const reviewId = review.id;
  const partnerName = review.partner.name || 'Your partner';

  // The step you're both on. Finishing it first leaves you waiting until your partner catches up.
  const step = Math.min(review.myStepsDone, review.partnerStepsDone);
  const waiting = review.myStepsDone > review.partnerStepsDone;
  const partnerReady = review.partnerStepsDone > review.myStepsDone;
  const finished = step >= STEPS.length;

  async function run(kind: NonNullable<typeof busy>, fn: string, args: Record<string, unknown>) {
    setError('');
    setBusy(kind);
    try {
      const { error: rpcError } = await supabase.rpc(fn, args);
      if (rpcError) {
        setError(rpcError.message);
        return;
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(undefined);
    }
  }

  function next() {
    const missing = ambienceMissing(ambience);
    if (missing) {
      setError(missing);
      return;
    }
    run('next', 'complete_step', { p_review_id: reviewId, p_step: step, p_answers: ambience });
  }

  function unready() {
    run('edit', 'reopen_step', { p_review_id: reviewId });
  }

  // Any change answers whatever the last error asked for.
  function changeAmbience(value: Ambience) {
    setError('');
    setAmbience(value);
  }

  // Counts as done with no answers; anything filled in so far isn't sent.
  function skip() {
    run('skip', 'complete_step', { p_review_id: reviewId, p_step: step, p_answers: null });
  }

  function leave() {
    Alert.alert('Leave the review?', `This ends it for ${partnerName} too.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => run('leave', 'leave_review', { p_review_id: reviewId }) },
    ]);
  }

  const nextTitle = step + 1 < STEPS.length ? `Next: ${STEPS[step + 1].title}` : 'Finish';

  return (
    <View className="flex-1 bg-canvas">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-row items-center gap-3 px-5 pt-2">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-white">
            <Ionicons name="chevron-back" size={22} color="#16191D" />
          </Pressable>
          <View className="flex-1">
            {!finished && (
              <Text className="text-[12px] font-semibold tracking-widest text-muted">
                STEP {step + 1} OF {STEPS.length}
              </Text>
            )}
            <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>
              With {review.partner.name || 'your partner'}
            </Text>
          </View>
          {!finished && (
            <View className="rounded-full bg-accent/15 px-3 py-1.5">
              <Text className="text-[13px] font-semibold text-accent">
                {partnerReady ? `${partnerName} is ready` : `${partnerName} is on ${STEPS[step].title}`}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4 flex-row gap-1.5 px-5">
          {STEPS.map((s, i) => (
            <View key={s.title} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brand' : 'bg-black/10'}`} />
          ))}
        </View>

        {finished ? (
          <View className="flex-1 justify-center px-8">
            <Text className="text-center text-3xl font-bold text-ink">You&apos;re both done</Text>
            {/* shortcut: placeholder until the rest of the steps and the results page exist */}
            <Text className="mt-1.5 text-center text-[15px] text-muted">More steps are on the way.</Text>
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-6">
            {/* Your answers stay on screen while you wait, but can't change until you tap the button again. */}
            <Animated.View
              pointerEvents={waiting ? 'none' : 'auto'}
              style={{ opacity: waiting ? 0.5 : 1, transitionProperty: 'opacity', transitionDuration: FADE_MS }}>
              <AmbienceStep value={ambience} onChange={changeAmbience} />
            </Animated.View>
            {!waiting && (
              <AnimatedPressable
                entering={FadeIn.duration(FADE_MS)}
                exiting={FadeOut.duration(FADE_MS)}
                onPress={skip}
                disabled={!!busy}
                accessibilityRole="button"
                className="mt-8 self-center px-4 py-2">
                {busy === 'skip' ? (
                  <ActivityIndicator size="small" color="#5B636C" />
                ) : (
                  <Text className="font-semibold text-muted">Skip this step</Text>
                )}
              </AnimatedPressable>
            )}
          </ScrollView>
        )}

        <View className="gap-3 px-5 pb-2 pt-3">
          {error ? (
            <Animated.Text
              key={error}
              entering={FadeIn.duration(FADE_MS)}
              exiting={FadeOut.duration(FADE_MS)}
              style={{ fontFamily: FONT }}
              className="text-center text-[14px] text-red-600">
              {error}
            </Animated.Text>
          ) : null}
          <View className="flex-row gap-3">
            <Pressable
              onPress={leave}
              disabled={!!busy}
              accessibilityRole="button"
              className={`h-[52px] items-center justify-center rounded-2xl border-[1.5px] border-ink bg-white active:opacity-80 ${
                finished ? 'flex-1' : 'w-28'
              }`}>
              {busy === 'leave' ? <ActivityIndicator color="#16191D" /> : <Text className="font-bold text-ink">Leave</Text>}
            </Pressable>
            {/* Pressing again while it's greyed out takes back your ready, so you can change your answers. */}
            {!finished && (
              <Pressable
                onPress={waiting ? unready : next}
                disabled={!!busy}
                accessibilityRole="button"
                accessibilityHint={waiting ? 'Takes back your answers so you can change them' : undefined}
                className="h-[52px] flex-1 active:opacity-80">
                <Animated.View
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    backgroundColor: waiting ? 'rgba(0,0,0,0.1)' : BRAND,
                    opacity: busy === 'next' || busy === 'edit' ? 0.6 : 1,
                    transitionProperty: ['backgroundColor', 'opacity'],
                    transitionDuration: FADE_MS,
                  }}>
                  {/* Keyed so the old label fades out while the new one fades in on top of it. */}
                  <Animated.View
                    key={waiting ? 'waiting' : 'next'}
                    entering={FadeIn.duration(FADE_MS)}
                    exiting={FadeOut.duration(FADE_MS)}
                    className="absolute inset-0 items-center justify-center">
                    {waiting ? (
                      <>
                        <Text className="font-bold text-muted">Waiting for {partnerName}</Text>
                        <Text className="text-[12px] text-muted">Tap to change your answers</Text>
                      </>
                    ) : (
                      <Text className="font-bold text-white">{nextTitle}</Text>
                    )}
                  </Animated.View>
                </Animated.View>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

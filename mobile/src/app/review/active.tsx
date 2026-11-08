import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentType } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AMBIENCE_PAGES, AmbienceStep, ambienceMissing, emptyAmbience } from '@/components/ambience-step';
import { Text } from '@/components/text';
import { useActiveReview } from '@/hooks/use-active-review';
import { supabase } from '@/utils/supabase';
import { BRAND, FADE_MS, FONT } from '@/utils/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Everything the screen needs to show one step. T is the shape of that step's answers.
type StepDef<T> = {
  title: string;
  // How many screens the step is shown over; the bar draws one segment per page.
  pages: number;
  // The answers before anything is picked.
  empty: T;
  // What's still missing before leaving this page, or null when it's done.
  missing: (value: T, page: number) => string | null;
  Component: ComponentType<{ value: T; onChange: (value: T) => void; page: number }>;
};
type Step = StepDef<unknown>;

// Checks a step's pieces all agree on T, then forgets it so different steps fit in one list.
function defineStep<T>(step: StepDef<T>) {
  return step as unknown as Step;
}

// In order. A step's index is what's saved as review_answers.step, so only ever add to the end.
const STEPS: Step[] = [
  defineStep({
    title: 'Ambience',
    pages: AMBIENCE_PAGES,
    empty: emptyAmbience,
    missing: ambienceMissing,
    Component: AmbienceStep,
  }),
];

// The live review, one step at a time in lockstep: Next sends your answers and marks you ready,
// and you both move on once your partner taps Next too. Leaving ends it for both people.
export default function ActiveReviewPage() {
  const { review, refresh } = useActiveReview();
  // Each step's answers, by step index.
  const [answers, setAnswers] = useState(() => STEPS.map((s) => s.empty));
  const [pageAt, setPageAt] = useState({ step: 0, page: 0 });
  const [busy, setBusy] = useState<'next' | 'skip' | 'edit' | 'leave'>();
  const [error, setError] = useState('');

  // Briefly null while the guard moves us away after the review ends.
  if (!review) return null;
  const reviewId = review.id;
  const partnerName = review.partner.name || 'Your partner';

  // The step you're both on. Finishing it first leaves you waiting until your partner catches up.
  const step = Math.min(review.myStepsDone, review.partnerStepsDone);
  const waiting = review.myStepsDone > review.partnerStepsDone;
  // The step being shown, or undefined once you're both past the last one.
  const current: Step | undefined = STEPS[step];
  const finished = !current;
  const page = pageAt.step === step ? pageAt.page : 0;
  const lastPage = !finished && page === current.pages - 1;
  // How much of the bar is filled: pages reached so far out of every page in the review, counting the one you're on.
  const totalPages = STEPS.reduce((sum, s) => sum + s.pages, 0);
  const pagesReached = STEPS.slice(0, step).reduce((sum, s) => sum + s.pages, 0) + (finished ? 0 : page + 1);

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

  // Earlier pages just move on, on this phone only. The last page sends the whole step and waits for your partner.
  function next() {
    if (!current) return;
    const missing = current.missing(answers[step], page);
    if (missing) {
      setError(missing);
      return;
    }
    if (!lastPage) {
      setError('');
      setPageAt({ step, page: page + 1 });
      return;
    }
    run('next', 'complete_step', { p_review_id: reviewId, p_step: step, p_answers: answers[step] });
  }

  function back() {
    setError('');
    setPageAt({ step, page: page - 1 });
  }

  function unready() {
    run('edit', 'reopen_step', { p_review_id: reviewId });
  }

  // Any change answers whatever the last error asked for.
  function changeAnswers(value: unknown) {
    setError('');
    setAnswers((all) => all.map((a, i) => (i === step ? value : a)));
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

  const nextTitle = !lastPage ? 'Next' : step + 1 < STEPS.length ? `Next: ${STEPS[step + 1].title}` : 'Finish';
  // Back between pages; on the first page (or while waiting) the left button leaves the review instead.
  const showBack = !finished && page > 0 && !waiting;

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
          {/* The bar below shows how far along you are, so the header just names the step and the place. */}
          <Text className="flex-1 text-[22px] font-bold text-ink" numberOfLines={1}>
            {finished ? 'Review' : STEPS[step].title}
          </Text>
          {/* shortcut: placeholder until reviews have a place picked */}
          <View className="max-w-[45%] flex-row items-center gap-1 rounded-full bg-accent/15 px-3 py-1.5">
            <Ionicons name="location-outline" size={14} color="#F07A3E" />
            <Text className="shrink text-[13px] font-semibold text-accent" numberOfLines={1}>
              Restaurant
            </Text>
          </View>
        </View>

        {/* A grey track with a fill that slides to the new width on every page change. */}
        <View className="mx-5 mt-4 h-1 overflow-hidden rounded-full bg-black/10">
          <Animated.View
            className="h-full bg-brand"
            style={{
              width: `${(pagesReached / totalPages) * 100}%`,
              transitionProperty: 'width',
              transitionDuration: FADE_MS,
            }}
          />
        </View>

        {finished ? (
          <View className="flex-1 justify-center px-8">
            <Text className="text-center text-3xl font-bold text-ink">You&apos;re both done</Text>
            {/* shortcut: placeholder until the rest of the steps and the results page exist */}
            <Text className="mt-1.5 text-center text-[15px] text-muted">More steps are on the way.</Text>
          </View>
        ) : (
          // grow + justify-center keeps a short page in the middle of the screen; a long one still scrolls from the top.
          <ScrollView className="flex-1" contentContainerClassName="grow justify-center px-5 pb-6 pt-6">
            {/* Your answers stay on screen while you wait, but can't change until you tap the button again. */}
            <Animated.View
              pointerEvents={waiting ? 'none' : 'auto'}
              style={{ opacity: waiting ? 0.5 : 1, transitionProperty: 'opacity', transitionDuration: FADE_MS }}>
              {/* Keyed by page so each page fades in. */}
              <Animated.View key={page} entering={FadeIn.duration(FADE_MS)}>
                <current.Component value={answers[step]} onChange={changeAnswers} page={page} />
              </Animated.View>
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
              onPress={showBack ? back : leave}
              disabled={!!busy}
              accessibilityRole="button"
              className={`h-[52px] items-center justify-center rounded-2xl border-[1.5px] border-ink bg-white active:opacity-80 ${
                finished ? 'flex-1' : 'w-28'
              }`}>
              {busy === 'leave' ? (
                <ActivityIndicator color="#16191D" />
              ) : (
                <Text className="font-bold text-ink">{showBack ? 'Back' : 'Leave'}</Text>
              )}
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
                    key={waiting ? 'waiting' : nextTitle}
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

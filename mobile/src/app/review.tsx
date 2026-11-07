import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';

import { AuthField } from '@/components/auth-field';
import { GradientScreen } from '@/components/gradient-screen';
import { PrimaryButton } from '@/components/primary-button';
import { usePartner } from '@/hooks/use-partner';
import { supabase } from '@/utils/supabase';

export default function Review() {
  const { partner, failed: partnerFailed, refresh: refreshPartner } = usePartner();
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await refreshPartner();
    } catch (e) {
      console.error('Error loading partner:', e);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <GradientScreen>
      <View className="px-5 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="self-start p-2">
          <Ionicons name="chevron-back" size={24} color="white" />
        </Pressable>
      </View>

      <View className="flex-1 justify-center px-8 pb-6">
        {partnerFailed ? (
          <View>
            <Text className="mb-6 text-center text-white">Couldn&apos;t check who you&apos;re paired with.</Text>
            <PrimaryButton title="TRY AGAIN" onPress={retry} loading={retrying} />
          </View>
        ) : partner === undefined ? (
          <ActivityIndicator color="white" />
        ) : partner ? (
          <View className="items-center">
            <Text className="text-3xl font-bold text-white">Paired with {partner.name || 'your partner'}</Text>
            {/* shortcut: placeholder until review modes exist */}
            <Text className="mt-1.5 text-center text-[15px] text-white/80">Choosing a mode comes next.</Text>
          </View>
        ) : (
          <PairWithCode onPaired={refreshPartner} />
        )}
      </View>
    </GradientScreen>
  );
}

function PairWithCode({ onPaired }: { onPaired: () => Promise<void> }) {
  const [myCode, setMyCode] = useState<string>();
  const [codeFailed, setCodeFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [entered, setEntered] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  // shortcut: a code left open past its 15 minutes isn't refreshed until the page is reopened.
  useEffect(() => {
    supabase.rpc('create_pair_code').then(({ data, error }) => {
      // Checked rather than asserted: the client has no generated types, so data is untyped.
      if (error || typeof data !== 'string') {
        console.error('Error creating pair code:', error ?? data);
        setCodeFailed(true);
      } else {
        setMyCode(data);
        setCodeFailed(false);
      }
    });
  }, [attempt]);

  async function connect() {
    setError('');
    const code = entered.trim().toUpperCase();
    if (!code) {
      setError("Enter your partner's code.");
      return;
    }

    setConnecting(true);
    try {
      const { error: redeemError } = await supabase.rpc('redeem_pair_code', { p_code: code });
      if (redeemError) {
        setError(redeemError.message);
        return;
      }
      await onPaired();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <View>
      <Text className="text-center text-3xl font-bold text-white">Pair with your partner</Text>
      <Text className="mt-1.5 text-center text-[15px] text-white/80">Send them your code, or enter theirs.</Text>

      <View className="mt-8 items-center rounded-3xl border border-white/30 bg-white/15 px-6 py-6">
        <Text className="text-[13px] text-white/85">Your code</Text>
        {myCode ? (
          <>
            <Text selectable className="mt-1 text-4xl font-bold tracking-[8px] text-white">
              {myCode}
            </Text>
            <Pressable
              onPress={() => Share.share({ message: `Pair with me on Pair Review using the code ${myCode}` })}
              accessibilityRole="button"
              className="mt-3 flex-row items-center gap-1.5 py-1">
              <Ionicons name="share-outline" size={18} color="white" />
              <Text className="font-semibold text-white">Share</Text>
            </Pressable>
          </>
        ) : codeFailed ? (
          <Pressable onPress={() => setAttempt((n) => n + 1)} accessibilityRole="button" className="mt-2 py-1">
            <Text className="text-center text-white">Couldn&apos;t get a code. Tap to try again.</Text>
          </Pressable>
        ) : (
          <ActivityIndicator className="mt-3" color="white" />
        )}
      </View>

      <View className="mt-8 gap-3.5">
        <AuthField
          icon="key-outline"
          placeholder="Partner's code"
          value={entered}
          onChangeText={setEntered}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />
        {error ? <Text className="text-center text-white">{error}</Text> : null}
        <PrimaryButton title="CONNECT" onPress={connect} loading={connecting} />
      </View>
    </View>
  );
}

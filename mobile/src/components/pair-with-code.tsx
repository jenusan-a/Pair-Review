import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';

import { AuthField } from '@/components/auth-field';
import { PrimaryButton } from '@/components/primary-button';
import { supabase } from '@/utils/supabase';

// Shows your code to share and a field for entering your partner's. onPaired runs once a review has started.
export function PairWithCode({ onPaired }: { onPaired: () => Promise<void> }) {
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

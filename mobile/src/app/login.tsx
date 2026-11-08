import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AuthField } from '@/components/auth-field';
import { GradientScreen } from '@/components/gradient-screen';
import { PrimaryButton } from '@/components/primary-button';
import { Text } from '@/components/text';
import { supabase } from '@/utils/supabase';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  async function submit() {
    setError('');
    if (!email || !password || (isSignup && !name)) {
      setError('Please fill in every field.');
      return;
    }

    setLoading(true);
    const { error } = isSignup
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    // On success there's nothing to do here: _layout.tsx sees the new session and shows the home screen.
    if (error) {
      setError(error.message);
    } else {
      router.replace('/');
    }
  }

  function switchMode() {
    setMode(isSignup ? 'login' : 'signup');
    setError('');
  }

  return (
    <GradientScreen className="px-8 pb-6">
      {/* Logo and title: takes all the spare space, which pushes the form to the bottom */}
      <View className="flex-1 items-center justify-center">
        <View className="mb-[18px] flex-row">
          <View className="h-[58px] w-[58px] rounded-full border-4 border-white" />
          <View className="-ml-5 h-[58px] w-[58px] rounded-full border-4 border-white bg-accent" />
        </View>
        <Text className="text-4xl font-bold text-white">Pair Review</Text>
        <Text className="mt-1.5 text-[15px] text-white/80">Rate the places you try together.</Text>
      </View>

      <View className="gap-3.5">
        {isSignup && (
          <AuthField
            icon="person-outline"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
        )}
        <AuthField
          icon="mail-outline"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <AuthField
          icon="lock-closed-outline"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={isSignup ? 'new-password' : 'current-password'}
        />
      </View>

      {error ? <Text className="mt-3.5 text-center text-white">{error}</Text> : null}

      <View className="mt-6">
        <PrimaryButton title={isSignup ? 'SIGN UP' : 'LOG IN'} onPress={submit} loading={loading} />
      </View>

      <Pressable onPress={switchMode} className="mt-5 py-1">
        <Text className="text-center text-[13px] text-white/85">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Text className="font-semibold text-white underline">{isSignup ? 'Log in' : 'Sign up'}</Text>
        </Text>
      </Pressable>
    </GradientScreen>
  );
}

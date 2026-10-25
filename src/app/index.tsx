import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/utils/supabase';

export default function Home() {
  const [name, setName] = useState('');

  useEffect(() => {
    // Row Level Security only lets you see your own profile, so .single() needs no filter.
    supabase
      .from('profiles')
      .select('name')
      .single()
      .then(({ data }) => setName(data?.name ?? ''));
  }, []);

  return (
    <View className="flex-1 bg-canvas">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Text className="text-3xl font-bold text-ink">Hi {name || 'there'}</Text>
          <Text className="text-center text-muted">You're logged in. The home map goes here next.</Text>
          <Pressable
            onPress={() => supabase.auth.signOut()}
            className="mt-6 h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-ink bg-white active:opacity-80">
            <Text className="font-semibold text-ink">Log out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

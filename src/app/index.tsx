import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

export default function Home() {
  const { profile } = useProfile();

  return (
    <View className="flex-1 bg-canvas">
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
            className="items-center gap-3">
            {profile?.picture_url ? (
              <Image source={profile.picture_url} style={{ width: 72, height: 72, borderRadius: 36 }} />
            ) : (
              <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-brand">
                <Ionicons name="person-outline" size={30} color="white" />
              </View>
            )}
            <Text className="text-3xl font-bold text-ink">Hi {profile?.name || 'there'}</Text>
          </Pressable>
          <Text className="text-center text-muted">You&apos;re logged in. The home map goes here next.</Text>
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

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { GradientScreen } from '@/components/gradient-screen';
import { ProfileForm } from '@/components/profile-form';
import { useProfile } from '@/hooks/use-profile';

export default function Profile() {
  const { profile } = useProfile();
  const [editing, setEditing] = useState(false);

  return (
    <GradientScreen>
      <View className="flex-row items-center justify-between px-5 py-2">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="p-2">
          <Ionicons name="chevron-back" size={24} color="white" />
        </Pressable>
        <Pressable onPress={() => setEditing(!editing)} accessibilityRole="button" className="p-2">
          <Text className="font-semibold text-white">{editing ? 'Cancel' : 'Edit'}</Text>
        </Pressable>
      </View>

      {editing ? (
        <View className="flex-1 justify-center px-8 pb-6">
          <ProfileForm onSaved={() => setEditing(false)} />
        </View>
      ) : (
        <ScrollView contentContainerClassName="px-8 pb-6">
          <View className="items-center">
            {profile?.picture_url ? (
              <Image
                source={profile.picture_url}
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: 56,
                  borderWidth: 4,
                  borderColor: 'white',
                }}
              />
            ) : (
              <View className="h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-white/15">
                <Ionicons name="person-outline" size={40} color="white" />
              </View>
            )}
            <Text className="mt-4 text-3xl font-bold text-white">{profile?.name}</Text>
          </View>

          <Text className="mb-3 mt-10 text-lg font-semibold text-white">Recent activity</Text>
          {/* shortcut: empty state only, until reviews exist to list here */}
          <View className="items-center rounded-3xl border border-white/30 bg-white/15 px-6 py-8">
            <Ionicons name="restaurant-outline" size={28} color="white" />
            <Text className="mt-2 text-center text-white/85">Nothing yet. Reviews you add will show up here.</Text>
          </View>
        </ScrollView>
      )}
    </GradientScreen>
  );
}

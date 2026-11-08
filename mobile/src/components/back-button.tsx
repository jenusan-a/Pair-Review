import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

// White chevron for the top of gradient screens.
export function BackButton() {
  return (
    <View className="px-5 py-2">
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="self-start p-2">
        <Ionicons name="chevron-back" size={24} color="white" />
      </Pressable>
    </View>
  );
}

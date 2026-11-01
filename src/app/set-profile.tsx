import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileForm } from '@/components/profile-form';

export default function SetProfile() {
  // Ask for the camera now so it's already allowed when adding review photos later.
  useEffect(() => {
    ImagePicker.requestCameraPermissionsAsync();
  }, []);

  // No redirect after saving: _layout.tsx sees the completed profile and shows the home screen.
  return (
    <LinearGradient colors={['#4A74F0', '#2C57D8', '#1E3FA8']} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-center px-8 pb-6">
          <View className="mb-8 items-center">
            <Text className="text-3xl font-bold text-white">Set up your profile</Text>
            <Text className="mt-1.5 text-center text-[15px] text-white/80">
              Add a photo and the name your partner will see.
            </Text>
          </View>
          <ProfileForm />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

import * as ImagePicker from 'expo-image-picker';
import { useEffect } from 'react';
import { View } from 'react-native';

import { GradientScreen } from '@/components/gradient-screen';
import { ProfileForm } from '@/components/profile-form';
import { Text } from '@/components/text';

export default function SetProfile() {
  // Ask for the camera now so it's already allowed when adding review photos later.
  useEffect(() => {
    ImagePicker.requestCameraPermissionsAsync();
  }, []);

  // No redirect after saving: _layout.tsx sees the completed profile and shows the home screen.
  return (
    <GradientScreen className="justify-center px-8 pb-6">
      <View className="mb-8 items-center">
        <Text className="text-3xl font-bold text-white">Set up your profile</Text>
        <Text className="mt-1.5 text-center text-[15px] text-white/80">
          Add a photo and the name your partner will see.
        </Text>
      </View>
      <ProfileForm />
    </GradientScreen>
  );
}

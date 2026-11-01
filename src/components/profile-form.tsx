import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { AuthField } from '@/components/auth-field';
import { PrimaryButton } from '@/components/primary-button';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/utils/supabase';

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

type Props = {
  onSaved?: () => void;
};

// Name + profile picture form, used by set-profile (onboarding) and the profile page (editing).
export function ProfileForm({ onSaved }: Props) {
  const { userId, profile, refresh } = useProfile();
  const [name, setName] = useState(profile?.name ?? '');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function takePhoto() {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Camera access is off', 'Turn it on for Pair Review in Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(pickerOptions);
    if (!result.canceled) setImage(result.assets[0]);
  }

  async function chooseFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (!result.canceled) setImage(result.assets[0]);
  }

  function pickImage() {
    Alert.alert('Profile picture', undefined, [
      { text: 'Take photo', onPress: takePhoto },
      { text: 'Choose from library', onPress: chooseFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function save() {
    setError('');
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!userId) return;

    setSaving(true);
    try {
      // Only set when a new photo is uploaded, so saving never overwrites the stored picture with null.
      let pictureUrl: string | null = null;

      if (image) {
        const path = `${userId}/avatar.jpg`;
        const bytes = await fetch(image.uri).then((r) => r.arrayBuffer());
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, bytes, { contentType: image.mimeType ?? 'image/jpeg', upsert: true });
        if (uploadError) {
          setError(uploadError.message);
          return;
        }
        // Same path on every upload, so the timestamp makes caches fetch the new picture.
        pictureUrl = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`;
      }

      const row: { id: string; name: string; picture_url?: string } = { id: userId, name: name.trim() };
      if (pictureUrl) row.picture_url = pictureUrl;

      const { error: saveError } = await supabase.from('profiles').upsert(row);
      if (saveError) {
        setError(saveError.message);
        return;
      }

      await refresh();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const preview = image?.uri ?? profile?.picture_url;

  return (
    <View>
      <Pressable
        onPress={pickImage}
        accessibilityRole="button"
        accessibilityLabel={preview ? 'Change profile picture' : 'Add profile picture'}
        className="mb-6 items-center">
        {preview ? (
          <Image
            source={preview}
            style={{ width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: 'white' }}
          />
        ) : (
          <View className="h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-white/15">
            <Ionicons name="camera-outline" size={32} color="white" />
          </View>
        )}
        <Text className="mt-2 text-[13px] text-white/85">{preview ? 'Change photo' : 'Add a photo'}</Text>
      </Pressable>

      <AuthField
        icon="person-outline"
        placeholder="Preferred name"
        value={name}
        onChangeText={setName}
        autoComplete="name"
      />

      {error ? <Text className="mt-3.5 text-center text-white">{error}</Text> : null}

      <View className="mt-6">
        <PrimaryButton title="SAVE" onPress={save} loading={saving} />
      </View>
    </View>
  );
}

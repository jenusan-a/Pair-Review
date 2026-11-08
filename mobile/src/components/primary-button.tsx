import { ActivityIndicator, Pressable } from 'react-native';

import { Text } from '@/components/text';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
};

export function PrimaryButton({ title, onPress, loading = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="h-[52px] items-center justify-center rounded-full bg-white active:opacity-80">
      {loading ? (
        <ActivityIndicator color="#2C57D8" />
      ) : (
        <Text className="font-bold tracking-widest text-brand">{title}</Text>
      )}
    </Pressable>
  );
}

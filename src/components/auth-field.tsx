import { Ionicons } from '@expo/vector-icons';
import { TextInput, type TextInputProps, View } from 'react-native';

type Props = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
};

export function AuthField({ icon, ...inputProps }: Props) {
  return (
    <View className="h-[52px] flex-row items-center rounded-full border border-white/30 bg-white/15 px-1.5">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
        <Ionicons name={icon} size={18} color="#2C57D8" />
      </View>
      <TextInput
        className="flex-1 text-[15px] text-white"
        placeholderTextColor="rgba(255,255,255,0.7)"
        {...inputProps}
      />
    </View>
  );
}

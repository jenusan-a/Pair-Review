import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { BRAND, FADE_MS, FONT, INK } from '@/utils/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  // Stretch to share the row with its neighbours, like Yes / Maybe / No. Otherwise it's as wide as its label.
  fill?: boolean;
  // 'radio' when only one in the group can be picked, 'checkbox' when any number can.
  role?: 'radio' | 'checkbox';
};

// A rounded button that's white when off and fades to blue when picked.
export function Pill({ label, selected, onPress, fill = false, role = 'checkbox' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      className={`h-10 ${fill ? 'flex-1' : ''}`}>
      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: selected ? BRAND : 'rgba(0,0,0,0.15)',
          backgroundColor: selected ? BRAND : 'white',
          transitionProperty: ['backgroundColor', 'borderColor'],
          transitionDuration: FADE_MS,
        }}>
        <Animated.Text
          style={{
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: '600',
            color: selected ? 'white' : INK,
            transitionProperty: 'color',
            transitionDuration: FADE_MS,
          }}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

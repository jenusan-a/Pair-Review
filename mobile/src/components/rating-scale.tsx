import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Text } from '@/components/text';
import { BRAND, FADE_MS, FONT, INK } from '@/utils/theme';

type Props = {
  value: number | null;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
};

// A row of 1–10 boxes with what the two ends mean underneath. The picked box fades to blue.
export function RatingScale({ value, onChange, lowLabel, highLabel }: Props) {
  return (
    <View>
      <View className="flex-row gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = n === value;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${n} out of 10`}
              className="h-11 flex-1">
              <Animated.View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: selected ? BRAND : 'rgba(0,0,0,0.1)',
                  backgroundColor: selected ? BRAND : 'white',
                  transitionProperty: ['backgroundColor', 'borderColor'],
                  transitionDuration: FADE_MS,
                }}>
                <Animated.Text
                  style={{
                    fontFamily: FONT,
                    fontSize: 15,
                    fontWeight: '600',
                    color: selected ? 'white' : INK,
                    transitionProperty: 'color',
                    transitionDuration: FADE_MS,
                  }}>
                  {n}
                </Animated.Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
      <View className="mt-2 flex-row justify-between">
        <Text className="text-[13px] text-muted">{lowLabel}</Text>
        <Text className="text-[13px] text-muted">{highLabel}</Text>
      </View>
    </View>
  );
}

import { Text as RNText, type TextProps } from 'react-native';

import { FONT } from '@/utils/theme';

// Use this instead of react-native's Text so everything is set in Inter. font-bold, italic and the rest still work.
export function Text({ style, ...props }: TextProps) {
  return <RNText style={[{ fontFamily: FONT }, style]} {...props} />;
}

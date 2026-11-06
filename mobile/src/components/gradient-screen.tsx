import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  className?: string;
};

// Blue gradient frame shared by the login and profile screens, with keyboard handling for their forms.
export function GradientScreen({ children, className = '' }: Props) {
  return (
    <LinearGradient colors={['#4A74F0', '#2C57D8', '#1E3FA8']} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className={`flex-1 ${className}`}>
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

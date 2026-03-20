import { Stack } from 'expo-router';
import BackButton from '../../components/BackButton';
import { useTheme } from '../../lib/ThemeContext';

export default function AuthLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerLeft: () => <BackButton />,
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      <Stack.Screen name="agreement" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}

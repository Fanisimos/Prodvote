import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuthContext } from '../lib/AuthContext';
import { ThemeProvider, useTheme } from '../lib/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { theme } = useTheme();
  const { session, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  const headerStyle = { backgroundColor: theme.headerBg };

  const BackButton = () => (
    <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 8, paddingRight: 16, paddingVertical: 8 }}>
      <Text style={{ fontSize: 28, color: theme.accent, fontWeight: '600' }}>‹</Text>
    </TouchableOpacity>
  );

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen
        name="feature/[id]"
        options={{
          title: 'Feature Details',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: 'Chat',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="profile/[id]"
        options={{
          title: 'Profile',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen name="apps" options={{ headerShown: false }} />
      <Stack.Screen
        name="paywall"
        options={{
          title: 'Choose Plan',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="fortune-wheel"
        options={{
          title: 'Daily Reward',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}

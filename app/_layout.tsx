import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { TouchableOpacity, Text, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import 'react-native-reanimated';

import { AuthProvider, useAuthContext } from '../lib/AuthContext';
import { ThemeProvider, useTheme } from '../lib/theme';
import { preloadAwardSounds } from '../lib/awardSounds';
import { supabase } from '../lib/supabase';

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
    if (loaded) {
      SplashScreen.hideAsync();
      preloadAwardSounds();
    }
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
    const onResetPassword = segments[1] === 'reset-password';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup && !onResetPassword) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  // Handle password recovery deep links (prodvote://reset-password?...)
  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return;
      // Supabase puts tokens in the URL fragment (#) on legacy flow,
      // or as ?code= on PKCE flow
      const parsed = new URL(url.replace('#', '?'));
      const code = parsed.searchParams.get('code');
      const accessToken = parsed.searchParams.get('access_token');
      const refreshToken = parsed.searchParams.get('refresh_token');
      const type = parsed.searchParams.get('type');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.warn('[deep-link] exchange error:', error.message);
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) console.warn('[deep-link] setSession error:', error.message);
      }

      if (type === 'recovery' || url.includes('reset-password')) {
        router.replace('/(auth)/reset-password');
      }
    }

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // Handle notification taps (daily reward → profile)
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type === 'daily_reward') {
        router.push('/(tabs)/profile');
      } else if (data?.route) {
        router.push(data.route);
      }
    });
    return () => sub.remove();
  }, []);

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
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          title: 'Chat',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="profile/[id]"
        options={{
          title: 'Profile',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
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
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="fortune-wheel"
        options={{
          title: 'Daily Reward',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="user/[username]"
        options={{
          title: '',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          headerStyle,
          headerTintColor: theme.headerText,
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  );
}

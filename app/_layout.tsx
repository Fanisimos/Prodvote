import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuthContext } from '../lib/AuthContext';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import ErrorBoundary from '../components/ErrorBoundary';

const ADMIN_EMAILS = ['tzoni@litsaitechnologies.com'];

function RootNavigation() {
  const { session, profile, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inAdmin = segments[0] === '(admin)';
    const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      if (isAdmin) {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [session, loading, segments]);

  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuthContext } from '../lib/AuthContext';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import ErrorBoundary from '../components/ErrorBoundary';
import { checkAppVersion, promptUpdate, promptMaintenance } from '../lib/versionCheck';
import { initSentry } from '../lib/sentry';
import Colors from '../constants/Colors';

// Initialize Sentry as early as possible
initSentry();

function RootNavigation() {
  const { session, profile, loading } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);

  // Version / maintenance check on mount
  useEffect(() => {
    checkAppVersion().then(({ needsUpdate, maintenance, message }) => {
      if (needsUpdate && message) {
        setBlocked(true);
        promptUpdate(message);
      } else if (maintenance && message) {
        setBlocked(true);
        promptMaintenance(message);
      }
    });
  }, []);

  useEffect(() => {
    if (loading || blocked) return;

    const inAuth = segments[0] === '(auth)';
    const inAgreement = segments[0] === '(auth)' && segments[1] === 'agreement';
    const inAdmin = segments[0] === '(admin)';
    const isAdmin = !!profile?.is_admin;

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth && !inAgreement) {
      // Check if user has accepted terms
      if (profile && !profile.accepted_terms_at && !isAdmin) {
        router.replace('/(auth)/agreement');
      } else if (isAdmin) {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)');
      }
    } else if (session && !inAuth && !inAdmin && profile && !profile.accepted_terms_at && !isAdmin) {
      // User somehow got past without accepting — redirect back
      router.replace('/(auth)/agreement');
    }
  }, [session, profile, loading, segments]);

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

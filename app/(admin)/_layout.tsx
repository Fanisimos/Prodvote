import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme } from '../../lib/theme';

export default function AdminLayout() {
  const { profile, loading } = useAuthContext();
  const { theme } = useTheme();
  const router = useRouter();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!profile?.is_admin) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={[styles.denied, { color: theme.danger }]}>Access Denied</Text>
        <Text style={{ color: theme.textMuted, fontSize: 16 }}>You do not have admin privileges.</Text>
      </View>
    );
  }

  const BackButton = () => (
    <TouchableOpacity onPress={() => router.back()} style={{ paddingLeft: 8, paddingRight: 16, paddingVertical: 8 }}>
      <Text style={{ fontSize: 28, color: theme.accent, fontWeight: '600' }}>‹</Text>
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.headerBg },
        headerTintColor: theme.headerText,
        headerTitleStyle: { fontWeight: '700' },
        headerLeft: () => <BackButton />,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="users" options={{ title: 'Manage Users' }} />
      <Stack.Screen name="features" options={{ title: 'Manage Features' }} />
      <Stack.Screen name="badges" options={{ title: 'Manage Badges' }} />
      <Stack.Screen name="channels" options={{ title: 'Manage Channels' }} />
      <Stack.Screen name="subscriptions" options={{ title: 'Subscriptions' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  denied: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
});

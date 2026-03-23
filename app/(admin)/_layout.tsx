import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';

export default function AdminLayout() {
  const { profile, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  if (!profile?.is_admin) {
    return (
      <View style={styles.center}>
        <Text style={styles.denied}>Access Denied</Text>
        <Text style={styles.subtext}>You do not have admin privileges.</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0a0a0f' },
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
  center: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  denied: {
    color: '#ff4d4d',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtext: {
    color: '#888',
    fontSize: 16,
  },
});

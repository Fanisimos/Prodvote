import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7c5cfc',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#0a0a0f',
          borderTopColor: '#1a1a2e',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        headerStyle: { backgroundColor: '#0a0a0f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trending',
          tabBarLabel: 'Trending',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="flame" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="roadmap"
        options={{
          title: 'Roadmap',
          tabBarLabel: 'Roadmap',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="map" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple text-based icon (replace with expo-vector-icons later)
function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  const icons: Record<string, string> = {
    flame: '🔥',
    map: '🗺️',
    person: '👤',
  };
  const { Text } = require('react-native');
  return <Text style={{ fontSize: size - 4 }}>{icons[name] || '•'}</Text>;
}

import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

const TAB_ICONS: Record<string, string> = {
  flame: '🔥',
  chat: '💬',
  plus: '➕',
  shop: '🛍️',
  apps: '📱',
  person: '👤',
};

function TabIcon({ name, size }: { name: string; color: string; size: number }) {
  return <Text style={{ fontSize: size - 4 }}>{TAB_ICONS[name] || '•'}</Text>;
}

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
          tabBarIcon: ({ color, size }) => <TabIcon name="flame" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => <TabIcon name="chat" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Submit',
          tabBarLabel: 'Submit',
          tabBarIcon: ({ color, size }) => <TabIcon name="plus" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, size }) => <TabIcon name="shop" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="apps"
        options={{
          title: 'Apps',
          tabBarLabel: 'Apps',
          tabBarIcon: ({ color, size }) => <TabIcon name="apps" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon name="person" color={color} size={size} />,
        }}
      />
      {/* Hide roadmap from tabs - accessible via navigation */}
      <Tabs.Screen name="roadmap" options={{ href: null }} />
    </Tabs>
  );
}

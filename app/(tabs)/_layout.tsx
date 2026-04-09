import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, Text, Image } from 'react-native';
import { useTheme } from '../../lib/theme';

function TabIcon({ emoji, size }: { emoji: string; color: string; size: number }) {
  return <Text style={{ fontSize: size - 2 }}>{emoji}</Text>;
}

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#b794f6',
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        headerStyle: { backgroundColor: theme.headerBg },
        headerTintColor: theme.headerText,
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Prodvote',
          tabBarLabel: 'Feed',
          headerLeft: () => (
            <Image
              source={require('../../assets/images/logo.png')}
              style={{ width: 30, height: 30, marginLeft: 16, borderRadius: 8 }}
            />
          ),
          tabBarIcon: ({ color, size }) => <TabIcon emoji="🏠" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => <TabIcon emoji="💬" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="apps"
        options={{
          title: 'Apps',
          tabBarLabel: 'Apps',
          tabBarIcon: ({ color, size }) => <TabIcon emoji="🧩" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Badge Shop',
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, size }) => <TabIcon emoji="🏪" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="submit"
        options={{
          title: 'Submit',
          tabBarLabel: 'Submit',
          tabBarIcon: ({ color, size }) => <TabIcon emoji="📝" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Your Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon emoji="👤" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="roadmap" options={{ href: null }} />
    </Tabs>
  );
}

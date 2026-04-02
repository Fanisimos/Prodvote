import { Stack } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../lib/theme';

export default function AppsLayout() {
  const { theme } = useTheme();
  const router = useRouter();

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
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="journal" options={{ title: 'Daily Journal' }} />
      <Stack.Screen name="habits" options={{ title: 'Habit Tracker' }} />
      <Stack.Screen name="pomodoro" options={{ title: 'Pomodoro Timer' }} />
      <Stack.Screen name="eisenhower" options={{ title: 'Eisenhower Matrix' }} />
      <Stack.Screen name="kanban" options={{ title: 'Kanban Board' }} />
      <Stack.Screen name="notes" options={{ title: 'Quick Notes' }} />
      <Stack.Screen name="plans" options={{ title: 'Plans' }} />
      <Stack.Screen name="whiteboard" options={{ title: 'Whiteboard' }} />
      <Stack.Screen name="breathe" options={{ title: 'Breathe' }} />
      <Stack.Screen name="hiit" options={{ title: 'HIIT Timer' }} />
      <Stack.Screen name="lunar-patrol" options={{ title: 'Lunar Patrol' }} />
    </Stack>
  );
}

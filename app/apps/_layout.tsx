import { Stack } from 'expo-router';
import BackButton from '../../components/BackButton';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

export default function AppsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerLeft: () => <BackButton to="/(tabs)/apps" />,
      }}
    >
      <Stack.Screen name="eisenhower" options={{ title: 'Eisenhower Matrix' }} />
      <Stack.Screen name="pomodoro" options={{ title: 'Pomodoro Timer' }} />
      <Stack.Screen name="habits" options={{ title: 'Habit Tracker' }} />
      <Stack.Screen name="notes" options={{ title: 'Quick Notes' }} />
      <Stack.Screen name="kanban" options={{ title: 'Kanban Board' }} />
      <Stack.Screen name="journal" options={{ title: 'Daily Journal' }} />
      <Stack.Screen name="whiteboard" options={{ title: 'Whiteboard' }} />
      <Stack.Screen name="breathe" options={{ title: 'Breathe' }} />
      <Stack.Screen name="hiit" options={{ title: 'HIIT Timer' }} />
      <Stack.Screen name="plans" options={{ title: 'Choose Plan' }} />
    </Stack>
  );
}

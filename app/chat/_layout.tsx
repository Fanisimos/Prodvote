import { Stack } from 'expo-router';
import BackButton from '../../components/BackButton';
import { useTheme } from '../../lib/ThemeContext';

export default function ChatLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerLeft: () => <BackButton to="/(tabs)/chat" />,
      }}
    />
  );
}

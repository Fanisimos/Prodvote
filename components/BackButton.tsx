import { TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';

export default function BackButton({ to }: { to?: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => to ? router.navigate(to as any) : (router.canGoBack() ? router.back() : router.navigate('/(tabs)'))}
      style={{ paddingLeft: 12, paddingRight: 16, marginTop: -6 }}
    >
      <Text style={{ fontSize: 28, color: Colors.primary, fontWeight: '300', lineHeight: 28 }}>‹</Text>
    </TouchableOpacity>
  );
}

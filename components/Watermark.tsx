import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

export default function Watermark() {
  const { isDark } = useTheme();

  return (
    <View style={s.container} pointerEvents="none">
      <Image
        source={require('../assets/6bfa49d8-3c0a-4aba-b630-216a41fc4144.png')}
        style={[s.image, { opacity: isDark ? 0.08 : 0.2 }]}
        resizeMode="contain"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  image: {
    width: '140%',
    height: '140%',
  } as any,
});

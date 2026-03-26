import { View, Image, useWindowDimensions, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

export default function Watermark() {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const size = width * 1.53;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={require('../assets/images/logo-watermark.png')}
        style={{
          position: 'absolute',
          width: size,
          height: size,
          left: (width - size) / 2,
          top: (height - size) / 2,
          opacity: 0.12,
          tintColor: theme.watermarkTint,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

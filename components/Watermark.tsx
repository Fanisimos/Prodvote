import { Image, useWindowDimensions } from 'react-native';
import { useTheme } from '../lib/theme';

export default function Watermark() {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const size = width * 1.53;

  return (
    <Image
      source={require('../assets/images/logo-watermark.png')}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        left: (width - size) / 2,
        top: (height - size) / 2,
        opacity: 0.12,
        zIndex: -1,
      }}
      tintColor={theme.watermarkTint}
      resizeMode="contain"
      pointerEvents="none"
    />
  );
}

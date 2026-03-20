import { View, Image } from 'react-native';

interface LogoProps {
  size?: number;
  glow?: boolean;
}

export function LogoIcon({ size = 48, glow = false }: LogoProps) {
  return (
    <View
      style={
        glow
          ? { shadowColor: '#7c5cfc', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: size * 0.4, elevation: 20 }
          : undefined
      }
    >
      <Image
        source={require('../assets/app-icon-Prodvote.png')}
        style={{ width: size, height: size, borderRadius: size * 0.2 }}
        resizeMode="contain"
      />
    </View>
  );
}

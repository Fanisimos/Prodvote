import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';
import AnimatedFrame, { FrameAnimationType } from './AnimatedFrame';

interface Props {
  username?: string;
  avatarUrl?: string | null;
  frameColor?: string | null;
  frameAnimation?: string | null;
  badgeEmoji?: string | null;
  size?: number;
}

function parseDefaultAvatar(url: string | null | undefined): { emoji: string; bg: string } | null {
  if (!url || !url.startsWith('default:')) return null;
  const parts = url.split(':');
  if (parts.length >= 3) {
    return { emoji: parts[1], bg: parts.slice(2).join(':') };
  }
  return null;
}

export default function UserAvatar({
  username = '',
  avatarUrl,
  frameColor,
  frameAnimation,
  badgeEmoji,
  size = 80,
}: Props) {
  const { theme } = useTheme();
  const defaultAvatar = parseDefaultAvatar(avatarUrl);
  const color = frameColor || theme.accent;
  const animation = (frameAnimation || 'none') as FrameAnimationType;
  const ringSize = size + 14;

  const avatarContent = defaultAvatar ? (
    <View style={[styles.fallback, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: defaultAvatar.bg,
    }]}>
      <Text style={{ fontSize: size * 0.45 }}>{defaultAvatar.emoji}</Text>
    </View>
  ) : avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
    />
  ) : (
    <View style={[styles.fallback, {
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: theme.card,
    }]}>
      <Text style={[styles.fallbackText, { color: theme.text, fontSize: size * 0.36 }]}>
        {username.slice(0, 2).toUpperCase() || '??'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { width: ringSize + 4, height: ringSize + 4 }]}>
      <AnimatedFrame size={ringSize} color={color} animationType={animation}>
        {avatarContent}
      </AnimatedFrame>

      {/* Badge emoji overlay */}
      {badgeEmoji && (
        <View style={[
          styles.badgeOverlay,
          {
            bottom: -2, right: -2,
            width: size * 0.35, height: size * 0.35, borderRadius: size * 0.175,
            backgroundColor: theme.bg,
          },
        ]}>
          <Text style={{ fontSize: size * 0.2 }}>{badgeEmoji}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  image: { resizeMode: 'cover' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { fontWeight: '700' },
  badgeOverlay: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
});

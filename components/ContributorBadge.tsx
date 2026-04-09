import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../lib/theme';
import { ContributorBadge as ContributorBadgeType } from '../lib/types';

const BADGE_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  contributor: { emoji: '🌱', label: 'Contributor', color: '#34d399' },
  prolific: { emoji: '🌟', label: 'Prolific', color: '#fbbf24' },
  power_voter: { emoji: '⚡', label: 'Power Voter', color: '#7c5cfc' },
  builder: { emoji: '🔨', label: 'Builder', color: '#ff6b35' },
  legend: { emoji: '👑', label: 'Legend', color: '#ff4d6a' },
};

interface Props {
  badge: ContributorBadgeType | string | null | undefined;
  size?: 'small' | 'normal';
}

export default function ContributorBadgeView({ badge, size = 'small' }: Props) {
  const { theme } = useTheme();
  if (!badge) return null;

  const config = BADGE_CONFIG[badge];
  if (!config) return null;

  const s = styles(theme);
  const isSmall = size === 'small';

  return (
    <View style={[s.badge, { backgroundColor: config.color + '22' }, isSmall && s.badgeSmall]}>
      <Text style={{ fontSize: isSmall ? 10 : 12 }}>{config.emoji}</Text>
      {!isSmall && <Text style={[s.label, { color: config.color }]}>{config.label}</Text>}
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  badgeSmall: { paddingHorizontal: 4, paddingVertical: 1 },
  label: { fontSize: 10, fontWeight: '700' },
});

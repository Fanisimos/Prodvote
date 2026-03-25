import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Profile, Tier } from '../../lib/types';
import { useTheme, Theme } from '../../lib/theme';

interface TierStats {
  tier: Tier;
  count: number;
  percentage: number;
  color: string;
  icon: string;
}

const TIER_CONFIG: Record<Tier, { color: string; icon: string; label: string }> = {
  free: { color: '#888', icon: '🆓', label: 'Free' },
  pro: { color: '#7c5cfc', icon: '⭐', label: 'Pro' },
  ultra: { color: '#fbbf24', icon: '👑', label: 'Ultra' },
  legendary: { color: '#ff4d6a', icon: '🔥', label: 'Legendary' },
};

export default function AdminSubscriptionsScreen() {
  const [tierStats, setTierStats] = useState<TierStats[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();

  const fetchStats = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('tier');

    if (data) {
      const total = data.length;
      setTotalUsers(total);

      const counts: Record<Tier, number> = { free: 0, pro: 0, ultra: 0, legendary: 0 };
      data.forEach((p: { tier: Tier }) => {
        counts[p.tier] = (counts[p.tier] || 0) + 1;
      });

      const tiers: Tier[] = ['free', 'pro', 'ultra', 'legendary'];
      setTierStats(
        tiers.map(tier => ({
          tier,
          count: counts[tier],
          percentage: total > 0 ? Math.round((counts[tier] / total) * 100) : 0,
          color: TIER_CONFIG[tier].color,
          icon: TIER_CONFIG[tier].icon,
        }))
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  const paidUsers = tierStats.reduce((sum, s) => sum + (s.tier !== 'free' ? s.count : 0), 0);
  const conversionRate = totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0;

  const s = makeStyles(theme);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
    >
      <Text style={s.heading}>Subscription Overview</Text>

      <View style={s.summaryRow}>
        <View style={s.summaryCard}>
          <Text style={s.summaryValue}>{totalUsers}</Text>
          <Text style={s.summaryLabel}>Total Users</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: '#4caf50' }]}>{paidUsers}</Text>
          <Text style={s.summaryLabel}>Paid Users</Text>
        </View>
        <View style={s.summaryCard}>
          <Text style={[s.summaryValue, { color: theme.accent }]}>{conversionRate}%</Text>
          <Text style={s.summaryLabel}>Conversion</Text>
        </View>
      </View>

      <Text style={s.heading}>Tier Breakdown</Text>

      {tierStats.map((stat) => (
        <View key={stat.tier} style={s.tierCard}>
          <View style={s.tierHeader}>
            <Text style={s.tierIcon}>{stat.icon}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.tierName}>{TIER_CONFIG[stat.tier].label}</Text>
              <Text style={s.tierCount}>{stat.count} users</Text>
            </View>
            <Text style={[s.tierPercentage, { color: stat.color }]}>
              {stat.percentage}%
            </Text>
          </View>

          <View style={s.barBg}>
            <View
              style={[
                s.barFill,
                { width: `${stat.percentage}%` as any, backgroundColor: stat.color },
              ]}
            />
          </View>
        </View>
      ))}

      <Text style={s.heading}>Distribution</Text>
      <View style={s.distCard}>
        <View style={s.distBar}>
          {tierStats.map((stat) => (
            stat.percentage > 0 ? (
              <View
                key={stat.tier}
                style={[
                  s.distSegment,
                  {
                    flex: stat.count,
                    backgroundColor: stat.color,
                  },
                ]}
              />
            ) : null
          ))}
        </View>
        <View style={s.distLegend}>
          {tierStats.map((stat) => (
            <View key={stat.tier} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: stat.color }]} />
              <Text style={s.legendText}>
                {TIER_CONFIG[stat.tier].label} ({stat.percentage}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' },
  heading: { color: t.text, fontSize: 20, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    backgroundColor: t.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: { color: t.text, fontSize: 24, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { color: t.textMuted, fontSize: 12, fontWeight: '500' },
  tierCard: {
    backgroundColor: t.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  tierHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tierIcon: { fontSize: 28 },
  tierName: { color: t.text, fontSize: 17, fontWeight: '700' },
  tierCount: { color: t.textMuted, fontSize: 13 },
  tierPercentage: { fontSize: 22, fontWeight: '800' },
  barBg: {
    backgroundColor: t.bg,
    borderRadius: 6,
    height: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  distCard: {
    backgroundColor: t.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 16,
  },
  distBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  distSegment: {
    height: '100%',
  },
  distLegend: { flexDirection: 'row', justifyContent: 'space-around' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: t.textMuted, fontSize: 13 },
});

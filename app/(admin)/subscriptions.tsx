import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/ThemeContext';
import Colors from '../../constants/Colors';

const TIER_COLORS: Record<string, string> = {
  free: '#94a3b8', pro: '#7c5cfc', ultra: '#fbbf24', legendary: '#ff4d6a',
};

const TIER_PERKS: Record<string, { votes: string; coins: number; weight: string }> = {
  free: { votes: '3/month', coins: 0, weight: '1x' },
  pro: { votes: '10/month', coins: 300, weight: '1x' },
  ultra: { votes: 'Unlimited', coins: 1000, weight: '3x' },
  legendary: { votes: 'Unlimited', coins: 2500, weight: '3x' },
};

interface TierStats {
  tier: string;
  count: number;
  totalCoins: number;
}

interface SubscriberRow {
  username: string;
  tier: string;
  coins: number;
  subscription_started_at: string | null;
  last_monthly_grant_at: string | null;
  next_renewal: string | null;
}

export default function SubscriptionsScreen() {
  const [tierStats, setTierStats] = useState<TierStats[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [recentGrants, setRecentGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, tier, coins, subscription_started_at, last_monthly_grant_at')
      .order('tier', { ascending: false });

    const tierMap: Record<string, { count: number; totalCoins: number }> = {};
    const subs: SubscriberRow[] = [];

    (profiles || []).forEach((p: any) => {
      if (!tierMap[p.tier]) tierMap[p.tier] = { count: 0, totalCoins: 0 };
      tierMap[p.tier].count++;
      tierMap[p.tier].totalCoins += p.coins || 0;

      if (p.tier !== 'free') {
        const lastGrant = p.last_monthly_grant_at ? new Date(p.last_monthly_grant_at) : null;
        const nextRenewal = lastGrant ? new Date(lastGrant.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
        subs.push({
          ...p,
          next_renewal: nextRenewal ? nextRenewal.toISOString() : null,
        });
      }
    });

    setTierStats(
      ['free', 'pro', 'ultra', 'legendary'].map(t => ({
        tier: t,
        count: tierMap[t]?.count || 0,
        totalCoins: tierMap[t]?.totalCoins || 0,
      }))
    );
    setSubscribers(subs);

    // Recent monthly grants
    const { data: grants } = await supabase
      .from('coin_rewards')
      .select('user_id, reward_type, amount, created_at, profiles:user_id (username)')
      .in('reward_type', ['monthly_pro', 'monthly_ultra', 'monthly_legendary'])
      .order('created_at', { ascending: false })
      .limit(30);

    setRecentGrants((grants || []).map((g: any) => ({
      ...g,
      username: g.profiles?.username || 'Unknown',
    })));

    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const totalRevenue = tierStats.reduce((sum, ts) => {
    const monthly = ts.tier === 'pro' ? 1.99 : ts.tier === 'ultra' ? 4.99 : ts.tier === 'legendary' ? 9.99 : 0;
    return sum + (monthly * ts.count);
  }, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Subscriptions</Text>
      <Text style={styles.pageSub}>Auto-managed per user — coins & votes renew every 30 days from subscription date</Text>

      {/* Revenue summary */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>ESTIMATED MONTHLY REVENUE</Text>
        <Text style={styles.revenueValue}>£{totalRevenue.toFixed(2)}</Text>
        <Text style={styles.revenueSub}>
          {tierStats.filter(t => t.tier !== 'free').reduce((s, t) => s + t.count, 0)} active subscribers
        </Text>
      </View>

      {/* Tier overview cards */}
      <View style={styles.tierGrid}>
        {tierStats.map(ts => {
          const perks = TIER_PERKS[ts.tier];
          return (
            <View key={ts.tier} style={[styles.tierCard, { borderColor: TIER_COLORS[ts.tier] + '40' }]}>
              <View style={[styles.tierHeader, { backgroundColor: TIER_COLORS[ts.tier] + '15' }]}>
                <Text style={[styles.tierName, { color: TIER_COLORS[ts.tier] }]}>
                  {ts.tier.charAt(0).toUpperCase() + ts.tier.slice(1)}
                </Text>
                <Text style={[styles.tierCount, { color: TIER_COLORS[ts.tier] }]}>{ts.count} users</Text>
              </View>
              <View style={styles.tierPerks}>
                <View style={styles.perkRow}>
                  <Text style={styles.perkLabel}>Votes</Text>
                  <Text style={styles.perkValue}>{perks.votes}</Text>
                </View>
                <View style={styles.perkRow}>
                  <Text style={styles.perkLabel}>Monthly Coins</Text>
                  <Text style={styles.perkValue}>{perks.coins || '—'}</Text>
                </View>
                <View style={styles.perkRow}>
                  <Text style={styles.perkLabel}>Vote Weight</Text>
                  <Text style={styles.perkValue}>{perks.weight}</Text>
                </View>
                <View style={styles.perkRow}>
                  <Text style={styles.perkLabel}>Total Coins Held</Text>
                  <Text style={[styles.perkValue, { color: '#fbbf24' }]}>{ts.totalCoins.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Active subscribers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVE SUBSCRIBERS</Text>
        <Text style={styles.sectionSub}>Coins & votes auto-renew 30 days after last grant</Text>

        {subscribers.length === 0 ? (
          <Text style={styles.emptyText}>No subscribers yet</Text>
        ) : (
          <View style={styles.subTable}>
            <View style={styles.subHeaderRow}>
              <Text style={[styles.subCell, { flex: 2 }, styles.subHeaderText]}>User</Text>
              <Text style={[styles.subCell, styles.subHeaderText]}>Tier</Text>
              <Text style={[styles.subCell, styles.subHeaderText]}>Coins</Text>
              <Text style={[styles.subCell, { flex: 1.5 }, styles.subHeaderText]}>Next Renewal</Text>
            </View>
            {subscribers.map((s, i) => {
              const daysUntil = s.next_renewal
                ? Math.max(0, Math.ceil((new Date(s.next_renewal).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : null;
              return (
                <View key={i} style={[styles.subRow, i % 2 === 0 && styles.subRowAlt]}>
                  <Text style={[styles.subCell, { flex: 2 }, styles.subUser]}>@{s.username}</Text>
                  <Text style={[styles.subCell, { color: TIER_COLORS[s.tier], fontWeight: '700' }]}>
                    {s.tier}
                  </Text>
                  <Text style={[styles.subCell, styles.subCoins]}>{s.coins.toLocaleString()}</Text>
                  <Text style={[styles.subCell, { flex: 1.5 }, styles.subRenewal]}>
                    {daysUntil !== null ? (
                      daysUntil === 0 ? 'Today' : `${daysUntil}d`
                    ) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Recent auto-grants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RECENT AUTO-GRANTS</Text>
        {recentGrants.length === 0 ? (
          <Text style={styles.emptyText}>No grants yet — they happen automatically on user login</Text>
        ) : (
          recentGrants.map((g, i) => (
            <View key={i} style={styles.logRow}>
              <Text style={styles.logUser}>@{g.username}</Text>
              <Text style={[styles.logType, { color: TIER_COLORS[g.reward_type.replace('monthly_', '')] || '#94a3b8' }]}>
                {g.reward_type.replace('monthly_', '')}
              </Text>
              <Text style={styles.logAmount}>+{g.amount}</Text>
              <Text style={styles.logDate}>{new Date(g.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </View>

      {/* How it works */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How auto-renewal works</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoEmoji}>1.</Text>
          <Text style={styles.infoText}>User subscribes via RevenueCat — tier changes, first month coins granted immediately</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoEmoji}>2.</Text>
          <Text style={styles.infoText}>Every time they open the app, we check if 30 days passed since last grant</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoEmoji}>3.</Text>
          <Text style={styles.infoText}>If yes — coins are auto-granted and votes are reset. No manual action needed.</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoEmoji}>4.</Text>
          <Text style={styles.infoText}>If they cancel (tier → free), the trigger clears subscription dates and stops future grants</Text>
        </View>
      </View>

      {/* Perk reference */}
      <View style={styles.refSection}>
        <Text style={styles.sectionTitle}>PERK REFERENCE</Text>
        <View style={styles.refTable}>
          <View style={styles.refHeaderRow}>
            <Text style={[styles.refCell, styles.refHeader, { flex: 1.5 }]}>Perk</Text>
            <Text style={[styles.refCell, styles.refHeader]}>Free</Text>
            <Text style={[styles.refCell, styles.refHeader, { color: '#7c5cfc' }]}>Pro</Text>
            <Text style={[styles.refCell, styles.refHeader, { color: '#fbbf24' }]}>Ultra</Text>
            <Text style={[styles.refCell, styles.refHeader, { color: '#ff4d6a' }]}>GOAT</Text>
          </View>
          {[
            { perk: 'Monthly Votes', free: '3', pro: '10', ultra: '∞', legendary: '∞' },
            { perk: 'Monthly Coins', free: '0', pro: '300', ultra: '1,000', legendary: '2,500' },
            { perk: 'Vote Weight', free: '1x', pro: '1x', ultra: '3x', legendary: '3x' },
            { perk: 'Gold Name', free: '—', pro: '—', ultra: '—', legendary: '✓' },
            { perk: 'Priority Subs', free: '—', pro: '✓', ultra: '✓', legendary: '✓' },
          ].map((row, i) => (
            <View key={i} style={[styles.refRow, i % 2 === 0 && styles.refRowAlt]}>
              <Text style={[styles.refCell, styles.refPerk, { flex: 1.5 }]}>{row.perk}</Text>
              <Text style={[styles.refCell, styles.refValue]}>{row.free}</Text>
              <Text style={[styles.refCell, styles.refValue]}>{row.pro}</Text>
              <Text style={[styles.refCell, styles.refValue]}>{row.ultra}</Text>
              <Text style={[styles.refCell, styles.refValue]}>{row.legendary}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 28, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 4 },
    pageSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },

    // Revenue
    revenueCard: {
      backgroundColor: Colors.primary + '12', borderRadius: 16, padding: 24,
      alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: Colors.primary + '30',
    },
    revenueLabel: { fontSize: 11, fontWeight: '800', color: Colors.primary, letterSpacing: 1.5, marginBottom: 8 },
    revenueValue: { fontSize: 40, fontWeight: '800', color: colors.text, marginBottom: 4 },
    revenueSub: { fontSize: 13, color: colors.textSecondary },

    // Tier cards
    tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
    tierCard: {
      flex: 1, minWidth: 200, backgroundColor: colors.surface, borderRadius: 16,
      borderWidth: 1, overflow: 'hidden',
    },
    tierHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tierName: { fontSize: 18, fontWeight: '800', textTransform: 'capitalize' },
    tierCount: { fontSize: 14, fontWeight: '700' },
    tierPerks: { padding: 16, gap: 10 },
    perkRow: { flexDirection: 'row', justifyContent: 'space-between' },
    perkLabel: { fontSize: 13, color: colors.textSecondary },
    perkValue: { fontSize: 13, fontWeight: '700', color: colors.text },

    // Section
    section: {
      backgroundColor: colors.surface, borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 11, fontWeight: '800', color: colors.textSecondary,
      letterSpacing: 1.5, marginBottom: 8,
    },
    sectionSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
    emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 },

    // Subscriber table
    subTable: { borderRadius: 10, overflow: 'hidden' },
    subHeaderRow: {
      flexDirection: 'row', backgroundColor: colors.surfaceBorder + '40',
      paddingVertical: 10, paddingHorizontal: 8,
    },
    subHeaderText: { fontWeight: '800', color: colors.textSecondary, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    subRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8 },
    subRowAlt: { backgroundColor: colors.background + '40' },
    subCell: { flex: 1, fontSize: 12 },
    subUser: { fontWeight: '700', color: colors.text },
    subCoins: { fontWeight: '700', color: '#fbbf24' },
    subRenewal: { color: colors.textSecondary, fontWeight: '600' },

    // Grant log
    logRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
    },
    logUser: { fontSize: 13, fontWeight: '700', color: colors.text, flex: 1 },
    logType: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    logAmount: { fontSize: 13, fontWeight: '800', color: '#fbbf24' },
    logDate: { fontSize: 11, color: colors.textSecondary },

    // Info card
    infoCard: {
      backgroundColor: colors.surface, borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 20,
    },
    infoTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
    infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    infoEmoji: { fontSize: 14, fontWeight: '800', color: Colors.primary },
    infoText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

    // Reference table
    refSection: {
      backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.surfaceBorder, padding: 20,
    },
    refTable: { borderRadius: 10, overflow: 'hidden' },
    refHeaderRow: {
      flexDirection: 'row', backgroundColor: colors.surfaceBorder + '40',
      paddingVertical: 12, paddingHorizontal: 8,
    },
    refRow: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 8 },
    refRowAlt: { backgroundColor: colors.background + '40' },
    refCell: { flex: 1, textAlign: 'center', fontSize: 12 },
    refHeader: { fontWeight: '800', color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase' },
    refPerk: { textAlign: 'left', paddingLeft: 8, fontWeight: '600', color: colors.text },
    refValue: { color: colors.textSecondary, fontWeight: '700' },
  });
}

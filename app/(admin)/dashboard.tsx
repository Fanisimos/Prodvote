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

interface Stats {
  totalUsers: number;
  totalFeatures: number;
  totalVotes: number;
  totalComments: number;
  totalBadgesPurchased: number;
  tierBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  recentSignups: { username: string; created_at: string; tier: string }[];
  topFeatures: { title: string; score: number; status: string; comment_count: number }[];
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const [
      { count: totalUsers },
      { count: totalFeatures },
      { count: totalVotes },
      { count: totalComments },
      { count: totalBadgesPurchased },
      { data: profiles },
      { data: features },
      { data: recentSignups },
      { data: topFeatures },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('features').select('*', { count: 'exact', head: true }),
      supabase.from('votes').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }),
      supabase.from('user_badges').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('tier'),
      supabase.from('features').select('status'),
      supabase.from('profiles').select('username, created_at, tier').order('created_at', { ascending: false }).limit(5),
      supabase.from('features').select('title, score, status, comment_count').order('score', { ascending: false }).limit(5),
    ]);

    const tierBreakdown: Record<string, number> = {};
    (profiles || []).forEach((p: any) => {
      tierBreakdown[p.tier] = (tierBreakdown[p.tier] || 0) + 1;
    });

    const statusBreakdown: Record<string, number> = {};
    (features || []).forEach((f: any) => {
      statusBreakdown[f.status] = (statusBreakdown[f.status] || 0) + 1;
    });

    setStats({
      totalUsers: totalUsers || 0,
      totalFeatures: totalFeatures || 0,
      totalVotes: totalVotes || 0,
      totalComments: totalComments || 0,
      totalBadgesPurchased: totalBadgesPurchased || 0,
      tierBreakdown,
      statusBreakdown,
      recentSignups: recentSignups || [],
      topFeatures: topFeatures || [],
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!stats) return null;

  const STATUS_COLORS: Record<string, string> = {
    open: '#94a3b8', under_review: '#fbbf24', planned: '#60a5fa',
    in_progress: '#a78bfa', shipped: '#34d399', declined: '#ef4444',
  };

  const TIER_COLORS: Record<string, string> = {
    free: '#94a3b8', pro: '#7c5cfc', ultra: '#fbbf24', legendary: '#ff4d6a',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Dashboard</Text>
      <Text style={styles.pageSub}>Overview of your app</Text>

      {/* Stat cards */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>👥</Text>
          <Text style={styles.statValue}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>💡</Text>
          <Text style={styles.statValue}>{stats.totalFeatures}</Text>
          <Text style={styles.statLabel}>Features</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🗳️</Text>
          <Text style={styles.statValue}>{stats.totalVotes}</Text>
          <Text style={styles.statLabel}>Votes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>💬</Text>
          <Text style={styles.statValue}>{stats.totalComments}</Text>
          <Text style={styles.statLabel}>Comments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🏅</Text>
          <Text style={styles.statValue}>{stats.totalBadgesPurchased}</Text>
          <Text style={styles.statLabel}>Badges Sold</Text>
        </View>
      </View>

      <View style={styles.row}>
        {/* Tier breakdown */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Users by Tier</Text>
          {Object.entries(stats.tierBreakdown).map(([tier, count]) => (
            <View key={tier} style={styles.breakdownRow}>
              <View style={[styles.dot, { backgroundColor: TIER_COLORS[tier] || '#94a3b8' }]} />
              <Text style={styles.breakdownLabel}>{tier}</Text>
              <Text style={[styles.breakdownValue, { color: TIER_COLORS[tier] || '#94a3b8' }]}>{count}</Text>
            </View>
          ))}
        </View>

        {/* Status breakdown */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Features by Status</Text>
          {Object.entries(stats.statusBreakdown).map(([status, count]) => (
            <View key={status} style={styles.breakdownRow}>
              <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] || '#94a3b8' }]} />
              <Text style={styles.breakdownLabel}>{status.replace('_', ' ')}</Text>
              <Text style={[styles.breakdownValue, { color: STATUS_COLORS[status] || '#94a3b8' }]}>{count}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        {/* Recent signups */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent Signups</Text>
          {stats.recentSignups.map((u, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.listPrimary}>@{u.username}</Text>
              <Text style={[styles.listBadge, { color: TIER_COLORS[u.tier] || '#94a3b8' }]}>{u.tier}</Text>
              <Text style={styles.listDate}>{new Date(u.created_at).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>

        {/* Top features */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Top Features</Text>
          {stats.topFeatures.map((f, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.listPrimary} numberOfLines={1}>{f.title}</Text>
              <Text style={styles.listScore}>▲ {f.score}</Text>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[f.status] || '#94a3b8' }]}>
                <Text style={styles.statusDotText}>{f.status.replace('_', ' ')}</Text>
              </View>
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

    // Stat grid
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    statCard: {
      backgroundColor: colors.surface, borderRadius: 16, padding: 20,
      minWidth: 140, flex: 1, alignItems: 'center',
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    statEmoji: { fontSize: 28, marginBottom: 8 },
    statValue: { fontSize: 32, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },

    // Row layout
    row: { flexDirection: 'row', gap: 16, marginBottom: 16 },

    // Panels
    panel: {
      flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    panelTitle: {
      fontSize: 14, fontWeight: '700', color: colors.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16,
    },

    // Breakdown rows
    breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    breakdownLabel: { fontSize: 14, color: colors.text, flex: 1, textTransform: 'capitalize' },
    breakdownValue: { fontSize: 18, fontWeight: '800' },

    // List rows
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    listPrimary: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
    listBadge: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
    listDate: { fontSize: 12, color: colors.textSecondary },
    listScore: { fontSize: 14, fontWeight: '800', color: Colors.primary },
    statusDot: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusDotText: { fontSize: 10, fontWeight: '700', color: '#fff', textTransform: 'uppercase' },
  });
}

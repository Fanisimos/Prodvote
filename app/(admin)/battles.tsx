import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../lib/theme';
import { notify } from '../../lib/adminUI';

interface BattleStat {
  feature_id: string;
  title: string;
  wins: number;
  appearances: number;
  win_rate: number;
}

export default function AdminBattles() {
  const [stats, setStats] = useState<BattleStat[]>([]);
  const [totalBattles, setTotalBattles] = useState(0);
  const [todayBattles, setTodayBattles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const { theme } = useTheme();

  const fetchData = useCallback(async () => {
    // Total battle votes
    const { count: total } = await supabase
      .from('idea_battle_votes').select('*', { count: 'exact', head: true });
    setTotalBattles(total ?? 0);

    // Today's battles
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('idea_battle_votes').select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());
    setTodayBattles(todayCount ?? 0);

    // Feature flag
    const { data: flag } = await supabase
      .from('feature_flags').select('enabled').eq('key', 'idea_battles').single();
    setEnabled(flag?.enabled ?? true);

    // Win stats: get all battle votes and compute
    const { data: votes } = await supabase
      .from('idea_battle_votes').select('idea_a_id, idea_b_id, winner_id')
      .limit(1000);

    if (votes && votes.length > 0) {
      const featureWins: Record<string, number> = {};
      const featureAppearances: Record<string, number> = {};

      votes.forEach(v => {
        featureAppearances[v.idea_a_id] = (featureAppearances[v.idea_a_id] || 0) + 1;
        featureAppearances[v.idea_b_id] = (featureAppearances[v.idea_b_id] || 0) + 1;
        featureWins[v.winner_id] = (featureWins[v.winner_id] || 0) + 1;
      });

      const featureIds = Object.keys(featureAppearances);
      const { data: features } = await supabase
        .from('features').select('id, title').in('id', featureIds);

      const titleMap: Record<string, string> = {};
      (features || []).forEach(f => { titleMap[f.id] = f.title; });

      const computed: BattleStat[] = featureIds.map(id => ({
        feature_id: id,
        title: titleMap[id] || 'Unknown',
        wins: featureWins[id] || 0,
        appearances: featureAppearances[id] || 0,
        win_rate: featureAppearances[id] ? Math.round(((featureWins[id] || 0) / featureAppearances[id]) * 100) : 0,
      })).sort((a, b) => b.wins - a.wins);

      setStats(computed.slice(0, 20));
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleBattles() {
    const newVal = !enabled;
    await supabase.from('feature_flags').update({ enabled: newVal, updated_at: new Date().toISOString() })
      .eq('key', 'idea_battles');
    setEnabled(newVal);
    notify('Updated', `Idea Battles ${newVal ? 'enabled' : 'disabled'}`);
  }

  const s = makeStyles(theme);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={theme.accent} />}
    >
      <View style={s.overviewRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{totalBattles}</Text>
          <Text style={s.statLabel}>Total Battles</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{todayBattles}</Text>
          <Text style={s.statLabel}>Today</Text>
        </View>
      </View>

      <TouchableOpacity style={[s.toggleBtn, !enabled && s.toggleBtnOff]} onPress={toggleBattles}>
        <Text style={s.toggleText}>{enabled ? 'Battles Enabled' : 'Battles Disabled'}</Text>
        <View style={[s.toggleDot, { backgroundColor: enabled ? theme.success : theme.danger }]} />
      </TouchableOpacity>

      <Text style={s.heading}>Top Battle Winners</Text>
      {stats.length === 0 ? (
        <Text style={s.empty}>No battle data yet</Text>
      ) : (
        stats.map((stat, i) => (
          <View key={stat.feature_id} style={s.row}>
            <Text style={s.rank}>#{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle} numberOfLines={1}>{stat.title}</Text>
              <Text style={s.rowMeta}>{stat.wins} wins / {stat.appearances} appearances ({stat.win_rate}%)</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' },
  overviewRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: t.card, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder,
  },
  statValue: { fontSize: 28, fontWeight: '800', color: t.accent },
  statLabel: { fontSize: 12, color: t.textMuted, marginTop: 4 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.successBg, borderRadius: 12, padding: 16,
    marginBottom: 20, borderWidth: 1, borderColor: t.success + '44',
  },
  toggleBtnOff: { backgroundColor: t.dangerBg, borderColor: t.danger + '44' },
  toggleText: { fontSize: 16, fontWeight: '700', color: t.text },
  toggleDot: { width: 12, height: 12, borderRadius: 6 },
  heading: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 12 },
  empty: { fontSize: 14, color: t.textMuted, textAlign: 'center', paddingVertical: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.card, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: t.cardBorder,
  },
  rank: { fontSize: 16, fontWeight: '800', color: t.accent, width: 32 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: t.text },
  rowMeta: { fontSize: 12, color: t.textMuted, marginTop: 2 },
});

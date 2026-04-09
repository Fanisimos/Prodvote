import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../lib/theme';

interface BoostEntry {
  id: string;
  feature_title: string;
  username: string;
  created_at: string;
}

export default function AdminBoosts() {
  const [boosts, setBoosts] = useState<BoostEntry[]>([]);
  const [totalBoosts, setTotalBoosts] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();

  const fetchData = useCallback(async () => {
    const { count } = await supabase.from('boosts').select('*', { count: 'exact', head: true });
    setTotalBoosts(count ?? 0);

    const { data: flag } = await supabase
      .from('feature_flags').select('enabled').eq('key', 'boost_idea').single();
    setEnabled(flag?.enabled ?? true);

    const { data } = await supabase
      .from('boosts').select('id, created_at, feature_id, user_id')
      .order('created_at', { ascending: false }).limit(50);

    if (data && data.length > 0) {
      const featureIds = [...new Set(data.map(b => b.feature_id))];
      const userIds = [...new Set(data.map(b => b.user_id))];

      const [featRes, userRes] = await Promise.all([
        supabase.from('features').select('id, title').in('id', featureIds),
        supabase.from('profiles').select('id, username').in('id', userIds),
      ]);

      const titleMap: Record<string, string> = {};
      (featRes.data || []).forEach(f => { titleMap[f.id] = f.title; });
      const nameMap: Record<string, string> = {};
      (userRes.data || []).forEach(u => { nameMap[u.id] = u.username; });

      setBoosts(data.map(b => ({
        id: b.id,
        feature_title: titleMap[b.feature_id] || 'Unknown',
        username: nameMap[b.user_id] || 'Unknown',
        created_at: b.created_at,
      })));
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleBoosts() {
    const newVal = !enabled;
    await supabase.from('feature_flags').update({ enabled: newVal, updated_at: new Date().toISOString() })
      .eq('key', 'boost_idea');
    setEnabled(newVal);
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
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
      <View style={s.statCard}>
        <Text style={s.statValue}>{totalBoosts}</Text>
        <Text style={s.statLabel}>Total Boosts</Text>
      </View>

      <TouchableOpacity style={[s.toggleBtn, !enabled && s.toggleBtnOff]} onPress={toggleBoosts}>
        <Text style={s.toggleText}>{enabled ? 'Boosts Enabled' : 'Boosts Disabled'}</Text>
        <View style={[s.toggleDot, { backgroundColor: enabled ? theme.success : theme.danger }]} />
      </TouchableOpacity>

      <Text style={s.heading}>Recent Boosts</Text>
      {boosts.length === 0 ? (
        <Text style={s.empty}>No boosts yet</Text>
      ) : (
        boosts.map(b => (
          <View key={b.id} style={s.row}>
            <Text style={{ fontSize: 18 }}>🚀</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle} numberOfLines={1}>{b.feature_title}</Text>
              <Text style={s.rowMeta}>by @{b.username} · {timeAgo(b.created_at)}</Text>
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
  statCard: {
    backgroundColor: t.card, borderRadius: 14, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder, marginBottom: 16,
  },
  statValue: { fontSize: 32, fontWeight: '800', color: t.accent },
  statLabel: { fontSize: 13, color: t.textMuted, marginTop: 4 },
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
  rowTitle: { fontSize: 15, fontWeight: '600', color: t.text },
  rowMeta: { fontSize: 12, color: t.textMuted, marginTop: 2 },
});

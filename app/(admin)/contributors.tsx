import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../lib/theme';
import ContributorBadgeView from '../../components/ContributorBadge';
import { notify, confirmAction } from '../../lib/adminUI';

interface ContributorEntry {
  id: string;
  username: string;
  ideas_submitted: number;
  total_votes_cast: number;
  winning_ideas: number;
  contributor_badge: string | null;
}

export default function AdminContributors() {
  const [contributors, setContributors] = useState<ContributorEntry[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();

  const fetchData = useCallback(async () => {
    const { data: flag } = await supabase
      .from('feature_flags').select('enabled').eq('key', 'contributor_badges').single();
    setEnabled(flag?.enabled ?? true);

    const { data } = await supabase
      .from('profiles')
      .select('id, username, ideas_submitted, total_votes_cast, winning_ideas, contributor_badge')
      .not('contributor_badge', 'is', null)
      .order('winning_ideas', { ascending: false })
      .limit(50);

    setContributors(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleBadges() {
    const newVal = !enabled;
    await supabase.from('feature_flags').update({ enabled: newVal, updated_at: new Date().toISOString() })
      .eq('key', 'contributor_badges');
    setEnabled(newVal);
  }

  async function refreshStats() {
    if (!(await confirmAction('Refresh Stats', 'This will recalculate all contributor stats. Continue?'))) return;
    const { data: allUsers } = await supabase.from('profiles').select('id').limit(500);
    if (allUsers) {
      for (const u of allUsers) {
        await supabase.rpc('refresh_contributor_stats', { p_user_id: u.id });
      }
    }
    notify('Done', 'Contributor stats refreshed.');
    fetchData();
  }

  async function removeBadge(userId: string) {
    await supabase.from('profiles').update({ contributor_badge: null }).eq('id', userId);
    fetchData();
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
      <TouchableOpacity style={[s.toggleBtn, !enabled && s.toggleBtnOff]} onPress={toggleBadges}>
        <Text style={s.toggleText}>{enabled ? 'Badges Enabled' : 'Badges Disabled'}</Text>
        <View style={[s.toggleDot, { backgroundColor: enabled ? theme.success : theme.danger }]} />
      </TouchableOpacity>

      <TouchableOpacity style={s.refreshBtn} onPress={refreshStats}>
        <Text style={s.refreshText}>Refresh All Stats</Text>
      </TouchableOpacity>

      <Text style={s.heading}>Top Contributors ({contributors.length})</Text>
      {contributors.length === 0 ? (
        <Text style={s.empty}>No contributors with badges yet</Text>
      ) : (
        contributors.map(c => (
          <View key={c.id} style={s.row}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={s.rowTitle}>@{c.username}</Text>
                <ContributorBadgeView badge={c.contributor_badge} size="normal" />
              </View>
              <Text style={s.rowMeta}>
                {c.ideas_submitted} ideas · {c.total_votes_cast} votes · {c.winning_ideas} shipped
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeBadge(c.id)}>
              <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '600' }}>Remove</Text>
            </TouchableOpacity>
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
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.successBg, borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: t.success + '44',
  },
  toggleBtnOff: { backgroundColor: t.dangerBg, borderColor: t.danger + '44' },
  toggleText: { fontSize: 16, fontWeight: '700', color: t.text },
  toggleDot: { width: 12, height: 12, borderRadius: 6 },
  refreshBtn: {
    backgroundColor: t.accent, borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 20,
  },
  refreshText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 12 },
  empty: { fontSize: 14, color: t.textMuted, textAlign: 'center', paddingVertical: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.card, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: t.cardBorder,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: t.text },
  rowMeta: { fontSize: 12, color: t.textMuted, marginTop: 2 },
});

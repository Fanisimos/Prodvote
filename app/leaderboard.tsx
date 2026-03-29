import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import Watermark from '../components/Watermark';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme, Theme, tierColor, tierEmoji } from '../lib/theme';

type Tab = 'voters' | 'submitters' | 'streaks';

interface LeaderEntry {
  username: string;
  tier: string;
  value: number;
  label: string;
}

export default function LeaderboardScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('voters');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const s = styles(theme);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    let data: LeaderEntry[] = [];

    if (tab === 'voters') {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: votes } = await supabase
        .from('votes')
        .select('user_id')
        .gte('created_at', oneWeekAgo);

      if (votes) {
        const counts: Record<string, number> = {};
        votes.forEach(v => { counts[v.user_id] = (counts[v.user_id] || 0) + 1; });
        const topIds = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, tier')
          .in('id', topIds.map(([id]) => id));

        data = topIds.map(([id, count]) => {
          const p = profiles?.find(p => p.id === id);
          return { username: p?.username || 'anon', tier: p?.tier || 'free', value: count, label: 'votes this week' };
        });
      }
    } else if (tab === 'submitters') {
      const { data: features } = await supabase
        .from('features')
        .select('user_id, vote_count');

      if (features) {
        const scores: Record<string, number> = {};
        features.forEach(f => { scores[f.user_id] = (scores[f.user_id] || 0) + f.vote_count; });
        const topIds = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 10);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, tier')
          .in('id', topIds.map(([id]) => id));

        data = topIds.map(([id, score]) => {
          const p = profiles?.find(p => p.id === id);
          return { username: p?.username || 'anon', tier: p?.tier || 'free', value: score, label: 'total votes received' };
        });
      }
    } else {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('username, tier, login_streak')
        .order('login_streak', { ascending: false })
        .limit(10);

      data = (profiles || []).map(p => ({
        username: p.username,
        tier: p.tier,
        value: p.login_streak,
        label: 'day streak',
      }));
    }

    setEntries(data);
    setLoading(false);
    setRefreshing(false);
  }, [tab]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

  const TABS: { id: Tab; label: string; emoji: string }[] = [
    { id: 'voters', label: 'Top Voters', emoji: '🗳️' },
    { id: 'submitters', label: 'Top Builders', emoji: '🚀' },
    { id: 'streaks', label: 'Streaks', emoji: '🔥' },
  ];

  const medalEmoji = (i: number) => ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;

  return (
    <View style={s.container}>
      <Watermark />
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLeaderboard(); }} tintColor={theme.accent} />
        }
      >
        <Text style={s.heading}>Leaderboard</Text>

        {/* Tabs */}
        <View style={s.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
              onPress={() => setTab(t.id)}
            >
              <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>
                {t.emoji} {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : entries.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 40 }}>📊</Text>
            <Text style={s.emptyText}>No data yet</Text>
          </View>
        ) : (
          entries.map((entry, i) => {
            const tc = tierColor(entry.tier, theme);
            const te = tierEmoji(entry.tier);
            return (
              <TouchableOpacity
                key={entry.username}
                style={[s.entryCard, i === 0 && s.entryCardGold]}
                onPress={() => router.push(`/user/${entry.username}` as any)}
                activeOpacity={0.7}
              >
                <Text style={s.medal}>{medalEmoji(i)}</Text>
                <View style={s.entryInfo}>
                  <View style={s.entryNameRow}>
                    <Text style={s.entryUsername}>@{entry.username}</Text>
                    <View style={[s.tierPill, { backgroundColor: tc + '22' }]}>
                      <Text style={[s.tierText, { color: tc }]}>{te} {entry.tier}</Text>
                    </View>
                  </View>
                  <Text style={s.entryLabel}>{entry.label}</Text>
                </View>
                <View style={s.valueBox}>
                  <Text style={[s.valueNum, i === 0 && { color: theme.gold }]}>{entry.value}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { padding: 20, paddingBottom: 60 },
  heading: { fontSize: 28, fontWeight: '800', color: t.text, marginBottom: 20 },
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tabBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.cardBorder,
  },
  tabBtnActive: { backgroundColor: t.accent, borderColor: t.accent },
  tabText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
  tabTextActive: { color: '#fff' },
  loadingBox: { paddingTop: 60, alignItems: 'center' },
  emptyBox: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: t.textMuted, fontWeight: '600' },
  entryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: t.card, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: t.cardBorder,
  },
  entryCardGold: {
    borderColor: '#fbbf2444', backgroundColor: t.card,
    shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  medal: { fontSize: 24, width: 36, textAlign: 'center' },
  entryInfo: { flex: 1 },
  entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  entryUsername: { fontSize: 16, fontWeight: '700', color: t.text },
  tierPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tierText: { fontSize: 11, fontWeight: '700' },
  entryLabel: { fontSize: 12, color: t.textMuted },
  valueBox: { alignItems: 'center' },
  valueNum: { fontSize: 22, fontWeight: '800', color: t.accent },
});

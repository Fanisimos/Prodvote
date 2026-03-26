import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import Watermark from '../../components/Watermark';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme, Theme } from '../../lib/theme';
import { Feature } from '../../lib/types';

type SortBy = 'top' | 'newest' | 'trending';

export default function TrendingScreen() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('top');
  const { session, profile } = useAuthContext();
  const { theme } = useTheme();
  const router = useRouter();

  const fetchFeatures = useCallback(async () => {
    let query = supabase
      .from('features_with_details')
      .select('*')
      .not('status', 'eq', 'declined');

    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'top') query = query.order('vote_count', { ascending: false });
    else query = query.order('score', { ascending: false });

    const { data } = await query.limit(50);
    setFeatures(data || []);

    if (session) {
      const { data: votes } = await supabase
        .from('votes')
        .select('feature_id')
        .eq('user_id', session.user.id);
      setUserVotes(new Set((votes || []).map(v => v.feature_id)));
    }

    setLoading(false);
    setRefreshing(false);
  }, [sortBy, session]);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  async function handleVote(featureId: string) {
    if (!session || !profile) return;

    const hasVoted = userVotes.has(featureId);

    if (hasVoted) {
      await supabase.from('votes').delete()
        .eq('user_id', session.user.id)
        .eq('feature_id', featureId);
      setUserVotes(prev => { const s = new Set(prev); s.delete(featureId); return s; });
      setFeatures(prev => prev.map(f =>
        f.id === featureId ? { ...f, vote_count: f.vote_count - 1, score: f.score - 1 } : f
      ));
    } else {
      if (profile.votes_remaining <= 0) {
        Alert.alert('No votes left', 'Upgrade to Pro for more votes!');
        return;
      }
      const weight = (profile.tier === 'ultra' || profile.tier === 'legendary') ? 3 : 1;
      await supabase.from('votes').insert({
        user_id: session.user.id,
        feature_id: featureId,
        weight,
      });
      await supabase.from('profiles').update({
        votes_remaining: profile.votes_remaining - 1,
      }).eq('id', session.user.id);
      setUserVotes(prev => new Set(prev).add(featureId));
      setFeatures(prev => prev.map(f =>
        f.id === featureId ? { ...f, vote_count: f.vote_count + 1, score: f.score + weight } : f
      ));
    }
  }

  function renderFeature({ item }: { item: Feature }) {
    const hasVoted = userVotes.has(item.id);
    const s = styles(theme);
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => router.push(`/feature/${item.id}`)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={[s.voteBox, hasVoted && s.voteBoxActive]}
          onPress={() => handleVote(item.id)}
        >
          <Text style={[s.voteArrow, hasVoted && s.voteArrowActive]}>▲</Text>
          <Text style={[s.voteCount, hasVoted && s.voteCountActive]}>
            {item.vote_count}
          </Text>
        </TouchableOpacity>
        <View style={s.cardContent}>
          <View style={s.cardMeta}>
            {item.category_name && (
              <View style={[s.badge, { backgroundColor: (item.category_color || '#7c5cfc') + '22' }]}>
                <Text style={[s.badgeText, { color: item.category_color || '#7c5cfc' }]}>
                  {item.category_name}
                </Text>
              </View>
            )}
            {item.status !== 'open' && (
              <View style={[s.badge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
                <Text style={[s.badgeText, { color: getStatusColor(item.status) }]}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={s.cardFooter}>
            <Text style={s.cardAuthor}>by {item.author_username || 'anon'}</Text>
            <Text style={s.cardComments}>💬 {item.comment_count}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const s = styles(theme);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Watermark />

      <View style={s.sortBar}>
        {(['top', 'newest', 'trending'] as SortBy[]).map(sb => (
          <TouchableOpacity
            key={sb}
            style={[s.sortTab, sortBy === sb && s.sortTabActive]}
            onPress={() => setSortBy(sb)}
          >
            <Text style={[s.sortText, sortBy === sb && s.sortTextActive]}>
              {sb === 'trending' ? 'Hot' : sb.charAt(0).toUpperCase() + sb.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={features}
        keyExtractor={item => item.id}
        renderItem={renderFeature}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeatures(); }}
            tintColor={theme.accent} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>📬</Text>
            <Text style={s.emptyText}>No feature requests yet</Text>
            <Text style={s.emptySubtext}>Be the first to submit one!</Text>
          </View>
        }
      />
    </View>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    open: '#888', under_review: '#ffb347', planned: '#4dc9f6',
    in_progress: '#7c5cfc', shipped: '#34d399', declined: '#ff4d6a',
  };
  return colors[status] || '#888';
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  sortBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    gap: 8, borderBottomWidth: 1, borderBottomColor: t.cardBorder,
  },
  sortTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: t.sortInactive },
  sortTabActive: { backgroundColor: t.sortActive },
  sortText: { color: t.sortTextInactive, fontWeight: '600', fontSize: 14 },
  sortTextActive: { color: t.sortTextActive },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row', backgroundColor: t.card, borderRadius: 16,
    padding: 16, gap: 14, borderWidth: 1, borderColor: t.cardBorder, marginBottom: 12,
  },
  voteBox: {
    alignItems: 'center', justifyContent: 'center', width: 52,
    paddingVertical: 8, borderRadius: 12, backgroundColor: t.surface,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  voteBoxActive: { backgroundColor: t.accentLight, borderColor: t.accent },
  voteArrow: { fontSize: 16, color: t.textMuted },
  voteArrowActive: { color: t.accent },
  voteCount: { fontSize: 18, fontWeight: '700', color: t.textMuted, marginTop: 2 },
  voteCountActive: { color: t.accent },
  cardContent: { flex: 1, gap: 6 },
  cardMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: t.text, lineHeight: 22 },
  cardDesc: { fontSize: 13, color: t.textSecondary, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardAuthor: { fontSize: 12, color: t.textMuted },
  cardComments: { fontSize: 12, color: t.textMuted },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: t.textMuted, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: t.textMuted, marginTop: 4 },
});

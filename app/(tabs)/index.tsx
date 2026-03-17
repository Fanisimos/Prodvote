import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Feature } from '../../lib/types';

type SortBy = 'trending' | 'newest' | 'top';

export default function TrendingScreen() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('trending');
  const { session, profile } = useAuthContext();
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
      const weight = profile.tier === 'pro' ? 5 : profile.tier === 'basic' ? 2 : 1;
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
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/feature/${item.id}`)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={[styles.voteBox, hasVoted && styles.voteBoxActive]}
          onPress={() => handleVote(item.id)}
        >
          <Text style={[styles.voteArrow, hasVoted && styles.voteArrowActive]}>▲</Text>
          <Text style={[styles.voteCount, hasVoted && styles.voteCountActive]}>
            {item.vote_count}
          </Text>
        </TouchableOpacity>
        <View style={styles.cardContent}>
          <View style={styles.cardMeta}>
            {item.category_name && (
              <View style={[styles.badge, { backgroundColor: (item.category_color || '#7c5cfc') + '22' }]}>
                <Text style={[styles.badgeText, { color: item.category_color || '#7c5cfc' }]}>
                  {item.category_name}
                </Text>
              </View>
            )}
            {item.status !== 'open' && (
              <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '22' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardAuthor}>by {item.author_username || 'anon'}</Text>
            <Text style={styles.cardComments}>💬 {item.comment_count}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sortBar}>
        {(['trending', 'newest', 'top'] as SortBy[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.sortTab, sortBy === s && styles.sortTabActive]}
            onPress={() => setSortBy(s)}
          >
            <Text style={[styles.sortText, sortBy === s && styles.sortTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={features}
        keyExtractor={item => item.id}
        renderItem={renderFeature}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFeatures(); }}
            tintColor="#7c5cfc" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No feature requests yet</Text>
            <Text style={styles.emptySubtext}>Be the first to submit one!</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/submit')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  sortBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    gap: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a2e',
  },
  sortTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a2e' },
  sortTabActive: { backgroundColor: '#7c5cfc' },
  sortText: { color: '#888', fontWeight: '600', fontSize: 14 },
  sortTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 16,
    padding: 16, gap: 14, borderWidth: 1, borderColor: '#2a2a3e', marginBottom: 12,
  },
  voteBox: {
    alignItems: 'center', justifyContent: 'center', width: 52,
    paddingVertical: 8, borderRadius: 12, backgroundColor: '#0a0a0f',
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  voteBoxActive: { backgroundColor: '#7c5cfc22', borderColor: '#7c5cfc' },
  voteArrow: { fontSize: 16, color: '#888' },
  voteArrowActive: { color: '#7c5cfc' },
  voteCount: { fontSize: 18, fontWeight: '700', color: '#888', marginTop: 2 },
  voteCountActive: { color: '#7c5cfc' },
  cardContent: { flex: 1, gap: 6 },
  cardMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', lineHeight: 22 },
  cardDesc: { fontSize: 13, color: '#aaa', lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  cardAuthor: { fontSize: 12, color: '#666' },
  cardComments: { fontSize: 12, color: '#666' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 60, height: 60,
    borderRadius: 30, backgroundColor: '#7c5cfc', alignItems: 'center',
    justifyContent: 'center', elevation: 8,
    shadowColor: '#7c5cfc', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12,
  },
  fabText: { fontSize: 32, color: '#fff', fontWeight: '300', marginTop: -2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#888' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 4 },
});

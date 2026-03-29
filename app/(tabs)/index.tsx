import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import Watermark from '../../components/Watermark';
import ReactionBar from '../../components/ReactionBar';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme, Theme } from '../../lib/theme';
import { Feature } from '../../lib/types';

type SortBy = 'top' | 'newest' | 'trending';

interface WeeklyStats {
  totalFeatures: number;
  totalVotes: number;
  shippedCount: number;
  topVoter: string | null;
  newUsers: number;
}

interface ActivityEvent {
  id: string;
  type: 'shipped' | 'milestone' | 'streak' | 'new_feature';
  emoji: string;
  text: string;
  time: string;
}

type FeedItem =
  | { kind: 'highlights'; stats: WeeklyStats }
  | { kind: 'activity'; event: ActivityEvent }
  | { kind: 'feature'; feature: Feature };

export default function TrendingScreen() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('top');
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const { session, profile } = useAuthContext();
  const { theme } = useTheme();
  const router = useRouter();

  const fetchWeeklyStats = useCallback(async () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [featuresRes, votesRes, shippedRes, usersRes] = await Promise.all([
      supabase.from('features').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
      supabase.from('votes').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
      supabase.from('features').select('id', { count: 'exact', head: true }).eq('status', 'shipped').gte('shipped_at', oneWeekAgo),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
    ]);

    // Top voter this week
    const { data: topVoterData } = await supabase
      .from('votes')
      .select('user_id')
      .gte('created_at', oneWeekAgo);

    let topVoter: string | null = null;
    if (topVoterData && topVoterData.length > 0) {
      const voteCounts: Record<string, number> = {};
      topVoterData.forEach(v => {
        voteCounts[v.user_id] = (voteCounts[v.user_id] || 0) + 1;
      });
      const topUserId = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topUserId) {
        const { data: topUser } = await supabase.from('profiles').select('username').eq('id', topUserId).single();
        topVoter = topUser?.username || null;
      }
    }

    setWeeklyStats({
      totalFeatures: featuresRes.count || 0,
      totalVotes: votesRes.count || 0,
      shippedCount: shippedRes.count || 0,
      topVoter,
      newUsers: usersRes.count || 0,
    });
  }, []);

  const fetchActivities = useCallback(async () => {
    const events: ActivityEvent[] = [];
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Recently shipped features
    const { data: shipped } = await supabase
      .from('features_with_details')
      .select('id, title, author_username, shipped_at')
      .eq('status', 'shipped')
      .gte('shipped_at', threeDaysAgo)
      .order('shipped_at', { ascending: false })
      .limit(3);

    shipped?.forEach(f => {
      events.push({
        id: `shipped-${f.id}`,
        type: 'shipped',
        emoji: '🎉',
        text: `${f.author_username || 'Someone'}'s feature "${f.title}" was shipped!`,
        time: timeAgo(f.shipped_at),
      });
    });

    // Features that hit milestones (10+ votes)
    const { data: milestones } = await supabase
      .from('features_with_details')
      .select('id, title, vote_count')
      .gte('vote_count', 10)
      .order('vote_count', { ascending: false })
      .limit(3);

    milestones?.forEach(f => {
      events.push({
        id: `milestone-${f.id}`,
        type: 'milestone',
        emoji: '🏆',
        text: `"${f.title}" reached ${f.vote_count} votes!`,
        time: '',
      });
    });

    // Users with high streaks
    const { data: streaks } = await supabase
      .from('profiles')
      .select('username, login_streak')
      .gte('login_streak', 5)
      .order('login_streak', { ascending: false })
      .limit(2);

    streaks?.forEach(u => {
      events.push({
        id: `streak-${u.username}`,
        type: 'streak',
        emoji: '🔥',
        text: `@${u.username} is on a ${u.login_streak}-day streak!`,
        time: '',
      });
    });

    // Newest submissions
    const { data: newest } = await supabase
      .from('features_with_details')
      .select('id, title, author_username, created_at')
      .order('created_at', { ascending: false })
      .limit(2);

    newest?.forEach(f => {
      events.push({
        id: `new-${f.id}`,
        type: 'new_feature',
        emoji: '🚀',
        text: `@${f.author_username || 'anon'} submitted "${f.title}"`,
        time: timeAgo(f.created_at),
      });
    });

    setActivities(events);
  }, []);

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

  useEffect(() => {
    fetchFeatures();
    fetchWeeklyStats();
    fetchActivities();
  }, [fetchFeatures, fetchWeeklyStats, fetchActivities]);

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

  // Build mixed feed: highlights at top, then interleave activities with features
  const feedItems: FeedItem[] = [];
  if (weeklyStats && (weeklyStats.totalFeatures > 0 || weeklyStats.totalVotes > 0)) {
    feedItems.push({ kind: 'highlights', stats: weeklyStats });
  }

  // Interleave: after every 3 features, insert an activity event
  let actIdx = 0;
  features.forEach((feature, i) => {
    if (i > 0 && i % 3 === 0 && actIdx < activities.length) {
      feedItems.push({ kind: 'activity', event: activities[actIdx] });
      actIdx++;
    }
    feedItems.push({ kind: 'feature', feature });
  });
  // Add remaining activities at the end
  while (actIdx < activities.length) {
    feedItems.push({ kind: 'activity', event: activities[actIdx] });
    actIdx++;
  }

  function renderItem({ item }: { item: FeedItem }) {
    const s = styles(theme);
    if (item.kind === 'highlights') return renderHighlights(item.stats, s);
    if (item.kind === 'activity') return renderActivity(item.event, s);
    return renderFeature(item.feature, s);
  }

  function renderHighlights(stats: WeeklyStats, s: ReturnType<typeof styles>) {
    return (
      <View style={s.highlightsCard}>
        <View style={s.highlightsHeader}>
          <Text style={{ fontSize: 18 }}>📊</Text>
          <Text style={s.highlightsTitle}>This Week</Text>
        </View>
        <View style={s.highlightsGrid}>
          <View style={s.highlightsStat}>
            <Text style={s.highlightsNumber}>{stats.totalFeatures}</Text>
            <Text style={s.highlightsLabel}>Ideas</Text>
          </View>
          <View style={s.highlightsStat}>
            <Text style={s.highlightsNumber}>{stats.totalVotes}</Text>
            <Text style={s.highlightsLabel}>Votes</Text>
          </View>
          <View style={s.highlightsStat}>
            <Text style={s.highlightsNumber}>{stats.shippedCount}</Text>
            <Text style={s.highlightsLabel}>Shipped</Text>
          </View>
          <View style={s.highlightsStat}>
            <Text style={s.highlightsNumber}>{stats.newUsers}</Text>
            <Text style={s.highlightsLabel}>New Users</Text>
          </View>
        </View>
        {stats.topVoter && (
          <View style={s.topVoterRow}>
            <Text style={{ fontSize: 14 }}>👑</Text>
            <Text style={s.topVoterText}>Top voter: <Text style={{ color: theme.accent, fontWeight: '700' }}>@{stats.topVoter}</Text></Text>
          </View>
        )}
      </View>
    );
  }

  function renderActivity(event: ActivityEvent, s: ReturnType<typeof styles>) {
    return (
      <View style={s.activityCard}>
        <Text style={{ fontSize: 20 }}>{event.emoji}</Text>
        <View style={s.activityContent}>
          <Text style={s.activityText} numberOfLines={2}>{event.text}</Text>
          {event.time ? <Text style={s.activityTime}>{event.time}</Text> : null}
        </View>
      </View>
    );
  }

  function renderFeature(item: Feature, s: ReturnType<typeof styles>) {
    const hasVoted = userVotes.has(item.id);
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
            <TouchableOpacity onPress={() => router.push(`/user/${item.author_username}` as any)}>
              <Text style={s.cardAuthor}>by {item.author_username || 'anon'}</Text>
            </TouchableOpacity>
            <Text style={s.cardComments}>💬 {item.comment_count}</Text>
          </View>
          <ReactionBar featureId={item.id} />
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
        data={feedItems}
        keyExtractor={(item, index) => {
          if (item.kind === 'highlights') return 'highlights';
          if (item.kind === 'activity') return item.event.id;
          return item.feature.id;
        }}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchFeatures();
            fetchWeeklyStats();
            fetchActivities();
          }}
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

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

  // Weekly Highlights
  highlightsCard: {
    backgroundColor: t.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: t.accent + '44', marginBottom: 16,
  },
  highlightsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  highlightsTitle: { fontSize: 18, fontWeight: '800', color: t.text },
  highlightsGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
  highlightsStat: { alignItems: 'center', flex: 1 },
  highlightsNumber: { fontSize: 24, fontWeight: '800', color: t.accent },
  highlightsLabel: { fontSize: 12, color: t.textMuted, marginTop: 2, fontWeight: '600' },
  topVoterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.cardBorder,
  },
  topVoterText: { fontSize: 14, color: t.textSecondary },

  // Activity Events
  activityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.card, borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: t.cardBorder,
    borderLeftWidth: 3, borderLeftColor: t.accent,
  },
  activityContent: { flex: 1 },
  activityText: { fontSize: 14, color: t.text, fontWeight: '500', lineHeight: 20 },
  activityTime: { fontSize: 12, color: t.textMuted, marginTop: 3 },

  // Feature Cards
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

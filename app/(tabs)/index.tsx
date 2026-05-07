import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Animated, Easing,
} from 'react-native';
import Watermark from '../../components/Watermark';
import ReactionBar from '../../components/ReactionBar';
import UserAvatar from '../../components/UserAvatar';
import AwardBadge from '../../components/AwardBadge';
import AwardPicker from '../../components/AwardPicker';
import EmojiConfetti from '../../components/EmojiConfetti';
import IdeaBattles from '../../components/IdeaBattles';
import ContributorBadgeView from '../../components/ContributorBadge';
import { ArenaBricksMini } from '../../components/ArenaBricks';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { promptSignUp } from '../../lib/guestGate';
import { useTheme, Theme } from '../../lib/theme';
import { useFeatureFlags } from '../../lib/useFeatureFlags';
import { useReport } from '../../components/ReportButton';
import { getBlockedUserIds } from '../../lib/blockUser';
import { Feature, FeatureAwardCount } from '../../lib/types';

type SortBy = 'top' | 'newest' | 'trending' | 'battles';

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
  const [featureAwards, setFeatureAwards] = useState<Record<string, FeatureAwardCount[]>>({});
  const [awardPickerFeatureId, setAwardPickerFeatureId] = useState<string | null>(null);
  const [awardBurst, setAwardBurst] = useState<{ featureId: string; emoji: string } | null>(null);
  const [confettiEmoji, setConfettiEmoji] = useState<string | null>(null);
  const { session, profile, isGuest } = useAuthContext();
  const { theme } = useTheme();
  const flags = useFeatureFlags();
  const { report } = useReport();
  const router = useRouter();

  const fetchWeeklyStats = useCallback(async () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [featuresRes, votesRes, shippedRes, usersRes, topVoterRes] = await Promise.all([
      supabase.from('features').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
      supabase.from('votes').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
      supabase.from('features').select('id', { count: 'exact', head: true }).eq('status', 'shipped').gte('shipped_at', oneWeekAgo),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', oneWeekAgo),
      supabase.from('votes').select('user_id').gte('created_at', oneWeekAgo),
    ]);

    let topVoter: string | null = null;
    const topVoterData = topVoterRes.data;
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
    const blockedIds = await getBlockedUserIds();

    let query = supabase
      .from('features_with_details')
      .select('*')
      .not('status', 'eq', 'declined');

    if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
    else if (sortBy === 'top') query = query.order('vote_count', { ascending: false });
    else query = query.order('score', { ascending: false });

    const { data } = await query.limit(50);
    const filtered = (data || []).filter((f: any) => !blockedIds.includes(f.user_id));
    setFeatures(filtered);

    if (session) {
      const { data: votes } = await supabase
        .from('votes')
        .select('feature_id')
        .eq('user_id', session.user.id);
      setUserVotes(new Set((votes || []).map(v => v.feature_id)));
    }

    // Fetch awards for all features
    const featureIds = (data || []).map((f: any) => f.id);
    if (featureIds.length > 0) {
      const { data: awardData } = await supabase
        .from('feature_award_counts')
        .select('*')
        .in('feature_id', featureIds);
      const grouped: Record<string, FeatureAwardCount[]> = {};
      (awardData || []).forEach((a: any) => {
        if (!grouped[a.feature_id]) grouped[a.feature_id] = [];
        grouped[a.feature_id].push(a);
      });
      setFeatureAwards(grouped);
    }

    setLoading(false);
    setRefreshing(false);
  }, [sortBy, session]);

  useEffect(() => {
    fetchFeatures();
    fetchWeeklyStats();
    fetchActivities();
  }, [fetchFeatures, fetchWeeklyStats, fetchActivities]);

  const [votingIds, setVotingIds] = useState<Set<string>>(new Set());

  async function handleVote(featureId: string) {
    if (isGuest) { promptSignUp('vote'); return; }
    if (!session || !profile) return;
    if (votingIds.has(featureId)) return;
    setVotingIds(prev => new Set(prev).add(featureId));

    const hasVoted = userVotes.has(featureId);

    if (hasVoted) {
      setUserVotes(prev => { const s = new Set(prev); s.delete(featureId); return s; });
      setFeatures(prev => prev.map(f =>
        f.id === featureId ? { ...f, vote_count: f.vote_count - 1, score: f.score - 1 } : f
      ));
      await supabase.from('votes').delete()
        .eq('user_id', session.user.id)
        .eq('feature_id', featureId);
    } else {
      if (profile.votes_remaining <= 0) {
        Alert.alert('No votes left', 'Upgrade to Pro for more votes!');
        setVotingIds(prev => { const s = new Set(prev); s.delete(featureId); return s; });
        return;
      }
      const weight = (profile.tier === 'ultra' || profile.tier === 'legendary') ? 3 : 1;
      setUserVotes(prev => new Set(prev).add(featureId));
      setFeatures(prev => prev.map(f =>
        f.id === featureId ? { ...f, vote_count: f.vote_count + 1, score: f.score + weight } : f
      ));
      await supabase.from('votes').insert({
        user_id: session.user.id,
        feature_id: featureId,
        weight,
      });
      await supabase.from('profiles').update({
        votes_remaining: profile.votes_remaining - 1,
      }).eq('id', session.user.id);
    }
    setVotingIds(prev => { const s = new Set(prev); s.delete(featureId); return s; });
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
    return <FeatureCard item={item.feature} s={s} />;
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

  function FeatureCard({ item, s }: { item: Feature; s: ReturnType<typeof styles> }) {
    const hasVoted = userVotes.has(item.id);
    const awards = featureAwards[item.id] || [];
    const lastTapRef = useRef(0);
    const arrowAnim = useRef(new Animated.Value(0)).current;
    const [showArrow, setShowArrow] = useState(false);
    const burstAnim = useRef(new Animated.Value(0)).current;
    const [showBurst, setShowBurst] = useState(false);
    const [burstEmoji, setBurstEmoji] = useState('');

    // Watch for award burst from parent
    useEffect(() => {
      if (awardBurst && awardBurst.featureId === item.id) {
        setBurstEmoji(awardBurst.emoji);
        // Wait for picker modal to fully close
        const timeout = setTimeout(() => {
          setShowBurst(true);
          burstAnim.setValue(0);
          Animated.sequence([
            Animated.timing(burstAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(2)), useNativeDriver: false }),
            Animated.delay(800),
            Animated.timing(burstAnim, { toValue: 2, duration: 500, easing: Easing.in(Easing.ease), useNativeDriver: false }),
          ]).start(() => {
            setShowBurst(false);
            setAwardBurst(null);
          });
        }, 600);
        return () => clearTimeout(timeout);
      }
    }, [awardBurst]);

    function handleCardPress() {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        lastTapRef.current = 0;
        // Double tap — always show animation, vote if not already voted
        setShowArrow(true);
        arrowAnim.setValue(0);
        Animated.sequence([
          Animated.timing(arrowAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(2)), useNativeDriver: false }),
          Animated.delay(400),
          Animated.timing(arrowAnim, { toValue: 2, duration: 300, easing: Easing.in(Easing.ease), useNativeDriver: false }),
        ]).start(() => {
          setShowArrow(false);
          if (!hasVoted) {
            handleVote(item.id);
          }
        });
      } else {
        lastTapRef.current = now;
        setTimeout(() => {
          if (lastTapRef.current === now) {
            router.push(`/feature/${item.id}`);
          }
        }, 300);
      }
    }

    const arrowScale = arrowAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1.3, 0] });
    const arrowOpacity = arrowAnim.interpolate({ inputRange: [0, 0.5, 1, 1.8, 2], outputRange: [0, 1, 1, 1, 0] });
    const arrowTranslateY = arrowAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [20, 0, -30] });

    const burstScale = burstAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1.5, 0] });
    const burstOpacity = burstAnim.interpolate({ inputRange: [0, 0.3, 1, 1.8, 2], outputRange: [0, 1, 1, 1, 0] });
    const burstRotate = burstAnim.interpolate({ inputRange: [0, 1, 2], outputRange: ['-20deg', '0deg', '15deg'] });

    return (
      <TouchableOpacity
        style={s.card}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        {/* Double-tap arrow overlay */}
        {showArrow && (
          <Animated.View style={[s.doubleTapOverlay, {
            opacity: arrowOpacity,
            transform: [{ scale: arrowScale }, { translateY: arrowTranslateY }],
          }]} pointerEvents="none">
            <Text style={s.doubleTapArrow}>▲</Text>
          </Animated.View>
        )}

        {/* Award burst overlay */}
        {showBurst && (
          <Animated.View style={[s.doubleTapOverlay, {
            opacity: burstOpacity,
            transform: [{ scale: burstScale }, { rotate: burstRotate }],
          }]} pointerEvents="none">
            <Text style={{ fontSize: 72 }}>{burstEmoji}</Text>
          </Animated.View>
        )}

        {/* Top row: vote button + count + badges */}
        <View style={s.cardTopRow}>
          <TouchableOpacity
            style={[s.voteCircle, hasVoted && s.voteCircleActive]}
            onPress={() => {
              lastTapRef.current = 0; // cancel any pending navigation
              handleVote(item.id);
            }}
          >
            <Text style={[s.voteChevron, hasVoted && s.voteChevronActive]}>⌃</Text>
          </TouchableOpacity>
          <Text style={[s.voteCount, hasVoted && s.voteCountActive]}>{item.vote_count}</Text>
          <View style={s.cardTopRight}>
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
              {item.is_boosted && (
                <View style={[s.badge, { backgroundColor: '#ff6b3522' }]}>
                  <Text style={[s.badgeText, { color: '#ff6b35' }]}>🚀 Boosted</Text>
                </View>
              )}
              {item.battle_wins > 0 && (
                <View style={[s.badge, { backgroundColor: '#b794f622' }]}>
                  <Text style={[s.badgeText, { color: '#b794f6' }]}>🥊 {item.battle_wins}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Title + Description */}
        <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={s.cardDesc} numberOfLines={3}>{item.description}</Text>

        {/* Awards row */}
        {awards.length > 0 && (
          <View style={s.awardsRow}>
            {awards.map(a => (
              <AwardBadge
                key={a.award_type_id}
                emoji={a.emoji}
                count={a.count}
                animation={a.animation}
                color={a.color}
                size={22}
                onPress={() => setConfettiEmoji(a.emoji)}
              />
            ))}
          </View>
        )}

        {/* Footer: avatar + author + time + comments + give award */}
        <View style={s.cardFooter}>
          <TouchableOpacity
            style={s.authorRow}
            onPress={() => router.push(`/user/${item.author_username}` as any)}
          >
            <UserAvatar
              username={item.author_username || 'anon'}
              avatarUrl={item.author_avatar}
              frameColor={item.author_frame_color}
              frameAnimation={item.author_frame_animation}
              size={28}
            />
            <View>
              <Text style={s.submittedLabel}>Submitted by</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={s.cardAuthor}>{item.author_username || 'anon'}</Text>
                {flags.contributor_badges !== false && item.author_contributor_badge && (
                  <ContributorBadgeView badge={item.author_contributor_badge} size="small" />
                )}
                <Text style={s.cardTime}>· {timeAgo(item.created_at)}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={s.footerRight}>
            <TouchableOpacity
              style={s.awardBtn}
              onPress={() => setAwardPickerFeatureId(item.id)}
            >
              <Text style={s.awardBtnText}>🏆</Text>
            </TouchableOpacity>
            <Text style={s.cardComments}>💬 {item.comment_count}</Text>
            <TouchableOpacity
              onPress={() => report({ contentType: 'feature', contentId: item.id, authorId: item.user_id, authorUsername: item.author_username })}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={s.reportBtn}>···</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reactions */}
        <ReactionBar featureId={item.id} />
      </TouchableOpacity>
    );
  }

  const s = styles(theme);

  return (
    <View style={s.container}>
      <Watermark />

      <View style={s.sortBar}>
        {((['top', 'newest', 'trending'] as SortBy[]).concat(flags.idea_battles !== false ? ['battles' as SortBy] : [])).map(sb => (
          <TouchableOpacity
            key={sb}
            style={[
              s.sortTab,
              sortBy === sb && s.sortTabActive,
              sb === 'battles' && s.sortTabBattles,
              sb === 'battles' && sortBy === sb && s.sortTabBattlesActive,
            ]}
            onPress={() => setSortBy(sb)}
          >
            {sb === 'battles' && <ArenaBricksMini />}
            <Text style={[
              s.sortText,
              sortBy === sb && s.sortTextActive,
              sb === 'battles' && s.sortTextBattles,
              sb === 'battles' && sortBy === sb && s.sortTextBattlesActive,
            ]}>
              {sb === 'trending' ? 'Hot' : sb === 'battles' ? 'Battles' : sb.charAt(0).toUpperCase() + sb.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {sortBy === 'battles' ? (
        <View style={{ flex: 1 }}>
          <IdeaBattles isActive={sortBy === 'battles'} />
        </View>
      ) : (
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
            loading ? (
              <View style={s.empty}>
                <ActivityIndicator size="large" color={theme.accent} />
              </View>
            ) : (
              <View style={s.empty}>
                <Text style={{ fontSize: 48 }}>📬</Text>
                <Text style={s.emptyText}>No feature requests yet</Text>
                <Text style={s.emptySubtext}>Be the first to submit one!</Text>
              </View>
            )
          }
        />
      )}

      <AwardPicker
        featureId={awardPickerFeatureId || ''}
        visible={!!awardPickerFeatureId}
        onClose={() => setAwardPickerFeatureId(null)}
        onAwarded={async (emoji) => {
          const fid = awardPickerFeatureId!;
          setAwardBurst({ featureId: fid, emoji });
          const { data: awardData } = await supabase
            .from('feature_award_counts')
            .select('*')
            .eq('feature_id', fid);
          setFeatureAwards(prev => ({ ...prev, [fid]: awardData || [] }));
        }}
      />

      <EmojiConfetti
        emoji={confettiEmoji || awardBurst?.emoji || '🏆'}
        visible={!!awardBurst || !!confettiEmoji}
        onDone={() => setConfettiEmoji(null)}
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
  sortTabBattles: {
    backgroundColor: '#1a0a12', borderWidth: 1, borderColor: '#ff450066', overflow: 'hidden' as const,
  },
  sortTabBattlesActive: {
    backgroundColor: '#ff4500', borderColor: '#ff4500',
  },
  sortText: { color: t.sortTextInactive, fontWeight: '600', fontSize: 14 },
  sortTextActive: { color: t.sortTextActive },
  sortTextBattles: { color: '#ff6b35' },
  sortTextBattlesActive: { color: '#ffffff' },
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
    backgroundColor: t.card, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: t.cardBorder, marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 4,
  },
  voteCircle: {
    width: 52, height: 48, borderRadius: 12,
    backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: t.cardBorder,
  },
  voteCircleActive: { backgroundColor: t.accent, borderColor: t.accent },
  voteChevron: { fontSize: 24, fontWeight: '700', color: t.textMuted, marginTop: -2 },
  voteChevronActive: { color: '#fff' },
  voteCount: {
    fontSize: 20, fontWeight: '800', color: t.accent,
  },
  voteCountActive: { color: t.accent },
  cardTopRight: { flex: 1, paddingTop: 4 },
  cardMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: t.text, lineHeight: 24, marginBottom: 6 },
  cardDesc: { fontSize: 14, color: t.textSecondary, lineHeight: 20, marginBottom: 14 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: t.cardBorder,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  submittedLabel: { fontSize: 11, color: t.textMuted, marginBottom: 1 },
  cardAuthor: { fontSize: 13, fontWeight: '700', color: t.text },
  cardTime: { fontSize: 12, fontWeight: '400', color: t.textMuted },
  awardsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  awardBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: t.cardBorder,
  },
  awardBtnText: { fontSize: 16 },
  cardComments: { fontSize: 13, color: t.textMuted },
  reportBtn: { fontSize: 16, color: t.textMuted + '88', fontWeight: '700', letterSpacing: 2, paddingHorizontal: 2 },
  doubleTapOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  doubleTapArrow: { fontSize: 64, color: t.accent },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: t.textMuted, marginTop: 12 },
  emptySubtext: { fontSize: 14, color: t.textMuted, marginTop: 4 },
});

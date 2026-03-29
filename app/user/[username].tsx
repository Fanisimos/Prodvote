import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import Watermark from '../../components/Watermark';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme, tierColor, tierEmoji } from '../../lib/theme';
import { Profile, Feature, Badge } from '../../lib/types';

interface PublicProfile extends Profile {
  badges: Badge[];
  topFeatures: Feature[];
  totalVotesReceived: number;
}

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const s = styles(theme);

  useEffect(() => { fetchProfile(); }, [username]);

  async function fetchProfile() {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (!profile) { setLoading(false); return; }

    const [featuresRes, badgesRes, votesRes] = await Promise.all([
      supabase.from('features_with_details').select('*')
        .eq('user_id', profile.id)
        .order('vote_count', { ascending: false })
        .limit(5),
      supabase.from('user_badges').select('*, badge:badges(*)').eq('user_id', profile.id),
      supabase.from('votes').select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id),
    ]);

    setUser({
      ...profile,
      badges: (badgesRes.data || []).map((ub: any) => ub.badge).filter(Boolean),
      topFeatures: featuresRes.data || [],
      totalVotesReceived: featuresRes.data?.reduce((sum: number, f: Feature) => sum + f.vote_count, 0) || 0,
    });
    setLoading(false);
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  if (!user) {
    return (
      <View style={s.center}>
        <Text style={{ fontSize: 40 }}>👤</Text>
        <Text style={[s.emptyText, { marginTop: 12 }]}>User not found</Text>
      </View>
    );
  }

  const tc = tierColor(user.tier, theme);
  const te = tierEmoji(user.tier);

  return (
    <View style={s.container}>
      <Watermark />
      <ScrollView contentContainerStyle={s.scroll}>

        {/* Avatar + Identity */}
        <View style={s.heroCard}>
          <View style={[s.avatarRing, { borderColor: tc }]}>
            <View style={s.avatarInner}>
              <Text style={s.avatarEmoji}>
                {user.active_badge ? (user.active_badge as any).emoji : '👤'}
              </Text>
            </View>
          </View>
          <Text style={s.username}>@{user.username}</Text>
          {user.bio && <Text style={s.bio}>{user.bio}</Text>}
          <View style={[s.tierPill, { backgroundColor: tc + '22' }]}>
            <Text style={[s.tierText, { color: tc }]}>{te} {user.tier.toUpperCase()}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{user.totalVotesReceived}</Text>
            <Text style={s.statLabel}>Votes received</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{user.topFeatures.length}</Text>
            <Text style={s.statLabel}>Submissions</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: theme.danger }]}>{user.login_streak}</Text>
            <Text style={s.statLabel}>🔥 Streak</Text>
          </View>
        </View>

        {/* Badges */}
        {user.badges.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Badges</Text>
            <View style={s.badgesRow}>
              {user.badges.map((badge: Badge) => (
                <View key={badge.id} style={[s.badgePill, { backgroundColor: badge.color + '22' }]}>
                  <Text style={s.badgeEmoji}>{badge.emoji}</Text>
                  <Text style={[s.badgeName, { color: badge.color }]}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Features */}
        {user.topFeatures.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Top Submissions</Text>
            {user.topFeatures.map((f: Feature) => (
              <TouchableOpacity
                key={f.id}
                style={s.featureCard}
                onPress={() => router.push(`/feature/${f.id}`)}
                activeOpacity={0.7}
              >
                <View style={s.featureVotes}>
                  <Text style={s.featureVoteNum}>{f.vote_count}</Text>
                  <Text style={s.featureVoteLabel}>votes</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.featureTitle} numberOfLines={2}>{f.title}</Text>
                  <Text style={[s.featureStatus, { color: getStatusColor(f.status) }]}>
                    {f.status.replace('_', ' ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={s.joinedText}>
          Joined {new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </Text>
      </ScrollView>
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
  scroll: { padding: 20, paddingBottom: 60 },
  heroCard: { alignItems: 'center', marginBottom: 24 },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarInner: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: '#7c5cfc22', alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 36 },
  username: { fontSize: 22, fontWeight: '800', color: t.text, marginBottom: 6 },
  bio: { fontSize: 14, color: t.textSecondary, textAlign: 'center', marginBottom: 10, lineHeight: 20 },
  tierPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  tierText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: t.card, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder,
  },
  statNum: { fontSize: 24, fontWeight: '800', color: t.accent },
  statLabel: { fontSize: 12, color: t.textMuted, marginTop: 2, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 12 },
  badgesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badgePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  badgeEmoji: { fontSize: 16 },
  badgeName: { fontSize: 13, fontWeight: '600' },
  featureCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: t.card, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: t.cardBorder,
  },
  featureVotes: {
    width: 48, alignItems: 'center', backgroundColor: t.surface,
    borderRadius: 10, paddingVertical: 6,
  },
  featureVoteNum: { fontSize: 18, fontWeight: '800', color: t.accent },
  featureVoteLabel: { fontSize: 10, color: t.textMuted, fontWeight: '600' },
  featureTitle: { fontSize: 14, fontWeight: '600', color: t.text, lineHeight: 20 },
  featureStatus: { fontSize: 12, fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
  emptyText: { fontSize: 16, color: t.textMuted, fontWeight: '600' },
  joinedText: { textAlign: 'center', fontSize: 13, color: t.textMuted, marginTop: 8 },
});

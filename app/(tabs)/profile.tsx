import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Share, Platform } from 'react-native';
import Watermark from '../../components/Watermark';
import UserAvatar from '../../components/UserAvatar';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme, Theme, tierColor, tierEmoji } from '../../lib/theme';
import { Feature, Badge, AvatarFrame } from '../../lib/types';
import { registerForPushNotifications, scheduleDailyRewardReminder } from '../../lib/notifications';
import * as StoreReview from 'expo-store-review';

async function maybePromptRating(userId: string) {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;
    // Small delay so profile page loads first
    setTimeout(async () => {
      await StoreReview.requestReview();
      // Mark as prompted so we never ask again
      await supabase.from('profiles').update({ has_been_prompted_rating: true }).eq('id', userId);
    }, 2000);
  } catch {}
}

export default function ProfileScreen() {
  const { profile, signOut, fetchProfile } = useAuthContext();
  const { theme, isDark, toggleTheme } = useTheme();
  const [submissions, setSubmissions] = useState<Feature[]>([]);
  const [ownedBadges, setOwnedBadges] = useState<(Badge & { owned: boolean })[]>([]);
  const [ownedFrames, setOwnedFrames] = useState<(AvatarFrame & { owned: boolean })[]>([]);

  useEffect(() => {
    if (!profile) return;
    // Register push notifications
    registerForPushNotifications(profile.id);
    scheduleDailyRewardReminder();
    // Fetch user submissions
    supabase.from('features_with_details').select('*')
      .eq('user_id', profile.id).order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setSubmissions(data || []));

    // Fetch owned badges
    supabase.from('user_badges').select('*, badge:badge_id(*)').eq('user_id', profile.id)
      .then(({ data }) => setOwnedBadges((data || []).map((d: any) => ({ ...d.badge, owned: true }))));

    // Fetch owned frames
    supabase.from('user_avatar_frames').select('*, frame:frame_id(*)').eq('user_id', profile.id)
      .then(({ data }) => setOwnedFrames((data || []).map((d: any) => ({ ...d.frame, owned: true }))));

    // Rating prompt — only if not already prompted, has 3+ day streak or 3+ submissions
    if (!profile.has_been_prompted_rating && profile.login_streak >= 3) {
      maybePromptRating(profile.id);
    }
  }, [profile?.id]);

  const [rewardCountdown, setRewardCountdown] = useState<string | null>(null);

  const canClaimReward = useCallback(() => {
    if (!profile?.last_daily_reward_at) return true;
    const lastClaim = new Date(profile.last_daily_reward_at).getTime();
    const nextClaim = lastClaim + 24 * 60 * 60 * 1000;
    return Date.now() >= nextClaim;
  }, [profile?.last_daily_reward_at]);

  useEffect(() => {
    if (!profile?.last_daily_reward_at || canClaimReward()) {
      setRewardCountdown(null);
      return;
    }
    function updateCountdown() {
      const lastClaim = new Date(profile!.last_daily_reward_at!).getTime();
      const nextClaim = lastClaim + 24 * 60 * 60 * 1000;
      const remaining = nextClaim - Date.now();
      if (remaining <= 0) {
        setRewardCountdown(null);
        return;
      }
      const hrs = Math.floor(remaining / (1000 * 60 * 60));
      const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((remaining % (1000 * 60)) / 1000);
      setRewardCountdown(`${hrs}h ${mins}m ${secs}s`);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [profile?.last_daily_reward_at, canClaimReward]);

  function claimDailyReward() {
    if (!canClaimReward()) {
      Alert.alert('Already Claimed', `Come back in ${rewardCountdown} for your next reward!`);
      return;
    }
    router.push('/fortune-wheel');
  }

  async function setActiveBadge() {
    if (!profile || ownedBadges.length === 0) {
      Alert.alert('No Badges', 'Visit the Badge Shop to get some badges!');
      return;
    }
    const buttons = ownedBadges.map(b => ({
      text: `${b.emoji} ${b.name}`,
      onPress: async () => {
        await supabase.from('profiles').update({ active_badge_id: b.id }).eq('id', profile.id);
        fetchProfile();
      },
    }));
    buttons.push({ text: 'Remove Badge', onPress: async () => {
      await supabase.from('profiles').update({ active_badge_id: null }).eq('id', profile.id);
      fetchProfile();
    }});
    Alert.alert('Set Active Badge', 'Choose a badge to display', [...buttons, { text: 'Cancel', onPress: () => {} }]);
  }

  async function setActiveFrame() {
    if (!profile || ownedFrames.length === 0) {
      Alert.alert('No Frames', 'Visit the Shop to get avatar frames!');
      return;
    }
    const buttons = ownedFrames.map(f => ({
      text: f.name,
      onPress: async () => {
        await supabase.from('profiles').update({ active_frame_id: f.id }).eq('id', profile.id);
        fetchProfile();
      },
    }));
    Alert.alert('Set Active Frame', 'Choose a frame', [...buttons, { text: 'Cancel', onPress: () => {} }]);
  }

  async function handleShare() {
    const code = profile?.referral_code || '';
    const message = `Join me on Prodvote! Use my referral code ${code} to get started. We both earn 500 coins! 🚀\n\nhttps://prodvote.com/invite?ref=${code}`;
    try {
      await Share.share({
        message,
        title: 'Invite to Prodvote',
      });
    } catch {}
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  if (!profile) return null;

  const s = styles(theme);
  const tColor = tierColor(profile.tier, theme);

  return (
    <View style={s.container}>
      <Watermark />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>

      {/* Avatar Section */}
      <View style={s.avatarSection}>
        <UserAvatar
          username={profile.username}
          avatarUrl={profile.avatar_url}
          frameColor={profile.active_frame?.color || tColor}
          frameAnimation={profile.active_frame?.animation_type || null}
          badgeEmoji={(profile.active_badge as any)?.emoji || null}
          size={86}
        />
        <Text style={s.username}>@{profile.username}</Text>
        <TouchableOpacity onPress={() => router.push('/apps/edit-profile' as any)}>
          <Text style={s.editLink}>Edit Profile</Text>
        </TouchableOpacity>
        <View style={[s.tierPill, { backgroundColor: tColor }]}>
          <Text style={s.tierPillText}>{tierEmoji(profile.tier)} {profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)}</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={s.statsCard}>
        <View style={s.stat}>
          <Text style={[s.statValue, { color: theme.accent }]}>{profile.votes_remaining}</Text>
          <Text style={s.statLabel}>Votes</Text>
        </View>
        <View style={s.stat}>
          <Text style={[s.statValue, { color: theme.coinText }]}>{profile.coins ?? 0}</Text>
          <Text style={s.statLabel}>Coins</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statValue}>{profile.boosts_remaining ?? 0}</Text>
          <Text style={s.statLabel}>Boosts</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statValue}>{submissions.length}</Text>
          <Text style={s.statLabel}>Submitted</Text>
        </View>
      </View>

      {/* Daily Reward */}
      <TouchableOpacity style={s.dailyReward} onPress={claimDailyReward}>
        <Text style={{ fontSize: 28 }}>{rewardCountdown ? '⏳' : '🎁'}</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          {rewardCountdown ? (
            <>
              <Text style={[s.dailyTitle, { color: theme.textMuted }]}>Come back in</Text>
              <Text style={[s.dailyStreak, { color: theme.accent, fontWeight: '800', fontSize: 15 }]}>{rewardCountdown}</Text>
            </>
          ) : (
            <>
              <Text style={s.dailyTitle}>Claim Daily Reward!</Text>
              <Text style={s.dailyStreak}>🔥 {profile.login_streak ?? 0} day streak</Text>
            </>
          )}
        </View>
        <View style={[s.dailyDot, { backgroundColor: rewardCountdown ? theme.textMuted : theme.success }]} />
      </TouchableOpacity>

      {/* Your Plan */}
      <View style={[s.planCard, { borderColor: tColor + '66' }]}>
        <View style={s.planHeader}>
          <Text style={[s.planLabel, { color: theme.textMuted }]}>YOUR PLAN</Text>
          {profile.tier !== 'free' && (
            <View style={[s.activeBadge, { backgroundColor: theme.successBg }]}>
              <Text style={{ color: theme.success, fontSize: 12, fontWeight: '700' }}>Active</Text>
            </View>
          )}
        </View>
        <View style={s.planRow}>
          <Text style={{ fontSize: 20 }}>{tierEmoji(profile.tier)}</Text>
          <Text style={[s.planName, { color: tColor }]}>
            {profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1)}
          </Text>
        </View>
        {profile.tier !== 'free' && (
          <Text style={s.planDetails}>
            {profile.tier === 'legendary' ? '∞' : profile.tier === 'ultra' ? '∞' : '10'} votes · {
              profile.tier === 'legendary' ? '2,500' : profile.tier === 'ultra' ? '1,000' : '300'
            } coins/mo · {profile.tier === 'legendary' ? 'GOAT' : profile.tier === 'ultra' ? '3x weight' : 'Pro badge'}
          </Text>
        )}
        <TouchableOpacity
          style={[s.managePlanBtn, { borderColor: tColor }]}
          onPress={() => router.push('/paywall')}
        >
          <Text style={[s.managePlanText, { color: tColor }]}>
            {profile.tier === 'free' ? 'Upgrade Plan' : 'Manage Plan'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Admin Dashboard */}
      {profile.is_admin && (
        <TouchableOpacity
          style={s.adminBtn}
          onPress={() => router.push('/(admin)/dashboard' as any)}
        >
          <Text style={{ fontSize: 18 }}>🛡️</Text>
          <Text style={s.adminText}>Admin Dashboard</Text>
        </TouchableOpacity>
      )}

      {/* Quick Links */}
      <View style={s.quickLinks}>
        <TouchableOpacity style={s.quickLink} onPress={() => router.push('/(tabs)/shop' as any)}>
          <Text style={{ fontSize: 24 }}>🏪</Text>
          <Text style={s.quickLinkText}>Badge Shop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickLink} onPress={() => router.push('/paywall')}>
          <Text style={{ fontSize: 24 }}>⚡</Text>
          <Text style={s.quickLinkText}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickLink} onPress={() => router.push('/(tabs)/submit' as any)}>
          <Text style={{ fontSize: 24 }}>📝</Text>
          <Text style={s.quickLinkText}>Submit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.quickLink} onPress={() => router.push('/leaderboard' as any)}>
          <Text style={{ fontSize: 24 }}>🏆</Text>
          <Text style={s.quickLinkText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* Invite Friends */}
      <TouchableOpacity style={s.inviteCard} onPress={handleShare}>
        <View style={s.inviteLeft}>
          <Text style={{ fontSize: 28 }}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.inviteTitle}>Invite Friends</Text>
            <Text style={s.inviteDesc}>You both get 500 coins when they join!</Text>
          </View>
        </View>
        <View style={s.inviteCodeBox}>
          <Text style={s.inviteCodeLabel}>YOUR CODE</Text>
          <Text style={s.inviteCode}>{profile.referral_code || '...'}</Text>
        </View>
        <View style={s.inviteShareBtn}>
          <Text style={s.inviteShareText}>Share Invite Link</Text>
        </View>
      </TouchableOpacity>

      {/* Your Badges */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>YOUR BADGES</Text>
        <TouchableOpacity onPress={setActiveBadge}>
          <Text style={s.sectionAction}>Set Active Badge</Text>
        </TouchableOpacity>
      </View>
      {ownedBadges.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {ownedBadges.map(b => (
            <View key={b.id} style={s.ownedBadge}>
              <Text style={{ fontSize: 28 }}>{b.emoji}</Text>
              <Text style={s.ownedBadgeName}>{b.name}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={s.emptyText}>No badges yet. Visit the shop!</Text>
      )}

      {/* Your Frames */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>AVATAR FRAMES</Text>
        <TouchableOpacity onPress={setActiveFrame}>
          <Text style={s.sectionAction}>Set Active Frame</Text>
        </TouchableOpacity>
      </View>
      {ownedFrames.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {ownedFrames.map(f => (
            <View key={f.id} style={s.ownedFrame}>
              <View style={s.activeTagSlot}>
                {profile.active_frame_id === f.id && (
                  <View style={s.activeTag}><Text style={s.activeTagText}>ACTIVE</Text></View>
                )}
              </View>
              <UserAvatar
                username={profile.username}
                avatarUrl={profile.avatar_url}
                frameColor={f.color}
                frameAnimation={f.animation_type}
                size={40}
              />
              <Text style={s.ownedBadgeName}>{f.name}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={s.emptyText}>No frames yet. Visit the shop!</Text>
      )}

      {/* Your Submissions */}
      {submissions.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginBottom: 10 }]}>YOUR SUBMISSIONS</Text>
          {submissions.map(f => (
            <TouchableOpacity
              key={f.id}
              style={s.submissionCard}
              onPress={() => router.push(`/feature/${f.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.submissionTitle}>{f.title}</Text>
                <Text style={s.submissionStatus}>{f.status.replace('_', ' ').toUpperCase()}</Text>
              </View>
              <Text style={s.submissionVotes}>▲ {f.vote_count}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Theme Toggle */}
      <TouchableOpacity style={s.themeToggle} onPress={toggleTheme}>
        <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
        <Text style={s.themeText}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
      </TouchableOpacity>

      {/* Sign Out */}
      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 20, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginTop: 10, marginBottom: 24 },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatar: {
    width: 86, height: 86, borderRadius: 43, backgroundColor: t.card,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: t.text },
  username: { fontSize: 22, fontWeight: '700', color: t.text },
  editLink: { fontSize: 14, color: t.accent, marginTop: 4, fontWeight: '600' },
  tierPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
  tierPillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsCard: {
    flexDirection: 'row', backgroundColor: t.card, borderRadius: 16,
    padding: 18, marginBottom: 16, borderWidth: 1, borderColor: t.cardBorder,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: t.text },
  statLabel: { fontSize: 12, color: t.textMuted, marginTop: 4 },
  dailyReward: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.card,
    borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: t.cardBorder,
  },
  dailyTitle: { fontSize: 16, fontWeight: '700', color: t.text },
  dailyStreak: { fontSize: 13, color: t.danger, fontWeight: '600', marginTop: 2 },
  dailyDot: { width: 12, height: 12, borderRadius: 6 },
  planCard: {
    backgroundColor: t.card, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1,
  },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  planName: { fontSize: 22, fontWeight: '800' },
  planDetails: { fontSize: 13, color: t.textMuted, marginBottom: 14 },
  managePlanBtn: {
    borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  managePlanText: { fontSize: 16, fontWeight: '700' },
  adminBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: t.dangerBg, borderRadius: 14, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: t.danger + '44',
  },
  adminText: { color: t.danger, fontSize: 16, fontWeight: '700' },
  quickLinks: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickLink: {
    flex: 1, backgroundColor: t.card, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder,
  },
  quickLinkText: { fontSize: 12, fontWeight: '600', color: t.textMuted, marginTop: 8 },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: t.textMuted, letterSpacing: 1 },
  sectionAction: { fontSize: 13, fontWeight: '600', color: t.accent },
  ownedBadge: {
    backgroundColor: t.card, borderRadius: 12, padding: 12, marginRight: 10,
    alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder, minWidth: 80,
  },
  ownedBadgeName: { fontSize: 12, fontWeight: '600', color: t.text, marginTop: 6 },
  ownedFrame: {
    backgroundColor: t.card, borderRadius: 12, padding: 12, marginRight: 10,
    alignItems: 'center', borderWidth: 1, borderColor: t.success + '44', minWidth: 80,
  },
  activeTagSlot: { height: 22, justifyContent: 'center', alignItems: 'center' },
  activeTag: {
    backgroundColor: t.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  activeTagText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  frameCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface },
  emptyText: { fontSize: 13, color: t.textMuted, marginBottom: 20 },
  submissionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.card,
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: t.cardBorder,
  },
  submissionTitle: { fontSize: 15, fontWeight: '600', color: t.text },
  submissionStatus: { fontSize: 12, color: t.textMuted, marginTop: 2 },
  submissionVotes: { fontSize: 14, fontWeight: '600', color: t.accent },
  themeToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: t.card, borderRadius: 14, padding: 16,
    marginTop: 20, borderWidth: 1, borderColor: t.cardBorder,
  },
  themeText: { fontSize: 16, fontWeight: '600', color: t.text },
  signOutBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    marginTop: 10, borderWidth: 1, borderColor: t.danger + '44',
  },
  signOutText: { color: t.danger, fontSize: 16, fontWeight: '700' },
  inviteCard: {
    backgroundColor: t.card, borderRadius: 16, padding: 18,
    marginBottom: 20, borderWidth: 1, borderColor: t.accent + '44',
  },
  inviteLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  inviteTitle: { fontSize: 17, fontWeight: '700', color: t.text },
  inviteDesc: { fontSize: 13, color: t.textMuted, marginTop: 2 },
  inviteCodeBox: {
    backgroundColor: t.surface, borderRadius: 10, padding: 12,
    alignItems: 'center', marginBottom: 12,
  },
  inviteCodeLabel: { fontSize: 10, fontWeight: '800', color: t.textMuted, letterSpacing: 1 },
  inviteCode: { fontSize: 22, fontWeight: '800', color: t.accent, letterSpacing: 2, marginTop: 2 },
  inviteShareBtn: {
    backgroundColor: t.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center',
  },
  inviteShareText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

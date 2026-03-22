import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Feature } from '../../lib/types';
import { useBadges } from '../../hooks/useFeatures';
import { useAvatarFrames } from '../../hooks/useAvatarFrames';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';
import { useDailyReward } from '../../hooks/useDailyReward';
import DailyRewardModal from '../../components/DailyRewardModal';
import AnimatedAvatar from '../../components/AnimatedAvatar';
import Watermark from '../../components/Watermark';

const TIER_INFO: Record<string, { label: string; color: string; emoji: string; perks: string }> = {
  free: { label: 'Free', color: '#94a3b8', emoji: '🆓', perks: '3 votes/mo · 0 coins/mo' },
  pro: { label: 'Pro', color: '#7c5cfc', emoji: '⚡', perks: '10 votes/mo · 600 coins/mo' },
  ultra: { label: 'Ultra', color: '#fbbf24', emoji: '👑', perks: '∞ votes · 1,000 coins/mo' },
  legendary: { label: 'Legendary', color: '#ff4d6a', emoji: '🐐', perks: '∞ votes · 2,500 coins/mo · GOAT' },
};


export default function ProfileScreen() {
  const { profile, session, signOut, fetchProfile } = useAuthContext();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const isAdmin = !!profile?.is_admin;
  const [myFeatures, setMyFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const { canClaim, claiming, result, streak, claimReward, setResult } = useDailyReward(session?.user.id);
  const { badges, ownedIds } = useBadges(session?.user.id);
  const ownedBadges = badges.filter(b => ownedIds.has(b.id));
  const { frames, ownedIds: ownedFrameIds, setActiveFrame } = useAvatarFrames(session?.user.id);
  const ownedFrames = frames.filter(f => ownedFrameIds.has(f.id));
  const activeFrame = frames.find(f => f.id === profile?.active_frame_id);

  useEffect(() => {
    if (!session?.user.id) return;
    (async () => {
      const { data } = await supabase
        .from('features')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (data) setMyFeatures(data);
      setLoading(false);
    })();
  }, [session?.user.id]);

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const tier = TIER_INFO[profile.tier] || TIER_INFO.free;
  const isFree = profile.tier === 'free';

  return (
    <View style={styles.container}>
      <Watermark />
      <FlatList
        data={myFeatures}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            {/* Avatar & name */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setShowFramePicker(true)} activeOpacity={0.8}>
                <AnimatedAvatar
                  letter={profile.username.charAt(0).toUpperCase()}
                  size={76}
                  tierColor={tier.color}
                  frameType={activeFrame?.animation_type}
                  frameColor={activeFrame?.color}
                  imageUri={profile.avatar_url}
                />
              </TouchableOpacity>
              <Text style={styles.username}>@{profile.username}</Text>
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => router.push('/apps/edit-profile')}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
              <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
                <Text style={styles.tierText}>{tier.emoji} {tier.label}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.votes_remaining}</Text>
                <Text style={styles.statLabel}>Votes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: '#fbbf24' }]}>{profile.coins ?? 0}</Text>
                <Text style={styles.statLabel}>Coins</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.boosts_remaining}</Text>
                <Text style={styles.statLabel}>Boosts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{myFeatures.length}</Text>
                <Text style={styles.statLabel}>Submitted</Text>
              </View>
            </View>

            {/* Daily reward card */}
            <TouchableOpacity
              style={styles.rewardCard}
              onPress={() => {
                setResult(null);
                setShowRewardModal(true);
              }}
            >
              <View style={styles.rewardLeft}>
                <Text style={styles.rewardEmoji}>{canClaim ? '🎁' : '✅'}</Text>
                <View>
                  <Text style={styles.rewardTitle}>
                    {canClaim ? 'Claim Daily Reward!' : 'Reward Claimed'}
                  </Text>
                  <Text style={styles.rewardSub}>
                    {streak > 0 ? `🔥 ${streak} day streak` : 'Start your streak!'}
                  </Text>
                </View>
              </View>
              {canClaim && (
                <View style={styles.rewardDot} />
              )}
            </TouchableOpacity>

            {/* Subscription card */}
            <View style={[styles.subCard, { borderColor: tier.color + '40' }]}>
              <View style={styles.subHeader}>
                <View>
                  <Text style={styles.subLabel}>YOUR PLAN</Text>
                  <Text style={[styles.subPlan, { color: tier.color }]}>
                    {tier.emoji} {tier.label}
                  </Text>
                  <Text style={styles.subPerks}>{tier.perks}</Text>
                </View>
                {!isFree && (
                  <View style={[styles.activeBadge, { backgroundColor: tier.color + '20' }]}>
                    <Text style={[styles.activeText, { color: tier.color }]}>Active</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.planBtn, { backgroundColor: isFree ? tier.color : 'transparent', borderWidth: isFree ? 0 : 1.5, borderColor: tier.color }]}
                onPress={() => router.push('/apps/plans')}
              >
                <Text style={[styles.planBtnText, { color: isFree ? '#fff' : tier.color }]}>
                  {isFree ? 'Upgrade Now' : 'Manage Plan'}
                </Text>
              </TouchableOpacity>

              {isFree && (
                <View style={styles.promoRow}>
                  <Text style={styles.promoText}>
                    🎉 Pro starts at just <Text style={{ fontWeight: '800', color: '#7c5cfc' }}>£1.99/mo</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Admin button */}
            {isAdmin && (
              <TouchableOpacity
                style={styles.adminBtn}
                onPress={() => router.push('/(admin)/dashboard')}
              >
                <Text style={styles.adminBtnEmoji}>🛡️</Text>
                <Text style={styles.adminBtnText}>Admin Dashboard</Text>
              </TouchableOpacity>
            )}

            {/* Quick actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => router.push('/(tabs)/shop')}
              >
                <Text style={styles.quickEmoji}>🏪</Text>
                <Text style={styles.quickLabel}>Badge Shop</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => router.push('/apps/plans')}
              >
                <Text style={styles.quickEmoji}>⚡</Text>
                <Text style={styles.quickLabel}>Plans</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => router.push('/(tabs)/submit')}
              >
                <Text style={styles.quickEmoji}>✍️</Text>
                <Text style={styles.quickLabel}>Submit</Text>
              </TouchableOpacity>
            </View>

            {/* Badge collection */}
            {ownedBadges.length > 0 && (
              <View style={styles.badgeSection}>
                <View style={styles.badgeSectionHeader}>
                  <Text style={styles.sectionTitle}>YOUR BADGES</Text>
                  <TouchableOpacity onPress={() => setShowBadgePicker(true)}>
                    <Text style={styles.setBadgeLink}>Set Active Badge</Text>
                  </TouchableOpacity>
                </View>
                {profile.active_badge_id && (() => {
                  const ab = badges.find(b => b.id === profile.active_badge_id);
                  return ab ? (
                    <View style={[styles.activeBadgeCard, { borderColor: ab.color + '60' }]}>
                      <Text style={{ fontSize: 20 }}>{ab.emoji}</Text>
                      <Text style={[styles.activeBadgeLabel, { color: ab.color }]}>{ab.name}</Text>
                      <Text style={styles.activeBadgeTag}>ACTIVE</Text>
                    </View>
                  ) : null;
                })()}
                <View style={styles.badgeGrid}>
                  {ownedBadges.map(b => (
                    <View key={b.id} style={[styles.badgeCard, { borderColor: b.color + '40' }]}>
                      <Text style={styles.badgeCardEmoji}>{b.emoji}</Text>
                      <Text style={styles.badgeCardName} numberOfLines={1}>{b.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Avatar frames section */}
            <View style={styles.badgeSection}>
              <View style={styles.badgeSectionHeader}>
                <Text style={styles.sectionTitle}>AVATAR FRAMES</Text>
                {ownedFrames.length > 0 && (
                  <TouchableOpacity onPress={() => setShowFramePicker(true)}>
                    <Text style={styles.setBadgeLink}>Set Active Frame</Text>
                  </TouchableOpacity>
                )}
              </View>
              {ownedFrames.length > 0 ? (
                <View style={styles.badgeGrid}>
                  {ownedFrames.map(f => {
                    const isActive = activeFrame?.id === f.id;
                    return (
                      <View key={f.id} style={[styles.frameGridCard, { borderColor: isActive ? '#34d399' : (f.color || '#7c5cfc') + '40' }]}>
                        {isActive && (
                          <View style={styles.activeRibbon}>
                            <Text style={styles.activeRibbonText}>ACTIVE</Text>
                          </View>
                        )}
                        <AnimatedAvatar
                          letter={profile.username.charAt(0).toUpperCase()}
                          size={28}
                          frameType={f.animation_type}
                          frameColor={f.color}
                        />
                        <Text style={styles.badgeCardName} numberOfLines={1}>{f.name}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.emptyFrameCard}
                  onPress={() => router.push('/(tabs)/shop')}
                >
                  <Text style={styles.emptyFrameText}>✨ Get animated avatar frames from the shop!</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.sectionTitle}>Your Submissions</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.featureItem}>
            <View style={styles.featureRow}>
              <Text style={styles.featureTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.featureScore}>▲ {item.score}</Text>
            </View>
            <Text style={styles.featureStatus}>{item.status.replace('_', ' ')}</Text>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <Text style={styles.emptyText}>You haven't submitted any features yet</Text>
          )
        }
        ListFooterComponent={
          <>
            <TouchableOpacity style={styles.themeBtn} onPress={toggleTheme}>
              <Text style={styles.themeBtnEmoji}>{isDark ? '☀️' : '🌙'}</Text>
              <Text style={styles.themeBtnText}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/apps/settings')}
            >
              <Text style={styles.settingsText}>⚙️  Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      <DailyRewardModal
        visible={showRewardModal}
        streak={streak}
        canClaim={canClaim}
        claiming={claiming}
        result={result}
        onSpin={async (amount: number) => {
          const res = await claimReward(amount);
          if (res?.success && session?.user.id) {
            await fetchProfile(session.user.id);
          }
        }}
        onClose={() => setShowRewardModal(false)}
      />

      {/* Active frame picker modal */}
      <Modal visible={showFramePicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowFramePicker(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Set Active Frame</Text>
            <Text style={styles.modalSub}>This animation will appear around your avatar</Text>

            <TouchableOpacity
              style={[styles.badgeOption, !profile.active_frame_id && styles.badgeOptionActive]}
              onPress={async () => {
                await setActiveFrame(null);
                if (session?.user.id) fetchProfile(session.user.id);
                setShowFramePicker(false);
              }}
            >
              <Text style={styles.badgeOptionEmoji}>✕</Text>
              <Text style={styles.badgeOptionName}>No Frame</Text>
            </TouchableOpacity>

            {ownedFrames.map(f => (
              <TouchableOpacity
                key={f.id}
                style={[styles.badgeOption, profile.active_frame_id === f.id && styles.badgeOptionActive]}
                onPress={async () => {
                  await setActiveFrame(f.id);
                  if (session?.user.id) fetchProfile(session.user.id);
                  setShowFramePicker(false);
                }}
              >
                <View style={styles.frameOptionPreview}>
                  <AnimatedAvatar
                    letter={profile.username.charAt(0).toUpperCase()}
                    size={32}
                    frameType={f.animation_type}
                    frameColor={f.color}
                  />
                </View>
                <View>
                  <Text style={styles.badgeOptionName}>{f.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{f.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Active badge picker modal */}
      <Modal visible={showBadgePicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowBadgePicker(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Set Active Badge</Text>
            <Text style={styles.modalSub}>This badge will show next to your name everywhere</Text>

            <TouchableOpacity
              style={[styles.badgeOption, !profile.active_badge_id && styles.badgeOptionActive]}
              onPress={async () => {
                await supabase.from('profiles').update({ active_badge_id: null }).eq('id', session?.user.id);
                if (session?.user.id) fetchProfile(session.user.id);
                setShowBadgePicker(false);
              }}
            >
              <Text style={styles.badgeOptionEmoji}>✕</Text>
              <Text style={styles.badgeOptionName}>No Badge</Text>
            </TouchableOpacity>

            {ownedBadges.map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.badgeOption, profile.active_badge_id === b.id && styles.badgeOptionActive]}
                onPress={async () => {
                  await supabase.from('profiles').update({ active_badge_id: b.id }).eq('id', session?.user.id);
                  if (session?.user.id) fetchProfile(session.user.id);
                  setShowBadgePicker(false);
                }}
              >
                <Text style={styles.badgeOptionEmoji}>{b.emoji}</Text>
                <View>
                  <Text style={styles.badgeOptionName}>{b.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{b.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    // Header
    header: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
    avatar: {
      width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.primary,
      justifyContent: 'center', alignItems: 'center', marginBottom: 12,
      borderWidth: 3,
    },
    avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
    username: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 6 },
    editProfileBtn: { marginBottom: 8 },
    editProfileText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
    tierBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
    tierText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Stats
    statsRow: {
      flexDirection: 'row', backgroundColor: colors.surface,
      marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 16,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
    statDivider: { width: 1, backgroundColor: colors.surfaceBorder },

    // Daily reward
    rewardCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.surface, marginHorizontal: 16, borderRadius: 16,
      padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#fbbf24' + '40',
    },
    rewardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rewardEmoji: { fontSize: 28 },
    rewardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    rewardSub: { fontSize: 12, color: '#f59e0b', fontWeight: '600', marginTop: 2 },
    rewardDot: {
      width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e',
    },

    // Subscription card
    subCard: {
      backgroundColor: colors.surface, marginHorizontal: 16, borderRadius: 18,
      padding: 20, borderWidth: 1.5, marginBottom: 16,
    },
    subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    subLabel: { fontSize: 10, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 4 },
    subPlan: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
    subPerks: { fontSize: 12, color: colors.textSecondary },
    activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    activeText: { fontSize: 12, fontWeight: '700' },
    planBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
    planBtnText: { fontSize: 15, fontWeight: '700' },
    promoRow: { marginTop: 12, alignItems: 'center' },
    promoText: { fontSize: 13, color: colors.textSecondary },

    // Admin button
    adminBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 14,
      backgroundColor: '#ff4d6a' + '15', borderWidth: 1.5, borderColor: '#ff4d6a' + '40',
    },
    adminBtnEmoji: { fontSize: 18 },
    adminBtnText: { fontSize: 15, fontWeight: '700', color: '#ff4d6a' },

    // Quick actions
    quickActions: {
      flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 20,
    },
    quickBtn: {
      flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14,
      alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    quickEmoji: { fontSize: 22, marginBottom: 6 },
    quickLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

    // Badge section
    badgeSection: { marginHorizontal: 16, marginBottom: 20 },
    badgeSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    setBadgeLink: { fontSize: 13, fontWeight: '700', color: Colors.primary },
    activeBadgeCard: {
      flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
      borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1.5,
    },
    activeBadgeLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
    activeBadgeTag: { fontSize: 9, fontWeight: '900', color: '#22c55e', letterSpacing: 1 },
    badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    badgeCard: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 12,
      alignItems: 'center', width: 80, borderWidth: 1.5,
    },
    badgeCardEmoji: { fontSize: 24, marginBottom: 4 },
    badgeCardName: { fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' },
    frameGridCard: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 12,
      alignItems: 'center', width: 80, borderWidth: 1.5, gap: 6,
      overflow: 'hidden',
    },
    activeRibbon: {
      position: 'absolute', top: 0, left: 0, right: 0,
      backgroundColor: '#34d399', paddingVertical: 2, alignItems: 'center',
    },
    activeRibbonText: {
      fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 0.8,
    },
    frameOptionPreview: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    emptyFrameCard: {
      backgroundColor: colors.surface, borderRadius: 12, padding: 16, alignItems: 'center',
      borderWidth: 1, borderColor: colors.surfaceBorder, borderStyle: 'dashed',
    },
    emptyFrameText: { fontSize: 13, color: colors.textSecondary },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: colors.surfaceBorder, borderBottomWidth: 0,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
    modalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
    badgeOption: {
      flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
    },
    badgeOptionActive: { backgroundColor: Colors.primary + '12', borderRadius: 10, paddingHorizontal: 12, marginHorizontal: -12 },
    badgeOptionEmoji: { fontSize: 24 },
    badgeOptionName: { fontSize: 16, fontWeight: '600', color: colors.text },

    // Submissions
    sectionTitle: {
      fontSize: 14, fontWeight: '700', color: colors.textSecondary,
      paddingHorizontal: 16, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    featureItem: {
      backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 8,
      borderRadius: 12, padding: 14,
    },
    featureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    featureTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, marginRight: 12 },
    featureScore: { fontSize: 14, fontWeight: '700', color: Colors.primary },
    featureStatus: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textTransform: 'uppercase' },
    emptyText: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, marginTop: 20 },

    // Theme toggle
    themeBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
      marginHorizontal: 16, marginTop: 20, padding: 14, borderRadius: 12,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    themeBtnEmoji: { fontSize: 18 },
    themeBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },

    // Settings
    settingsButton: {
      marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 12,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: 'center',
    },
    settingsText: { color: colors.text, fontWeight: '600', fontSize: 15 },

    // Sign out
    signOutButton: {
      marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 12,
      borderWidth: 1, borderColor: colors.error, alignItems: 'center',
    },
    signOutText: { color: colors.error, fontWeight: '600', fontSize: 15 },
  });
}

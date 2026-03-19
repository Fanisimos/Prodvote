import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';
import { useFeatures, useVote, useBadges, giveFeatureAward } from '../../hooks/useFeatures';
import { supabase } from '../../lib/supabase';
import { Feature, FeatureStatus } from '../../lib/types';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

const ADMIN_USERNAMES = ['Fanisimos', 'Fanisimos_ADMIN'];

const TIER_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
  pro: { emoji: '⚡', label: 'Pro', color: '#7c5cfc' },
  ultra: { emoji: '👑', label: 'Ultra', color: '#fbbf24' },
  legendary: { emoji: '🐐', label: 'GOAT', color: '#ff4d6a' },
};

const STATUS_COLORS: Record<FeatureStatus, string> = {
  open: '#94a3b8',
  under_review: '#fbbf24',
  planned: '#60a5fa',
  in_progress: '#a78bfa',
  shipped: '#34d399',
  declined: '#ef4444',
};

const SORT_OPTIONS = [
  { key: 'score' as const, label: 'Top' },
  { key: 'newest' as const, label: 'New' },
  { key: 'comments' as const, label: 'Hot' },
];

function FeatureCard({
  item,
  onVote,
  onPress,
  onHeart,
  onAward,
  onAuthorPress,
  isAdmin,
  colors,
}: {
  item: Feature;
  onVote: () => void;
  onPress: () => void;
  onHeart?: () => void;
  onAward?: () => void;
  onAuthorPress?: () => void;
  isAdmin?: boolean;
  colors: any;
}) {
  const styles = getStyles(colors);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <TouchableOpacity style={styles.voteCol} onPress={onVote}>
        <Text style={[styles.voteArrow, item.user_has_voted && styles.voteActive]}>▲</Text>
        <Text style={[styles.voteCount, item.user_has_voted && styles.voteActive]}>
          {item.score}
        </Text>
      </TouchableOpacity>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          {item.category_name && (
            <View style={[styles.categoryBadge, { backgroundColor: item.category_color || Colors.primary }]}>
              <Text style={styles.categoryText}>{item.category_name}</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

        {/* Awards row */}
        {item.awards && item.awards.length > 0 && (
          <View style={styles.awardsRow}>
            {item.awards.map((award, i) => (
              <View key={i} style={[
                styles.awardBubble,
                {
                  backgroundColor: (award.color || '#7c5cfc') + '18',
                  // @ts-ignore
                  boxShadow: `0 0 6px ${award.color || '#7c5cfc'}40`,
                },
              ]}>
                <Text style={styles.awardEmoji}>{award.emoji}</Text>
                {award.count > 1 && <Text style={[styles.awardCount, { color: award.color }]}>{award.count}</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity onPress={onAuthorPress}>
            <Text style={[
              styles.meta,
              { fontWeight: '700' },
              item.author_tier === 'legendary' && styles.legendaryName,
            ]}>@{item.author_username}</Text>
          </TouchableOpacity>
          {item.author_tier && TIER_BADGES[item.author_tier] && (
            <View style={[
              styles.tierGlow,
              {
                backgroundColor: TIER_BADGES[item.author_tier].color + '18',
                // @ts-ignore
                boxShadow: `0 0 8px ${TIER_BADGES[item.author_tier].color}60, 0 0 16px ${TIER_BADGES[item.author_tier].color}30`,
              },
            ]}>
              <Text style={[styles.tierGlowText, { color: TIER_BADGES[item.author_tier].color }]}>
                {TIER_BADGES[item.author_tier].emoji} {TIER_BADGES[item.author_tier].label}
              </Text>
            </View>
          )}
          {(item as any).is_priority && <Text style={styles.priorityBadge}>⚡ Priority</Text>}
          {item.is_boosted && <Text style={styles.boostBadge}>🚀 Boosted</Text>}
          {item.dev_hearted && <Text style={styles.heartBadge}>❤️ Loved by dev</Text>}
          <Text style={styles.meta}>💬 {item.comment_count}</Text>
          <TouchableOpacity onPress={onAward} style={styles.awardBtn}>
            <Text style={styles.awardBtnText}>🏅</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity onPress={onHeart} style={styles.heartBtn}>
              <Text style={{ fontSize: 14 }}>{item.dev_hearted ? '💔' : '❤️'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const { session, profile, fetchProfile } = useAuthContext();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const isAdmin = !!profile?.username && ADMIN_USERNAMES.includes(profile.username);
  const [sortBy, setSortBy] = useState<'score' | 'newest' | 'comments'>('score');
  const { features, loading, refreshing, loadingMore, hasMore, refresh, loadMore, markUserVotes } = useFeatures(sortBy);
  const { toggleVote } = useVote();
  const { badges } = useBadges(session?.user.id);
  const [showAwardPicker, setShowAwardPicker] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);

  async function handleHeart(feature: Feature) {
    const newVal = !feature.dev_hearted;
    const { error } = await supabase.from('features').update({ dev_hearted: newVal }).eq('id', feature.id);
    if (error) {
      console.error('Heart error:', error);
      alert('Heart failed: ' + error.message);
      return;
    }
    await refresh();
  }

  async function handleGiveAward(featureId: string, badge: any) {
    if (!session?.user.id) return;
    setAwarding(true);
    const { error } = await giveFeatureAward(featureId, badge.id, badge.price, session.user.id);
    if (error) {
      if (Platform.OS === 'web') alert(error);
      else Alert.alert('Error', String(error));
    } else {
      fetchProfile(session.user.id);
      await refresh();
    }
    setAwarding(false);
    setShowAwardPicker(null);
  }

  useEffect(() => {
    if (session?.user.id && features.length > 0) {
      markUserVotes(session.user.id);
    }
  }, [session?.user.id, features.length]);

  async function handleVote(feature: Feature) {
    if (!session?.user.id) return;
    const result = await toggleVote(feature.id, session.user.id, !!feature.user_has_voted);
    if (!result.success && result.error) {
      if (Platform.OS === 'web') alert(result.error);
      else Alert.alert('Vote Limit', result.error);
      return;
    }
    if (session.user.id) fetchProfile(session.user.id);
    await refresh();
    markUserVotes(session.user.id);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.sortBar}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortButton, sortBy === opt.key && styles.sortButtonActive]}
            onPress={() => setSortBy(opt.key)}
          >
            <Text style={[styles.sortText, sortBy === opt.key && styles.sortTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={features}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <FeatureCard
            item={item}
            onVote={() => handleVote(item)}
            onPress={() => router.push(`/feature/${item.id}`)}
            onHeart={() => handleHeart(item)}
            onAward={() => setShowAwardPicker(item.id)}
            onAuthorPress={() => router.push(`/profile/${item.user_id}`)}
            isAdmin={isAdmin}
            colors={colors}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.list}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No feature requests yet</Text>
            <Text style={styles.emptySubtext}>Be the first to submit one!</Text>
          </View>
        }
      />

      {/* Award picker modal */}
      <Modal visible={!!showAwardPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAwardPicker(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Give an Award</Text>
            <Text style={styles.modalSub}>
              Spend coins to award this idea
              {profile?.coins != null && (
                <Text style={{ color: '#fbbf24', fontWeight: '800' }}> · 🪙 {profile.coins}</Text>
              )}
            </Text>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator>
              {badges.filter(b => b.price > 0).map(b => {
                const canAfford = (profile?.coins ?? 0) >= b.price;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.awardOption, !canAfford && { opacity: 0.4 }]}
                    onPress={() => canAfford && showAwardPicker && handleGiveAward(showAwardPicker, b)}
                    disabled={!canAfford || awarding}
                  >
                    <Text style={styles.awardOptionEmoji}>{b.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.awardOptionName}>{b.name}</Text>
                      <Text style={styles.awardOptionDesc}>{b.description}</Text>
                    </View>
                    <View style={[styles.awardPriceBadge, { backgroundColor: (b.color || '#7c5cfc') + '20' }]}>
                      <Text style={[styles.awardPriceText, { color: b.color }]}>🪙 {b.price}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {awarding && (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 16 }} />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    sortBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    sortButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
    },
    sortButtonActive: {
      backgroundColor: Colors.primary,
    },
    sortText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 14,
    },
    sortTextActive: {
      color: '#fff',
    },
    list: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
    },
    voteCol: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 16,
      borderRightWidth: 1,
      borderRightColor: colors.surfaceBorder,
    },
    voteArrow: {
      fontSize: 18,
      color: colors.textSecondary,
    },
    voteCount: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textSecondary,
      marginTop: 2,
    },
    voteActive: {
      color: Colors.primary,
    },
    cardContent: {
      flex: 1,
      padding: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    categoryBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    categoryText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    description: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    meta: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    legendaryName: {
      color: '#fbbf24',
      fontWeight: '900',
    },
    priorityBadge: {
      fontSize: 11,
      color: '#7c5cfc',
      fontWeight: '700',
    },
    boostBadge: {
      fontSize: 12,
      color: Colors.accent,
      fontWeight: '600',
    },
    tierGlow: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    tierGlowText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: 0.5,
    },
    heartBadge: {
      fontSize: 11,
      color: '#ff4d6a',
      fontWeight: '700',
    },
    heartBtn: {
      marginLeft: 'auto',
      padding: 4,
    },
    // Awards on cards
    awardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    awardBubble: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    },
    awardEmoji: { fontSize: 14 },
    awardCount: { fontSize: 11, fontWeight: '800' },
    awardBtn: { padding: 2 },
    awardBtnText: { fontSize: 14 },

    // Award modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: colors.surfaceBorder, borderBottomWidth: 0,
      maxHeight: '70%',
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
    modalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
    awardOption: {
      flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
    },
    awardOptionEmoji: { fontSize: 28 },
    awardOptionName: { fontSize: 16, fontWeight: '600', color: colors.text },
    awardOptionDesc: { fontSize: 12, color: colors.textSecondary },
    awardPriceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    awardPriceText: { fontSize: 12, fontWeight: '800' },

    empty: {
      alignItems: 'center',
      paddingTop: 80,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
}

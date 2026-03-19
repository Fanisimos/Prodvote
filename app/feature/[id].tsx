import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { useFeatureDetail, useComments, useVote, useBadges, giveFeatureAward } from '../../hooks/useFeatures';
import { FeatureStatus } from '../../lib/types';
import Colors from '../../constants/Colors';

// Admin usernames
const ADMIN_USERNAMES = ['Fanisimos', 'Fanisimos_ADMIN'];

const STATUS_COLORS: Record<FeatureStatus, string> = {
  open: '#94a3b8',
  under_review: '#fbbf24',
  planned: '#60a5fa',
  in_progress: '#a78bfa',
  shipped: '#34d399',
  declined: '#ef4444',
};

export default function FeatureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, profile, fetchProfile } = useAuthContext();
  const { colors } = useTheme();
  const { feature, loading: featureLoading, toggleDevHeart: toggleFeatureHeart } = useFeatureDetail(id);
  const { comments, loading: commentsLoading, addComment, toggleDevHeart, deleteComment, giveAward } = useComments(id);
  const { toggleVote } = useVote();
  const { badges, ownedIds } = useBadges(session?.user.id);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<number | null>(null);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [showAwardPicker, setShowAwardPicker] = useState<string | null>(null);
  const [showFeatureAwardPicker, setShowFeatureAwardPicker] = useState(false);
  const [awarding, setAwarding] = useState(false);

  const isAdmin = !!profile?.username && ADMIN_USERNAMES.includes(profile.username);
  const ownedBadges = badges.filter(b => ownedIds.has(b.id));

  async function handleComment() {
    if (!newComment.trim() || !session?.user.id) return;
    setSending(true);
    await addComment(newComment.trim(), session.user.id, selectedBadge ?? undefined);
    setNewComment('');
    setSelectedBadge(null);
    setSending(false);
  }

  async function handleVote() {
    if (!session?.user.id || !feature) return;
    await toggleVote(feature.id, session.user.id, !!feature.user_has_voted);
  }

  function handleDelete(commentId: string) {
    if (Platform.OS === 'web') {
      if (confirm('Delete this comment?')) {
        deleteComment(commentId);
      }
    } else {
      Alert.alert('Delete Comment', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteComment(commentId) },
      ]);
    }
  }

  async function handleGiveFeatureAward(badge: any) {
    if (!session?.user.id || !feature) return;
    setAwarding(true);
    const { error } = await giveFeatureAward(feature.id, badge.id, badge.price, session.user.id);
    if (error) {
      if (Platform.OS === 'web') alert(error);
      else Alert.alert('Error', String(error));
    } else {
      fetchProfile(session.user.id);
    }
    setAwarding(false);
    setShowFeatureAwardPicker(false);
  }

  async function handleGiveAward(commentId: string, badge: any) {
    if (!session?.user.id) return;
    setAwarding(true);
    const { error } = await giveAward(commentId, badge.id, badge.price, session.user.id);
    if (error) {
      if (Platform.OS === 'web') alert(error);
      else Alert.alert('Error', String(error));
    } else {
      fetchProfile(session.user.id);
    }
    setAwarding(false);
    setShowAwardPicker(null);
  }

  const styles = getStyles(colors);

  if (featureLoading || !feature) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const selectedBadgeObj = badges.find(b => b.id === selectedBadge);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: 'Feature',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={styles.featureSection}>
            <View style={styles.headerRow}>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[feature.status] + '22' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[feature.status] }]}>
                  {feature.status.replace('_', ' ')}
                </Text>
              </View>
              {feature.is_boosted && <Text style={styles.boostBadge}>🚀 Boosted</Text>}
            </View>

            <Text style={styles.title}>{feature.title}</Text>
            <Text style={styles.description}>{feature.description}</Text>

            <View style={styles.metaRow}>
              <TouchableOpacity onPress={() => router.push(`/profile/${feature.user_id}`)}>
                <Text style={[styles.author, { fontWeight: '700' }]}>@{feature.author_username}</Text>
              </TouchableOpacity>
              {feature.category_name && (
                <View style={[styles.categoryBadge, { backgroundColor: feature.category_color || Colors.primary }]}>
                  <Text style={styles.categoryText}>{feature.category_name}</Text>
                </View>
              )}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.voteButton, feature.user_has_voted && styles.voteButtonActive]}
                onPress={handleVote}
              >
                <Text style={[styles.voteButtonText, feature.user_has_voted && styles.voteButtonTextActive]}>
                  ▲ {feature.score}
                </Text>
              </TouchableOpacity>
              <Text style={styles.commentCountText}>💬 {feature.comment_count} comments</Text>
              <TouchableOpacity
                style={styles.awardBtn}
                onPress={() => setShowFeatureAwardPicker(true)}
              >
                <Text style={styles.awardBtnText}>🏅 Award</Text>
              </TouchableOpacity>
              {feature.dev_hearted && <Text style={{ fontSize: 16 }}>❤️</Text>}
              {isAdmin && (
                <TouchableOpacity
                  style={styles.adminBtn}
                  onPress={toggleFeatureHeart}
                >
                  <Text style={styles.adminBtnText}>
                    {feature.dev_hearted ? '💔 Unheart' : '❤️ Heart'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {feature.dev_response && (
              <View style={styles.devResponse}>
                <Text style={styles.devLabel}>Developer Response</Text>
                <Text style={styles.devText}>{feature.dev_response}</Text>
              </View>
            )}

            <Text style={styles.commentsTitle}>Comments</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.commentCard, item.is_dev_reply && styles.commentDev]}>
            <View style={styles.commentHeader}>
              <View style={styles.commentUserRow}>
                <TouchableOpacity onPress={() => router.push(`/profile/${item.user_id}`)}>
                  <Text style={styles.commentUser}>
                    @{item.username}
                    {item.is_dev_reply && <Text style={styles.devTag}> DEV</Text>}
                  </Text>
                </TouchableOpacity>
                {item.badge_emoji && (
                  <View style={[styles.commentBadge, { backgroundColor: (item.badge_color || '#7c5cfc') + '20' }]}>
                    <Text style={styles.commentBadgeText}>{item.badge_emoji} {item.badge_name}</Text>
                  </View>
                )}
              </View>
              <View style={styles.commentActions}>
                {item.dev_hearted && (
                  <Text style={styles.devHeart}>❤️</Text>
                )}
                <Text style={styles.commentDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <Text style={styles.commentBody}>{item.body}</Text>

            {/* Awards display */}
            {item.awards && item.awards.length > 0 && (
              <View style={styles.awardsRow}>
                {item.awards.map((award: any, i: number) => (
                  <View key={i} style={[styles.awardBubble, { backgroundColor: (award.color || '#7c5cfc') + '18' }]}>
                    <Text style={styles.awardEmoji}>{award.emoji}</Text>
                    {award.count > 1 && <Text style={[styles.awardCount, { color: award.color }]}>{award.count}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Comment actions */}
            <View style={styles.commentFooter}>
              <TouchableOpacity
                style={styles.awardBtn}
                onPress={() => setShowAwardPicker(item.id)}
              >
                <Text style={styles.awardBtnText}>🏅 Award</Text>
              </TouchableOpacity>

              {/* Admin actions */}
              {isAdmin && (
                <>
                  <TouchableOpacity
                    style={styles.adminBtn}
                    onPress={() => toggleDevHeart(item.id, item.dev_hearted)}
                  >
                    <Text style={styles.adminBtnText}>
                      {item.dev_hearted ? '💔 Unheart' : '❤️ Heart'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.adminBtn}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={[styles.adminBtnText, { color: '#ef4444' }]}>🗑 Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          !commentsLoading ? (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Comment input bar */}
      <View style={styles.inputBar}>
        {/* Badge selector */}
        {ownedBadges.length > 0 && (
          <TouchableOpacity
            style={[styles.badgePickerBtn, selectedBadge && { backgroundColor: (selectedBadgeObj?.color || Colors.primary) + '20' }]}
            onPress={() => setShowBadgePicker(true)}
          >
            <Text style={styles.badgePickerText}>
              {selectedBadge ? selectedBadgeObj?.emoji : '🏷️'}
            </Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="#64748b"
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newComment.trim() || sending) && styles.sendDisabled]}
          onPress={handleComment}
          disabled={!newComment.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Badge picker modal */}
      <Modal visible={showBadgePicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowBadgePicker(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Choose a Badge</Text>
            <Text style={styles.modalSub}>Badge will show next to your name on this comment</Text>

            <TouchableOpacity
              style={[styles.badgeOption, !selectedBadge && styles.badgeOptionActive]}
              onPress={() => { setSelectedBadge(null); setShowBadgePicker(false); }}
            >
              <Text style={styles.badgeOptionEmoji}>✕</Text>
              <Text style={styles.badgeOptionName}>No Badge</Text>
            </TouchableOpacity>

            {ownedBadges.map(b => (
              <TouchableOpacity
                key={b.id}
                style={[styles.badgeOption, selectedBadge === b.id && styles.badgeOptionActive]}
                onPress={() => { setSelectedBadge(b.id); setShowBadgePicker(false); }}
              >
                <Text style={styles.badgeOptionEmoji}>{b.emoji}</Text>
                <Text style={styles.badgeOptionName}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Award picker modal */}
      <Modal visible={!!showAwardPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAwardPicker(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Give an Award</Text>
            <Text style={styles.modalSub}>
              Spend coins to award a badge to this comment
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
                    style={[styles.badgeOption, !canAfford && { opacity: 0.4 }]}
                    onPress={() => canAfford && showAwardPicker && handleGiveAward(showAwardPicker, b)}
                    disabled={!canAfford || awarding}
                  >
                    <Text style={styles.badgeOptionEmoji}>{b.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.badgeOptionName}>{b.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{b.description}</Text>
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

      {/* Feature award picker modal */}
      <Modal visible={showFeatureAwardPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowFeatureAwardPicker(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Award this Idea</Text>
            <Text style={styles.modalSub}>
              Recognize great ideas with an award
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
                    style={[styles.badgeOption, !canAfford && { opacity: 0.4 }]}
                    onPress={() => canAfford && handleGiveFeatureAward(b)}
                    disabled={!canAfford || awarding}
                  >
                    <Text style={styles.badgeOptionEmoji}>{b.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.badgeOptionName}>{b.name}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{b.description}</Text>
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
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    listContent: { padding: 16, paddingBottom: 20 },
    featureSection: { marginBottom: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    boostBadge: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8 },
    description: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 16 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    author: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
    categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    categoryText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    voteButton: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10,
      borderRadius: 10, borderWidth: 2, borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
    },
    voteButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
    voteButtonText: { fontSize: 16, fontWeight: '800', color: colors.textSecondary },
    voteButtonTextActive: { color: Colors.primary },
    commentCountText: { fontSize: 14, color: colors.textSecondary },
    devResponse: {
      backgroundColor: Colors.primary + '15', borderLeftWidth: 3, borderLeftColor: Colors.primary,
      borderRadius: 8, padding: 14, marginBottom: 20,
    },
    devLabel: { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 6, textTransform: 'uppercase' },
    devText: { fontSize: 14, color: colors.text, lineHeight: 20 },
    commentsTitle: {
      fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase',
      letterSpacing: 0.5, borderTopWidth: 1, borderTopColor: colors.surfaceBorder, paddingTop: 16,
    },

    // Comments
    commentCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
    commentDev: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
    commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    commentUserRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    commentUser: { fontSize: 13, fontWeight: '700', color: colors.text },
    devTag: { color: Colors.primary, fontSize: 11 },
    commentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    commentBadgeText: { fontSize: 11, fontWeight: '700', color: colors.text },
    commentActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    devHeart: { fontSize: 14 },
    commentDate: { fontSize: 12, color: colors.textSecondary },
    commentBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

    // Awards
    awardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    awardBubble: {
      flexDirection: 'row', alignItems: 'center', gap: 3,
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    },
    awardEmoji: { fontSize: 14 },
    awardCount: { fontSize: 11, fontWeight: '800' },

    // Comment footer
    commentFooter: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.surfaceBorder },
    awardBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.background },
    awardBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

    // Admin
    adminBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.background },
    adminBtnText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

    // Award price in modal
    awardPriceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    awardPriceText: { fontSize: 12, fontWeight: '800' },

    // Input bar
    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end', padding: 12,
      borderTopWidth: 1, borderTopColor: colors.surfaceBorder, backgroundColor: colors.surface, gap: 8,
    },
    badgePickerBtn: {
      width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
      backgroundColor: colors.background, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    badgePickerText: { fontSize: 18 },
    commentInput: {
      flex: 1, backgroundColor: colors.background, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 100,
    },
    sendButton: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
    sendDisabled: { opacity: 0.4 },
    sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    noComments: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, marginTop: 20 },

    // Badge picker modal
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
  });
}

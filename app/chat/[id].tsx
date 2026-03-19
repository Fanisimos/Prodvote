import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMessages } from '../../hooks/useChat';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import Colors from '../../constants/Colors';
import { Stack } from 'expo-router';
import AnimatedAvatar from '../../components/AnimatedAvatar';
import { useReportBlock } from '../../hooks/useReportBlock';

const ADMIN_USERNAMES = ['Fanisimos', 'Fanisimos_ADMIN'];

const TIER_COLORS: Record<string, string> = {
  free: '#94a3b8',
  pro: '#7c5cfc',
  ultra: '#fbbf24',
  legendary: '#ff4d6a',
};

export default function ChatRoomScreen() {
  const { id, name, emoji } = useLocalSearchParams<{ id: string; name: string; emoji: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { session, profile } = useAuthContext();
  const { messages, loading, loadingEarlier, hasEarlier, sendMessage, deleteMessage, loadEarlierMessages } = useMessages(id);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isAdmin = profile?.username && ADMIN_USERNAMES.includes(profile.username);
  const { reportUser, blockUser, isBlocked } = useReportBlock();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  async function handleSend() {
    if (!text.trim() || !session?.user.id || sending) return;
    setSending(true);
    const { error } = await sendMessage(text, session.user.id, profile?.username, profile?.tier);
    if (!error) setText('');
    setSending(false);
  }

  function handleDelete(messageId: string) {
    if (Platform.OS === 'web') {
      if (confirm('Delete this message?')) deleteMessage(messageId);
    } else {
      Alert.alert('Delete Message', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(messageId) },
      ]);
    }
  }

  function handleMessageLongPress(item: any) {
    const isMe = item.user_id === session?.user.id;
    const canDelete = isMe || isAdmin;

    if (isMe) {
      // Own message: only delete
      if (canDelete) handleDelete(item.id);
      return;
    }

    // Other user's message: show report/block/delete options
    const buttons: any[] = [
      { text: 'Cancel', style: 'cancel' },
      {
        text: '🚩 Report User',
        onPress: () => {
          if (Platform.OS === 'web') {
            const reason = prompt('Why are you reporting this user?');
            if (reason) {
              reportUser(item.user_id, reason, item.id).catch(() => {});
              alert('Report submitted. Thank you.');
            }
          } else {
            Alert.alert('Report User', 'Report this user for inappropriate behavior?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Report',
                style: 'destructive',
                onPress: () => {
                  reportUser(item.user_id, 'Inappropriate message', item.id).catch(() => {});
                  Alert.alert('Done', 'Report submitted. Thank you.');
                },
              },
            ]);
          }
        },
      },
      {
        text: isBlocked(item.user_id) ? '✅ Unblock User' : '🚫 Block User',
        style: 'destructive' as const,
        onPress: async () => {
          try {
            if (isBlocked(item.user_id)) {
              // unblock handled via hook if needed
            } else {
              await blockUser(item.user_id);
            }
          } catch {}
        },
      },
    ];

    if (canDelete) {
      buttons.push({
        text: '🗑️ Delete Message',
        style: 'destructive' as const,
        onPress: () => deleteMessage(item.id),
      });
    }

    if (Platform.OS === 'web') {
      // Simple web fallback
      const action = prompt(
        `${item.username || 'User'}\n\nChoose action:\n1. Report\n2. ${isBlocked(item.user_id) ? 'Unblock' : 'Block'}${canDelete ? '\n3. Delete message' : ''}`
      );
      if (action === '1') buttons[1].onPress();
      else if (action === '2') buttons[2].onPress();
      else if (action === '3' && canDelete) buttons[3]?.onPress();
    } else {
      Alert.alert(item.username || 'User', 'Choose an action', buttons);
    }
  }

  // Filter out blocked users' messages
  const visibleMessages = messages.filter(m => !isBlocked(m.user_id));

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  }

  const channelTitle = `${emoji || '💬'} ${name || 'Chat'}`;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen options={{ title: channelTitle }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={visibleMessages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            hasEarlier ? (
              <TouchableOpacity style={styles.loadEarlierBtn} onPress={loadEarlierMessages} disabled={loadingEarlier}>
                {loadingEarlier ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.loadEarlierText}>Load earlier messages</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>{emoji || '💬'}</Text>
              <Text style={styles.emptyText}>No messages yet. Be the first!</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isMe = item.user_id === session?.user.id;
            const canDelete = isMe || isAdmin;
            const tierColor = TIER_COLORS[item.tier || 'free'] || '#94a3b8';

            // Group messages: show avatar/name only if different user from previous
            const prevMsg = index > 0 ? visibleMessages[index - 1] : null;
            const showHeader = !prevMsg || prevMsg.user_id !== item.user_id;

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onLongPress={() => handleMessageLongPress(item)}
                style={[styles.messageBubble, isMe && styles.messageBubbleMe]}
              >
                {showHeader && (
                  <View style={styles.messageHeader}>
                    <TouchableOpacity
                      onPress={() => router.push(`/profile/${item.user_id}`)}
                    >
                      <AnimatedAvatar
                        letter={(item.username || '?').charAt(0).toUpperCase()}
                        size={28}
                        tierColor={tierColor}
                        frameType={item.active_frame_type}
                        frameColor={item.active_frame_color}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push(`/profile/${item.user_id}`)}>
                      <Text style={[
                        styles.msgUsername,
                        { color: tierColor },
                        item.tier === 'legendary' && styles.legendaryName,
                      ]}>
                        {item.username || 'Unknown'}
                      </Text>
                    </TouchableOpacity>
                    {item.active_badge_emoji && (
                      <Text style={styles.msgActiveBadge}>{item.active_badge_emoji}</Text>
                    )}
                    {item.tier && item.tier !== 'free' && (
                      <Text style={styles.msgTierBadge}>
                        {item.tier === 'pro' ? '⚡' : item.tier === 'ultra' ? '👑' : '🐐'}
                      </Text>
                    )}
                    <Text style={styles.msgTime}>{formatTime(item.created_at)}</Text>
                  </View>
                )}
                <Text style={[styles.msgBody, !showHeader && styles.msgBodyContinued]}>
                  {item.body}
                </Text>
                {item.is_pinned && (
                  <Text style={styles.pinnedBadge}>📌 Pinned</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    messageList: { padding: 16, paddingBottom: 8 },

    // Load earlier
    loadEarlierBtn: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
    loadEarlierText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

    // Empty state
    emptyWrap: { alignItems: 'center', marginTop: 60 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 15, color: colors.textSecondary },

    // Messages
    messageBubble: {
      marginBottom: 2,
      paddingHorizontal: 4,
    },
    messageBubbleMe: {},
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
      marginBottom: 4,
    },
    msgAvatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    msgAvatarText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    msgUsername: { fontWeight: '700', fontSize: 14 },
    legendaryName: { color: '#fbbf24', fontWeight: '900', textShadowColor: '#fbbf2440', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
    msgActiveBadge: { fontSize: 14 },
    msgTierBadge: { fontSize: 12 },
    msgTime: { fontSize: 11, color: colors.textSecondary },
    msgBody: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 22,
      paddingLeft: 52,
    },
    msgBodyContinued: {
      paddingLeft: 52,
    },
    pinnedBadge: {
      fontSize: 11,
      color: '#fbbf24',
      fontWeight: '600',
      paddingLeft: 52,
      marginTop: 2,
    },

    // Input
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      paddingBottom: Platform.OS === 'ios' ? 28 : 12,
      borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      gap: 10,
    },
    input: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      maxHeight: 100,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.4,
    },
    sendBtnText: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
    },
  });
}

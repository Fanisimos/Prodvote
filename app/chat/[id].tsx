import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { promptSignUp } from '../../lib/guestGate';
import { useTheme, Theme } from '../../lib/theme';
import { Message } from '../../lib/types';
import UserAvatar from '../../components/UserAvatar';
import { useReport } from '../../components/ReportButton';
import { getBlockedUserIds } from '../../lib/blockUser';

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isGuest } = useAuthContext();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  const blockedIdsRef = useRef<Set<string>>(new Set());
  const { report } = useReport();

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const blocked = await getBlockedUserIds();
    const blockedSet = new Set(blocked);
    setBlockedIds(blockedSet);
    blockedIdsRef.current = blockedSet;
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(username, avatar_url, tier, active_frame:active_frame_id(animation_type, color))')
      .eq('channel_id', id)
      .order('created_at', { ascending: false })
      .limit(100);
    const mapped = (data || [])
      .filter((m: any) => !blocked.includes(m.user_id))
      .map((m: any) => ({
        ...m,
        username: m.profiles?.username,
        avatar_url: m.profiles?.avatar_url,
        tier: m.profiles?.tier,
        frame_animation: m.profiles?.active_frame?.animation_type || null,
        frame_color: m.profiles?.active_frame?.color || null,
      }));
    setMessages(mapped);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${id}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (blockedIdsRef.current.has(newMsg.user_id)) return;
          const { data: profileData } = await supabase.from('profiles').select('username, avatar_url, tier, active_frame:active_frame_id(animation_type, color)').eq('id', newMsg.user_id).single();
          const enriched: Message = {
            ...newMsg,
            username: profileData?.username,
            avatar_url: profileData?.avatar_url,
            tier: profileData?.tier,
            frame_animation: (profileData as any)?.active_frame?.animation_type || null,
            frame_color: (profileData as any)?.active_frame?.color || null,
          };
          setMessages(prev => prev.some(m => m.id === enriched.id) ? prev : [enriched, ...prev]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function handleSend() {
    if (isGuest) { promptSignUp('chat'); return; }
    if (!text.trim() || !session) return;
    setSending(true);
    await supabase.from('messages').insert({ channel_id: id, user_id: session.user.id, body: text.trim() });
    setText('');
    setSending(false);
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  const s = styles(theme);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={{ fontSize: 48 }}>💬</Text>
            <Text style={s.emptyText}>No messages yet. Start the conversation!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.user_id === session?.user.id;
          return (
            <View style={[s.msgRow, isMe && s.msgRowMe]}>
              <UserAvatar
                username={item.username || 'anon'}
                avatarUrl={item.avatar_url}
                frameColor={item.frame_color}
                frameAnimation={item.frame_animation}
                size={32}
              />
              <View style={[s.bubble, isMe && s.bubbleMe]}>
                <View style={s.bubbleHeader}>
                  <Text style={[s.bubbleUser, isMe && { color: theme.accent }]}>{item.username || 'anon'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.bubbleTime}>{timeAgo(item.created_at)}</Text>
                    {!isMe && (
                      <TouchableOpacity
                        onPress={() => report({ contentType: 'message', contentId: item.id, authorId: item.user_id, authorUsername: item.username })}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={{ color: theme.textMuted, fontSize: 14 }}>···</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Text style={s.bubbleBody}>{item.body}</Text>
              </View>
            </View>
          );
        }}
      />
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder="Type a message..."
          placeholderTextColor={theme.textMuted}
          value={text}
          onChangeText={setText}
          maxLength={1000}
          multiline
        />
        <TouchableOpacity
          style={[s.sendBtn, !text.trim() && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  empty: { alignItems: 'center', marginTop: 60, transform: [{ scaleY: -1 }] },
  emptyText: { fontSize: 16, color: t.textMuted, marginTop: 12 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '85%' },
  msgRowMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubble: {
    flex: 1, backgroundColor: t.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  bubbleMe: { backgroundColor: t.accentLight, borderColor: t.accent + '33' },
  bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: 12 },
  bubbleUser: { fontSize: 13, fontWeight: '600', color: t.textSecondary },
  bubbleTime: { fontSize: 11, color: t.textMuted },
  bubbleBody: { fontSize: 15, color: t.text, lineHeight: 21 },
  inputBar: {
    flexDirection: 'row', padding: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: t.cardBorder, backgroundColor: t.bg,
  },
  input: {
    flex: 1, backgroundColor: t.inputBg, borderRadius: 12, padding: 12,
    color: t.text, fontSize: 14, borderWidth: 1, borderColor: t.inputBorder, maxHeight: 100,
  },
  sendBtn: { backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Message } from '../../lib/types';

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(username, avatar_url, tier)')
      .eq('channel_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    const mapped = (data || []).map((m: any) => ({
      ...m,
      username: m.profiles?.username,
      avatar_url: m.profiles?.avatar_url,
      tier: m.profiles?.tier,
    }));
    setMessages(mapped);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${id}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch the profile info for the new message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, avatar_url, tier')
            .eq('id', newMsg.user_id)
            .single();
          const enriched: Message = {
            ...newMsg,
            username: profileData?.username,
            avatar_url: profileData?.avatar_url,
            tier: profileData?.tier,
          };
          setMessages((prev) => [enriched, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function handleSend() {
    if (!text.trim() || !session) return;
    setSending(true);
    await supabase.from('messages').insert({
      channel_id: id,
      user_id: session.user.id,
      body: text.trim(),
    });
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
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.user_id === session?.user.id;
          return (
            <View style={[styles.messageBubble, isMe && styles.messageBubbleMe]}>
              <View style={styles.messageHeader}>
                <Text style={[styles.messageUser, isMe && { color: '#7c5cfc' }]}>
                  {item.username || 'anon'}
                </Text>
                <Text style={styles.messageTime}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={styles.messageBody}>{item.body}</Text>
            </View>
          );
        }}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          value={text}
          onChangeText={setText}
          maxLength={1000}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  empty: { alignItems: 'center', marginTop: 60, transform: [{ scaleY: -1 }] },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888' },
  messageBubble: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  messageBubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#7c5cfc15',
    borderColor: '#7c5cfc33',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 12,
  },
  messageUser: { fontSize: 13, fontWeight: '600', color: '#aaa' },
  messageTime: { fontSize: 11, color: '#555' },
  messageBody: { fontSize: 15, color: '#eee', lineHeight: 21 },
  inputBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    backgroundColor: '#0a0a0f',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#7c5cfc',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme, Theme } from '../../lib/theme';
import { useAuthContext } from '../../lib/AuthContext';
import { sendChatMessage, getMonthlyUsage, formatResetDate, ChatMessage, AIUsage } from '../../lib/ai';

export default function AIChatScreen() {
  const { theme } = useTheme();
  const { profile } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isPro = ['pro', 'ultra', 'legendary'].includes(profile?.tier || '');

  // Fetch usage on mount for Pro users
  useEffect(() => {
    if (isPro) {
      getMonthlyUsage().then(setUsage);
    }
  }, [isPro]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setRateLimited(false);
    scrollToBottom();

    try {
      const res = await sendChatMessage(text, messages);

      if (res.error === 'rate_limited') {
        setRateLimited(true);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: isPro
            ? 'I\'m temporarily busy. Please try again in a moment.'
            : 'We\'re currently very busy. Please try again later or upgrade to Pro for guaranteed access.',
        }]);
      } else if (res.error === 'monthly_limit') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `You've reached your monthly limit of 5,900 messages. Your usage resets on ${formatResetDate()}.`,
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
        if (res.usage) setUsage(res.usage);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
      }]);
    }

    setSending(false);
    scrollToBottom();
  }

  const s = makeStyles(theme);
  const usagePercent = usage ? Math.min((usage.current / usage.limit) * 100, 100) : 0;
  const usageColor = usagePercent > 90 ? theme.danger : usagePercent > 70 ? '#ffb347' : theme.accent;

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Warning banner — only shown when Pro user is near limit */}
      {isPro && usage && usagePercent >= 80 && usagePercent < 100 && (
        <View style={s.warningBanner}>
          <Text style={s.warningText}>
            You have ~{(usage.limit - usage.current).toLocaleString()} messages left this month. Resets {formatResetDate()}.
          </Text>
        </View>
      )}
      {isPro && usage && usagePercent >= 100 && (
        <View style={s.limitBanner}>
          <Text style={s.limitText}>
            Monthly limit reached. Resets {formatResetDate()}.
          </Text>
        </View>
      )}

      {/* Free user banner */}
      {!isPro && (
        <View style={s.freeBanner}>
          <Text style={s.freeBannerText}>
            Free tier — availability may vary. Upgrade to Pro for guaranteed access.
          </Text>
        </View>
      )}

      {/* Chat messages */}
      <ScrollView
        ref={scrollRef}
        style={s.chatArea}
        contentContainerStyle={s.chatContent}
        onContentSizeChange={scrollToBottom}
      >
        {messages.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🤖</Text>
            <Text style={s.emptyTitle}>Prodvote AI</Text>
            <Text style={s.emptyDesc}>
              Ask me anything — brainstorm ideas, get writing help, productivity tips, or just chat.
            </Text>
            <View style={s.suggestionsContainer}>
              {[
                'Help me brainstorm a feature idea',
                'Write a product description for me',
                'Give me 5 productivity tips',
              ].map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={s.suggestionChip}
                  onPress={() => { setInput(suggestion); }}
                >
                  <Text style={s.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {messages.map((msg, i) => (
          <View
            key={i}
            style={[s.messageBubble, msg.role === 'user' ? s.userBubble : s.aiBubble]}
          >
            {msg.role === 'assistant' && (
              <Text style={s.aiLabel}>Prodvote AI</Text>
            )}
            <Text style={[s.messageText, msg.role === 'user' ? s.userText : s.aiText]}>
              {msg.content}
            </Text>
          </View>
        ))}

        {sending && (
          <View style={[s.messageBubble, s.aiBubble]}>
            <Text style={s.aiLabel}>Prodvote AI</Text>
            <View style={s.typingDots}>
              <Text style={s.typingDot}>●</Text>
              <Text style={[s.typingDot, { opacity: 0.6 }]}>●</Text>
              <Text style={[s.typingDot, { opacity: 0.3 }]}>●</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={s.inputArea}>
        <TextInput
          style={s.textInput}
          placeholder="Type a message..."
          placeholderTextColor={theme.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          editable={!sending}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.sendIcon}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },

  // Warning / limit banners
  warningBanner: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#ffb34722', borderBottomWidth: 1, borderBottomColor: '#ffb34744',
  },
  warningText: { fontSize: 12, color: '#ffb347', textAlign: 'center' },
  limitBanner: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: t.danger + '22', borderBottomWidth: 1, borderBottomColor: t.danger + '44',
  },
  limitText: { fontSize: 12, color: t.danger, textAlign: 'center' },

  // Free banner
  freeBanner: {
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: t.accentLight, borderBottomWidth: 1, borderBottomColor: t.accent + '22',
  },
  freeBannerText: { fontSize: 12, color: t.accent, textAlign: 'center' },

  // Chat area
  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: t.text, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  suggestionsContainer: { gap: 8, width: '100%' },
  suggestionChip: {
    backgroundColor: t.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  suggestionText: { fontSize: 14, color: t.textSecondary },

  // Messages
  messageBubble: {
    maxWidth: '85%', borderRadius: 16, padding: 12, marginBottom: 8,
  },
  userBubble: {
    backgroundColor: t.accent, alignSelf: 'flex-end', borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: t.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  aiLabel: {
    fontSize: 10, fontWeight: '800', color: t.accent, marginBottom: 4,
    letterSpacing: 0.5,
  },
  messageText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#fff' },
  aiText: { color: t.text },

  // Typing indicator
  typingDots: { flexDirection: 'row', gap: 4 },
  typingDot: { fontSize: 12, color: t.textMuted },

  // Input
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.cardBorder,
  },
  textInput: {
    flex: 1, backgroundColor: t.inputBg, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: t.text, fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: t.inputBorder,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '800' },
});

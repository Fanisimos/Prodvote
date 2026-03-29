import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';
import { useTheme } from '../lib/theme';

const PRESET_REACTIONS = ['🔥', '🤔', '👀', '❤️', '🎉'];

interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Props {
  featureId: string;
}

export default function ReactionBar({ featureId }: Props) {
  const { session, profile } = useAuthContext();
  const { theme } = useTheme();
  const [reactions, setReactions] = useState<ReactionCount[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const isPro = profile?.tier === 'pro' || profile?.tier === 'ultra' || profile?.tier === 'legendary';

  useEffect(() => { fetchReactions(); }, [featureId]);

  async function fetchReactions() {
    const [countsRes, userRes] = await Promise.all([
      supabase.from('feature_reaction_counts').select('emoji, count').eq('feature_id', featureId),
      session
        ? supabase.from('feature_reactions').select('emoji').eq('feature_id', featureId).eq('user_id', session.user.id)
        : Promise.resolve({ data: [] }),
    ]);

    const countMap: Record<string, number> = {};
    (countsRes.data || []).forEach((r: any) => { countMap[r.emoji] = Number(r.count); });

    const userSet = new Set((userRes.data || []).map((r: any) => r.emoji));

    // Show preset reactions + any custom ones that have counts
    const allEmojis = new Set([...PRESET_REACTIONS, ...Object.keys(countMap)]);
    setReactions(Array.from(allEmojis).map(e => ({
      emoji: e,
      count: countMap[e] || 0,
      hasReacted: userSet.has(e),
    })));
  }

  async function toggleReaction(emoji: string) {
    if (!session) return;

    const current = reactions.find(r => r.emoji === emoji);
    const hasReacted = current?.hasReacted ?? false;

    if (hasReacted) {
      await supabase.from('feature_reactions')
        .delete()
        .eq('feature_id', featureId)
        .eq('user_id', session.user.id)
        .eq('emoji', emoji);
    } else {
      await supabase.from('feature_reactions')
        .insert({ feature_id: featureId, user_id: session.user.id, emoji });
    }

    setReactions(prev => {
      const exists = prev.find(r => r.emoji === emoji);
      if (exists) {
        return prev.map(r => r.emoji === emoji
          ? { ...r, count: hasReacted ? r.count - 1 : r.count + 1, hasReacted: !hasReacted }
          : r
        );
      }
      return [...prev, { emoji, count: 1, hasReacted: true }];
    });

    setPickerOpen(false);
    setShowCustomInput(false);
  }

  async function submitCustomEmoji() {
    const emoji = customEmoji.trim();
    if (!emoji) return;

    // Basic emoji validation — must be 1-2 chars (emoji can be multi-codepoint)
    if ([...emoji].length > 2) {
      Alert.alert('One emoji only', 'Please enter a single emoji.');
      return;
    }

    await toggleReaction(emoji);
    setCustomEmoji('');
  }

  // Reactions with counts to show inline (collapsed view)
  const activeReactions = reactions.filter(r => r.count > 0);
  const totalReactions = activeReactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <View style={styles.container}>
      {/* Active reactions shown inline */}
      {activeReactions.map(r => (
        <TouchableOpacity
          key={r.emoji}
          style={[
            styles.pill,
            { backgroundColor: r.hasReacted ? theme.accent + '22' : theme.surface },
            r.hasReacted && { borderColor: theme.accent },
          ]}
          onPress={() => toggleReaction(r.emoji)}
          activeOpacity={0.7}
        >
          <Text style={styles.pillEmoji}>{r.emoji}</Text>
          <Text style={[styles.pillCount, { color: r.hasReacted ? theme.accent : theme.textMuted }]}>
            {r.count}
          </Text>
        </TouchableOpacity>
      ))}

      {/* + button to open picker */}
      <TouchableOpacity
        style={[styles.addBtn, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
        onPress={() => { setPickerOpen(true); setShowCustomInput(false); }}
        activeOpacity={0.7}
      >
        <Text style={[styles.addBtnText, { color: theme.textMuted }]}>
          {totalReactions > 0 ? '+ React' : '+ Add reaction'}
        </Text>
      </TouchableOpacity>

      {/* Reaction picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => { setPickerOpen(false); setShowCustomInput(false); }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={[styles.picker, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Text style={[styles.pickerTitle, { color: theme.textMuted }]}>React</Text>

                {/* Preset emojis */}
                <View style={styles.emojiRow}>
                  {PRESET_REACTIONS.map(e => {
                    const r = reactions.find(rx => rx.emoji === e);
                    const reacted = r?.hasReacted ?? false;
                    return (
                      <TouchableOpacity
                        key={e}
                        style={[
                          styles.emojiBtn,
                          { backgroundColor: reacted ? theme.accent + '22' : theme.surface },
                          reacted && { borderColor: theme.accent, borderWidth: 1 },
                        ]}
                        onPress={() => toggleReaction(e)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.emojiText}>{e}</Text>
                        {(r?.count ?? 0) > 0 && (
                          <Text style={[styles.emojiBtnCount, { color: reacted ? theme.accent : theme.textMuted }]}>
                            {r!.count}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom emoji — Pro only */}
                  <TouchableOpacity
                    style={[
                      styles.emojiBtn,
                      { backgroundColor: isPro ? theme.accentLight : theme.surface },
                    ]}
                    onPress={() => {
                      if (!isPro) {
                        Alert.alert('Pro Feature', 'Custom emoji reactions are available for Pro subscribers.', [
                          { text: 'OK', style: 'cancel' },
                        ]);
                        return;
                      }
                      setShowCustomInput(v => !v);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiText}>{isPro ? '✏️' : '🔒'}</Text>
                    <Text style={[styles.emojiBtnCount, { color: theme.textMuted }]}>
                      {isPro ? 'Custom' : 'Pro'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Custom emoji input (Pro only) */}
                {showCustomInput && isPro && (
                  <View style={styles.customInputRow}>
                    <TextInput
                      style={[styles.customInput, {
                        backgroundColor: theme.surface,
                        borderColor: theme.accent,
                        color: theme.text,
                      }]}
                      value={customEmoji}
                      onChangeText={setCustomEmoji}
                      placeholder="Type any emoji..."
                      placeholderTextColor={theme.textMuted}
                      maxLength={4}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.customSendBtn, { backgroundColor: theme.accent }]}
                      onPress={submitCustomEmoji}
                    >
                      <Text style={styles.customSendText}>React</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeRow}
                  onPress={() => { setPickerOpen(false); setShowCustomInput(false); }}
                >
                  <Text style={[styles.closeText, { color: theme.textMuted }]}>✕ Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: 'transparent',
  },
  pillEmoji: { fontSize: 14 },
  pillCount: { fontSize: 12, fontWeight: '700' },
  addBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 12, fontWeight: '600' },
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  picker: {
    borderRadius: 20, padding: 20, borderWidth: 1,
    width: 320,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  pickerTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 8 },
  emojiBtn: {
    alignItems: 'center', justifyContent: 'center',
    width: 56, height: 56, borderRadius: 16,
    borderWidth: 1, borderColor: 'transparent',
  },
  emojiText: { fontSize: 26 },
  emojiBtnCount: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  customInputRow: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' },
  customInput: {
    flex: 1, borderRadius: 12, padding: 12, fontSize: 20,
    borderWidth: 1, textAlign: 'center',
  },
  customSendBtn: {
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
  },
  customSendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  closeRow: { alignItems: 'center', marginTop: 16 },
  closeText: { fontSize: 14, fontWeight: '600' },
});

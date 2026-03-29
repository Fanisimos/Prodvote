import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';
import { useTheme } from '../lib/theme';

const REACTIONS = ['🔥', '🤔', '👀', '❤️', '🎉'];

interface ReactionCount {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Props {
  featureId: string;
}

export default function ReactionBar({ featureId }: Props) {
  const { session } = useAuthContext();
  const { theme } = useTheme();
  const [reactions, setReactions] = useState<ReactionCount[]>(
    REACTIONS.map(e => ({ emoji: e, count: 0, hasReacted: false }))
  );

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

    setReactions(REACTIONS.map(e => ({
      emoji: e,
      count: countMap[e] || 0,
      hasReacted: userSet.has(e),
    })));
  }

  async function toggleReaction(emoji: string) {
    if (!session) return;

    const current = reactions.find(r => r.emoji === emoji);
    if (!current) return;

    if (current.hasReacted) {
      await supabase.from('feature_reactions')
        .delete()
        .eq('feature_id', featureId)
        .eq('user_id', session.user.id)
        .eq('emoji', emoji);
    } else {
      await supabase.from('feature_reactions')
        .insert({ feature_id: featureId, user_id: session.user.id, emoji });
    }

    setReactions(prev => prev.map(r =>
      r.emoji === emoji
        ? { ...r, count: r.hasReacted ? r.count - 1 : r.count + 1, hasReacted: !r.hasReacted }
        : r
    ));
  }

  // Only show reactions that have count > 0 or show all
  return (
    <View style={styles.container}>
      {reactions.map(r => (
        <TouchableOpacity
          key={r.emoji}
          style={[
            styles.pill,
            { backgroundColor: r.hasReacted ? theme.accent + '22' : theme.surface },
            r.hasReacted && { borderColor: theme.accent, borderWidth: 1 },
          ]}
          onPress={() => toggleReaction(r.emoji)}
          activeOpacity={0.7}
        >
          <Text style={styles.emoji}>{r.emoji}</Text>
          {r.count > 0 && (
            <Text style={[styles.count, { color: r.hasReacted ? theme.accent : theme.textMuted }]}>
              {r.count}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: 'transparent',
  },
  emoji: { fontSize: 15 },
  count: { fontSize: 13, fontWeight: '700' },
});

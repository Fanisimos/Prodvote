import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import Watermark from '../../components/Watermark';
import ReactionBar from '../../components/ReactionBar';
import UserAvatar from '../../components/UserAvatar';
import AwardBadge from '../../components/AwardBadge';
import AwardPicker from '../../components/AwardPicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { notifyVoteMilestone } from '../../lib/notifications';
import { useTheme, Theme } from '../../lib/theme';
import { Feature, Comment, FeatureAwardCount } from '../../lib/types';

export default function FeatureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [awards, setAwards] = useState<FeatureAwardCount[]>([]);
  const [awardPickerOpen, setAwardPickerOpen] = useState(false);
  const { session, profile } = useAuthContext();
  const { theme } = useTheme();

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    const [featureRes, commentsRes] = await Promise.all([
      supabase.from('features_with_details').select('*').eq('id', id).single(),
      supabase.from('comments').select('*, profiles(username, avatar_url, tier)')
        .eq('feature_id', id).order('created_at', { ascending: true }),
    ]);
    setFeature(featureRes.data);
    const mapped = (commentsRes.data || []).map((c: any) => ({
      ...c, username: c.profiles?.username, avatar_url: c.profiles?.avatar_url, tier: c.profiles?.tier,
    }));
    setComments(mapped);
    // Fetch awards
    const { data: awardData } = await supabase
      .from('feature_award_counts')
      .select('*')
      .eq('feature_id', id);
    setAwards(awardData || []);

    if (session) {
      const { data: vote } = await supabase.from('votes')
        .select('id').eq('user_id', session.user.id).eq('feature_id', id).single();
      setHasVoted(!!vote);
    }
    setLoading(false);
  }

  async function handleVote() {
    if (!session || !profile || !feature) return;
    if (hasVoted) {
      await supabase.from('votes').delete().eq('user_id', session.user.id).eq('feature_id', id);
      setHasVoted(false);
      setFeature(prev => prev ? { ...prev, vote_count: prev.vote_count - 1 } : prev);
    } else {
      if (profile.votes_remaining <= 0) {
        Alert.alert('No votes left', 'Upgrade to Pro for more votes!');
        return;
      }
      const weight = (profile.tier === 'ultra' || profile.tier === 'legendary') ? 3 : 1;
      await supabase.from('votes').insert({ user_id: session.user.id, feature_id: id, weight });
      await supabase.from('profiles').update({ votes_remaining: profile.votes_remaining - 1 }).eq('id', session.user.id);
      setHasVoted(true);
      const newCount = (feature?.vote_count || 0) + 1;
      setFeature(prev => prev ? { ...prev, vote_count: newCount } : prev);
      // Notify the feature author if they hit a milestone
      if (feature?.user_id === session.user.id && [10, 25, 50, 100].includes(newCount)) {
        notifyVoteMilestone(feature.title, newCount);
      }
    }
  }

  async function handleComment() {
    if (!newComment.trim() || !session) return;
    setSending(true);
    const { error } = await supabase.from('comments').insert({
      feature_id: id, user_id: session.user.id, body: newComment.trim(),
    });
    setSending(false);
    if (!error) { setNewComment(''); fetchAll(); }
  }

  const s = styles(theme);

  if (loading || !feature) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  const statusColor = getStatusColor(feature.status);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Watermark />
      <ScrollView contentContainerStyle={s.scroll}>

        <View style={s.header}>
          <View style={s.metaRow}>
            {feature.category_name && (
              <View style={[s.badge, { backgroundColor: (feature.category_color || '#7c5cfc') + '22' }]}>
                <Text style={[s.badgeText, { color: feature.category_color }]}>{feature.category_name}</Text>
              </View>
            )}
            <View style={[s.badge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[s.badgeText, { color: statusColor }]}>{feature.status.replace('_', ' ')}</Text>
            </View>
          </View>
          <Text style={s.title}>{feature.title}</Text>
          <Text style={s.description}>{feature.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => router.push(`/user/${feature.author_username}` as any)}>
              <Text style={[s.authorText, { color: theme.accent }]}>@{feature.author_username || 'anon'}</Text>
            </TouchableOpacity>
            <Text style={s.authorText}>· {timeAgo(feature.created_at)}</Text>
          </View>
        </View>

        <ReactionBar featureId={feature.id} />

        {/* Awards */}
        {awards.length > 0 && (
          <View style={s.awardsRow}>
            {awards.map(a => (
              <AwardBadge
                key={a.award_type_id}
                emoji={a.emoji}
                count={a.count}
                animation={a.animation}
                color={a.color}
                size={28}
              />
            ))}
          </View>
        )}

        {/* Vote + Give Award row */}
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.voteButton, hasVoted && s.voteButtonActive]} onPress={handleVote}>
            <Text style={[s.voteArrow, hasVoted && s.voteArrowActive]}>▲</Text>
            <Text style={[s.voteButtonText, hasVoted && s.voteButtonTextActive]}>
              {hasVoted ? 'Voted' : 'Upvote'} · {feature.vote_count}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.giveAwardBtn} onPress={() => setAwardPickerOpen(true)}>
            <Text style={{ fontSize: 18 }}>🏆</Text>
            <Text style={s.giveAwardText}>Award</Text>
          </TouchableOpacity>
        </View>

        <AwardPicker
          featureId={feature.id}
          visible={awardPickerOpen}
          onClose={() => setAwardPickerOpen(false)}
          onAwarded={() => fetchAll()}
        />

        {feature.dev_response && (
          <View style={s.devResponse}>
            <Text style={s.devLabel}>Developer Response</Text>
            <Text style={s.devText}>{feature.dev_response}</Text>
          </View>
        )}

        <View style={s.commentsSection}>
          <Text style={s.commentsTitle}>Comments ({comments.length})</Text>
          {comments.map(comment => (
            <View key={comment.id} style={[s.comment, comment.is_dev_reply && s.commentDev]}>
              <View style={s.commentHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <UserAvatar
                    username={comment.username || 'anon'}
                    avatarUrl={(comment as any).avatar_url}
                    size={28}
                  />
                  <TouchableOpacity onPress={() => router.push(`/user/${comment.username}` as any)}>
                    <Text style={s.commentAuthor}>
                      {comment.username || 'anon'}{comment.is_dev_reply && ' (Dev)'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.commentTime}>{timeAgo(comment.created_at)}</Text>
              </View>
              <Text style={s.commentBody}>{comment.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={s.commentBar}>
        <TextInput
          style={s.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={theme.textMuted}
          value={newComment}
          onChangeText={setNewComment}
          maxLength={500}
        />
        <TouchableOpacity
          style={[s.sendBtn, !newComment.trim() && s.sendBtnDisabled]}
          onPress={handleComment}
          disabled={!newComment.trim() || sending}
        >
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    open: '#888', under_review: '#ffb347', planned: '#4dc9f6',
    in_progress: '#7c5cfc', shipped: '#34d399', declined: '#ff4d6a',
  };
  return colors[status] || '#888';
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  scroll: { padding: 20, paddingBottom: 100 },
  header: { gap: 12 },
  metaRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '800', color: t.text, lineHeight: 30 },
  description: { fontSize: 15, color: t.textSecondary, lineHeight: 22 },
  authorText: { fontSize: 13, color: t.textMuted, marginTop: 4 },
  awardsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 16 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  voteButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: t.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  giveAwardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: t.card, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  giveAwardText: { fontSize: 14, fontWeight: '700', color: t.textMuted },
  voteButtonActive: { backgroundColor: t.accentLight, borderColor: t.accent },
  voteArrow: { fontSize: 18, color: t.textMuted },
  voteArrowActive: { color: t.accent },
  voteButtonText: { fontSize: 16, fontWeight: '700', color: t.textMuted },
  voteButtonTextActive: { color: t.accent },
  devResponse: {
    backgroundColor: t.successBg, borderRadius: 14, padding: 16,
    marginTop: 16, borderWidth: 1, borderColor: t.success + '44',
  },
  devLabel: { fontSize: 12, fontWeight: '700', color: t.success, marginBottom: 8, textTransform: 'uppercase' },
  devText: { fontSize: 14, color: t.textSecondary, lineHeight: 20 },
  commentsSection: { marginTop: 28 },
  commentsTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 16 },
  comment: {
    backgroundColor: t.card, borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: t.cardBorder,
  },
  commentDev: { borderColor: t.success + '44', backgroundColor: t.successBg },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: t.textSecondary },
  commentTime: { fontSize: 12, color: t.textMuted },
  commentBody: { fontSize: 14, color: t.text, lineHeight: 20 },
  commentBar: {
    flexDirection: 'row', padding: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: t.cardBorder, backgroundColor: t.bg,
  },
  commentInput: {
    flex: 1, backgroundColor: t.inputBg, borderRadius: 12, padding: 12,
    color: t.text, fontSize: 14, borderWidth: 1, borderColor: t.inputBorder,
  },
  sendBtn: {
    backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

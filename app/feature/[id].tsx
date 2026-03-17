import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Feature, Comment } from '../../lib/types';

export default function FeatureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { session, profile } = useAuthContext();

  useEffect(() => {
    fetchAll();
  }, [id]);

  async function fetchAll() {
    const [featureRes, commentsRes] = await Promise.all([
      supabase.from('features_with_details').select('*').eq('id', id).single(),
      supabase.from('comments').select('*, profiles(username, avatar_url, tier)')
        .eq('feature_id', id).order('created_at', { ascending: true }),
    ]);

    setFeature(featureRes.data);

    const mapped = (commentsRes.data || []).map((c: any) => ({
      ...c,
      username: c.profiles?.username,
      avatar_url: c.profiles?.avatar_url,
      tier: c.profiles?.tier,
    }));
    setComments(mapped);

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
      await supabase.from('votes').delete()
        .eq('user_id', session.user.id).eq('feature_id', id);
      setHasVoted(false);
      setFeature(prev => prev ? { ...prev, vote_count: prev.vote_count - 1 } : prev);
    } else {
      if (profile.votes_remaining <= 0) {
        Alert.alert('No votes left', 'Upgrade to Pro for more votes!');
        return;
      }
      const weight = profile.tier === 'pro' ? 5 : profile.tier === 'basic' ? 2 : 1;
      await supabase.from('votes').insert({
        user_id: session.user.id, feature_id: id, weight,
      });
      await supabase.from('profiles').update({
        votes_remaining: profile.votes_remaining - 1,
      }).eq('id', session.user.id);
      setHasVoted(true);
      setFeature(prev => prev ? { ...prev, vote_count: prev.vote_count + 1 } : prev);
    }
  }

  async function handleComment() {
    if (!newComment.trim() || !session) return;
    setSending(true);
    const { error } = await supabase.from('comments').insert({
      feature_id: id, user_id: session.user.id, body: newComment.trim(),
    });
    setSending(false);
    if (!error) {
      setNewComment('');
      fetchAll();
    }
  }

  if (loading || !feature) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  const statusColor = getStatusColor(feature.status);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.metaRow}>
            {feature.category_name && (
              <View style={[styles.badge, { backgroundColor: (feature.category_color || '#7c5cfc') + '22' }]}>
                <Text style={[styles.badgeText, { color: feature.category_color }]}>
                  {feature.category_name}
                </Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {feature.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{feature.title}</Text>
          <Text style={styles.description}>{feature.description}</Text>

          <View style={styles.authorRow}>
            <Text style={styles.authorText}>
              by {feature.author_username || 'anon'} · {timeAgo(feature.created_at)}
            </Text>
          </View>
        </View>

        {/* Vote button */}
        <TouchableOpacity
          style={[styles.voteButton, hasVoted && styles.voteButtonActive]}
          onPress={handleVote}
        >
          <Text style={[styles.voteButtonArrow, hasVoted && styles.voteButtonArrowActive]}>▲</Text>
          <Text style={[styles.voteButtonText, hasVoted && styles.voteButtonTextActive]}>
            {hasVoted ? 'Voted' : 'Upvote'} · {feature.vote_count}
          </Text>
        </TouchableOpacity>

        {/* Dev response */}
        {feature.dev_response && (
          <View style={styles.devResponse}>
            <Text style={styles.devLabel}>Developer Response</Text>
            <Text style={styles.devText}>{feature.dev_response}</Text>
          </View>
        )}

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({comments.length})
          </Text>
          {comments.map(comment => (
            <View key={comment.id} style={[styles.comment, comment.is_dev_reply && styles.commentDev]}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>
                  {comment.username || 'anon'}
                  {comment.is_dev_reply && ' (Developer)'}
                </Text>
                <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
              </View>
              <Text style={styles.commentBody}>{comment.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Comment input */}
      <View style={styles.commentBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="#666"
          value={newComment}
          onChangeText={setNewComment}
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  scroll: { padding: 20, paddingBottom: 100 },
  header: { gap: 12 },
  metaRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 30 },
  description: { fontSize: 15, color: '#ccc', lineHeight: 22 },
  authorRow: { marginTop: 4 },
  authorText: { fontSize: 13, color: '#666' },
  voteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14,
    marginTop: 20, borderWidth: 1, borderColor: '#2a2a3e',
  },
  voteButtonActive: { backgroundColor: '#7c5cfc22', borderColor: '#7c5cfc' },
  voteButtonArrow: { fontSize: 18, color: '#888' },
  voteButtonArrowActive: { color: '#7c5cfc' },
  voteButtonText: { fontSize: 16, fontWeight: '700', color: '#888' },
  voteButtonTextActive: { color: '#7c5cfc' },
  devResponse: {
    backgroundColor: '#34d39911', borderRadius: 14, padding: 16,
    marginTop: 16, borderWidth: 1, borderColor: '#34d39944',
  },
  devLabel: { fontSize: 12, fontWeight: '700', color: '#34d399', marginBottom: 8, textTransform: 'uppercase' },
  devText: { fontSize: 14, color: '#ccc', lineHeight: 20 },
  commentsSection: { marginTop: 28 },
  commentsTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  comment: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e',
  },
  commentDev: { borderColor: '#34d39944', backgroundColor: '#34d39909' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#aaa' },
  commentTime: { fontSize: 12, color: '#555' },
  commentBody: { fontSize: 14, color: '#ddd', lineHeight: 20 },
  commentBar: {
    flexDirection: 'row', padding: 12, gap: 10,
    borderTopWidth: 1, borderTopColor: '#1a1a2e', backgroundColor: '#0a0a0f',
  },
  commentInput: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 12,
    color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a3e',
  },
  sendBtn: {
    backgroundColor: '#7c5cfc', borderRadius: 12, paddingHorizontal: 18,
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Profile, Feature, Badge } from '../../lib/types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [profileRes, featuresRes, badgesRes] = await Promise.all([
        supabase.from('profiles').select('*, badges:active_badge_id(emoji, name, color)').eq('id', id).single(),
        supabase.from('features').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('user_badges').select('*, badge:badge_id(*)').eq('user_id', id),
      ]);
      if (profileRes.data) {
        const p = profileRes.data as any;
        setProfile({ ...p, active_badge: p.badges });
      }
      setFeatures(featuresRes.data || []);
      setBadges((badgesRes.data || []).map((ub: any) => ub.badge));
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c5cfc" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const tierColors: Record<string, string> = { free: '#888', basic: '#4dc9f6', pro: '#7c5cfc' };

  return (
    <FlatList
      data={features}
      keyExtractor={(item) => item.id}
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={[styles.avatar, { borderColor: tierColors[profile.tier] || '#888' }]}>
            <Text style={styles.avatarText}>{profile.username.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>
            {profile.username}
            {profile.active_badge && ` ${profile.active_badge.emoji}`}
          </Text>
          <View style={[styles.tierBadge, { backgroundColor: (tierColors[profile.tier] || '#888') + '22' }]}>
            <Text style={[styles.tierText, { color: tierColors[profile.tier] || '#888' }]}>
              {profile.tier.toUpperCase()}
            </Text>
          </View>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {badges.length > 0 && (
            <View style={styles.badgeRow}>
              {badges.map((b) => (
                <View key={b.id} style={[styles.badgeChip, { backgroundColor: b.color + '22' }]}>
                  <Text>{b.emoji} {b.name}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Feature Requests ({features.length})</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>No features submitted yet</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>{item.title}</Text>
          <View style={styles.featureMeta}>
            <Text style={styles.metaText}>🗳️ {item.vote_count}</Text>
            <Text style={styles.metaText}>💬 {item.comment_count}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#888', fontSize: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  username: { fontSize: 24, fontWeight: '700', color: '#fff' },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  tierText: { fontSize: 12, fontWeight: '700' },
  bio: { fontSize: 14, color: '#aaa', marginTop: 12, textAlign: 'center', lineHeight: 20 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' },
  badgeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 24, alignSelf: 'flex-start' },
  featureCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  featureTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  featureMeta: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metaText: { fontSize: 13, color: '#888' },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
});

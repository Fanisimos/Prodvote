import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';

export default function ProfileScreen() {
  const { profile, signOut } = useAuthContext();

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  if (!profile) return null;

  const tierColors: Record<string, string> = {
    free: '#888', pro: '#7c5cfc', ultra: '#fbbf24', legendary: '#ff4d6a',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { borderColor: profile.active_frame?.color || tierColors[profile.tier] || '#888' }]}>
          {profile.avatar_url ? (
            <Text style={styles.avatarText}>{profile.username.slice(0, 2).toUpperCase()}</Text>
          ) : (
            <Text style={styles.avatarText}>{profile.username.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        {profile.active_frame && profile.active_frame.name !== 'Default' && (
          <Text style={styles.frameLabel}>{profile.active_frame.name}</Text>
        )}
        <Text style={styles.username}>
          {profile.username}
          {profile.active_badge ? ` ${(profile.active_badge as any).emoji}` : ''}
        </Text>
        <View style={[styles.tierBadge, { backgroundColor: (tierColors[profile.tier] || '#888') + '22' }]}>
          <Text style={[styles.tierText, { color: tierColors[profile.tier] || '#888' }]}>
            {profile.tier.toUpperCase()}
          </Text>
        </View>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.votes_remaining}</Text>
          <Text style={styles.statLabel}>Votes Left</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: '#fbbf24' }]}>🪙 {profile.coins ?? 0}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.login_streak ?? 0}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      {/* Upgrade CTA */}
      {profile.tier === 'free' && (
        <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/paywall')}>
          <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
          <Text style={styles.upgradeDesc}>
            10 votes/month, 2x weight, 600 bonus coins/month, exclusive badges & frames
          </Text>
          <View style={styles.upgradePrice}>
            <Text style={styles.upgradePriceText}>View Plans</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/apps/edit-profile' as any)}>
          <Text style={styles.actionText}>✏️  Edit Profile</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/shop' as any)}>
          <Text style={styles.actionText}>🛍️  Badge Shop</Text>
        </TouchableOpacity>
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/roadmap' as any)}>
          <Text style={styles.actionText}>🗺️  Roadmap</Text>
        </TouchableOpacity>
        {profile.is_admin && (
          <>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(admin)/dashboard' as any)}>
              <Text style={[styles.actionText, { color: '#ff4d6a' }]}>🔧  Admin Panel</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={styles.actionDivider} />
        <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
          <Text style={styles.actionTextDanger}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Prodvote v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 24, paddingBottom: 40 },
  avatarContainer: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  frameLabel: { fontSize: 11, color: '#7c5cfc', fontWeight: '600', marginBottom: 4 },
  username: { fontSize: 24, fontWeight: '700', color: '#fff' },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  tierText: { fontSize: 12, fontWeight: '700' },
  bio: { fontSize: 14, color: '#aaa', marginTop: 10, textAlign: 'center', lineHeight: 20 },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 16,
    padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#2a2a3e',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#2a2a3e' },
  upgradeCard: {
    backgroundColor: '#7c5cfc11', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#7c5cfc44', marginBottom: 24,
  },
  upgradeTitle: { fontSize: 18, fontWeight: '700', color: '#7c5cfc' },
  upgradeDesc: { fontSize: 14, color: '#aaa', marginTop: 6, lineHeight: 20 },
  upgradePrice: {
    backgroundColor: '#7c5cfc', borderRadius: 10, paddingHorizontal: 16,
    paddingVertical: 8, alignSelf: 'flex-start', marginTop: 14,
  },
  upgradePriceText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  actions: {
    backgroundColor: '#1a1a2e', borderRadius: 16, borderWidth: 1,
    borderColor: '#2a2a3e', overflow: 'hidden',
  },
  actionRow: { padding: 16, alignItems: 'center' },
  actionDivider: { height: 1, backgroundColor: '#2a2a3e' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  actionTextDanger: { color: '#ff4d6a', fontWeight: '600', fontSize: 16 },
  version: { textAlign: 'center', color: '#444', marginTop: 24, fontSize: 12 },
});

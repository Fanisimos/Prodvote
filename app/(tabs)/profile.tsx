import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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
    free: '#888', basic: '#4dc9f6', pro: '#7c5cfc',
  };

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { borderColor: tierColors[profile.tier] || '#888' }]}>
          <Text style={styles.avatarText}>
            {profile.username.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.username}>{profile.username}</Text>
        <View style={[styles.tierBadge, { backgroundColor: (tierColors[profile.tier] || '#888') + '22' }]}>
          <Text style={[styles.tierText, { color: tierColors[profile.tier] || '#888' }]}>
            {profile.tier.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.votes_remaining}</Text>
          <Text style={styles.statLabel}>Votes Left</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.boosts_remaining}</Text>
          <Text style={styles.statLabel}>Boosts</Text>
        </View>
      </View>

      {/* Upgrade CTA */}
      {profile.tier === 'free' && (
        <TouchableOpacity style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
          <Text style={styles.upgradeDesc}>
            Unlimited votes, 5x vote weight, boost features, and more
          </Text>
          <View style={styles.upgradePrice}>
            <Text style={styles.upgradePriceText}>£9.99/mo</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
          <Text style={styles.actionTextDanger}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>Prodvote v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 24 },
  avatarContainer: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3,
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  username: { fontSize: 24, fontWeight: '700', color: '#fff' },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  tierText: { fontSize: 12, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 16,
    padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#2a2a3e',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
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
  actionTextDanger: { color: '#ff4d6a', fontWeight: '600', fontSize: 16 },
  version: { textAlign: 'center', color: '#444', marginTop: 24, fontSize: 12 },
});

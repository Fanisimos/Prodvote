import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { usePublicProfile } from '../../hooks/usePublicProfile';
import { useAuthContext } from '../../lib/AuthContext';
import { useReportBlock } from '../../hooks/useReportBlock';
import { useTheme } from '../../lib/ThemeContext';
import Colors from '../../constants/Colors';
import AnimatedAvatar from '../../components/AnimatedAvatar';

const TIER_INFO: Record<string, { label: string; color: string; emoji: string }> = {
  free: { label: 'Free', color: '#94a3b8', emoji: '' },
  pro: { label: 'Pro', color: '#7c5cfc', emoji: '' },
  ultra: { label: 'Ultra', color: '#fbbf24', emoji: '' },
  legendary: { label: 'Legendary', color: '#ff4d6a', emoji: '' },
};

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { session } = useAuthContext();
  const { profile, badges, stats, loading } = usePublicProfile(id);
  const { reportUser, blockUser, unblockUser, isBlocked } = useReportBlock();
  const isOwnProfile = session?.user.id === id;

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const tier = TIER_INFO[profile.tier] || TIER_INFO.free;
  const joinDate = new Date(profile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: `@${profile.username}` }} />

      {/* Avatar & name */}
      <View style={styles.header}>
        <AnimatedAvatar
          letter={profile.username.charAt(0).toUpperCase()}
          size={80}
          tierColor={tier.color}
          frameType={profile.active_frame_type}
          frameColor={profile.active_frame_color}
          imageUri={profile.avatar_url}
        />
        <Text style={styles.username}>@{profile.username}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
            <Text style={styles.tierText}>{tier.emoji} {tier.label}</Text>
          </View>
          {profile.active_badge_emoji && (
            <View style={[styles.activeBadge, { backgroundColor: (profile.active_badge_color || '#7c5cfc') + '20' }]}>
              <Text style={styles.activeBadgeText}>
                {profile.active_badge_emoji} {profile.active_badge_name}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.joinDate}>Joined {joinDate}</Text>
        {!isOwnProfile && session && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => {
                if (Platform.OS === 'web') {
                  const reason = prompt('Why are you reporting this user?');
                  if (reason) {
                    reportUser(id, reason).catch(() => {});
                    alert('Report submitted. Thank you.');
                  }
                } else {
                  Alert.alert('Report User', 'Are you sure you want to report this user?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Report',
                      style: 'destructive',
                      onPress: () => {
                        reportUser(id, 'Reported from profile').catch(() => {});
                        Alert.alert('Done', 'Report submitted.');
                      },
                    },
                  ]);
                }
              }}
            >
              <Text style={styles.reportBtnText}>🚩 Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.blockBtn, isBlocked(id) && styles.blockBtnActive]}
              onPress={async () => {
                try {
                  if (isBlocked(id)) {
                    await unblockUser(id);
                    if (Platform.OS === 'web') alert('User unblocked.');
                    else Alert.alert('Unblocked', 'You can see their messages again.');
                  } else {
                    await blockUser(id);
                    if (Platform.OS === 'web') alert('User blocked.');
                    else Alert.alert('Blocked', 'You will no longer see their messages.');
                  }
                } catch {}
              }}
            >
              <Text style={styles.blockBtnText}>
                {isBlocked(id) ? '✅ Blocked' : '🚫 Block'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.features}</Text>
          <Text style={styles.statLabel}>Features</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.comments}</Text>
          <Text style={styles.statLabel}>Comments</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{badges.length}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
      </View>

      {/* Badge collection */}
      {badges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BADGE COLLECTION</Text>
          <View style={styles.badgeGrid}>
            {badges.map((b) => (
              <View key={b.badge_id} style={[styles.badgeCard, { borderColor: b.color + '40' }]}>
                <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                <Text style={styles.badgeName} numberOfLines={1}>{b.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {badges.length === 0 && (
        <View style={styles.emptySection}>
          <Text style={styles.emptyEmoji}>🏪</Text>
          <Text style={styles.emptyText}>No badges yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    header: { alignItems: 'center', paddingTop: 24, paddingBottom: 20 },
    avatar: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary,
      justifyContent: 'center', alignItems: 'center', marginBottom: 12,
      borderWidth: 3,
    },
    avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
    username: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 10 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    tierBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12 },
    tierText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    activeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    activeBadgeText: { fontWeight: '700', fontSize: 13, color: colors.text },
    joinDate: { fontSize: 13, color: colors.textSecondary, marginTop: 10 },

    statsRow: {
      flexDirection: 'row', backgroundColor: colors.surface,
      marginHorizontal: 16, borderRadius: 16, padding: 16, marginBottom: 20,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
    statDivider: { width: 1, backgroundColor: colors.surfaceBorder },

    section: { marginHorizontal: 16 },
    sectionTitle: {
      fontSize: 12, fontWeight: '800', color: colors.textSecondary,
      letterSpacing: 1.5, marginBottom: 12,
    },
    badgeGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    },
    badgeCard: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 14,
      alignItems: 'center', width: 90, borderWidth: 1.5,
    },
    badgeEmoji: { fontSize: 28, marginBottom: 6 },
    badgeName: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    reportBtn: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    reportBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
    blockBtn: {
      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    blockBtnActive: { backgroundColor: '#ef444420', borderColor: '#ef4444' },
    blockBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },

    emptySection: { alignItems: 'center', marginTop: 20 },
    emptyEmoji: { fontSize: 40, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.textSecondary },
  });
}

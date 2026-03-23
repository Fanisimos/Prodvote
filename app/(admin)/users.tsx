import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Profile, Tier } from '../../lib/types';

const TIERS: Tier[] = ['free', 'pro', 'ultra', 'legendary'];
const TIER_COLORS: Record<Tier, string> = {
  free: '#888',
  pro: '#7c5cfc',
  ultra: '#fbbf24',
  legendary: '#ff4d6a',
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    setUsers(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const onRefresh = () => { setRefreshing(true); fetchUsers(); };

  const toggleBan = async (user: Profile) => {
    const action = user.is_banned ? 'unban' : 'ban';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      `Are you sure you want to ${action} @${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: user.is_banned ? 'default' : 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .update({ is_banned: !user.is_banned })
              .eq('id', user.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setUsers(prev =>
                prev.map(u => u.id === user.id ? { ...u, is_banned: !u.is_banned } : u)
              );
            }
          },
        },
      ]
    );
  };

  const changeTier = (user: Profile) => {
    Alert.alert(
      'Change Tier',
      `Current tier: ${user.tier}\nSelect new tier for @${user.username}:`,
      [
        ...TIERS.filter(t => t !== user.tier).map(tier => ({
          text: tier.charAt(0).toUpperCase() + tier.slice(1),
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .update({ tier })
              .eq('id', user.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setUsers(prev =>
                prev.map(u => u.id === user.id ? { ...u, tier } : u)
              );
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderUser = ({ item }: { item: Profile }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>@{item.username}</Text>
          <View style={styles.row}>
            <View style={[styles.tierBadge, { borderColor: TIER_COLORS[item.tier] }]}>
              <Text style={[styles.tierText, { color: TIER_COLORS[item.tier] }]}>
                {item.tier.toUpperCase()}
              </Text>
            </View>
            {item.is_banned && (
              <View style={styles.bannedBadge}>
                <Text style={styles.bannedText}>BANNED</Text>
              </View>
            )}
            {item.is_admin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminText}>ADMIN</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.coinBox}>
          <Text style={styles.coinValue}>{item.coins}</Text>
          <Text style={styles.coinLabel}>coins</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, item.is_banned ? styles.unbanBtn : styles.banBtn]}
          onPress={() => toggleBan(item)}
        >
          <Text style={styles.actionBtnText}>
            {item.is_banned ? 'Unban' : 'Ban'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.tierBtn]}
          onPress={() => changeTier(item)}
        >
          <Text style={styles.actionBtnText}>Change Tier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.countText}>{users.length} users</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c5cfc" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  countText: { color: '#888', fontSize: 13, paddingHorizontal: 16, paddingTop: 12 },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  username: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tierBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tierText: { fontSize: 11, fontWeight: '700' },
  bannedBadge: {
    backgroundColor: '#ff4d4d22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bannedText: { color: '#ff4d4d', fontSize: 11, fontWeight: '700' },
  adminBadge: {
    backgroundColor: '#7c5cfc22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminText: { color: '#7c5cfc', fontSize: 11, fontWeight: '700' },
  coinBox: { alignItems: 'center' },
  coinValue: { color: '#ffc107', fontSize: 18, fontWeight: '700' },
  coinLabel: { color: '#888', fontSize: 11 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  banBtn: { backgroundColor: '#ff4d4d22', borderWidth: 1, borderColor: '#ff4d4d44' },
  unbanBtn: { backgroundColor: '#4caf5022', borderWidth: 1, borderColor: '#4caf5044' },
  tierBtn: { backgroundColor: '#7c5cfc22', borderWidth: 1, borderColor: '#7c5cfc44' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Profile, Tier } from '../../lib/types';
import { useTheme, Theme } from '../../lib/theme';

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
  const { theme } = useTheme();

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

  const s = makeStyles(theme);

  const renderUser = ({ item }: { item: Profile }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.username}>@{item.username}</Text>
          <View style={s.row}>
            <View style={[s.tierBadge, { borderColor: TIER_COLORS[item.tier] }]}>
              <Text style={[s.tierText, { color: TIER_COLORS[item.tier] }]}>
                {item.tier.toUpperCase()}
              </Text>
            </View>
            {item.is_banned && (
              <View style={s.bannedBadge}>
                <Text style={s.bannedText}>BANNED</Text>
              </View>
            )}
            {item.is_admin && (
              <View style={s.adminBadge}>
                <Text style={s.adminText}>ADMIN</Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.coinBox}>
          <Text style={s.coinValue}>{item.coins}</Text>
          <Text style={s.coinLabel}>coins</Text>
        </View>
      </View>

      <View style={s.cardActions}>
        <TouchableOpacity
          style={[s.actionBtn, item.is_banned ? s.unbanBtn : s.banBtn]}
          onPress={() => toggleBan(item)}
        >
          <Text style={s.actionBtnText}>
            {item.is_banned ? 'Unban' : 'Ban'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.tierBtn]}
          onPress={() => changeTier(item)}
        >
          <Text style={s.actionBtnText}>Change Tier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.countText}>{users.length} users</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      />
    </View>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  countText: { color: t.textMuted, fontSize: 13, paddingHorizontal: 16, paddingTop: 12 },
  card: {
    backgroundColor: t.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  username: { color: t.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
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
    backgroundColor: t.accent + '22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminText: { color: t.accent, fontSize: 11, fontWeight: '700' },
  coinBox: { alignItems: 'center' },
  coinValue: { color: '#ffc107', fontSize: 18, fontWeight: '700' },
  coinLabel: { color: t.textMuted, fontSize: 11 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  banBtn: { backgroundColor: '#ff4d4d22', borderWidth: 1, borderColor: '#ff4d4d44' },
  unbanBtn: { backgroundColor: '#4caf5022', borderWidth: 1, borderColor: '#4caf5044' },
  tierBtn: { backgroundColor: t.accent + '22', borderWidth: 1, borderColor: t.accent + '44' },
  actionBtnText: { color: t.text, fontSize: 14, fontWeight: '600' },
});

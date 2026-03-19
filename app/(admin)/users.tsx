import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/ThemeContext';
import Colors from '../../constants/Colors';

const TIERS = ['free', 'pro', 'ultra', 'legendary'];
const TIER_COLORS: Record<string, string> = {
  free: '#94a3b8', pro: '#7c5cfc', ultra: '#fbbf24', legendary: '#ff4d6a',
};

interface UserRow {
  id: string;
  username: string;
  tier: string;
  coins: number;
  votes_remaining: number;
  boosts_remaining: number;
  is_banned: boolean;
  created_at: string;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [coinAmount, setCoinAmount] = useState('');
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, tier, coins, votes_remaining, boosts_remaining, is_banned, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setUsers(data || []);
    setLoading(false);
  }

  async function toggleBan(id: string, current: boolean) {
    const action = current ? 'Unban' : 'Ban';
    const doAction = async () => {
      await supabase.from('profiles').update({ is_banned: !current }).eq('id', id);
      fetchUsers();
    };
    if (Platform.OS === 'web') {
      if (confirm(`${action} this user?`)) doAction();
    } else {
      Alert.alert(`${action} User`, `Are you sure?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: action, style: 'destructive', onPress: doAction },
      ]);
    }
  }

  async function changeTier(id: string, tier: string) {
    await supabase.from('profiles').update({ tier }).eq('id', id);
    fetchUsers();
  }

  async function addCoins(id: string) {
    const amount = parseInt(coinAmount);
    if (!amount || isNaN(amount)) return;
    const user = users.find(u => u.id === id);
    if (!user) return;
    await supabase.from('profiles').update({ coins: user.coins + amount }).eq('id', id);
    setCoinAmount('');
    fetchUsers();
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Users</Text>
          <Text style={styles.pageSub}>{users.length} total users</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
          {filtered.map(u => {
            const expanded = expandedId === u.id;
            return (
              <View key={u.id} style={[styles.userCard, u.is_banned && styles.bannedCard]}>
                <TouchableOpacity onPress={() => {
                  setExpandedId(expanded ? null : u.id);
                  setCoinAmount('');
                }}>
                  <View style={styles.userHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.username}>@{u.username}</Text>
                        {u.is_banned && (
                          <View style={styles.bannedBadge}>
                            <Text style={styles.bannedText}>BANNED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.userMeta}>
                        🪙 {u.coins} · 🗳️ {u.votes_remaining} votes · {new Date(u.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[u.tier] + '22' }]}>
                      <Text style={[styles.tierText, { color: TIER_COLORS[u.tier] }]}>
                        {u.tier}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.expandedSection}>
                    {/* Tier changer */}
                    <Text style={styles.sectionLabel}>CHANGE TIER</Text>
                    <View style={styles.tierRow}>
                      {TIERS.map(t => (
                        <TouchableOpacity
                          key={t}
                          style={[
                            styles.tierBtn,
                            { borderColor: TIER_COLORS[t] },
                            u.tier === t && { backgroundColor: TIER_COLORS[t] },
                          ]}
                          onPress={() => changeTier(u.id, t)}
                        >
                          <Text style={[
                            styles.tierBtnText,
                            { color: u.tier === t ? '#fff' : TIER_COLORS[t] },
                          ]}>
                            {t}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Add coins */}
                    <Text style={styles.sectionLabel}>ADD / REMOVE COINS</Text>
                    <View style={styles.coinRow}>
                      <TextInput
                        style={styles.coinInput}
                        placeholder="Amount (e.g. 100 or -50)"
                        placeholderTextColor="#64748b"
                        value={coinAmount}
                        onChangeText={setCoinAmount}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity style={styles.coinBtn} onPress={() => addCoins(u.id)}>
                        <Text style={styles.coinBtnText}>Apply</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{u.coins}</Text>
                        <Text style={styles.statLabel}>Coins</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{u.votes_remaining}</Text>
                        <Text style={styles.statLabel}>Votes Left</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{u.boosts_remaining}</Text>
                        <Text style={styles.statLabel}>Boosts Left</Text>
                      </View>
                    </View>

                    {/* Ban / Unban */}
                    <TouchableOpacity
                      style={[styles.banBtn, u.is_banned && styles.unbanBtn]}
                      onPress={() => toggleBan(u.id, u.is_banned)}
                    >
                      <Text style={[styles.banBtnText, u.is_banned && styles.unbanBtnText]}>
                        {u.is_banned ? '✅ Unban User' : '🚫 Ban User'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 28, paddingBottom: 0 },
    pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    pageSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

    searchBar: { paddingHorizontal: 28, paddingVertical: 16 },
    searchInput: {
      backgroundColor: colors.surface, borderRadius: 12, padding: 14,
      fontSize: 14, color: colors.text, borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },

    list: { flex: 1, paddingHorizontal: 28 },

    userCard: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    bannedCard: { borderColor: '#ef4444' + '40' },
    userHeader: { flexDirection: 'row', alignItems: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    username: { fontSize: 15, fontWeight: '700', color: colors.text },
    bannedBadge: {
      backgroundColor: '#ef4444' + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    },
    bannedText: { fontSize: 10, fontWeight: '800', color: '#ef4444', letterSpacing: 1 },
    userMeta: { fontSize: 12, color: colors.textSecondary },
    tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    tierText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

    expandedSection: {
      marginTop: 16, paddingTop: 16, borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
    },

    sectionLabel: {
      fontSize: 10, fontWeight: '800', color: colors.textSecondary,
      letterSpacing: 1.5, marginBottom: 10, marginTop: 8,
    },

    tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    tierBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
      borderWidth: 1.5, backgroundColor: 'transparent',
    },
    tierBtnText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

    coinRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    coinInput: {
      flex: 1, backgroundColor: colors.background, borderRadius: 10,
      padding: 12, fontSize: 14, color: colors.text,
    },
    coinBtn: {
      backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 20,
      justifyContent: 'center',
    },
    coinBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statItem: {
      flex: 1, backgroundColor: colors.background, borderRadius: 10,
      padding: 14, alignItems: 'center',
    },
    statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

    banBtn: {
      padding: 12, borderRadius: 10, alignItems: 'center',
      backgroundColor: '#ef4444' + '15', borderWidth: 1, borderColor: '#ef4444' + '40',
    },
    unbanBtn: {
      backgroundColor: colors.success + '15', borderColor: colors.success + '40',
    },
    banBtnText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
    unbanBtnText: { color: colors.success },
  });
}

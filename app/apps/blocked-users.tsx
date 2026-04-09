import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { unblockUser } from '../../lib/blockUser';
import { useTheme, Theme } from '../../lib/theme';

interface BlockedUser {
  blocked_id: string;
  created_at: string;
  profile: { id: string; username: string; avatar_url: string | null } | null;
}

export default function BlockedUsersScreen() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data } = await supabase
      .from('blocked_users')
      .select('blocked_id, created_at, profile:blocked_id(id, username, avatar_url)')
      .eq('blocker_id', session.user.id)
      .order('created_at', { ascending: false });
    setBlocked((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUnblock(id: string) {
    const ok = await unblockUser(id);
    if (ok) setBlocked(prev => prev.filter(b => b.blocked_id !== id));
  }

  const s = styles(theme);

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Blocked Users' }} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.accent} />
      ) : blocked.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🚫</Text>
          <Text style={s.emptyTitle}>No blocked users</Text>
          <Text style={s.emptyDesc}>When you block someone, they'll appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.blocked_id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.username}>@{item.profile?.username || 'unknown'}</Text>
                <Text style={s.date}>Blocked {new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <TouchableOpacity style={s.unblockBtn} onPress={() => handleUnblock(item.blocked_id)}>
                <Text style={s.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 4 },
  emptyDesc: { fontSize: 14, color: t.textMuted, textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.card,
    borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.cardBorder,
  },
  username: { fontSize: 16, fontWeight: '700', color: t.text },
  date: { fontSize: 12, color: t.textMuted, marginTop: 2 },
  unblockBtn: {
    backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  unblockText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

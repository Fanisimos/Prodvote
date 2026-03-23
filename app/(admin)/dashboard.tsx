import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  route?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchStats = useCallback(async () => {
    const [users, features, votes, messages] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('features').select('*', { count: 'exact', head: true }),
      supabase.from('votes').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
    ]);

    setStats([
      { label: 'Total Users', value: users.count ?? 0, icon: '👥', route: '/(admin)/users' },
      { label: 'Total Features', value: features.count ?? 0, icon: '💡', route: '/(admin)/features' },
      { label: 'Total Votes', value: votes.count ?? 0, icon: '🗳️' },
      { label: 'Total Messages', value: messages.count ?? 0, icon: '💬', route: '/(admin)/channels' },
    ]);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c5cfc" />}
    >
      <Text style={styles.heading}>Overview</Text>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <TouchableOpacity
            key={stat.label}
            style={styles.card}
            activeOpacity={stat.route ? 0.7 : 1}
            onPress={() => stat.route && router.push(stat.route as any)}
          >
            <Text style={styles.cardIcon}>{stat.icon}</Text>
            <Text style={styles.cardValue}>{stat.value.toLocaleString()}</Text>
            <Text style={styles.cardLabel}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.heading}>Quick Actions</Text>
      <View style={styles.actions}>
        {[
          { label: 'Manage Users', route: '/(admin)/users', icon: '👥' },
          { label: 'Manage Features', route: '/(admin)/features', icon: '💡' },
          { label: 'Manage Badges', route: '/(admin)/badges', icon: '🏅' },
          { label: 'Manage Channels', route: '/(admin)/channels', icon: '📢' },
          { label: 'Subscriptions', route: '/(admin)/subscriptions', icon: '💎' },
        ].map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionBtn}
            onPress={() => router.push(action.route as any)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
  heading: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    padding: 20,
    width: '48%' as any,
    flexGrow: 1,
    alignItems: 'center',
  },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardValue: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  cardLabel: { color: '#888', fontSize: 13, fontWeight: '500' },
  actions: { gap: 8 },
  actionBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: { fontSize: 20, marginRight: 12 },
  actionLabel: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  actionArrow: { color: '#7c5cfc', fontSize: 24, fontWeight: '700' },
});

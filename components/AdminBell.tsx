import { useState, useEffect, useCallback } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

const LAST_SEEN_KEY = 'admin_last_seen_at';

export default function AdminBell() {
  const { theme } = useTheme();
  const router = useRouter();
  const [count, setCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    const lastSeen = (await AsyncStorage.getItem(LAST_SEEN_KEY)) || new Date(0).toISOString();

    const [reportsRes, subsRes, featuresRes] = await Promise.all([
      supabase.from('content_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('tier', 'free').gt('tier_updated_at', lastSeen),
      supabase.from('features').select('id', { count: 'exact', head: true }).gt('created_at', lastSeen),
    ]);

    const total = (reportsRes.count || 0) + (subsRes.count || 0) + (featuresRes.count || 0);
    setCount(total);
  }, []);

  useFocusEffect(useCallback(() => { fetchCounts(); }, [fetchCounts]));

  useEffect(() => {
    const channel = supabase
      .channel('admin-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'content_reports' }, fetchCounts)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'features' }, fetchCounts)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, fetchCounts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCounts]);

  return (
    <TouchableOpacity
      onPress={() => router.push('/(admin)/notifications')}
      style={s.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Text style={{ fontSize: 22 }}>🔔</Text>
      {count > 0 && (
        <View style={[s.badge, { backgroundColor: theme.accent }]}>
          <Text style={s.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { padding: 6, position: 'relative' },
  badge: {
    position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18,
    borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

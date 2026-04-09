import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../lib/theme';

const LAST_SEEN_KEY = 'admin_last_seen_at';

interface ReportRow { id: string; reason: string; content_type: string; created_at: string; }
interface SubRow { id: string; username: string; tier: string; tier_updated_at: string; }
interface FeatureRow { id: string; title: string; created_at: string; }

export default function AdminNotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const lastSeen = (await AsyncStorage.getItem(LAST_SEEN_KEY)) || new Date(0).toISOString();

    const [r, sb, f] = await Promise.all([
      supabase.from('content_reports').select('id, reason, content_type, created_at')
        .eq('status', 'pending').order('created_at', { ascending: false }).limit(25),
      supabase.from('profiles').select('id, username, tier, tier_updated_at')
        .neq('tier', 'free').gt('tier_updated_at', lastSeen)
        .order('tier_updated_at', { ascending: false }).limit(25),
      supabase.from('features').select('id, title, created_at')
        .gt('created_at', lastSeen).order('created_at', { ascending: false }).limit(25),
    ]);

    setReports((r.data || []) as any);
    setSubs((sb.data || []) as any);
    setFeatures((f.data || []) as any);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function markAllSeen() {
    await AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    load();
  }

  const s = styles(theme);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  const empty = reports.length === 0 && subs.length === 0 && features.length === 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Admin Notifications' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.headerRow}>
          <Text style={s.title}>Notifications</Text>
          <TouchableOpacity onPress={markAllSeen} style={s.markBtn}>
            <Text style={s.markBtnText}>Mark all seen</Text>
          </TouchableOpacity>
        </View>

        {empty && <Text style={s.emptyText}>You're all caught up ✨</Text>}

        {reports.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🚩 Pending Reports ({reports.length})</Text>
            <Text style={s.hint}>Tap to action in Reports screen — won't clear until resolved</Text>
            {reports.map(r => (
              <TouchableOpacity key={r.id} style={s.card} onPress={() => router.push('/(admin)/reports')}>
                <Text style={s.cardTitle}>{r.reason} · {r.content_type}</Text>
                <Text style={s.cardMeta}>{timeAgo(r.created_at)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {subs.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>💎 New Paid Subscribers ({subs.length})</Text>
            {subs.map(u => (
              <View key={u.id} style={s.card}>
                <Text style={s.cardTitle}>@{u.username} → {u.tier}</Text>
                <Text style={s.cardMeta}>{timeAgo(u.tier_updated_at)}</Text>
              </View>
            ))}
          </View>
        )}

        {features.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>✨ New Submissions ({features.length})</Text>
            {features.map(f => (
              <TouchableOpacity key={f.id} style={s.card} onPress={() => router.push(`/feature/${f.id}`)}>
                <Text style={s.cardTitle} numberOfLines={1}>{f.title}</Text>
                <Text style={s.cardMeta}>{timeAgo(f.created_at)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: t.text },
  markBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: t.accent },
  markBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emptyText: { fontSize: 14, color: t.textMuted, textAlign: 'center', marginTop: 40 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: t.textSecondary, marginBottom: 4 },
  hint: { fontSize: 11, color: t.textMuted, fontStyle: 'italic', marginBottom: 8 },
  card: {
    backgroundColor: t.card, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: t.text },
  cardMeta: { fontSize: 12, color: t.textMuted, marginTop: 4 },
});

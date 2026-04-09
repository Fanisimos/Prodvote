import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reporter: { username: string } | null;
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuthContext();

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) console.log('reports fetch error', error);
    const rows = (data || []) as any[];
    const reporterIds = Array.from(new Set(rows.map(r => r.reporter_id).filter(Boolean)));
    let usernameMap: Record<string, string> = {};
    if (reporterIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, username').in('id', reporterIds);
      usernameMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p.username]));
    }
    const withReporter = rows.map(r => ({ ...r, reporter: { username: usernameMap[r.reporter_id] || 'unknown' } }));
    setReports(withReporter as any);
    setLoading(false);
  }

  async function updateStatus(reportId: string, status: string) {
    await supabase.from('content_reports').update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session?.user.id,
    }).eq('id', reportId);
    fetchReports();
  }

  function confirm(message: string): boolean {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && window.confirm(message);
    }
    return true; // native path is handled by Alert below
  }

  function notify(title: string, msg: string) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  }

  async function handleRemove(report: Report) {
    if (!confirm('Remove this content permanently?')) return;
    if (report.content_type === 'comment') {
      await supabase.from('comments').delete().eq('id', report.content_id);
    } else if (report.content_type === 'feature') {
      await supabase.from('features').delete().eq('id', report.content_id);
    } else if (report.content_type === 'message') {
      await supabase.from('messages').delete().eq('id', report.content_id);
    }
    await updateStatus(report.id, 'resolved');
  }

  async function lookupAuthor(report: Report): Promise<string | null> {
    if (report.content_type === 'user') return report.content_id;
    const table =
      report.content_type === 'feature' ? 'features' :
      report.content_type === 'comment' ? 'comments' :
      report.content_type === 'message' ? 'messages' : null;
    if (!table) return null;
    const { data } = await supabase.from(table).select('user_id').eq('id', report.content_id).single();
    return (data as any)?.user_id || null;
  }

  async function handleBan(report: Report) {
    if (!confirm('Ban this user? They will be prevented from posting.')) return;
    const authorId = await lookupAuthor(report);
    if (!authorId) { notify('Error', 'Could not find content author'); return; }
    const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', authorId);
    if (error) { notify('Error', error.message); return; }
    await updateStatus(report.id, 'resolved');
    notify('Banned', 'User has been banned');
  }

  const pending = reports.filter(r => r.status === 'pending');
  const resolved = reports.filter(r => r.status !== 'pending');

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#7c5cfc" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Content Reports</Text>

      <View style={s.statsRow}>
        <View style={[s.statCard, { borderColor: '#ff4d6a44' }]}>
          <Text style={[s.statValue, { color: '#ff4d6a' }]}>{pending.length}</Text>
          <Text style={s.statLabel}>Pending</Text>
        </View>
        <View style={[s.statCard, { borderColor: '#34d39944' }]}>
          <Text style={[s.statValue, { color: '#34d399' }]}>{resolved.length}</Text>
          <Text style={s.statLabel}>Resolved</Text>
        </View>
      </View>

      {pending.length === 0 && (
        <Text style={s.emptyText}>No pending reports</Text>
      )}

      {pending.map(r => (
        <View key={r.id} style={s.reportCard}>
          <View style={s.reportHeader}>
            <View style={[s.reasonBadge, { backgroundColor: reasonColor(r.reason) + '22' }]}>
              <Text style={[s.reasonText, { color: reasonColor(r.reason) }]}>{r.reason}</Text>
            </View>
            <Text style={s.reportType}>{r.content_type}</Text>
          </View>
          <Text style={s.reportMeta}>
            Reported by @{(r.reporter as any)?.username || 'unknown'} · {timeAgo(r.created_at)}
          </Text>
          {r.details && <Text style={s.reportDetails}>{r.details}</Text>}
          <View style={s.actionsRow}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#2a2a3e' }]} onPress={() => updateStatus(r.id, 'dismissed')}>
              <Text style={s.actionText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#2a2a3e' }]} onPress={() => updateStatus(r.id, 'reviewed')}>
              <Text style={s.actionText}>Reviewed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ff4d6a' }]} onPress={() => handleRemove(r)}>
              <Text style={s.actionText}>Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ff3d00' }]} onPress={() => handleBan(r)}>
              <Text style={s.actionText}>Ban User</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {resolved.length > 0 && (
        <>
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Resolved</Text>
          {resolved.slice(0, 20).map(r => (
            <View key={r.id} style={[s.reportCard, { opacity: 0.5 }]}>
              <View style={s.reportHeader}>
                <View style={[s.reasonBadge, { backgroundColor: '#88888822' }]}>
                  <Text style={[s.reasonText, { color: '#888' }]}>{r.reason}</Text>
                </View>
                <Text style={[s.reportType, { color: r.status === 'resolved' ? '#34d399' : '#888' }]}>
                  {r.status}
                </Text>
              </View>
              <Text style={s.reportMeta}>
                {r.content_type} · @{(r.reporter as any)?.username || 'unknown'}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function reasonColor(reason: string): string {
  const colors: Record<string, string> = {
    spam: '#ffb347', inappropriate: '#ff4d6a', harassment: '#ff3d00',
    misinformation: '#7c5cfc', other: '#888',
  };
  return colors[reason] || '#888';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#888', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1,
  },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 20 },
  reportCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e',
  },
  reportHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  reasonBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  reasonText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  reportType: { fontSize: 12, color: '#888', fontWeight: '600' },
  reportMeta: { fontSize: 12, color: '#666' },
  reportDetails: { fontSize: 13, color: '#aaa', marginTop: 6 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

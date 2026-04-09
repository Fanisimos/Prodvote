import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Switch,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../lib/theme';
import { AppMetadata } from '../../lib/types';

export default function AdminAppMetadata() {
  const [apps, setApps] = useState<AppMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSuggested, setEditSuggested] = useState('');
  const [editVotes, setEditVotes] = useState('');
  const { theme } = useTheme();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('app_metadata').select('*').order('app_id');
    setApps(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleFeatured(app: AppMetadata) {
    await supabase.from('app_metadata')
      .update({ is_featured: !app.is_featured })
      .eq('id', app.id);
    fetchData();
  }

  async function saveEdit(app: AppMetadata) {
    await supabase.from('app_metadata').update({
      suggested_by: editSuggested.trim() || null,
      vote_count: parseInt(editVotes) || 0,
    }).eq('id', app.id);
    setEditingId(null);
    fetchData();
  }

  function startEdit(app: AppMetadata) {
    setEditingId(app.id);
    setEditSuggested(app.suggested_by || '');
    setEditVotes(String(app.vote_count || 0));
  }

  const s = makeStyles(theme);

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color={theme.accent} /></View>;
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={theme.accent} />}
    >
      <Text style={s.heading}>App Visibility & Metadata</Text>
      <Text style={s.subtext}>Featured apps appear first. Others go under "More Tools".</Text>

      {apps.map(app => (
        <View key={app.id} style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.appId}>{app.app_id}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.featuredLabel}>{app.is_featured ? 'Featured' : 'Hidden'}</Text>
              <Switch
                value={app.is_featured}
                onValueChange={() => toggleFeatured(app)}
                trackColor={{ true: theme.accent }}
              />
            </View>
          </View>

          {editingId === app.id ? (
            <View style={s.editSection}>
              <Text style={s.inputLabel}>Suggested by (username)</Text>
              <TextInput
                style={s.input}
                value={editSuggested}
                onChangeText={setEditSuggested}
                placeholder="@username"
                placeholderTextColor={theme.textMuted}
              />
              <Text style={s.inputLabel}>Vote count</Text>
              <TextInput
                style={s.input}
                value={editVotes}
                onChangeText={setEditVotes}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textMuted}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={s.saveBtn} onPress={() => saveEdit(app)}>
                  <Text style={s.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingId(null)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.metaRow}>
              <Text style={s.metaText}>
                {app.suggested_by ? `Suggested by @${app.suggested_by}` : 'No suggester set'}
                {app.vote_count > 0 ? ` · ${app.vote_count} votes` : ''}
              </Text>
              <TouchableOpacity onPress={() => startEdit(app)}>
                <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 13 }}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 20, fontWeight: '700', color: t.text, marginBottom: 4 },
  subtext: { fontSize: 13, color: t.textMuted, marginBottom: 16 },
  card: {
    backgroundColor: t.card, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: t.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  appId: { fontSize: 16, fontWeight: '700', color: t.text },
  featuredLabel: { fontSize: 12, color: t.textMuted },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 13, color: t.textMuted },
  editSection: { marginTop: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: t.textMuted, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: t.inputBg, borderRadius: 10, padding: 12,
    color: t.text, fontSize: 14, borderWidth: 1, borderColor: t.inputBorder,
  },
  saveBtn: {
    flex: 1, backgroundColor: t.accent, borderRadius: 10, padding: 12, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: {
    flex: 1, backgroundColor: t.surface, borderRadius: 10, padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: t.cardBorder,
  },
  cancelBtnText: { color: t.textMuted, fontWeight: '700' },
});

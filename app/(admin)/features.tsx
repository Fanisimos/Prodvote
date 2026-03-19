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

const STATUSES = ['open', 'under_review', 'planned', 'in_progress', 'shipped', 'declined'];
const STATUS_COLORS: Record<string, string> = {
  open: '#94a3b8', under_review: '#fbbf24', planned: '#60a5fa',
  in_progress: '#a78bfa', shipped: '#34d399', declined: '#ef4444',
};

interface FeatureRow {
  id: string;
  title: string;
  description: string;
  status: string;
  score: number;
  vote_count: number;
  comment_count: number;
  dev_response: string | null;
  dev_hearted: boolean;
  created_at: string;
  author_username?: string;
}

export default function FeaturesScreen() {
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [devResponse, setDevResponse] = useState('');
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => { fetchFeatures(); }, [filter]);

  async function fetchFeatures() {
    setLoading(true);
    let query = supabase
      .from('features_with_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data } = await query.limit(100);
    setFeatures(data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const updates: any = { status };
    if (status === 'shipped') updates.shipped_at = new Date().toISOString();
    await supabase.from('features').update(updates).eq('id', id);
    fetchFeatures();
  }

  async function deleteFeature(id: string) {
    const doDelete = () => {
      supabase.from('features').delete().eq('id', id).then(() => fetchFeatures());
    };
    if (Platform.OS === 'web') {
      if (confirm('Delete this feature permanently?')) doDelete();
    } else {
      Alert.alert('Delete Feature', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function saveDevResponse(id: string) {
    await supabase.from('features').update({ dev_response: devResponse || null }).eq('id', id);
    setDevResponse('');
    setExpandedId(null);
    fetchFeatures();
  }

  async function toggleHeart(id: string, current: boolean) {
    await supabase.from('features').update({ dev_hearted: !current }).eq('id', id);
    fetchFeatures();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Features</Text>
          <Text style={styles.pageSub}>{features.length} features</Text>
        </View>
      </View>

      {/* Filter bar */}
      <ScrollView horizontal style={styles.filterBar} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, filter === s && { backgroundColor: STATUS_COLORS[s] + '22' }]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.filterText, filter === s && { color: STATUS_COLORS[s] }]}>
              {s.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
          {features.map(f => {
            const expanded = expandedId === f.id;
            return (
              <View key={f.id} style={styles.featureCard}>
                <TouchableOpacity onPress={() => {
                  setExpandedId(expanded ? null : f.id);
                  setDevResponse(f.dev_response || '');
                }}>
                  <View style={styles.featureHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>{f.title}</Text>
                      <Text style={styles.featureMeta}>
                        @{f.author_username} · ▲{f.score} · 💬{f.comment_count} · {new Date(f.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[f.status] + '22' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[f.status] }]}>
                        {f.status.replace('_', ' ')}
                      </Text>
                    </View>
                    {f.dev_hearted && <Text style={{ fontSize: 16, marginLeft: 6 }}>❤️</Text>}
                  </View>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.expandedSection}>
                    <Text style={styles.featureDesc}>{f.description}</Text>

                    {/* Status changer */}
                    <Text style={styles.sectionLabel}>CHANGE STATUS</Text>
                    <View style={styles.statusRow}>
                      {STATUSES.map(s => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.statusBtn,
                            { borderColor: STATUS_COLORS[s] },
                            f.status === s && { backgroundColor: STATUS_COLORS[s] },
                          ]}
                          onPress={() => updateStatus(f.id, s)}
                        >
                          <Text style={[
                            styles.statusBtnText,
                            { color: f.status === s ? '#fff' : STATUS_COLORS[s] },
                          ]}>
                            {s.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Dev response */}
                    <Text style={styles.sectionLabel}>DEV RESPONSE</Text>
                    <TextInput
                      style={styles.devInput}
                      placeholder="Write a developer response..."
                      placeholderTextColor="#64748b"
                      value={devResponse}
                      onChangeText={setDevResponse}
                      multiline
                    />
                    <TouchableOpacity style={styles.saveBtn} onPress={() => saveDevResponse(f.id)}>
                      <Text style={styles.saveBtnText}>Save Response</Text>
                    </TouchableOpacity>

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => toggleHeart(f.id, f.dev_hearted)}
                      >
                        <Text style={styles.actionBtnText}>
                          {f.dev_hearted ? '💔 Unheart' : '❤️ Heart'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => deleteFeature(f.id)}
                      >
                        <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>🗑 Delete</Text>
                      </TouchableOpacity>
                    </View>
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

    filterBar: { paddingHorizontal: 28, paddingVertical: 16, maxHeight: 56 },
    filterChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
      backgroundColor: colors.surface, marginRight: 8,
    },
    filterActive: { backgroundColor: Colors.primary + '22' },
    filterText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'capitalize' },
    filterTextActive: { color: Colors.primary },

    list: { flex: 1, paddingHorizontal: 28 },

    featureCard: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    featureHeader: { flexDirection: 'row', alignItems: 'center' },
    featureTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
    featureMeta: { fontSize: 12, color: colors.textSecondary },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

    expandedSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.surfaceBorder },
    featureDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },

    sectionLabel: {
      fontSize: 10, fontWeight: '800', color: colors.textSecondary,
      letterSpacing: 1.5, marginBottom: 10, marginTop: 8,
    },

    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    statusBtn: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
      borderWidth: 1.5, backgroundColor: 'transparent',
    },
    statusBtnText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

    devInput: {
      backgroundColor: colors.background, borderRadius: 10, padding: 14,
      fontSize: 14, color: colors.text, minHeight: 80, textAlignVertical: 'top',
      marginBottom: 10,
    },
    saveBtn: {
      backgroundColor: Colors.primary, borderRadius: 10, padding: 12, alignItems: 'center',
      marginBottom: 16,
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    actionsRow: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
      backgroundColor: colors.background,
    },
    deleteBtn: {},
    actionBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  });
}

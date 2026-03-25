import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Feature, FeatureStatus } from '../../lib/types';
import { useTheme, Theme } from '../../lib/theme';

const STATUSES: FeatureStatus[] = ['open', 'under_review', 'planned', 'in_progress', 'shipped', 'declined'];

const STATUS_COLORS: Record<FeatureStatus, string> = {
  open: '#4da6ff',
  under_review: '#ffc107',
  planned: '#7c5cfc',
  in_progress: '#ff9800',
  shipped: '#4caf50',
  declined: '#ff4d4d',
};

const STATUS_LABELS: Record<FeatureStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  shipped: 'Shipped',
  declined: 'Declined',
};

export default function AdminFeaturesScreen() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devResponseId, setDevResponseId] = useState<string | null>(null);
  const [devResponseText, setDevResponseText] = useState('');
  const { theme } = useTheme();

  const fetchFeatures = useCallback(async () => {
    const { data } = await supabase
      .from('features_with_details')
      .select('*')
      .order('created_at', { ascending: false });

    setFeatures(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchFeatures(); }, [fetchFeatures]);

  const onRefresh = () => { setRefreshing(true); fetchFeatures(); };

  const changeStatus = (feature: Feature) => {
    Alert.alert(
      'Change Status',
      `Current: ${STATUS_LABELS[feature.status]}\n"${feature.title}"`,
      [
        ...STATUSES.filter(s => s !== feature.status).map(status => ({
          text: STATUS_LABELS[status],
          onPress: async () => {
            const updates: any = { status };
            if (status === 'shipped') updates.shipped_at = new Date().toISOString();

            const { error } = await supabase
              .from('features')
              .update(updates)
              .eq('id', feature.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setFeatures(prev =>
                prev.map(f => f.id === feature.id ? { ...f, ...updates } : f)
              );
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const submitDevResponse = async (featureId: string) => {
    if (!devResponseText.trim()) return;

    const { error } = await supabase
      .from('features')
      .update({ dev_response: devResponseText.trim() })
      .eq('id', featureId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setFeatures(prev =>
        prev.map(f => f.id === featureId ? { ...f, dev_response: devResponseText.trim() } : f)
      );
      setDevResponseId(null);
      setDevResponseText('');
    }
  };

  const s = makeStyles(theme);

  const renderFeature = ({ item }: { item: Feature }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={s.author}>by @{item.author_username || 'unknown'}</Text>
        </View>
        <View style={s.voteBox}>
          <Text style={s.voteCount}>{item.vote_count}</Text>
          <Text style={s.voteLabel}>votes</Text>
        </View>
      </View>

      <View style={s.row}>
        <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22', borderColor: STATUS_COLORS[item.status] + '44' }]}>
          <Text style={[s.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
        {item.is_boosted && (
          <View style={s.boostedBadge}>
            <Text style={s.boostedText}>BOOSTED</Text>
          </View>
        )}
      </View>

      {item.dev_response && (
        <View style={s.devResponseBox}>
          <Text style={s.devResponseLabel}>Dev Response:</Text>
          <Text style={s.devResponseText}>{item.dev_response}</Text>
        </View>
      )}

      {devResponseId === item.id && (
        <View style={s.devInputBox}>
          <TextInput
            style={s.devInput}
            value={devResponseText}
            onChangeText={setDevResponseText}
            placeholder="Type dev response..."
            placeholderTextColor={theme.textMuted}
            multiline
          />
          <View style={s.devInputActions}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => { setDevResponseId(null); setDevResponseText(''); }}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.submitBtn}
              onPress={() => submitDevResponse(item.id)}
            >
              <Text style={s.submitBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={s.cardActions}>
        <TouchableOpacity
          style={[s.actionBtn, s.statusBtn]}
          onPress={() => changeStatus(item)}
        >
          <Text style={s.actionBtnText}>Change Status</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.responseBtn]}
          onPress={() => {
            setDevResponseId(item.id);
            setDevResponseText(item.dev_response || '');
          }}
        >
          <Text style={s.actionBtnText}>Dev Response</Text>
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
      <Text style={s.countText}>{features.length} features</Text>
      <FlatList
        data={features}
        keyExtractor={(item) => item.id}
        renderItem={renderFeature}
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
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  title: { color: t.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  author: { color: t.textMuted, fontSize: 13 },
  voteBox: { alignItems: 'center', marginLeft: 12 },
  voteCount: { color: t.accent, fontSize: 22, fontWeight: '800' },
  voteLabel: { color: t.textMuted, fontSize: 11 },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  boostedBadge: {
    backgroundColor: '#ff980022',
    borderWidth: 1,
    borderColor: '#ff980044',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  boostedText: { color: '#ff9800', fontSize: 12, fontWeight: '700' },
  devResponseBox: {
    backgroundColor: t.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  devResponseLabel: { color: t.accent, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  devResponseText: { color: t.textSecondary, fontSize: 13, lineHeight: 18 },
  devInputBox: { marginBottom: 10 },
  devInput: {
    backgroundColor: t.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.cardBorder,
    color: t.text,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  devInputActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancelBtn: {
    backgroundColor: t.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelBtnText: { color: t.textMuted, fontSize: 14, fontWeight: '600' },
  submitBtn: {
    backgroundColor: t.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statusBtn: { backgroundColor: t.accent + '22', borderWidth: 1, borderColor: t.accent + '44' },
  responseBtn: { backgroundColor: '#4da6ff22', borderWidth: 1, borderColor: '#4da6ff44' },
  actionBtnText: { color: t.text, fontSize: 14, fontWeight: '600' },
});

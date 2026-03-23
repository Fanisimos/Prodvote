import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Feature, FeatureStatus } from '../../lib/types';

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

  const renderFeature = ({ item }: { item: Feature }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.author}>by @{item.author_username || 'unknown'}</Text>
        </View>
        <View style={styles.voteBox}>
          <Text style={styles.voteCount}>{item.vote_count}</Text>
          <Text style={styles.voteLabel}>votes</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22', borderColor: STATUS_COLORS[item.status] + '44' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
        {item.is_boosted && (
          <View style={styles.boostedBadge}>
            <Text style={styles.boostedText}>BOOSTED</Text>
          </View>
        )}
      </View>

      {item.dev_response && (
        <View style={styles.devResponseBox}>
          <Text style={styles.devResponseLabel}>Dev Response:</Text>
          <Text style={styles.devResponseText}>{item.dev_response}</Text>
        </View>
      )}

      {devResponseId === item.id && (
        <View style={styles.devInputBox}>
          <TextInput
            style={styles.devInput}
            value={devResponseText}
            onChangeText={setDevResponseText}
            placeholder="Type dev response..."
            placeholderTextColor="#666"
            multiline
          />
          <View style={styles.devInputActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setDevResponseId(null); setDevResponseText(''); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => submitDevResponse(item.id)}
            >
              <Text style={styles.submitBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.statusBtn]}
          onPress={() => changeStatus(item)}
        >
          <Text style={styles.actionBtnText}>Change Status</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.responseBtn]}
          onPress={() => {
            setDevResponseId(item.id);
            setDevResponseText(item.dev_response || '');
          }}
        >
          <Text style={styles.actionBtnText}>Dev Response</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.countText}>{features.length} features</Text>
      <FlatList
        data={features}
        keyExtractor={(item) => item.id}
        renderItem={renderFeature}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c5cfc" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  countText: { color: '#888', fontSize: 13, paddingHorizontal: 16, paddingTop: 12 },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  author: { color: '#888', fontSize: 13 },
  voteBox: { alignItems: 'center', marginLeft: 12 },
  voteCount: { color: '#7c5cfc', fontSize: 22, fontWeight: '800' },
  voteLabel: { color: '#888', fontSize: 11 },
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
    backgroundColor: '#0a0a0f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  devResponseLabel: { color: '#7c5cfc', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  devResponseText: { color: '#ccc', fontSize: 13, lineHeight: 18 },
  devInputBox: { marginBottom: 10 },
  devInput: {
    backgroundColor: '#0a0a0f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    color: '#fff',
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  devInputActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancelBtn: {
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#7c5cfc',
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
  statusBtn: { backgroundColor: '#7c5cfc22', borderWidth: 1, borderColor: '#7c5cfc44' },
  responseBtn: { backgroundColor: '#4da6ff22', borderWidth: 1, borderColor: '#4da6ff44' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

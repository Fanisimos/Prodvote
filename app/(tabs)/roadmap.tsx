import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Feature, FeatureStatus } from '../../lib/types';

const STATUS_ORDER: { key: FeatureStatus; label: string; color: string }[] = [
  { key: 'in_progress', label: '🚀 In Progress', color: '#7c5cfc' },
  { key: 'planned', label: '📋 Planned', color: '#4dc9f6' },
  { key: 'under_review', label: '🔍 Under Review', color: '#ffb347' },
  { key: 'shipped', label: '✅ Shipped', color: '#34d399' },
];

interface Section {
  title: string;
  color: string;
  data: Feature[];
}

export default function RoadmapScreen() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  async function fetchRoadmap() {
    const { data } = await supabase
      .from('features_with_details')
      .select('*')
      .in('status', ['in_progress', 'planned', 'under_review', 'shipped'])
      .order('score', { ascending: false });

    const grouped: Section[] = STATUS_ORDER.map(s => ({
      title: s.label,
      color: s.color,
      data: (data || []).filter(f => f.status === s.key),
    })).filter(s => s.data.length > 0);

    setSections(grouped);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchRoadmap(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.sectionLine, { backgroundColor: section.color }]} />
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/feature/${item.id}`)}
          >
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
            </View>
            <View style={styles.voteChip}>
              <Text style={styles.voteText}>▲ {item.vote_count}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRoadmap(); }}
            tintColor="#7c5cfc" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Roadmap is empty</Text>
            <Text style={styles.emptySubtext}>Vote on features to help shape the roadmap!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  list: { padding: 16, paddingBottom: 40 },
  sectionHeader: { marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sectionLine: { height: 3, borderRadius: 2, width: 40 },
  card: {
    flexDirection: 'row', backgroundColor: '#1a1a2e', borderRadius: 14,
    padding: 14, marginBottom: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  cardLeft: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  cardDesc: { fontSize: 13, color: '#888' },
  voteChip: {
    backgroundColor: '#7c5cfc22', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, marginLeft: 12,
  },
  voteText: { color: '#7c5cfc', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#888' },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 4 },
});

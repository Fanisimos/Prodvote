import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../lib/theme';
import { Feature, FeatureStatus } from '../../lib/types';

const STATUS_ORDER: { key: FeatureStatus; label: string; color: string }[] = [
  { key: 'in_progress', label: '🚀 In Progress', color: '#7c5cfc' },
  { key: 'planned', label: '📋 Planned', color: '#4dc9f6' },
  { key: 'under_review', label: '🔍 Under Review', color: '#ffb347' },
  { key: 'shipped', label: '✅ Shipped', color: '#34d399' },
];

interface Section { title: string; color: string; data: Feature[]; }

export default function RoadmapScreen() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  async function fetchRoadmap() {
    const { data } = await supabase.from('features_with_details').select('*')
      .in('status', ['in_progress', 'planned', 'under_review', 'shipped'])
      .order('score', { ascending: false });
    const grouped = STATUS_ORDER.map(s => ({
      title: s.label, color: s.color, data: (data || []).filter(f => f.status === s.key),
    })).filter(s => s.data.length > 0);
    setSections(grouped);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchRoadmap(); }, []);

  const s = styles(theme);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={theme.accent} /></View>;

  return (
    <View style={s.container}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={[s.sectionLine, { backgroundColor: section.color }]} />
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/feature/${item.id}`)}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardDesc} numberOfLines={1}>{item.description}</Text>
            </View>
            <View style={s.voteChip}><Text style={s.voteText}>▲ {item.vote_count}</Text></View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRoadmap(); }} tintColor={theme.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>Roadmap is empty</Text>
            <Text style={s.emptySubtext}>Vote on features to help shape the roadmap!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  sectionHeader: { marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 8 },
  sectionLine: { height: 3, borderRadius: 2, width: 40 },
  card: {
    flexDirection: 'row', backgroundColor: t.card, borderRadius: 14,
    padding: 14, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: t.text },
  cardDesc: { fontSize: 13, color: t.textMuted },
  voteChip: { backgroundColor: t.accentLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 12 },
  voteText: { color: t.accent, fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: t.textMuted },
  emptySubtext: { fontSize: 14, color: t.textMuted, marginTop: 4 },
});

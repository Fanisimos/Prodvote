import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
  Switch,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../lib/theme';
import { FeatureFlag } from '../../lib/types';

export default function AdminFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from('feature_flags').select('*').order('key');
    setFlags(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleFlag(flag: FeatureFlag) {
    const newVal = !flag.enabled;
    await supabase.from('feature_flags').update({
      enabled: newVal,
      updated_at: new Date().toISOString(),
    }).eq('id', flag.id);
    setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, enabled: newVal } : f));
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
      <Text style={s.heading}>Feature Flags</Text>
      <Text style={s.subtext}>Toggle features on/off across the app. Changes take effect within 5 minutes.</Text>

      {flags.map(flag => (
        <View key={flag.id} style={s.card}>
          <View style={s.cardLeft}>
            <Text style={s.flagKey}>{flag.key}</Text>
            {flag.description && <Text style={s.flagDesc}>{flag.description}</Text>}
            <Text style={s.flagTime}>
              Updated {new Date(flag.updated_at).toLocaleDateString()}
            </Text>
          </View>
          <Switch
            value={flag.enabled}
            onValueChange={() => toggleFlag(flag)}
            trackColor={{ true: theme.accent }}
          />
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
  subtext: { fontSize: 13, color: t.textMuted, marginBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: t.card, borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: t.cardBorder,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  flagKey: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 2 },
  flagDesc: { fontSize: 13, color: t.textSecondary, marginBottom: 4 },
  flagTime: { fontSize: 11, color: t.textMuted },
});

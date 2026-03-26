import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import Watermark from '../../components/Watermark';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../lib/theme';
import { Channel } from '../../lib/types';

export default function ChatScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('channels').select('*').order('sort_order');
    setChannels(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const s = styles(theme);

  return (
    <View style={s.container}>
      <Watermark />
      <FlatList
        data={channels}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchChannels} tintColor={theme.accent} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>💬</Text>
              <Text style={s.emptyText}>No channels yet</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.channelCard} onPress={() => router.push(`/chat/${item.id}`)}>
            <View style={[s.channelIcon, { backgroundColor: (item.color || '#7c5cfc') + '22' }]}>
              <Text style={{ fontSize: 24 }}>{item.emoji || '💬'}</Text>
            </View>
            <View style={s.channelInfo}>
              <View style={s.channelNameRow}>
                <Text style={s.channelName}>{item.name}</Text>
                {item.is_locked && <Text style={{ fontSize: 12 }}>🔒</Text>}
              </View>
              {item.description && <Text style={s.channelDesc} numberOfLines={1}>{item.description}</Text>}
            </View>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  channelCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.card,
    borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.cardBorder,
  },
  channelIcon: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  channelInfo: { flex: 1 },
  channelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  channelName: { fontSize: 17, fontWeight: '700', color: t.text },
  channelDesc: { fontSize: 13, color: t.textMuted, marginTop: 3 },
  arrow: { fontSize: 24, color: t.textMuted },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: t.textMuted, marginTop: 12 },
});

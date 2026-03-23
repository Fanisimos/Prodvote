import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Channel } from '../../lib/types';

export default function ChatScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('channels')
      .select('*')
      .order('sort_order');
    setChannels(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  return (
    <View style={styles.container}>
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchChannels} tintColor="#7c5cfc" />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No channels yet</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.channelCard}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <View style={[styles.channelIcon, { backgroundColor: (item.color || '#7c5cfc') + '22' }]}>
              <Text style={{ fontSize: 24 }}>{item.emoji || '💬'}</Text>
            </View>
            <View style={styles.channelInfo}>
              <View style={styles.channelNameRow}>
                <Text style={styles.channelName}>{item.name}</Text>
                {item.is_locked && <Text style={styles.lockIcon}>🔒</Text>}
              </View>
              {item.description && (
                <Text style={styles.channelDesc} numberOfLines={1}>{item.description}</Text>
              )}
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  channelCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e',
    borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e',
  },
  channelIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  channelInfo: { flex: 1 },
  channelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  channelName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  lockIcon: { fontSize: 12 },
  channelDesc: { fontSize: 13, color: '#888', marginTop: 3 },
  arrow: { fontSize: 24, color: '#555' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888' },
});

import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useChannels } from '../../hooks/useChat';
import { useTheme } from '../../lib/ThemeContext';
import Colors from '../../constants/Colors';
import Watermark from '../../components/Watermark';

export default function ChatScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { channels, loading } = useChannels();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Watermark />
      <FlatList
        data={channels}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.channelCard}
            onPress={() => router.push(`/chat/${item.id}?name=${encodeURIComponent(item.name)}&emoji=${encodeURIComponent(item.emoji)}`)}
            accessibilityLabel={`${item.emoji} ${item.name} channel${item.is_locked ? ', locked' : ''}`}
            accessibilityHint="Double tap to open chat"
            accessibilityRole="button"
          >
            <View style={[styles.channelIcon, { backgroundColor: item.color + '20' }]}>
              <Text style={styles.channelEmoji}>{item.emoji}</Text>
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
            <Text style={[styles.chevron, { color: item.color }]}>›</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Channels</Text>
            <Text style={styles.headerSub}>{channels.length} channels</Text>
          </View>
        }
      />
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    header: { marginBottom: 16 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
    headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    channelCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    channelIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    channelEmoji: { fontSize: 24 },
    channelInfo: { flex: 1 },
    channelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    channelName: { fontSize: 16, fontWeight: '700', color: colors.text },
    lockIcon: { fontSize: 12 },
    channelDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
    chevron: { fontSize: 28, fontWeight: '300' },
  });
}

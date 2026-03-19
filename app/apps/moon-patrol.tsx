import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';

export default function MoonPatrolScreen() {
  const { colors } = useTheme();

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.fallback, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🚀</Text>
        <Text style={[styles.fallbackText, { color: colors.text }]}>
          Moon Patrol is available on web only
        </Text>
        <Text style={[styles.fallbackSub, { color: colors.textSecondary }]}>
          Open Prodvote in your browser to play
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <iframe
        src="/games/moon-patrol.html"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: '#000',
        }}
        allow="autoplay"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fallback: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  fallbackText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  fallbackSub: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});

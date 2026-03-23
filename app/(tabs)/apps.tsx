import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';

const APPS = [
  { id: 'journal', name: 'Journal', emoji: '📓', color: '#7c5cfc', desc: 'Daily reflections' },
  { id: 'habits', name: 'Habits', emoji: '✅', color: '#34d399', desc: 'Track daily habits' },
  { id: 'pomodoro', name: 'Pomodoro', emoji: '🍅', color: '#ff4d6a', desc: '25/5 focus timer' },
  { id: 'eisenhower', name: 'Eisenhower', emoji: '📊', color: '#ffb347', desc: 'Priority matrix' },
  { id: 'kanban', name: 'Kanban', emoji: '📋', color: '#4dc9f6', desc: 'Task boards' },
  { id: 'notes', name: 'Notes', emoji: '📝', color: '#f472b6', desc: 'Quick notes' },
  { id: 'plans', name: 'Plans', emoji: '🎯', color: '#fbbf24', desc: 'Goals & plans' },
  { id: 'whiteboard', name: 'Whiteboard', emoji: '🎨', color: '#8b5cf6', desc: 'Draw & sketch' },
  { id: 'breathe', name: 'Breathe', emoji: '🫁', color: '#34d399', desc: 'Breathing exercises' },
  { id: 'hiit', name: 'HIIT', emoji: '🏋️', color: '#ff6b35', desc: 'Interval training' },
  { id: 'moon-patrol', name: 'Moon Patrol', emoji: '🚀', color: '#6366f1', desc: 'Space game' },
];

export default function AppsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Productivity</Text>
      <View style={styles.grid}>
        {APPS.slice(0, 7).map((app) => (
          <TouchableOpacity
            key={app.id}
            style={styles.appCard}
            onPress={() => router.push(`/apps/${app.id}` as any)}
          >
            <View style={[styles.appIcon, { backgroundColor: app.color + '22' }]}>
              <Text style={{ fontSize: 28 }}>{app.emoji}</Text>
            </View>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.appDesc}>{app.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Wellness & Fun</Text>
      <View style={styles.grid}>
        {APPS.slice(7).map((app) => (
          <TouchableOpacity
            key={app.id}
            style={styles.appCard}
            onPress={() => router.push(`/apps/${app.id}` as any)}
          >
            <View style={[styles.appIcon, { backgroundColor: app.color + '22' }]}>
              <Text style={{ fontSize: 28 }}>{app.emoji}</Text>
            </View>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.appDesc}>{app.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 16, marginTop: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  appCard: {
    width: '47%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  appDesc: { fontSize: 12, color: '#888', marginTop: 3 },
});

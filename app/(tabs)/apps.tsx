import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useTheme, Theme } from '../../lib/theme';

const PRODUCTIVITY = [
  { id: 'eisenhower', name: 'Eisenhower Matrix', emoji: '📋', desc: 'Prioritise tasks by urgency and importance across 4 quadrants' },
  { id: 'pomodoro', name: 'Pomodoro Timer', emoji: '⏱️', desc: 'Focus in 25-minute sprints with breaks to stay productive' },
  { id: 'habits', name: 'Habit Tracker', emoji: '🔥', desc: 'Build streaks and track daily habits with visual progress' },
  { id: 'notes', name: 'Quick Notes', emoji: '📝', desc: 'Capture ideas and thoughts on the go' },
  { id: 'kanban', name: 'Kanban Board', emoji: '📊', desc: 'Manage projects with To Do, In Progress, and Done columns' },
  { id: 'journal', name: 'Daily Journal', emoji: '📓', desc: 'Reflect on your day with prompts and mood tracking' },
  { id: 'plans', name: 'Plans', emoji: '🎯', desc: 'Set goals and track progress towards your targets' },
  { id: 'whiteboard', name: 'Whiteboard', emoji: '🎨', desc: 'Freehand drawing canvas — sketch ideas, mind-map, doodle' },
  { id: 'breathe', name: 'Breathe', emoji: '🫁', desc: 'Guided breathing exercises — box 4-7-8, calm & more' },
  { id: 'hiit', name: 'HIIT Timer', emoji: '🔥', desc: 'Interval workout timer with presets and custom builder' },
];

const GAMES = [
  { id: 'moon-patrol', name: 'Moon Patrol: Dark Frontier', emoji: '🚀', desc: 'Retro arcade shooter — dodge obstacles and blast aliens' },
];

export default function AppsScreen() {
  const { theme } = useTheme();
  const s = styles(theme);

  function renderApp(app: typeof PRODUCTIVITY[0]) {
    return (
      <TouchableOpacity
        key={app.id}
        style={s.appRow}
        onPress={() => router.push(`/apps/${app.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={s.emojiContainer}>
          <Text style={{ fontSize: 28 }}>{app.emoji}</Text>
        </View>
        <View style={s.appInfo}>
          <Text style={s.appName}>{app.name}</Text>
          <Text style={s.appDesc} numberOfLines={2}>{app.desc}</Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Image
        source={require('../../assets/images/logo-watermark.png')}
        style={s.watermark}
        tintColor={theme.watermarkTint}
        resizeMode="contain"
      />

      <Text style={s.heading}>Apps</Text>

      {PRODUCTIVITY.map(renderApp)}

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>GAMES</Text>
        <Text style={s.sectionCount}>{GAMES.length} game</Text>
      </View>

      {GAMES.map(renderApp)}
    </ScrollView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { paddingBottom: 40 },
  watermark: {
    position: 'absolute', width: 600, height: 600, opacity: 0.05,
    top: '15%', left: '50%', marginLeft: -300, zIndex: -1,
  },
  heading: { fontSize: 28, fontWeight: '800', color: t.text, padding: 16, paddingBottom: 8 },
  appRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.card,
    marginHorizontal: 16, marginBottom: 10, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: t.cardBorder,
  },
  emojiContainer: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: t.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  appInfo: { flex: 1, marginLeft: 14 },
  appName: { fontSize: 16, fontWeight: '700', color: t.text },
  appDesc: { fontSize: 13, color: t.textSecondary, marginTop: 3, lineHeight: 18 },
  chevron: { fontSize: 24, color: t.textMuted, marginLeft: 8 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: t.text, letterSpacing: 1 },
  sectionCount: { fontSize: 13, color: t.textMuted },
});

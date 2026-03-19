import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

interface JournalEntry {
  id: string;
  date: string;
  mood: string;
  gratitude: string;
  highlight: string;
  reflection: string;
  createdAt: string;
}

const STORAGE_KEY = 'prodvote_journal';
const MOODS = [
  { emoji: '😄', label: 'Great' },
  { emoji: '🙂', label: 'Good' },
  { emoji: '😐', label: 'Okay' },
  { emoji: '😔', label: 'Low' },
  { emoji: '😤', label: 'Tough' },
];

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function JournalScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<'write' | 'list'>('write');

  // Today's entry state
  const today = getToday();
  const todayEntry = entries.find(e => e.date === today);
  const [mood, setMood] = useState(todayEntry?.mood || '');
  const [gratitude, setGratitude] = useState(todayEntry?.gratitude || '');
  const [highlight, setHighlight] = useState(todayEntry?.highlight || '');
  const [reflection, setReflection] = useState(todayEntry?.reflection || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
          const parsed = JSON.parse(json);
          setEntries(parsed);
          const existing = parsed.find((e: JournalEntry) => e.date === today);
          if (existing) {
            setMood(existing.mood);
            setGratitude(existing.gratitude);
            setHighlight(existing.highlight);
            setReflection(existing.reflection);
          }
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, loaded]);

  function saveEntry() {
    const now = new Date().toISOString();
    if (todayEntry) {
      setEntries(prev => prev.map(e => e.date === today
        ? { ...e, mood, gratitude, highlight, reflection }
        : e
      ));
    } else {
      setEntries(prev => [{
        id: Date.now().toString(36),
        date: today,
        mood,
        gratitude,
        highlight,
        reflection,
        createdAt: now,
      }, ...prev]);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const streak = (() => {
    let count = 0;
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      if (sorted[i]?.date === expected) count++;
      else break;
    }
    return count;
  })();

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'write' && styles.toggleActive]}
          onPress={() => setView('write')}
        >
          <Text style={[styles.toggleText, view === 'write' && styles.toggleTextActive]}>Write</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'list' && styles.toggleActive]}
          onPress={() => setView('list')}
        >
          <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {view === 'write' ? (
        <ScrollView contentContainerStyle={styles.writeContent}>
          {/* Streak */}
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>📖</Text>
            <View>
              <Text style={styles.streakValue}>{streak} day streak</Text>
              <Text style={styles.streakLabel}>Keep writing daily!</Text>
            </View>
          </View>

          {/* Mood */}
          <Text style={styles.promptLabel}>How are you feeling?</Text>
          <View style={styles.moodRow}>
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.emoji}
                style={[styles.moodBtn, mood === m.emoji && styles.moodSelected]}
                onPress={() => setMood(m.emoji)}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, mood === m.emoji && styles.moodLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Prompts */}
          <Text style={styles.promptLabel}>What are you grateful for?</Text>
          <TextInput
            style={styles.promptInput}
            placeholder="Today I'm thankful for..."
            placeholderTextColor="#64748b"
            value={gratitude}
            onChangeText={setGratitude}
            multiline
          />

          <Text style={styles.promptLabel}>Today's highlight</Text>
          <TextInput
            style={styles.promptInput}
            placeholder="The best part of today was..."
            placeholderTextColor="#64748b"
            value={highlight}
            onChangeText={setHighlight}
            multiline
          />

          <Text style={styles.promptLabel}>Reflection</Text>
          <TextInput
            style={[styles.promptInput, { minHeight: 100 }]}
            placeholder="What's on your mind..."
            placeholderTextColor="#64748b"
            value={reflection}
            onChangeText={setReflection}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={saveEntry}>
            <Text style={styles.saveBtnText}>{saved ? '✓ Saved!' : 'Save Entry'}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={entries.sort((a, b) => b.date.localeCompare(a.date))}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
                <Text style={styles.entryMood}>{item.mood}</Text>
              </View>
              {item.gratitude ? (
                <View style={styles.entryField}>
                  <Text style={styles.fieldLabel}>Grateful for</Text>
                  <Text style={styles.fieldText}>{item.gratitude}</Text>
                </View>
              ) : null}
              {item.highlight ? (
                <View style={styles.entryField}>
                  <Text style={styles.fieldLabel}>Highlight</Text>
                  <Text style={styles.fieldText}>{item.highlight}</Text>
                </View>
              ) : null}
              {item.reflection ? (
                <View style={styles.entryField}>
                  <Text style={styles.fieldLabel}>Reflection</Text>
                  <Text style={styles.fieldText}>{item.reflection}</Text>
                </View>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySub}>Start your first journal entry today</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    toggle: {
      flexDirection: 'row', margin: 16, backgroundColor: colors.surface,
      borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    toggleActive: { backgroundColor: Colors.primary },
    toggleText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    toggleTextActive: { color: '#fff' },
    writeContent: { padding: 16, paddingBottom: 40 },
    streakCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface,
      borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    streakEmoji: { fontSize: 32 },
    streakValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
    streakLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 6 },
    moodBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    moodSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
    moodEmoji: { fontSize: 24 },
    moodLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
    moodLabelActive: { color: Colors.primary },
    promptLabel: {
      fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8,
    },
    promptInput: {
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
      borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, marginBottom: 20, minHeight: 60,
    },
    saveBtn: { backgroundColor: '#a78bfa', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    listContent: { padding: 16, paddingBottom: 40 },
    entryCard: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    entryDate: { fontSize: 15, fontWeight: '700', color: colors.text },
    entryMood: { fontSize: 24 },
    entryField: { marginBottom: 10 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    fieldText: { fontSize: 14, color: colors.text, lineHeight: 20 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 18, fontWeight: '600', color: colors.text },
    emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  });
}

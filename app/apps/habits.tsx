import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  streak: number;
  completedDates: string[];
  createdAt: string;
}

const STORAGE_KEY = 'prodvote_habits';
const ICONS = ['💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '✍️', '🎵', '💻', '🎨', '🧹'];
const HABIT_COLORS = ['#ff4d6a', '#ffb347', '#34d399', '#4dc9f6', '#a78bfa', '#7c5cfc'];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().split('T')[0],
      label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
      day: d.getDate(),
      isToday: i === 0,
    });
  }
  return days;
}

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort().reverse();
  const today = getToday();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export default function HabitsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('💪');
  const [selectedColor, setSelectedColor] = useState('#7c5cfc');
  const days = getLast7Days();
  const today = getToday();

  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) setHabits(JSON.parse(json));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits, loaded]);

  function addHabit() {
    if (!newName.trim()) return;
    const habit: Habit = {
      id: genId(),
      name: newName.trim(),
      icon: selectedIcon,
      color: selectedColor,
      streak: 0,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };
    setHabits(prev => [...prev, habit]);
    setNewName('');
    setShowAdd(false);
  }

  function toggleHabit(habitId: string, date: string) {
    setHabits(prev => prev.map(h => {
      if (h.id !== habitId) return h;
      const has = h.completedDates.includes(date);
      const newDates = has ? h.completedDates.filter(d => d !== date) : [...h.completedDates, date];
      return { ...h, completedDates: newDates, streak: calcStreak(newDates) };
    }));
  }

  function deleteHabit(id: string) {
    setHabits(prev => prev.filter(h => h.id !== id));
  }

  const completedToday = habits.filter(h => h.completedDates.includes(today)).length;

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressCount}>
            {completedToday}/{habits.length}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: habits.length > 0 ? `${(completedToday / habits.length) * 100}%` : '0%' },
            ]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {habits.map(habit => (
          <View key={habit.id} style={[styles.habitCard, { borderColor: habit.color + '25' }]}>
            <View style={styles.habitHeader}>
              <View style={styles.habitInfo}>
                <Text style={styles.habitIcon}>{habit.icon}</Text>
                <View>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <Text style={styles.habitStreak}>
                    {habit.streak > 0 ? `🔥 ${habit.streak} day streak` : 'No streak yet'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => deleteHabit(habit.id)}>
                <Text style={styles.habitDelete}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {days.map(day => {
                const done = habit.completedDates.includes(day.key);
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[
                      styles.dayCell,
                      done && { backgroundColor: habit.color },
                      day.isToday && !done && { borderColor: habit.color, borderWidth: 2 },
                    ]}
                    onPress={() => toggleHabit(habit.id, day.key)}
                  >
                    <Text style={[styles.dayLabel, done && { color: '#fff' }]}>{day.label}</Text>
                    <Text style={[styles.dayNum, done && { color: '#fff', fontWeight: '800' }]}>{day.day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {habits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyText}>No habits yet</Text>
            <Text style={styles.emptySub}>Start building positive habits today</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAdd(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>New Habit</Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Drink water, Read 20 pages..."
              placeholderTextColor="#64748b"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={styles.label}>ICON</Text>
            <View style={styles.iconPicker}>
              {ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconOption, selectedIcon === ic && styles.iconSelected]}
                  onPress={() => setSelectedIcon(ic)}
                >
                  <Text style={{ fontSize: 22 }}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>COLOR</Text>
            <View style={styles.colorPicker}>
              {HABIT_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c }, selectedColor === c && styles.colorSelected]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={addHabit}>
              <Text style={styles.addBtnText}>Add Habit</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    progressCard: {
      backgroundColor: colors.surface,
      margin: 16,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    progressCount: { fontSize: 15, fontWeight: '800', color: Colors.primary },
    progressBar: { height: 6, backgroundColor: colors.surfaceBorder, borderRadius: 3 },
    progressFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
    habitCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
    },
    habitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    habitInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    habitIcon: { fontSize: 28 },
    habitName: { fontSize: 16, fontWeight: '700', color: colors.text },
    habitStreak: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    habitDelete: { fontSize: 24, color: colors.textSecondary, padding: 4 },
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.background,
    },
    dayLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
    dayNum: { fontSize: 14, color: colors.text, marginTop: 2 },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 18, fontWeight: '600', color: colors.text },
    emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    fab: {
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
      backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
      shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    fabText: { fontSize: 28, color: '#fff', lineHeight: 56, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: colors.surfaceBorder, borderBottomWidth: 0,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 20 },
    input: {
      backgroundColor: colors.background, borderWidth: 1, borderColor: colors.surfaceBorder,
      borderRadius: 12, padding: 16, fontSize: 16, color: colors.text,
    },
    label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 18, marginBottom: 10, letterSpacing: 1 },
    iconPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    iconOption: { padding: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.surfaceBorder },
    iconSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
    colorPicker: { flexDirection: 'row', gap: 10 },
    colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
    colorSelected: { borderColor: '#fff' },
    addBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}

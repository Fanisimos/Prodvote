import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Habit } from '../../lib/types';

export default function HabitsScreen() {
  const { session } = useAuthContext();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newHabit, setNewHabit] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchHabits = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });
    setHabits(data || []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  function isCompletedToday(habit: Habit): boolean {
    if (!habit.last_completed_at) return false;
    const last = new Date(habit.last_completed_at);
    const now = new Date();
    return (
      last.getFullYear() === now.getFullYear() &&
      last.getMonth() === now.getMonth() &&
      last.getDate() === now.getDate()
    );
  }

  async function toggleHabit(habit: Habit) {
    if (!session) return;
    const completedToday = isCompletedToday(habit);

    if (completedToday) {
      // Undo today's completion: reduce streak, clear last_completed_at
      const newStreak = Math.max(0, habit.streak - 1);
      await supabase
        .from('habits')
        .update({ streak: newStreak, last_completed_at: null })
        .eq('id', habit.id);
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id ? { ...h, streak: newStreak, last_completed_at: null } : h
        )
      );
    } else {
      // Check if streak is consecutive (completed yesterday)
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      let newStreak = 1;
      if (habit.last_completed_at) {
        const last = new Date(habit.last_completed_at);
        if (
          last.getFullYear() === yesterday.getFullYear() &&
          last.getMonth() === yesterday.getMonth() &&
          last.getDate() === yesterday.getDate()
        ) {
          newStreak = habit.streak + 1;
        }
      }

      const nowISO = now.toISOString();
      await supabase
        .from('habits')
        .update({ streak: newStreak, last_completed_at: nowISO })
        .eq('id', habit.id);
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id ? { ...h, streak: newStreak, last_completed_at: nowISO } : h
        )
      );
    }
  }

  async function handleAdd() {
    if (!newHabit.trim() || !session) return;
    setAdding(true);
    const { error } = await supabase.from('habits').insert({
      user_id: session.user.id,
      name: newHabit.trim(),
      streak: 0,
    });
    setAdding(false);
    if (!error) {
      setNewHabit('');
      fetchHabits();
    } else {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Habit', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('habits').delete().eq('id', id);
          setHabits((prev) => prev.filter((h) => h.id !== id));
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* Add habit input */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="New habit..."
          placeholderTextColor="#666"
          value={newHabit}
          onChangeText={setNewHabit}
          maxLength={50}
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!newHabit.trim() || adding) && { opacity: 0.4 }]}
          onPress={handleAdd}
          disabled={!newHabit.trim() || adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addBtnText}>Add</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHabits} tintColor="#7c5cfc" />}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 40 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No habits yet</Text>
              <Text style={styles.emptySubtext}>Add your first habit above</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const done = isCompletedToday(item);
          return (
            <TouchableOpacity
              style={[styles.habitCard, done && styles.habitCardDone]}
              onPress={() => toggleHabit(item)}
              onLongPress={() => handleDelete(item.id)}
            >
              <View style={[styles.checkbox, done && styles.checkboxDone]}>
                {done && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.habitInfo}>
                <Text style={[styles.habitName, done && styles.habitNameDone]}>{item.name}</Text>
                <Text style={styles.streak}>
                  🔥 {item.streak} day{item.streak !== 1 ? 's' : ''} streak
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  addRow: {
    flexDirection: 'row', padding: 16, gap: 10,
  },
  addInput: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e',
  },
  addBtn: {
    backgroundColor: '#7c5cfc', borderRadius: 12, paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888' },
  emptySubtext: { fontSize: 13, color: '#555', marginTop: 4 },
  habitCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e',
  },
  habitCardDone: {
    borderColor: '#34d39944', backgroundColor: '#34d39909',
  },
  checkbox: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 2,
    borderColor: '#2a2a3e', alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  checkboxDone: { backgroundColor: '#34d399', borderColor: '#34d399' },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: '700' },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  habitNameDone: { color: '#34d399' },
  streak: { fontSize: 13, color: '#888', marginTop: 3 },
});

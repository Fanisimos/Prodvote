import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { KanbanBoard, KanbanCard } from '../../lib/types';

const COLUMNS = ['todo', 'in_progress', 'done'] as const;
type ColumnName = typeof COLUMNS[number];

const COLUMN_CONFIG: Record<ColumnName, { label: string; color: string }> = {
  todo: { label: 'To Do', color: '#ffb347' },
  in_progress: { label: 'In Progress', color: '#7c5cfc' },
  done: { label: 'Done', color: '#34d399' },
};

export default function KanbanScreen() {
  const { session } = useAuthContext();
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCardText, setNewCardText] = useState('');
  const [addingColumn, setAddingColumn] = useState<ColumnName | null>(null);

  const fetchBoard = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    // Get or create the user's default board
    let { data: boards } = await supabase
      .from('kanban_boards')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true })
      .limit(1);

    let currentBoard = boards?.[0] || null;

    if (!currentBoard) {
      const { data: newBoard } = await supabase
        .from('kanban_boards')
        .insert({ user_id: session.user.id, name: 'My Board' })
        .select()
        .single();
      currentBoard = newBoard;
    }

    setBoard(currentBoard);

    if (currentBoard) {
      const { data: cardData } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('board_id', currentBoard.id)
        .order('position', { ascending: true });
      setCards(cardData || []);
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  async function addCard(column: ColumnName) {
    if (!newCardText.trim() || !board) return;
    const columnCards = cards.filter((c) => c.column_name === column);
    const { data, error } = await supabase
      .from('kanban_cards')
      .insert({
        board_id: board.id,
        title: newCardText.trim(),
        column_name: column,
        position: columnCards.length,
      })
      .select()
      .single();

    if (!error && data) {
      setCards((prev) => [...prev, data]);
    }
    setNewCardText('');
    setAddingColumn(null);
  }

  async function moveCard(card: KanbanCard, direction: 'left' | 'right') {
    const currentIndex = COLUMNS.indexOf(card.column_name as ColumnName);
    const newIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= COLUMNS.length) return;

    const newColumn = COLUMNS[newIndex];
    const newColCards = cards.filter((c) => c.column_name === newColumn);

    await supabase
      .from('kanban_cards')
      .update({ column_name: newColumn, position: newColCards.length })
      .eq('id', card.id);

    setCards((prev) =>
      prev.map((c) =>
        c.id === card.id ? { ...c, column_name: newColumn, position: newColCards.length } : c
      )
    );
  }

  async function deleteCard(id: string) {
    Alert.alert('Delete Card', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('kanban_cards').delete().eq('id', id);
          setCards((prev) => prev.filter((c) => c.id !== id));
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {COLUMNS.map((col) => {
        const config = COLUMN_CONFIG[col];
        const columnCards = cards.filter((c) => c.column_name === col);
        const colIndex = COLUMNS.indexOf(col);

        return (
          <View key={col} style={styles.column}>
            <View style={styles.columnHeader}>
              <View style={[styles.columnDot, { backgroundColor: config.color }]} />
              <Text style={styles.columnTitle}>{config.label}</Text>
              <Text style={styles.columnCount}>{columnCards.length}</Text>
            </View>

            <ScrollView style={styles.columnCards} showsVerticalScrollIndicator={false}>
              {columnCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.card}
                  onLongPress={() => deleteCard(card.id)}
                >
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <View style={styles.cardActions}>
                    {colIndex > 0 && (
                      <TouchableOpacity
                        style={styles.moveBtn}
                        onPress={() => moveCard(card, 'left')}
                      >
                        <Text style={styles.moveBtnText}>←</Text>
                      </TouchableOpacity>
                    )}
                    {colIndex < COLUMNS.length - 1 && (
                      <TouchableOpacity
                        style={styles.moveBtn}
                        onPress={() => moveCard(card, 'right')}
                      >
                        <Text style={styles.moveBtnText}>→</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {addingColumn === col ? (
                <View style={styles.addCardRow}>
                  <TextInput
                    style={styles.addCardInput}
                    placeholder="Card title..."
                    placeholderTextColor="#666"
                    value={newCardText}
                    onChangeText={setNewCardText}
                    autoFocus
                    maxLength={100}
                    onSubmitEditing={() => addCard(col)}
                  />
                  <View style={styles.addCardActions}>
                    <TouchableOpacity
                      style={styles.addCardBtn}
                      onPress={() => addCard(col)}
                    >
                      <Text style={styles.addCardBtnText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setAddingColumn(null); setNewCardText(''); }}
                    >
                      <Text style={styles.addCardCancel}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addCardTrigger}
                  onPress={() => { setAddingColumn(col); setNewCardText(''); }}
                >
                  <Text style={styles.addCardTriggerText}>+ Add card</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  scrollContent: { padding: 16, gap: 12 },
  column: {
    width: 280, backgroundColor: '#1a1a2e', borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: '#2a2a3e',
  },
  columnHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8,
  },
  columnDot: { width: 10, height: 10, borderRadius: 5 },
  columnTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1 },
  columnCount: { fontSize: 13, color: '#888', fontWeight: '600' },
  columnCards: { flex: 1 },
  card: {
    backgroundColor: '#0a0a0f', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#2a2a3e',
  },
  cardTitle: { fontSize: 14, color: '#eee', fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  moveBtn: {
    backgroundColor: '#2a2a3e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  moveBtnText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  addCardRow: { marginTop: 4 },
  addCardInput: {
    backgroundColor: '#0a0a0f', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a3e',
  },
  addCardActions: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
  addCardBtn: {
    backgroundColor: '#7c5cfc', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8,
  },
  addCardBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addCardCancel: { color: '#888', fontSize: 13 },
  addCardTrigger: { paddingVertical: 10 },
  addCardTriggerText: { color: '#555', fontSize: 14 },
});

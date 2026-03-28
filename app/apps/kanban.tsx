import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme, Theme } from '../../lib/theme';
import { KanbanBoard, KanbanCard } from '../../lib/types';

const COLUMNS = ['todo', 'in_progress', 'done'] as const;
type ColumnName = typeof COLUMNS[number];

const COLUMN_CONFIG: Record<ColumnName, { label: string; color: string; emoji: string }> = {
  todo: { label: 'To Do', color: '#ffb347', emoji: '📋' },
  in_progress: { label: 'In Progress', color: '#7c5cfc', emoji: '⚡' },
  done: { label: 'Done', color: '#34d399', emoji: '✅' },
};

export default function KanbanScreen() {
  const { session } = useAuthContext();
  const { theme } = useTheme();
  const s = styles(theme);
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCardText, setNewCardText] = useState('');
  const [addingColumn, setAddingColumn] = useState<ColumnName | null>(null);

  const fetchBoard = useCallback(async () => {
    if (!session) return;
    setLoading(true);

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
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.scrollContent}
    >
      {COLUMNS.map((col) => {
        const config = COLUMN_CONFIG[col];
        const columnCards = cards.filter((c) => c.column_name === col);
        const colIndex = COLUMNS.indexOf(col);

        return (
          <View key={col} style={s.column}>
            <View style={s.columnHeader}>
              <Text style={{ fontSize: 16 }}>{config.emoji}</Text>
              <Text style={s.columnTitle}>{config.label}</Text>
              <View style={[s.columnCountBadge, { backgroundColor: config.color + '22' }]}>
                <Text style={[s.columnCount, { color: config.color }]}>{columnCards.length}</Text>
              </View>
            </View>

            <ScrollView style={s.columnCards} showsVerticalScrollIndicator={false}>
              {columnCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={s.card}
                  onLongPress={() => deleteCard(card.id)}
                >
                  <Text style={s.cardTitle}>{card.title}</Text>
                  <View style={s.cardActions}>
                    {colIndex > 0 && (
                      <TouchableOpacity
                        style={s.moveBtn}
                        onPress={() => moveCard(card, 'left')}
                      >
                        <Text style={s.moveBtnText}>←</Text>
                      </TouchableOpacity>
                    )}
                    {colIndex < COLUMNS.length - 1 && (
                      <TouchableOpacity
                        style={[s.moveBtn, { backgroundColor: config.color + '22' }]}
                        onPress={() => moveCard(card, 'right')}
                      >
                        <Text style={[s.moveBtnText, { color: config.color }]}>→</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {addingColumn === col ? (
                <View style={s.addCardRow}>
                  <TextInput
                    style={s.addCardInput}
                    placeholder="Card title..."
                    placeholderTextColor={theme.textMuted}
                    value={newCardText}
                    onChangeText={setNewCardText}
                    autoFocus
                    maxLength={100}
                    onSubmitEditing={() => addCard(col)}
                  />
                  <View style={s.addCardActions}>
                    <TouchableOpacity
                      style={s.addCardBtn}
                      onPress={() => addCard(col)}
                    >
                      <Text style={s.addCardBtnText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setAddingColumn(null); setNewCardText(''); }}
                    >
                      <Text style={s.addCardCancel}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.addCardTrigger}
                  onPress={() => { setAddingColumn(col); setNewCardText(''); }}
                >
                  <Text style={s.addCardTriggerText}>+ Add card</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  scrollContent: { padding: 16, gap: 12 },
  column: {
    width: 280, backgroundColor: t.card, borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: t.cardBorder,
  },
  columnHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8,
  },
  columnTitle: { fontSize: 16, fontWeight: '700', color: t.text, flex: 1 },
  columnCountBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  columnCount: { fontSize: 13, fontWeight: '700' },
  columnCards: { flex: 1 },
  card: {
    backgroundColor: t.surface, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: t.cardBorder,
  },
  cardTitle: { fontSize: 14, color: t.text, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  moveBtn: {
    backgroundColor: t.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  moveBtnText: { color: t.textMuted, fontSize: 14, fontWeight: '600' },
  addCardRow: { marginTop: 4 },
  addCardInput: {
    backgroundColor: t.inputBg, borderRadius: 10, padding: 12,
    color: t.text, fontSize: 14, borderWidth: 1, borderColor: t.inputBorder,
  },
  addCardActions: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' },
  addCardBtn: {
    backgroundColor: t.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8,
  },
  addCardBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addCardCancel: { color: t.textMuted, fontSize: 13 },
  addCardTrigger: { paddingVertical: 10 },
  addCardTriggerText: { color: t.textMuted, fontSize: 14 },
});

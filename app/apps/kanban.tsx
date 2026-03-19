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
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

type Column = 'todo' | 'progress' | 'done';

interface KanbanCard {
  id: string;
  text: string;
  column: Column;
  color: string;
  createdAt: string;
}

const STORAGE_KEY = 'prodvote_kanban';
const CARD_COLORS = ['#7c5cfc', '#ff4d6a', '#ffb347', '#34d399', '#4dc9f6', '#a78bfa'];

const COLUMNS: Record<Column, { label: string; color: string; icon: string }> = {
  todo: { label: 'To Do', color: '#94a3b8', icon: '○' },
  progress: { label: 'In Progress', color: '#ffb347', icon: '◐' },
  done: { label: 'Done', color: '#34d399', icon: '●' },
};

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function KanbanScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addColumn, setAddColumn] = useState<Column>('todo');
  const [newText, setNewText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#7c5cfc');
  const [moveCard, setMoveCard] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) setCards(JSON.parse(json));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards, loaded]);

  function addCard() {
    if (!newText.trim()) return;
    setCards(prev => [...prev, {
      id: genId(),
      text: newText.trim(),
      column: addColumn,
      color: selectedColor,
      createdAt: new Date().toISOString(),
    }]);
    setNewText('');
    setShowAdd(false);
  }

  function moveToColumn(cardId: string, column: Column) {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, column } : c));
    setMoveCard(null);
  }

  function deleteCard(id: string) {
    if (Platform.OS === 'web') {
      setCards(prev => prev.filter(c => c.id !== id));
    } else {
      Alert.alert('Delete Card', 'Remove this card?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => setCards(prev => prev.filter(c => c.id !== id)) },
      ]);
    }
  }

  function openAdd(column: Column) {
    setAddColumn(column);
    setNewText('');
    setShowAdd(true);
  }

  const getCards = (col: Column) => cards.filter(c => c.column === col);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {(Object.keys(COLUMNS) as Column[]).map(col => {
          const colCards = getCards(col);
          const config = COLUMNS[col];
          return (
            <View key={col} style={styles.column}>
              <View style={styles.colHeader}>
                <View style={styles.colTitleRow}>
                  <Text style={[styles.colIcon, { color: config.color }]}>{config.icon}</Text>
                  <Text style={styles.colTitle}>{config.label}</Text>
                  <View style={[styles.colCount, { backgroundColor: config.color + '22' }]}>
                    <Text style={[styles.colCountText, { color: config.color }]}>{colCards.length}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => openAdd(col)}>
                  <Text style={[styles.addIcon, { color: config.color }]}>+</Text>
                </TouchableOpacity>
              </View>

              {colCards.map(card => (
                <View key={card.id} style={[styles.card, { borderLeftColor: card.color, borderLeftWidth: 3 }]}>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardText}>{card.text}</Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => setMoveCard(card.id)} style={styles.cardBtn}>
                        <Text style={styles.cardBtnText}>↗ Move</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteCard(card.id)} style={styles.cardBtn}>
                        <Text style={[styles.cardBtnText, { color: colors.error }]}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              {colCards.length === 0 && (
                <TouchableOpacity style={styles.emptyCol} onPress={() => openAdd(col)}>
                  <Text style={styles.emptyColText}>+ Add a card</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Card Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowAdd(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              Add to {COLUMNS[addColumn].label}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              placeholderTextColor="#64748b"
              value={newText}
              onChangeText={setNewText}
              autoFocus
              multiline
            />

            <Text style={styles.label}>COLOR</Text>
            <View style={styles.colorRow}>
              {CARD_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorSelected]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={addCard}>
              <Text style={styles.addBtnText}>Add Card</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Move Card Modal */}
      <Modal visible={moveCard !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setMoveCard(null)}>
          <Pressable style={styles.moveModal} onPress={() => {}}>
            <Text style={styles.modalTitle}>Move to</Text>
            {(Object.keys(COLUMNS) as Column[]).map(col => (
              <TouchableOpacity
                key={col}
                style={styles.moveOption}
                onPress={() => moveCard && moveToColumn(moveCard, col)}
              >
                <Text style={[styles.moveIcon, { color: COLUMNS[col].color }]}>{COLUMNS[col].icon}</Text>
                <Text style={styles.moveText}>{COLUMNS[col].label}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 40 },
    column: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    colHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    colTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    colIcon: { fontSize: 16 },
    colTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    colCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    colCountText: { fontSize: 12, fontWeight: '800' },
    addIcon: { fontSize: 24, fontWeight: '400' },
    card: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
    },
    cardContent: {},
    cardText: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 10 },
    cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
    cardBtn: { padding: 4 },
    cardBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    emptyCol: { paddingVertical: 20, alignItems: 'center' },
    emptyColText: { fontSize: 14, color: colors.textSecondary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: colors.surfaceBorder, borderBottomWidth: 0,
    },
    moveModal: {
      backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: colors.surfaceBorder, borderBottomWidth: 0,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 20 },
    input: {
      backgroundColor: colors.background, borderWidth: 1, borderColor: colors.surfaceBorder,
      borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, minHeight: 80,
    },
    label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 16, marginBottom: 10, letterSpacing: 1 },
    colorRow: { flexDirection: 'row', gap: 10 },
    colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: 'transparent' },
    colorSelected: { borderColor: '#fff' },
    addBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    moveOption: {
      flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16,
      borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
    },
    moveIcon: { fontSize: 20 },
    moveText: { fontSize: 16, fontWeight: '600', color: colors.text },
  });
}

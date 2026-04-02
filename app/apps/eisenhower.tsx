import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native';
import { useTheme, Theme } from '../../lib/theme';

type Quadrant = 'ui' | 'uni' | 'uni2' | 'nuni';

interface Item {
  id: string;
  text: string;
  quadrant: Quadrant;
}

const QUADRANTS: { key: Quadrant; title: string; subtitle: string; color: string }[] = [
  { key: 'ui', title: 'Do', subtitle: 'Urgent & Important', color: '#ff4d6a' },
  { key: 'uni', title: 'Schedule', subtitle: 'Not Urgent & Important', color: '#7c5cfc' },
  { key: 'uni2', title: 'Delegate', subtitle: 'Urgent & Not Important', color: '#ffb347' },
  { key: 'nuni', title: 'Eliminate', subtitle: 'Not Urgent & Not Important', color: '#888' },
];

export default function EisenhowerScreen() {
  const { theme } = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeQuadrant, setActiveQuadrant] = useState<Quadrant | null>(null);

  function addItem(quadrant: Quadrant) {
    if (!inputText.trim()) {
      setActiveQuadrant(quadrant);
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), text: inputText.trim(), quadrant },
    ]);
    setInputText('');
    setActiveQuadrant(null);
  }

  function removeItem(id: string) {
    Alert.alert('Remove', 'Delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setItems((prev) => prev.filter((i) => i.id !== id)) },
    ]);
  }

  function getItems(quadrant: Quadrant) {
    return items.filter((i) => i.quadrant === quadrant);
  }

  const s = styles(theme);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Input row if a quadrant is active */}
      {activeQuadrant && (
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder={`Add to ${QUADRANTS.find((q) => q.key === activeQuadrant)?.title}...`}
            placeholderTextColor={theme.textMuted}
            value={inputText}
            onChangeText={setInputText}
            maxLength={100}
            autoFocus
            onSubmitEditing={() => addItem(activeQuadrant)}
          />
          <TouchableOpacity style={s.inputBtn} onPress={() => addItem(activeQuadrant)}>
            <Text style={s.inputBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.inputCancelBtn} onPress={() => { setActiveQuadrant(null); setInputText(''); }}>
            <Text style={s.inputCancelText}>X</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2x2 Grid */}
      <View style={s.grid}>
        {QUADRANTS.map((q) => (
          <View key={q.key} style={[s.quadrant, { borderColor: q.color + '44' }]}>
            <View style={s.quadrantHeader}>
              <View>
                <Text style={[s.quadrantTitle, { color: q.color }]}>{q.title}</Text>
                <Text style={s.quadrantSubtitle}>{q.subtitle}</Text>
              </View>
              <TouchableOpacity
                style={[s.quadrantAddBtn, { backgroundColor: q.color + '22' }]}
                onPress={() => { setActiveQuadrant(q.key); setInputText(''); }}
              >
                <Text style={[s.quadrantAddText, { color: q.color }]}>+</Text>
              </TouchableOpacity>
            </View>
            {getItems(q.key).length === 0 ? (
              <Text style={s.quadrantEmpty}>No items</Text>
            ) : (
              getItems(q.key).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={s.itemRow}
                  onLongPress={() => removeItem(item.id)}
                >
                  <View style={[s.itemDot, { backgroundColor: q.color }]} />
                  <Text style={s.itemText}>{item.text}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1, backgroundColor: t.inputBg, borderRadius: 12, padding: 14,
    color: t.text, fontSize: 15, borderWidth: 1, borderColor: t.inputBorder,
  },
  inputBtn: {
    backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 18,
    justifyContent: 'center',
  },
  inputBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  inputCancelBtn: {
    backgroundColor: t.surface, borderRadius: 12, paddingHorizontal: 14,
    justifyContent: 'center',
  },
  inputCancelText: { color: t.textMuted, fontWeight: '700', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quadrant: {
    width: '47%', backgroundColor: t.card, borderRadius: 16, padding: 14,
    borderWidth: 1, minHeight: 180,
  },
  quadrantHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  quadrantTitle: { fontSize: 16, fontWeight: '800' },
  quadrantSubtitle: { fontSize: 10, color: t.textMuted, marginTop: 2 },
  quadrantAddBtn: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  quadrantAddText: { fontSize: 18, fontWeight: '700' },
  quadrantEmpty: { fontSize: 12, color: t.textMuted, fontStyle: 'italic' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  itemText: { fontSize: 13, color: t.text, flex: 1 },
});

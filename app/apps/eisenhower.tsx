import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native';

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Input row if a quadrant is active */}
      {activeQuadrant && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={`Add to ${QUADRANTS.find((q) => q.key === activeQuadrant)?.title}...`}
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            maxLength={100}
            autoFocus
            onSubmitEditing={() => addItem(activeQuadrant)}
          />
          <TouchableOpacity style={styles.inputBtn} onPress={() => addItem(activeQuadrant)}>
            <Text style={styles.inputBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inputCancelBtn} onPress={() => { setActiveQuadrant(null); setInputText(''); }}>
            <Text style={styles.inputCancelText}>X</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 2x2 Grid */}
      <View style={styles.grid}>
        {QUADRANTS.map((q) => (
          <View key={q.key} style={[styles.quadrant, { borderColor: q.color + '44' }]}>
            <View style={styles.quadrantHeader}>
              <View>
                <Text style={[styles.quadrantTitle, { color: q.color }]}>{q.title}</Text>
                <Text style={styles.quadrantSubtitle}>{q.subtitle}</Text>
              </View>
              <TouchableOpacity
                style={[styles.quadrantAddBtn, { backgroundColor: q.color + '22' }]}
                onPress={() => { setActiveQuadrant(q.key); setInputText(''); }}
              >
                <Text style={[styles.quadrantAddText, { color: q.color }]}>+</Text>
              </TouchableOpacity>
            </View>
            {getItems(q.key).length === 0 ? (
              <Text style={styles.quadrantEmpty}>No items</Text>
            ) : (
              getItems(q.key).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemRow}
                  onLongPress={() => removeItem(item.id)}
                >
                  <View style={[styles.itemDot, { backgroundColor: q.color }]} />
                  <Text style={styles.itemText}>{item.text}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 16, paddingBottom: 40 },
  inputRow: {
    flexDirection: 'row', gap: 10, marginBottom: 16,
  },
  input: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e',
  },
  inputBtn: {
    backgroundColor: '#7c5cfc', borderRadius: 12, paddingHorizontal: 18,
    justifyContent: 'center',
  },
  inputBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  inputCancelBtn: {
    backgroundColor: '#2a2a3e', borderRadius: 12, paddingHorizontal: 14,
    justifyContent: 'center',
  },
  inputCancelText: { color: '#888', fontWeight: '700', fontSize: 15 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  quadrant: {
    width: '47%', backgroundColor: '#1a1a2e', borderRadius: 16, padding: 14,
    borderWidth: 1, minHeight: 180,
  },
  quadrantHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  quadrantTitle: { fontSize: 16, fontWeight: '800' },
  quadrantSubtitle: { fontSize: 10, color: '#666', marginTop: 2 },
  quadrantAddBtn: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  quadrantAddText: { fontSize: 18, fontWeight: '700' },
  quadrantEmpty: { fontSize: 12, color: '#444', fontStyle: 'italic' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  itemText: { fontSize: 13, color: '#ddd', flex: 1 },
});

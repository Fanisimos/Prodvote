import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';

interface Note {
  id: string;
  title: string;
  body: string;
  color: string;
  updatedAt: string;
  pinned: boolean;
}

const STORAGE_KEY = 'prodvote_notes';
const NOTE_COLORS = ['#1e293b', '#2d1b4e', '#1b2e3d', '#2d1b1b', '#1b2d1e', '#2d2a1b'];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotesScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) setNotes(JSON.parse(json));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, loaded]);

  function openNew() {
    setTitle('');
    setBody('');
    setEditing({ id: '', title: '', body: '', color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)], updatedAt: '', pinned: false });
  }

  function openEdit(note: Note) {
    setTitle(note.title);
    setBody(note.body);
    setEditing(note);
  }

  function saveNote() {
    if (!title.trim() && !body.trim()) {
      setEditing(null);
      return;
    }
    const now = new Date().toISOString();
    if (editing?.id) {
      setNotes(prev => prev.map(n => n.id === editing.id ? { ...n, title: title.trim(), body: body.trim(), updatedAt: now } : n));
    } else {
      setNotes(prev => [{
        id: genId(),
        title: title.trim(),
        body: body.trim(),
        color: editing?.color || NOTE_COLORS[0],
        updatedAt: now,
        pinned: false,
      }, ...prev]);
    }
    setEditing(null);
  }

  function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
    setEditing(null);
  }

  function togglePin(id: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }

  const filtered = notes
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.noteCard, { backgroundColor: item.color }]}
            onPress={() => openEdit(item)}
            activeOpacity={0.7}
          >
            {item.pinned && <Text style={styles.pin}>📌</Text>}
            {item.title ? <Text style={styles.noteTitle} numberOfLines={2}>{item.title}</Text> : null}
            <Text style={styles.noteBody} numberOfLines={6}>{item.body}</Text>
            <Text style={styles.noteTime}>{timeAgo(item.updatedAt)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptySub}>Tap + to capture an idea</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openNew}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Editor Modal */}
      <Modal visible={editing !== null} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalOverlay} onPress={saveNote}>
            <Pressable style={styles.modalContent} onPress={() => {}}>
              <View style={styles.editorHeader}>
                <Text style={styles.modalTitle}>{editing?.id ? 'Edit Note' : 'New Note'}</Text>
                <View style={styles.editorActions}>
                  {editing?.id && (
                    <>
                      <TouchableOpacity onPress={() => togglePin(editing.id)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>{editing.pinned ? '📌' : 'Pin'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteNote(editing.id)} style={styles.actionBtn}>
                        <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <TextInput
                style={styles.titleInput}
                placeholder="Title"
                placeholderTextColor="#64748b"
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
              <TextInput
                style={styles.bodyInput}
                placeholder="Start writing..."
                placeholderTextColor="#64748b"
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveNote}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchBar: { paddingHorizontal: 16, paddingVertical: 12 },
    searchInput: {
      backgroundColor: colors.surface, borderRadius: 12, padding: 14,
      fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    grid: { paddingHorizontal: 12, paddingBottom: 100 },
    row: { gap: 10, paddingHorizontal: 4 },
    noteCard: {
      flex: 1, borderRadius: 14, padding: 14, marginBottom: 10, minHeight: 120,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    },
    pin: { fontSize: 12, marginBottom: 4 },
    noteTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
    noteBody: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
    noteTime: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 10 },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 18, fontWeight: '600', color: colors.text },
    emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    fab: {
      position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
      backgroundColor: '#34d399', justifyContent: 'center', alignItems: 'center',
      shadowColor: '#34d399', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    },
    fabText: { fontSize: 28, color: '#fff' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: {
      backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 40, maxHeight: '85%', borderWidth: 1,
      borderColor: colors.surfaceBorder, borderBottomWidth: 0,
    },
    editorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    editorActions: { flexDirection: 'row', gap: 12 },
    actionBtn: { padding: 6 },
    actionText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    titleInput: {
      fontSize: 20, fontWeight: '700', color: colors.text, paddingVertical: 8,
      borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, marginBottom: 12,
    },
    bodyInput: {
      fontSize: 16, color: colors.text, minHeight: 200, lineHeight: 24,
    },
    saveBtn: { backgroundColor: '#34d399', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}

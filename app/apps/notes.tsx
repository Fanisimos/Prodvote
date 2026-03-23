import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Note } from '../../lib/types';

export default function NotesScreen() {
  const { session } = useAuthContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    setNotes(data || []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  function openNew() {
    setEditingNote(null);
    setTitle('');
    setBody('');
    setModalVisible(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setTitle(note.title || '');
    setBody(note.body || '');
    setModalVisible(true);
  }

  async function handleSave() {
    if (!session) return;
    setSaving(true);

    if (editingNote) {
      const { error } = await supabase
        .from('notes')
        .update({
          title: title.trim() || null,
          body: body.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingNote.id);
      if (error) Alert.alert('Error', error.message);
    } else {
      const { error } = await supabase.from('notes').insert({
        user_id: session.user.id,
        title: title.trim() || null,
        body: body.trim() || null,
      });
      if (error) Alert.alert('Error', error.message);
    }

    setSaving(false);
    setModalVisible(false);
    setTitle('');
    setBody('');
    setEditingNote(null);
    fetchNotes();
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('notes').delete().eq('id', id);
          setNotes((prev) => prev.filter((n) => n.id !== id));
        },
      },
    ]);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchNotes} tintColor="#7c5cfc" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No notes yet</Text>
              <Text style={styles.emptySubtext}>Tap + to create one</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.noteCard}
            onPress={() => openEdit(item)}
            onLongPress={() => handleDelete(item.id)}
          >
            {item.title && <Text style={styles.noteTitle} numberOfLines={2}>{item.title}</Text>}
            {item.body && <Text style={styles.noteBody} numberOfLines={5}>{item.body}</Text>}
            <Text style={styles.noteDate}>{formatDate(item.updated_at)}</Text>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openNew}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Note Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Write something..."
              placeholderTextColor="#666"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={8}
              maxLength={5000}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setModalVisible(false); setEditingNote(null); setTitle(''); setBody(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.4 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888' },
  emptySubtext: { fontSize: 13, color: '#555', marginTop: 4 },
  noteCard: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e',
  },
  noteTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  noteBody: { fontSize: 13, color: '#aaa', lineHeight: 18, marginBottom: 8 },
  noteDate: { fontSize: 11, color: '#555' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7c5cfc', alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: '#7c5cfc', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '600', marginTop: -2 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  input: {
    backgroundColor: '#0a0a0f', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e', marginBottom: 12,
  },
  inputMultiline: { minHeight: 160, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#2a2a3e',
  },
  cancelBtnText: { color: '#888', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#7c5cfc',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

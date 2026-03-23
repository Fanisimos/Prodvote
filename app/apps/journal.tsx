import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { JournalEntry } from '../../lib/types';

export default function JournalScreen() {
  const { session } = useAuthContext();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleAdd() {
    if (!body.trim() || !session) return;
    setSaving(true);
    const { error } = await supabase.from('journal_entries').insert({
      user_id: session.user.id,
      title: title.trim() || null,
      body: body.trim(),
    });
    setSaving(false);
    if (!error) {
      setTitle('');
      setBody('');
      setModalVisible(false);
      fetchEntries();
    } else {
      Alert.alert('Error', error.message);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('journal_entries').delete().eq('id', id);
          setEntries((prev) => prev.filter((e) => e.id !== id));
        },
      },
    ]);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchEntries} tintColor="#7c5cfc" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📓</Text>
              <Text style={styles.emptyText}>No journal entries yet</Text>
              <Text style={styles.emptySubtext}>Tap + to write your first entry</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onLongPress={() => handleDelete(item.id)}>
            <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
            {item.title && <Text style={styles.cardTitle}>{item.title}</Text>}
            <Text style={styles.cardBody} numberOfLines={4}>{item.body}</Text>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* New Entry Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Entry</Text>
            <TextInput
              style={styles.input}
              placeholder="Title (optional)"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="What's on your mind?"
              placeholderTextColor="#666"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              maxLength={2000}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setModalVisible(false); setTitle(''); setBody(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!body.trim() || saving) && { opacity: 0.4 }]}
                onPress={handleAdd}
                disabled={!body.trim() || saving}
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
  card: {
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e',
  },
  cardDate: { fontSize: 12, color: '#7c5cfc', fontWeight: '600', marginBottom: 6 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 6 },
  cardBody: { fontSize: 14, color: '#ccc', lineHeight: 20 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7c5cfc', alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: '#7c5cfc', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '600', marginTop: -2 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
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
  inputMultiline: { minHeight: 120, textAlignVertical: 'top' },
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

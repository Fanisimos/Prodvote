import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { JournalEntry } from '../../lib/types';
import { useTheme, Theme } from '../../lib/theme';

export default function JournalScreen() {
  const { session } = useAuthContext();
  const { theme } = useTheme();
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

  const s = styles(theme);

  return (
    <View style={s.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchEntries} tintColor={theme.accent} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📓</Text>
              <Text style={s.emptyText}>No journal entries yet</Text>
              <Text style={s.emptySubtext}>Tap + to write your first entry</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onLongPress={() => handleDelete(item.id)}>
            <Text style={s.cardDate}>{formatDate(item.created_at)}</Text>
            {item.title && <Text style={s.cardTitle}>{item.title}</Text>}
            <Text style={s.cardBody} numberOfLines={4}>{item.body}</Text>
          </TouchableOpacity>
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setModalVisible(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* New Entry Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>New Entry</Text>
            <TextInput
              style={s.input}
              placeholder="Title (optional)"
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <TextInput
              style={[s.input, s.inputMultiline]}
              placeholder="What's on your mind?"
              placeholderTextColor={theme.textMuted}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={6}
              maxLength={2000}
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setModalVisible(false); setTitle(''); setBody(''); }}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, (!body.trim() || saving) && { opacity: 0.4 }]}
                onPress={handleAdd}
                disabled={!body.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: t.textMuted },
  emptySubtext: { fontSize: 13, color: t.textMuted, marginTop: 4 },
  card: {
    backgroundColor: t.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: t.cardBorder,
  },
  cardDate: { fontSize: 12, color: t.accent, fontWeight: '600', marginBottom: 6 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: t.text, marginBottom: 6 },
  cardBody: { fontSize: 14, color: t.textSecondary || t.textMuted, lineHeight: 20 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: t.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '600', marginTop: -2 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: t.text, marginBottom: 16 },
  input: {
    backgroundColor: t.inputBg, borderRadius: 12, padding: 14,
    color: t.text, fontSize: 15, borderWidth: 1, borderColor: t.inputBorder, marginBottom: 12,
  },
  inputMultiline: { minHeight: 120, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: t.surface,
  },
  cancelBtnText: { color: t.textMuted, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: t.accent,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

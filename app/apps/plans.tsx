import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Plan } from '../../lib/types';

const STATUS_OPTIONS = ['active', 'completed', 'archived'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Active', color: '#7c5cfc' },
  completed: { label: 'Completed', color: '#34d399' },
  archived: { label: 'Archived', color: '#888' },
};

export default function PlansScreen() {
  const { session } = useAuthContext();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', filter)
      .order('created_at', { ascending: false });
    setPlans(data || []);
    setLoading(false);
  }, [session, filter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  async function handleAdd() {
    if (!title.trim() || !session) return;
    setSaving(true);
    const { error } = await supabase.from('plans').insert({
      user_id: session.user.id,
      title: title.trim(),
      description: description.trim() || null,
      status: 'active',
      due_date: dueDate.trim() || null,
    });
    setSaving(false);
    if (!error) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setModalVisible(false);
      fetchPlans();
    } else {
      Alert.alert('Error', error.message);
    }
  }

  async function updateStatus(plan: Plan, newStatus: string) {
    await supabase.from('plans').update({ status: newStatus }).eq('id', plan.id);
    fetchPlans();
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete Plan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('plans').delete().eq('id', id);
          setPlans((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  }

  function formatDueDate(dateStr: string | null) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const isPast = d < now;
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return { label, isPast };
  }

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {STATUS_OPTIONS.map((s) => {
          const config = STATUS_CONFIG[s];
          const isActive = filter === s;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, isActive && { backgroundColor: config.color + '22', borderColor: config.color }]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.filterText, isActive && { color: config.color }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPlans} tintColor="#7c5cfc" />}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyText}>No {filter} plans</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const due = formatDueDate(item.due_date);
          const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.active;
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => handleDelete(item.id)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={[styles.statusDot, { backgroundColor: config.color }]} />
              </View>
              {item.description && (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              )}
              <View style={styles.cardFooter}>
                {due && (
                  <Text style={[styles.dueDate, due.isPast && item.status === 'active' && { color: '#ff4d6a' }]}>
                    Due: {due.label}
                  </Text>
                )}
                <View style={styles.cardActions}>
                  {item.status === 'active' && (
                    <TouchableOpacity
                      style={styles.actionChip}
                      onPress={() => updateStatus(item, 'completed')}
                    >
                      <Text style={styles.actionChipText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'active' && (
                    <TouchableOpacity
                      style={[styles.actionChip, { backgroundColor: '#88888822' }]}
                      onPress={() => updateStatus(item, 'archived')}
                    >
                      <Text style={[styles.actionChipText, { color: '#888' }]}>Archive</Text>
                    </TouchableOpacity>
                  )}
                  {item.status !== 'active' && (
                    <TouchableOpacity
                      style={styles.actionChip}
                      onPress={() => updateStatus(item, 'active')}
                    >
                      <Text style={styles.actionChipText}>Reactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* New Plan Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Plan</Text>
            <TextInput
              style={styles.input}
              placeholder="Plan title"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Description (optional)"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <TextInput
              style={styles.input}
              placeholder="Due date (YYYY-MM-DD)"
              placeholderTextColor="#666"
              value={dueDate}
              onChangeText={setDueDate}
              maxLength={10}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setModalVisible(false); setTitle(''); setDescription(''); setDueDate(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!title.trim() || saving) && { opacity: 0.4 }]}
                onPress={handleAdd}
                disabled={!title.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Create</Text>
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
  filterRow: { flexDirection: 'row', gap: 8, padding: 16 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  filterText: { fontSize: 13, fontWeight: '600', color: '#666' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888' },
  card: {
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#fff', flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardDesc: { fontSize: 14, color: '#aaa', marginTop: 6, lineHeight: 20 },
  cardFooter: { marginTop: 12 },
  dueDate: { fontSize: 12, color: '#888', marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionChip: {
    backgroundColor: '#7c5cfc22', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
  },
  actionChipText: { color: '#7c5cfc', fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7c5cfc', alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: '#7c5cfc', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '600', marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  input: {
    backgroundColor: '#0a0a0f', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e', marginBottom: 12,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#2a2a3e',
  },
  cancelBtnText: { color: '#888', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#7c5cfc',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

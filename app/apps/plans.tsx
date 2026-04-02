import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Plan } from '../../lib/types';
import { useTheme, Theme } from '../../lib/theme';

const STATUS_OPTIONS = ['active', 'completed', 'archived'] as const;

export default function PlansScreen() {
  const { session } = useAuthContext();
  const { theme } = useTheme();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: theme.accent },
    completed: { label: 'Completed', color: '#34d399' },
    archived: { label: 'Archived', color: theme.textMuted },
  };

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

  const s = styles(theme);

  return (
    <View style={s.container}>
      {/* Filter tabs */}
      <View style={s.filterRow}>
        {STATUS_OPTIONS.map((st) => {
          const config = STATUS_CONFIG[st];
          const isActive = filter === st;
          return (
            <TouchableOpacity
              key={st}
              style={[s.filterTab, isActive && { backgroundColor: config.color + '22', borderColor: config.color }]}
              onPress={() => setFilter(st)}
            >
              <Text style={[s.filterText, isActive && { color: config.color }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPlans} tintColor={theme.accent} />}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🎯</Text>
              <Text style={s.emptyText}>No {filter} plans</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const due = formatDueDate(item.due_date);
          const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.active;
          return (
            <TouchableOpacity style={s.card} onLongPress={() => handleDelete(item.id)}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <View style={[s.statusDot, { backgroundColor: config.color }]} />
              </View>
              {item.description && (
                <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
              )}
              <View style={s.cardFooter}>
                {due && (
                  <Text style={[s.dueDate, due.isPast && item.status === 'active' && { color: '#ff4d6a' }]}>
                    Due: {due.label}
                  </Text>
                )}
                <View style={s.cardActions}>
                  {item.status === 'active' && (
                    <TouchableOpacity
                      style={s.actionChip}
                      onPress={() => updateStatus(item, 'completed')}
                    >
                      <Text style={s.actionChipText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'active' && (
                    <TouchableOpacity
                      style={[s.actionChip, { backgroundColor: theme.textMuted + '22' }]}
                      onPress={() => updateStatus(item, 'archived')}
                    >
                      <Text style={[s.actionChipText, { color: theme.textMuted }]}>Archive</Text>
                    </TouchableOpacity>
                  )}
                  {item.status !== 'active' && (
                    <TouchableOpacity
                      style={s.actionChip}
                      onPress={() => updateStatus(item, 'active')}
                    >
                      <Text style={s.actionChipText}>Reactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => setModalVisible(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* New Plan Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>New Plan</Text>
            <TextInput
              style={s.input}
              placeholder="Plan title"
              placeholderTextColor={theme.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <TextInput
              style={[s.input, s.inputMultiline]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <TextInput
              style={s.input}
              placeholder="Due date (YYYY-MM-DD)"
              placeholderTextColor={theme.textMuted}
              value={dueDate}
              onChangeText={setDueDate}
              maxLength={10}
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setModalVisible(false); setTitle(''); setDescription(''); setDueDate(''); }}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, (!title.trim() || saving) && { opacity: 0.4 }]}
                onPress={handleAdd}
                disabled={!title.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Create</Text>
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
  filterRow: { flexDirection: 'row', gap: 8, padding: 16 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: t.textMuted },
  card: {
    backgroundColor: t.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: t.cardBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: t.text, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardDesc: { fontSize: 14, color: t.textMuted, marginTop: 6, lineHeight: 20 },
  cardFooter: { marginTop: 12 },
  dueDate: { fontSize: 12, color: t.textMuted, marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionChip: {
    backgroundColor: t.accent + '22', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
  },
  actionChipText: { color: t.accent, fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: t.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: '#fff', fontWeight: '600', marginTop: -2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: t.text, marginBottom: 16 },
  input: {
    backgroundColor: t.inputBg, borderRadius: 12, padding: 14,
    color: t.text, fontSize: 15, borderWidth: 1, borderColor: t.inputBorder, marginBottom: 12,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: t.surface,
  },
  cancelBtnText: { color: t.textMuted, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: t.accent,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

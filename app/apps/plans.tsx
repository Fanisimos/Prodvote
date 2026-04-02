import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, RefreshControl, Platform, Switch,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Plan } from '../../lib/types';
import { useTheme, Theme } from '../../lib/theme';
import { addPlanToCalendar, removeCalendarEvent } from '../../lib/calendar';

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
  const [saving, setSaving] = useState(false);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [isAllDay, setIsAllDay] = useState(true);
  const [dueDate, setDueDate] = useState(new Date());
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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

  function resetModal() {
    setTitle('');
    setDescription('');
    setDueDate(new Date());
    const s = new Date(); s.setHours(9, 0, 0, 0);
    const e = new Date(); e.setHours(10, 0, 0, 0);
    setStartTime(s);
    setEndTime(e);
    setIsAllDay(true);
    setSyncToCalendar(true);
    setShowDatePicker(false);
    setShowStartPicker(false);
    setShowEndPicker(false);
  }

  function buildCalendarDates(): { startDate: Date; endDate: Date } {
    if (isAllDay) {
      return { startDate: dueDate, endDate: dueDate };
    }
    // Combine dueDate (day) with startTime/endTime (hours)
    const start = new Date(dueDate);
    start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const end = new Date(dueDate);
    end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    // If end is before start, push to next day
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    return { startDate: start, endDate: end };
  }

  async function handleAdd() {
    if (!title.trim() || !session) return;
    setSaving(true);

    let calendarEventId: string | null = null;
    const dueDateStr = dueDate.toISOString();

    // Sync to device calendar if enabled
    if (syncToCalendar && Platform.OS !== 'web') {
      const { startDate, endDate } = buildCalendarDates();
      calendarEventId = await addPlanToCalendar({
        title: title.trim(),
        description: description.trim() || null,
        allDay: isAllDay,
        startDate,
        endDate,
      });
    }

    const { error } = await supabase.from('plans').insert({
      user_id: session.user.id,
      title: title.trim(),
      description: description.trim() || null,
      status: 'active',
      due_date: dueDateStr,
      calendar_event_id: calendarEventId,
    });
    setSaving(false);
    if (!error) {
      if (calendarEventId) {
        Alert.alert('Added to Calendar', 'Your plan has been synced to your device calendar with reminders.');
      }
      resetModal();
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

  async function handleDelete(plan: Plan) {
    Alert.alert('Delete Plan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (plan.calendar_event_id && Platform.OS !== 'web') {
            await removeCalendarEvent(plan.calendar_event_id);
          }
          await supabase.from('plans').delete().eq('id', plan.id);
          setPlans((prev) => prev.filter((p) => p.id !== plan.id));
        },
      },
    ]);
  }

  async function handleCalendarSync(plan: Plan) {
    if (!plan.due_date) {
      Alert.alert('No Due Date', 'Add a due date to sync this plan to your calendar.');
      return;
    }
    if (plan.calendar_event_id) {
      Alert.alert('Already Synced', 'This plan is already in your calendar.');
      return;
    }
    const date = new Date(plan.due_date);
    const eventId = await addPlanToCalendar({
      title: plan.title,
      description: plan.description,
      allDay: true,
      startDate: date,
      endDate: date,
    });
    if (eventId) {
      await supabase.from('plans').update({ calendar_event_id: eventId }).eq('id', plan.id);
      Alert.alert('Synced!', 'Plan added to your calendar with reminders.');
      fetchPlans();
    }
  }

  function formatDueDate(dateStr: string | null) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const isPast = d < now;
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return { label, isPast };
  }

  function formatDate(d: Date) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
            <TouchableOpacity style={s.card} onLongPress={() => handleDelete(item)}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {item.calendar_event_id && (
                    <Text style={{ fontSize: 14 }}>📅</Text>
                  )}
                  <View style={[s.statusDot, { backgroundColor: config.color }]} />
                </View>
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
                  {item.status === 'active' && item.due_date && !item.calendar_event_id && Platform.OS !== 'web' && (
                    <TouchableOpacity
                      style={[s.actionChip, { backgroundColor: '#34d39922' }]}
                      onPress={() => handleCalendarSync(item)}
                    >
                      <Text style={[s.actionChipText, { color: '#34d399' }]}>📅 Sync</Text>
                    </TouchableOpacity>
                  )}
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.modalOverlay}>
            <ScrollView
              style={s.modalScroll}
              contentContainerStyle={s.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
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

              {/* Date picker */}
              <Text style={s.sectionLabel}>Due Date</Text>
              {Platform.OS === 'ios' ? (
                <View style={s.pickerContainer}>
                  <DateTimePicker
                    value={dueDate}
                    mode="date"
                    display="compact"
                    onChange={(_, date) => { if (date) setDueDate(date); }}
                    minimumDate={new Date()}
                    accentColor={theme.accent}
                  />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={s.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={s.dateButtonText}>📅  {formatDate(dueDate)}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate}
                      mode="date"
                      display="default"
                      onChange={(_, date) => {
                        setShowDatePicker(false);
                        if (date) setDueDate(date);
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}

              {/* All day toggle */}
              {Platform.OS !== 'web' && (
                <View style={s.calendarToggle}>
                  <Text style={s.calendarToggleText}>All Day Event</Text>
                  <Switch
                    value={isAllDay}
                    onValueChange={setIsAllDay}
                    trackColor={{ false: theme.cardBorder, true: theme.accent + '66' }}
                    thumbColor={isAllDay ? theme.accent : theme.textMuted}
                  />
                </View>
              )}

              {/* Time pickers (only when not all-day) */}
              {!isAllDay && (
                <>
                  {Platform.OS === 'ios' ? (
                    <View style={s.timeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.sectionLabel}>Start Time</Text>
                        <View style={s.pickerContainer}>
                          <DateTimePicker
                            value={startTime}
                            mode="time"
                            display="compact"
                            onChange={(_, date) => { if (date) setStartTime(date); }}
                            accentColor={theme.accent}
                          />
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.sectionLabel}>End Time</Text>
                        <View style={s.pickerContainer}>
                          <DateTimePicker
                            value={endTime}
                            mode="time"
                            display="compact"
                            onChange={(_, date) => { if (date) setEndTime(date); }}
                            accentColor={theme.accent}
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={s.timeRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.sectionLabel}>Start Time</Text>
                          <TouchableOpacity
                            style={s.dateButton}
                            onPress={() => setShowStartPicker(true)}
                          >
                            <Text style={s.dateButtonText}>{formatTime(startTime)}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.sectionLabel}>End Time</Text>
                          <TouchableOpacity
                            style={s.dateButton}
                            onPress={() => setShowEndPicker(true)}
                          >
                            <Text style={s.dateButtonText}>{formatTime(endTime)}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {showStartPicker && (
                        <DateTimePicker
                          value={startTime}
                          mode="time"
                          display="default"
                          onChange={(_, date) => {
                            setShowStartPicker(false);
                            if (date) setStartTime(date);
                          }}
                        />
                      )}
                      {showEndPicker && (
                        <DateTimePicker
                          value={endTime}
                          mode="time"
                          display="default"
                          onChange={(_, date) => {
                            setShowEndPicker(false);
                            if (date) setEndTime(date);
                          }}
                        />
                      )}
                    </>
                  )}
                </>
              )}

              {/* Calendar sync toggle */}
              {Platform.OS !== 'web' && (
                <View style={s.calendarToggle}>
                  <Text style={s.calendarToggleText}>📅 Add to Calendar</Text>
                  <Switch
                    value={syncToCalendar}
                    onValueChange={setSyncToCalendar}
                    trackColor={{ false: theme.cardBorder, true: theme.accent + '66' }}
                    thumbColor={syncToCalendar ? theme.accent : theme.textMuted}
                  />
                </View>
              )}

              <View style={s.modalActions}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => { resetModal(); setModalVisible(false); }}
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
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
  modalScroll: {
    backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalScrollContent: {
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: t.text, marginBottom: 16 },
  input: {
    backgroundColor: t.inputBg, borderRadius: 12, padding: 14,
    color: t.text, fontSize: 15, borderWidth: 1, borderColor: t.inputBorder, marginBottom: 12,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: t.textMuted, marginBottom: 6, marginTop: 4 },
  dateButton: {
    backgroundColor: t.inputBg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: t.inputBorder, marginBottom: 12,
  },
  dateButtonText: { color: t.text, fontSize: 15 },
  pickerContainer: {
    backgroundColor: t.inputBg, borderRadius: 12, padding: 8,
    borderWidth: 1, borderColor: t.inputBorder, marginBottom: 12,
    alignItems: 'flex-start',
  },
  timeRow: { flexDirection: 'row', gap: 12 },
  calendarToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8,
  },
  calendarToggleText: { fontSize: 15, color: t.text, fontWeight: '500' },
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

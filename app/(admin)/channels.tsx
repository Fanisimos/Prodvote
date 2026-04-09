import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Channel } from '../../lib/types';
import { useTheme, Theme } from '../../lib/theme';
import { notify, confirmAction } from '../../lib/adminUI';

export default function AdminChannelsScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useTheme();

  const fetchChannels = useCallback(async () => {
    const { data } = await supabase
      .from('channels')
      .select('*')
      .order('created_at', { ascending: true });

    setChannels(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const onRefresh = () => { setRefreshing(true); fetchChannels(); };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setShowForm(false);
  };

  const createChannel = async () => {
    if (!formName.trim()) {
      notify('Error', 'Channel name is required.');
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from('channels')
      .insert({
        name: formName.trim(),
        description: formDescription.trim() || null,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      notify('Error', error.message);
    } else if (data) {
      setChannels(prev => [...prev, data]);
      resetForm();
    }
  };

  const deleteChannel = async (channel: Channel) => {
    if (channel.is_locked) {
      notify('Cannot Delete', 'This is the default channel and cannot be deleted.');
      return;
    }
    if (!(await confirmAction('Delete Channel', `Delete "#${channel.name}"? All messages will be lost.`))) return;
    const { error } = await supabase.from('channels').delete().eq('id', channel.id);
    if (error) notify('Error', error.message);
    else setChannels(prev => prev.filter(c => c.id !== channel.id));
  };

  const s = makeStyles(theme);

  const renderChannel = ({ item }: { item: Channel }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.hashCircle}>
          <Text style={s.hash}>#</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={s.nameRow}>
            <Text style={s.channelName}>{item.name}</Text>
            {item.is_locked && (
              <View style={s.defaultBadge}>
                <Text style={s.defaultText}>DEFAULT</Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={s.channelDesc} numberOfLines={2}>{item.description}</Text>
          )}
          <Text style={s.dateText}>
            Created {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {!item.is_locked && (
          <TouchableOpacity style={s.deleteBtn} onPress={() => deleteChannel(item)}>
            <Text style={s.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {showForm && (
        <View style={s.formContainer}>
          <Text style={s.formTitle}>Create New Channel</Text>

          <Text style={s.label}>Name</Text>
          <TextInput
            style={s.input}
            value={formName}
            onChangeText={setFormName}
            placeholder="channel-name"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />

          <Text style={s.label}>Description</Text>
          <TextInput
            style={[s.input, { minHeight: 60 }]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="Optional description"
            placeholderTextColor={theme.textMuted}
            multiline
          />

          <View style={s.formActions}>
            <TouchableOpacity style={s.cancelFormBtn} onPress={resetForm}>
              <Text style={s.cancelFormText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.createBtn, submitting && { opacity: 0.6 }]}
              onPress={createChannel}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.createBtnText}>Create Channel</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showForm && (
        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(true)}>
          <Text style={s.addBtnText}>+ New Channel</Text>
        </TouchableOpacity>
      )}

      <Text style={s.countText}>{channels.length} channels</Text>

      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannel}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  countText: { color: t.textMuted, fontSize: 13, paddingHorizontal: 16, paddingTop: 4 },
  card: {
    backgroundColor: t.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  hashCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.accent + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hash: { color: t.accent, fontSize: 22, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  channelName: { color: t.text, fontSize: 16, fontWeight: '700' },
  defaultBadge: {
    backgroundColor: '#4caf5022',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  defaultText: { color: '#4caf50', fontSize: 10, fontWeight: '700' },
  channelDesc: { color: t.textMuted, fontSize: 13, marginBottom: 4 },
  dateText: { color: t.textMuted, fontSize: 12 },
  deleteBtn: {
    backgroundColor: '#ff4d4d22',
    borderWidth: 1,
    borderColor: '#ff4d4d44',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  deleteBtnText: { color: '#ff4d4d', fontSize: 13, fontWeight: '600' },
  addBtn: {
    backgroundColor: t.accent,
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  formContainer: {
    backgroundColor: t.card,
    borderBottomWidth: 1,
    borderBottomColor: t.cardBorder,
    padding: 16,
  },
  formTitle: { color: t.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { color: t.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: t.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.cardBorder,
    color: t.text,
    padding: 12,
    fontSize: 15,
  },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelFormBtn: {
    flex: 1,
    backgroundColor: t.cardBorder,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelFormText: { color: t.textMuted, fontSize: 15, fontWeight: '600' },
  createBtn: {
    flex: 1,
    backgroundColor: t.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

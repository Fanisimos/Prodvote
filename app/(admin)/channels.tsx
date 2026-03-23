import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Channel } from '../../lib/types';

export default function AdminChannelsScreen() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      Alert.alert('Error', 'Channel name is required.');
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
      Alert.alert('Error', error.message);
    } else if (data) {
      setChannels(prev => [...prev, data]);
      resetForm();
    }
  };

  const deleteChannel = (channel: Channel) => {
    if (channel.is_locked) {
      Alert.alert('Cannot Delete', 'This is the default channel and cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Channel',
      `Are you sure you want to delete "#${channel.name}"? All messages in this channel will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('channels')
              .delete()
              .eq('id', channel.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setChannels(prev => prev.filter(c => c.id !== channel.id));
            }
          },
        },
      ]
    );
  };

  const renderChannel = ({ item }: { item: Channel }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.hashCircle}>
          <Text style={styles.hash}>#</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.nameRow}>
            <Text style={styles.channelName}>{item.name}</Text>
            {item.is_locked && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>DEFAULT</Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={styles.channelDesc} numberOfLines={2}>{item.description}</Text>
          )}
          <Text style={styles.dateText}>
            Created {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
        {!item.is_locked && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteChannel(item)}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {showForm && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Create New Channel</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={formName}
            onChangeText={setFormName}
            placeholder="channel-name"
            placeholderTextColor="#666"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="Optional description"
            placeholderTextColor="#666"
            multiline
          />

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelFormBtn} onPress={resetForm}>
              <Text style={styles.cancelFormText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, submitting && { opacity: 0.6 }]}
              onPress={createChannel}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createBtnText}>Create Channel</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!showForm && (
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ New Channel</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.countText}>{channels.length} channels</Text>

      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={renderChannel}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c5cfc" />}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  countText: { color: '#888', fontSize: 13, paddingHorizontal: 16, paddingTop: 4 },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  hashCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7c5cfc22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hash: { color: '#7c5cfc', fontSize: 22, fontWeight: '700' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  channelName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  defaultBadge: {
    backgroundColor: '#4caf5022',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  defaultText: { color: '#4caf50', fontSize: 10, fontWeight: '700' },
  channelDesc: { color: '#888', fontSize: 13, marginBottom: 4 },
  dateText: { color: '#555', fontSize: 12 },
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
    backgroundColor: '#7c5cfc',
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  formContainer: {
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3e',
    padding: 16,
  },
  formTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#0a0a0f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    color: '#fff',
    padding: 12,
    fontSize: 15,
  },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelFormBtn: {
    flex: 1,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelFormText: { color: '#888', fontSize: 15, fontWeight: '600' },
  createBtn: {
    flex: 1,
    backgroundColor: '#7c5cfc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

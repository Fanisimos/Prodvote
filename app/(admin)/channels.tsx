import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAdminChannels, Channel } from '../../hooks/useChat';
import { useTheme } from '../../lib/ThemeContext';
import Colors from '../../constants/Colors';

const EMOJI_OPTIONS = ['💬', '💡', '🐛', '🎮', '📢', '🎨', '🔥', '🎵', '📚', '🏆', '❓', '🛠️'];
const COLOR_OPTIONS = ['#7c5cfc', '#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b'];

export default function ChannelsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { channels, loading, createChannel, updateChannel, deleteChannel } = useAdminChannels();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('💬');
  const [color, setColor] = useState('#7c5cfc');

  function resetForm() {
    setName('');
    setDescription('');
    setEmoji('💬');
    setColor('#7c5cfc');
    setShowCreate(false);
    setEditingId(null);
  }

  function startEdit(ch: Channel) {
    setEditingId(ch.id);
    setName(ch.name);
    setDescription(ch.description || '');
    setEmoji(ch.emoji);
    setColor(ch.color);
    setShowCreate(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (editingId) {
      await updateChannel(editingId, { name: name.trim(), description: description.trim() || null, emoji, color });
    } else {
      await createChannel(name.trim(), description.trim(), emoji, color);
    }
    resetForm();
  }

  async function handleDelete(id: string, channelName: string) {
    const doDelete = () => deleteChannel(id);
    if (Platform.OS === 'web') {
      if (confirm(`Delete #${channelName}? All messages will be lost.`)) doDelete();
    } else {
      Alert.alert('Delete Channel', `Delete #${channelName}? All messages will be lost.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function handleToggleLock(ch: Channel) {
    await updateChannel(ch.id, { is_locked: !ch.is_locked });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Channels</Text>
          <Text style={styles.pageSub}>{channels.length} channels</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => { resetForm(); setShowCreate(!showCreate); }}
        >
          <Text style={styles.createBtnText}>{showCreate ? '✕ Cancel' : '+ New Channel'}</Text>
        </TouchableOpacity>
      </View>

      {/* Create / Edit form */}
      {showCreate && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Edit Channel' : 'New Channel'}</Text>

          <TextInput
            style={styles.formInput}
            placeholder="Channel name"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.formInput}
            placeholder="Description (optional)"
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.formLabel}>EMOJI</Text>
          <View style={styles.optionsRow}>
            {EMOJI_OPTIONS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiOption, emoji === e && styles.emojiOptionActive]}
                onPress={() => setEmoji(e)}
              >
                <Text style={{ fontSize: 20 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>COLOR</Text>
          <View style={styles.optionsRow}>
            {COLOR_OPTIONS.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  color === c && styles.colorOptionActive,
                ]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Create Channel'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
        {channels.map(ch => (
          <View key={ch.id} style={styles.channelCard}>
            <View style={styles.channelRow}>
              <View style={[styles.channelIcon, { backgroundColor: ch.color + '20' }]}>
                <Text style={{ fontSize: 22 }}>{ch.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.channelName}>{ch.name}</Text>
                  {ch.is_locked && <Text style={{ fontSize: 12 }}>🔒</Text>}
                </View>
                {ch.description && (
                  <Text style={styles.channelDesc} numberOfLines={1}>{ch.description}</Text>
                )}
              </View>
            </View>

            <View style={styles.channelActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => startEdit(ch)}>
                <Text style={styles.actionBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleLock(ch)}>
                <Text style={styles.actionBtnText}>{ch.is_locked ? '🔓 Unlock' : '🔒 Lock'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleDelete(ch.id, ch.name)}
              >
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>🗑 Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: 28, paddingBottom: 16,
    },
    pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    pageSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    createBtn: {
      backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Form
    formCard: {
      backgroundColor: colors.surface, marginHorizontal: 28, borderRadius: 16,
      padding: 20, borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: 16,
    },
    formTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
    formInput: {
      backgroundColor: colors.background, borderRadius: 10, padding: 14,
      fontSize: 14, color: colors.text, marginBottom: 12,
    },
    formLabel: {
      fontSize: 10, fontWeight: '800', color: colors.textSecondary,
      letterSpacing: 1.5, marginBottom: 8, marginTop: 4,
    },
    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    emojiOption: {
      width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
      backgroundColor: colors.background,
    },
    emojiOptionActive: {
      borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.primary + '15',
    },
    colorOption: {
      width: 32, height: 32, borderRadius: 16,
    },
    colorOptionActive: {
      borderWidth: 3, borderColor: '#fff',
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
    },
    saveBtn: {
      backgroundColor: Colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4,
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Channel list
    list: { flex: 1, paddingHorizontal: 28 },
    channelCard: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    channelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    channelIcon: {
      width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    },
    channelName: { fontSize: 16, fontWeight: '700', color: colors.text },
    channelDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    channelActions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
      backgroundColor: colors.background,
    },
    deleteBtn: {},
    actionBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  });
}

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/ThemeContext';
import Colors from '../../constants/Colors';

interface BadgeRow {
  id: number;
  name: string;
  emoji: string;
  description: string;
  price: number;
  color: string;
  is_active: boolean;
  purchase_count?: number;
}

export default function BadgesScreen() {
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editColor, setEditColor] = useState('');

  // Create fields
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newColor, setNewColor] = useState('#7c5cfc');

  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => { fetchBadges(); }, []);

  async function fetchBadges() {
    setLoading(true);
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('id', { ascending: true });

    // Get purchase counts
    const { data: purchases } = await supabase
      .from('user_badges')
      .select('badge_id');

    const counts: Record<number, number> = {};
    (purchases || []).forEach((p: any) => {
      counts[p.badge_id] = (counts[p.badge_id] || 0) + 1;
    });

    setBadges((data || []).map(b => ({ ...b, purchase_count: counts[b.id] || 0 })));
    setLoading(false);
  }

  function startEdit(badge: BadgeRow) {
    setExpandedId(expandedId === badge.id ? null : badge.id);
    setEditName(badge.name);
    setEditEmoji(badge.emoji);
    setEditDesc(badge.description);
    setEditPrice(String(badge.price));
    setEditColor(badge.color);
  }

  async function saveBadge(id: number) {
    await supabase.from('badges').update({
      name: editName,
      emoji: editEmoji,
      description: editDesc,
      price: parseInt(editPrice) || 0,
      color: editColor,
    }).eq('id', id);
    setExpandedId(null);
    fetchBadges();
  }

  async function toggleActive(id: number, current: boolean) {
    await supabase.from('badges').update({ is_active: !current }).eq('id', id);
    fetchBadges();
  }

  async function deleteBadge(id: number) {
    const doDelete = () => {
      supabase.from('badges').delete().eq('id', id).then(() => fetchBadges());
    };
    if (Platform.OS === 'web') {
      if (confirm('Delete this badge permanently?')) doDelete();
    } else {
      Alert.alert('Delete Badge', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function createBadge() {
    if (!newName || !newEmoji) return;
    await supabase.from('badges').insert({
      name: newName,
      emoji: newEmoji,
      description: newDesc,
      price: parseInt(newPrice) || 0,
      color: newColor,
      is_active: true,
    });
    setNewName('');
    setNewEmoji('');
    setNewDesc('');
    setNewPrice('');
    setNewColor('#7c5cfc');
    setShowCreate(false);
    fetchBadges();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Badges</Text>
          <Text style={styles.pageSub}>{badges.length} badges</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreate(!showCreate)}
        >
          <Text style={styles.createBtnText}>{showCreate ? '✕ Cancel' : '+ New Badge'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Create form */}
          {showCreate && (
            <View style={styles.createCard}>
              <Text style={styles.sectionLabel}>CREATE NEW BADGE</Text>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { width: 60 }]}
                  placeholder="😀"
                  placeholderTextColor="#64748b"
                  value={newEmoji}
                  onChangeText={setNewEmoji}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Badge name"
                  placeholderTextColor="#64748b"
                  value={newName}
                  onChangeText={setNewName}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Description"
                placeholderTextColor="#64748b"
                value={newDesc}
                onChangeText={setNewDesc}
              />
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Price (coins)"
                  placeholderTextColor="#64748b"
                  value={newPrice}
                  onChangeText={setNewPrice}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Color (#hex)"
                  placeholderTextColor="#64748b"
                  value={newColor}
                  onChangeText={setNewColor}
                />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={createBadge}>
                <Text style={styles.saveBtnText}>Create Badge</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Badge list */}
          {badges.map(b => {
            const expanded = expandedId === b.id;
            return (
              <View key={b.id} style={[styles.badgeCard, !b.is_active && styles.inactiveCard]}>
                <TouchableOpacity onPress={() => startEdit(b)}>
                  <View style={styles.badgeHeader}>
                    <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.badgeName}>{b.name}</Text>
                        {!b.is_active && (
                          <View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveText}>INACTIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.badgeMeta}>
                        🪙 {b.price} coins · {b.purchase_count} purchased
                      </Text>
                    </View>
                    <View style={[styles.colorDot, { backgroundColor: b.color }]} />
                  </View>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.formRow}>
                      <TextInput
                        style={[styles.input, { width: 60 }]}
                        value={editEmoji}
                        onChangeText={setEditEmoji}
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={editName}
                        onChangeText={setEditName}
                        placeholder="Name"
                        placeholderTextColor="#64748b"
                      />
                    </View>
                    <TextInput
                      style={styles.input}
                      value={editDesc}
                      onChangeText={setEditDesc}
                      placeholder="Description"
                      placeholderTextColor="#64748b"
                      multiline
                    />
                    <View style={styles.formRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={editPrice}
                        onChangeText={setEditPrice}
                        placeholder="Price"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={editColor}
                        onChangeText={setEditColor}
                        placeholder="Color (#hex)"
                        placeholderTextColor="#64748b"
                      />
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity style={styles.saveBtn} onPress={() => saveBadge(b.id)}>
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.toggleBtn}
                        onPress={() => toggleActive(b.id, b.is_active)}
                      >
                        <Text style={styles.toggleBtnText}>
                          {b.is_active ? '⏸ Deactivate' : '▶️ Activate'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => deleteBadge(b.id)}
                      >
                        <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      padding: 28, paddingBottom: 16, flexDirection: 'row',
      alignItems: 'flex-start', justifyContent: 'space-between',
    },
    pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
    pageSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    createBtn: {
      backgroundColor: Colors.primary, borderRadius: 10,
      paddingHorizontal: 16, paddingVertical: 10,
    },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    list: { flex: 1, paddingHorizontal: 28 },

    createCard: {
      backgroundColor: Colors.primary + '10', borderRadius: 14, padding: 16,
      marginBottom: 16, borderWidth: 1, borderColor: Colors.primary + '30',
    },

    sectionLabel: {
      fontSize: 10, fontWeight: '800', color: colors.textSecondary,
      letterSpacing: 1.5, marginBottom: 12,
    },

    formRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    input: {
      backgroundColor: colors.background, borderRadius: 10, padding: 12,
      fontSize: 14, color: colors.text, marginBottom: 10,
    },

    badgeCard: {
      backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    inactiveCard: { opacity: 0.6 },
    badgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    badgeEmoji: { fontSize: 32 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    badgeName: { fontSize: 15, fontWeight: '700', color: colors.text },
    inactiveBadge: {
      backgroundColor: '#64748b' + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    },
    inactiveText: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 1 },
    badgeMeta: { fontSize: 12, color: colors.textSecondary },
    colorDot: { width: 20, height: 20, borderRadius: 10 },

    expandedSection: {
      marginTop: 16, paddingTop: 16, borderTopWidth: 1,
      borderTopColor: colors.surfaceBorder,
    },

    actionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    saveBtn: {
      backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 20,
      paddingVertical: 12, alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    toggleBtn: {
      borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: colors.background,
    },
    toggleBtnText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
    deleteBtn: {
      borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: '#ef4444' + '15', borderWidth: 1, borderColor: '#ef4444' + '40',
    },
    deleteBtnText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
  });
}

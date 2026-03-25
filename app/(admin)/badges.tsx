import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Badge } from '../../lib/types';
import { useTheme, Theme } from '../../lib/theme';

export default function AdminBadgesScreen() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmoji, setFormEmoji] = useState('');
  const [formColor, setFormColor] = useState('#7c5cfc');
  const [formCost, setFormCost] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { theme } = useTheme();

  const fetchBadges = useCallback(async () => {
    const { data } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: false });

    setBadges(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);

  const onRefresh = () => { setRefreshing(true); fetchBadges(); };

  const resetForm = () => {
    setFormName('');
    setFormEmoji('');
    setFormColor('#7c5cfc');
    setFormCost('');
    setFormDescription('');
    setShowForm(false);
  };

  const createBadge = async () => {
    if (!formName.trim() || !formEmoji.trim()) {
      Alert.alert('Error', 'Name and emoji are required.');
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from('badges')
      .insert({
        name: formName.trim(),
        emoji: formEmoji.trim(),
        color: formColor.trim(),
        price: parseInt(formCost) || 0,
        description: formDescription.trim() || null,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setBadges(prev => [data, ...prev]);
      resetForm();
    }
  };

  const deleteBadge = (badge: Badge) => {
    Alert.alert(
      'Delete Badge',
      `Are you sure you want to delete "${badge.emoji} ${badge.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('badges')
              .delete()
              .eq('id', badge.id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setBadges(prev => prev.filter(b => b.id !== badge.id));
            }
          },
        },
      ]
    );
  };

  const s = makeStyles(theme);

  const renderBadge = ({ item }: { item: Badge }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={[s.emojiCircle, { backgroundColor: item.color + '22' }]}>
          <Text style={s.emoji}>{item.emoji}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.badgeName}>{item.name}</Text>
          {item.description && (
            <Text style={s.badgeDesc} numberOfLines={2}>{item.description}</Text>
          )}
          <View style={s.row}>
            <Text style={s.costText}>{item.price} coins</Text>
            {item.is_premium && (
              <View style={s.premiumBadge}>
                <Text style={s.premiumText}>PREMIUM</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={s.deleteBtn} onPress={() => deleteBadge(item)}>
          <Text style={s.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
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
        <ScrollView style={s.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={s.formTitle}>Create New Badge</Text>

          <Text style={s.label}>Name</Text>
          <TextInput
            style={s.input}
            value={formName}
            onChangeText={setFormName}
            placeholder="Badge name"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={s.label}>Emoji</Text>
          <TextInput
            style={s.input}
            value={formEmoji}
            onChangeText={setFormEmoji}
            placeholder="e.g. 🏆"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={s.label}>Color (hex)</Text>
          <TextInput
            style={s.input}
            value={formColor}
            onChangeText={setFormColor}
            placeholder="#7c5cfc"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={s.label}>Coin Cost</Text>
          <TextInput
            style={s.input}
            value={formCost}
            onChangeText={setFormCost}
            placeholder="0"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
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
              onPress={createBadge}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.createBtnText}>Create Badge</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {!showForm && (
        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(true)}>
          <Text style={s.addBtnText}>+ New Badge</Text>
        </TouchableOpacity>
      )}

      <Text style={s.countText}>{badges.length} badges</Text>

      <FlatList
        data={badges}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderBadge}
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
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 24 },
  badgeName: { color: t.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  badgeDesc: { color: t.textMuted, fontSize: 13, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  costText: { color: '#ffc107', fontSize: 13, fontWeight: '600' },
  premiumBadge: {
    backgroundColor: '#ffc10722',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  premiumText: { color: '#ffc107', fontSize: 10, fontWeight: '700' },
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
    maxHeight: 420,
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
  formActions: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 8 },
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

import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import Watermark from '../../components/Watermark';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme, Theme } from '../../lib/theme';
import { Category } from '../../lib/types';

export default function SubmitScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { session } = useAuthContext();
  const { theme } = useTheme();

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }
    if (title.trim().length < 5) {
      Alert.alert('Error', 'Title must be at least 5 characters');
      return;
    }
    if (!session) return;

    setLoading(true);
    const { error } = await supabase.from('features').insert({
      user_id: session.user.id,
      title: title.trim(),
      description: description.trim(),
      category_id: selectedCategory,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setTitle('');
      setDescription('');
      setSelectedCategory(1);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }
  }

  const s = styles(theme);

  return (
    <View style={s.container}>
      <Watermark />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>

      {submitted && (
        <View style={s.successBanner}>
          <Text style={s.successText}>Feature submitted successfully!</Text>
        </View>
      )}

      <Text style={s.heading}>Submit Your Idea</Text>
      <Text style={s.subheading}>e.g. Add dark mode support</Text>

      <Text style={s.label}>Title</Text>
      <TextInput
        style={s.input}
        placeholder="Short, descriptive title"
        placeholderTextColor={theme.textMuted}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <Text style={s.charCount}>{title.length}/120</Text>

      <Text style={s.label}>Description</Text>
      <TextInput
        style={[s.input, s.textArea]}
        placeholder="Describe the feature, why it's useful, and how it should work..."
        placeholderTextColor={theme.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        maxLength={1000}
      />
      <Text style={s.charCount}>{description.length}/1000</Text>

      <Text style={s.label}>Category</Text>
      <View style={s.categoryRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              s.categoryChip,
              selectedCategory === cat.id && { backgroundColor: cat.color + '33', borderColor: cat.color },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[s.categoryText, selectedCategory === cat.id && { color: cat.color }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={s.submitText}>Submit Feature Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, gap: 4 },
  heading: { fontSize: 24, fontWeight: '800', color: t.text, marginTop: 8 },
  subheading: { fontSize: 14, color: t.textMuted, marginTop: 4, marginBottom: 8 },
  successBanner: {
    backgroundColor: t.successBg, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: t.success + '44', marginBottom: 8,
  },
  successText: { color: t.success, fontWeight: '600', textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: t.textSecondary, marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: t.inputBg, borderRadius: 14, padding: 16,
    color: t.text, fontSize: 16, borderWidth: 1, borderColor: t.inputBorder,
  },
  textArea: { height: 140 },
  charCount: { fontSize: 12, color: t.textMuted, textAlign: 'right', marginTop: 4 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder,
  },
  categoryText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
  submitBtn: {
    backgroundColor: t.accent, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

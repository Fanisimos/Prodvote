import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Category } from '../../lib/types';

export default function SubmitScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { session } = useAuthContext();

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {submitted && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✅ Feature submitted successfully!</Text>
        </View>
      )}

      <Text style={styles.heading}>Submit Your Idea</Text>
      <Text style={styles.subheading}>e.g. Add dark mode support</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Short, descriptive title"
        placeholderTextColor="#666"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <Text style={styles.charCount}>{title.length}/120</Text>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe the feature, why it's useful, and how it should work..."
        placeholderTextColor="#666"
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
        maxLength={1000}
      />
      <Text style={styles.charCount}>{description.length}/1000</Text>

      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryRow}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && { backgroundColor: cat.color + '33', borderColor: cat.color },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === cat.id && { color: cat.color },
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit Feature Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 24, gap: 4 },
  heading: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 8 },
  subheading: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 8 },
  successBanner: {
    backgroundColor: '#34d39922',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34d39944',
    marginBottom: 8,
  },
  successText: { color: '#34d399', fontWeight: '600', textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#aaa', marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
    color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#2a2a3e',
  },
  textArea: { height: 140 },
  charCount: { fontSize: 12, color: '#555', textAlign: 'right', marginTop: 4 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a3e',
  },
  categoryText: { fontSize: 13, fontWeight: '600', color: '#888' },
  submitBtn: {
    backgroundColor: '#7c5cfc', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

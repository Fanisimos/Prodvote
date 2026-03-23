import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';

export default function EditProfileScreen() {
  const { session, profile, fetchProfile } = useAuthContext();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeBadgeName, setActiveBadgeName] = useState<string | null>(null);
  const [activeFrameName, setActiveFrameName] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    async function loadEquipped() {
      if (!profile) return;
      if (profile.active_badge_id) {
        const { data } = await supabase
          .from('badges')
          .select('name, emoji')
          .eq('id', profile.active_badge_id)
          .single();
        if (data) setActiveBadgeName(`${data.emoji} ${data.name}`);
      }
      if (profile.active_frame_id) {
        const { data } = await supabase
          .from('frames')
          .select('name, color')
          .eq('id', profile.active_frame_id)
          .single();
        if (data) setActiveFrameName(data.name);
      }
    }
    loadEquipped();
  }, [profile]);

  async function handleSave() {
    if (!session || !username.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim(), bio: bio.trim() || null })
      .eq('id', session.user.id);
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await fetchProfile(session.user.id);
      Alert.alert('Saved', 'Your profile has been updated.');
      router.back();
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar preview */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {username.slice(0, 2).toUpperCase() || '??'}
            </Text>
          </View>
        </View>

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          placeholderTextColor="#666"
          maxLength={30}
          autoCapitalize="none"
        />

        {/* Bio */}
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself..."
          placeholderTextColor="#666"
          maxLength={200}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.charCount}>{bio.length}/200</Text>

        {/* Equipped items */}
        <Text style={styles.sectionTitle}>Equipped</Text>
        <View style={styles.equippedRow}>
          <View style={styles.equippedItem}>
            <Text style={styles.equippedLabel}>Badge</Text>
            <Text style={styles.equippedValue}>{activeBadgeName || 'None'}</Text>
          </View>
          <View style={styles.equippedItem}>
            <Text style={styles.equippedLabel}>Frame</Text>
            <Text style={styles.equippedValue}>{activeFrameName || 'None'}</Text>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0f' },
  scroll: { padding: 24, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#7c5cfc',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  label: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e',
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#555', textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 28, marginBottom: 12 },
  equippedRow: { flexDirection: 'row', gap: 12 },
  equippedItem: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  equippedLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  equippedValue: { fontSize: 15, fontWeight: '600', color: '#fff' },
  saveBtn: {
    backgroundColor: '#7c5cfc', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

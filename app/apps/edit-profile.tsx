import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme, Theme, tierColor } from '../../lib/theme';
import UserAvatar from '../../components/UserAvatar';

const DEFAULT_AVATARS = [
  { name: 'Blobby', emoji: '🫠', bg: '#FF6B6B' },
  { name: 'Grumpus', emoji: '👾', bg: '#845EF7' },
  { name: 'Fuzzball', emoji: '🧶', bg: '#FF922B' },
  { name: 'Cyclops', emoji: '👁️', bg: '#20C997' },
  { name: 'Chomper', emoji: '🦷', bg: '#339AF0' },
  { name: 'Zappy', emoji: '⚡', bg: '#FCC419' },
  { name: 'Gloopy', emoji: '🍭', bg: '#F06595' },
  { name: 'Cactoid', emoji: '🌵', bg: '#51CF66' },
];

export default function EditProfileScreen() {
  const { session, profile, fetchProfile } = useAuthContext();
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeBadgeName, setActiveBadgeName] = useState<string | null>(null);
  const [activeFrameName, setActiveFrameName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const s = styles(theme);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || null);
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
          .from('avatar_frames')
          .select('name, color')
          .eq('id', profile.active_frame_id)
          .single();
        if (data) setActiveFrameName(data.name);
      }
    }
    loadEquipped();
  }, [profile]);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photos to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    await uploadAvatar(result.assets[0].uri);
  }

  async function uploadAvatar(uri: string) {
    if (!session) return;
    setUploading(true);

    try {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${session.user.id}.${ext}`;
      const filePath = `avatars/${fileName}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      setAvatarUrl(publicUrl);
      await fetchProfile(session.user.id);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to upload image');
    }

    setUploading(false);
  }

  async function selectDefaultAvatar(avatar: typeof DEFAULT_AVATARS[0]) {
    if (!session) return;
    // For default avatars, store a special URL format: "default:emoji:bg"
    const defaultUrl = `default:${avatar.emoji}:${avatar.bg}`;
    await supabase
      .from('profiles')
      .update({ avatar_url: defaultUrl })
      .eq('id', session.user.id);
    setAvatarUrl(defaultUrl);
    setShowAvatarPicker(false);
    await fetchProfile(session.user.id);
  }

  async function removeAvatar() {
    if (!session) return;
    await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', session.user.id);
    setAvatarUrl(null);
    setShowAvatarPicker(false);
    await fetchProfile(session.user.id);
  }

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
      <View style={s.center}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const frameColor = profile?.active_frame?.color || tierColor(profile?.tier || 'free', theme);
  const frameAnimation = profile?.active_frame?.animation_type || null;
  const badgeEmoji = (profile?.active_badge as any)?.emoji || null;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Avatar + photo picker */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={() => setShowAvatarPicker(v => !v)} disabled={uploading}>
            <UserAvatar
              username={username}
              avatarUrl={avatarUrl}
              frameColor={frameColor}
              frameAnimation={frameAnimation}
              badgeEmoji={badgeEmoji}
              size={100}
            />
            {uploading ? (
              <View style={s.uploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={s.cameraIcon}>
                <Text style={{ fontSize: 14 }}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={s.changePhotoText}>Tap to change avatar</Text>
        </View>

        {/* Avatar picker */}
        {showAvatarPicker && (
          <View style={s.avatarPickerCard}>
            <Text style={s.pickerTitle}>Choose an Avatar</Text>

            {/* Default monster avatars */}
            <View style={s.avatarGrid}>
              {DEFAULT_AVATARS.map((av) => (
                <TouchableOpacity
                  key={av.name}
                  style={s.avatarOption}
                  onPress={() => selectDefaultAvatar(av)}
                  activeOpacity={0.7}
                >
                  <View style={[s.avatarCircle, { backgroundColor: av.bg }]}>
                    <Text style={s.avatarEmoji}>{av.emoji}</Text>
                  </View>
                  <Text style={s.avatarName}>{av.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Upload your own */}
            <TouchableOpacity style={s.uploadBtn} onPress={pickImage}>
              <Text style={{ fontSize: 16 }}>📸</Text>
              <Text style={s.uploadBtnText}>Upload Your Own Photo</Text>
            </TouchableOpacity>

            {/* Remove avatar */}
            {avatarUrl && (
              <TouchableOpacity style={s.removeBtn} onPress={removeAvatar}>
                <Text style={s.removeBtnText}>Remove Avatar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Username */}
        <Text style={s.label}>Username</Text>
        <TextInput
          style={s.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          placeholderTextColor={theme.textMuted}
          maxLength={30}
          autoCapitalize="none"
        />

        {/* Bio */}
        <Text style={s.label}>Bio</Text>
        <TextInput
          style={[s.input, s.inputMultiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself..."
          placeholderTextColor={theme.textMuted}
          maxLength={200}
          multiline
          numberOfLines={4}
        />
        <Text style={s.charCount}>{bio.length}/200</Text>

        {/* Equipped items */}
        <Text style={s.sectionTitle}>Equipped</Text>
        <View style={s.equippedRow}>
          <View style={s.equippedItem}>
            <Text style={s.equippedLabel}>Badge</Text>
            <Text style={s.equippedValue}>{activeBadgeName || 'None'}</Text>
          </View>
          <View style={s.equippedItem}>
            <Text style={s.equippedLabel}>Frame</Text>
            <Text style={s.equippedValue}>{activeFrameName || 'None'}</Text>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  scroll: { padding: 24, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  uploadOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 57,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: t.bg,
  },
  changePhotoText: { fontSize: 13, color: t.accent, marginTop: 10, fontWeight: '600' },
  // Avatar picker
  avatarPickerCard: {
    backgroundColor: t.card, borderRadius: 16, padding: 18,
    marginBottom: 24, borderWidth: 1, borderColor: t.cardBorder,
  },
  pickerTitle: {
    fontSize: 16, fontWeight: '700', color: t.text, textAlign: 'center', marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
  },
  avatarOption: { alignItems: 'center', width: 68 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  avatarEmoji: { fontSize: 26 },
  avatarName: { fontSize: 11, color: t.textMuted, fontWeight: '600', marginTop: 4 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: t.accent, borderRadius: 12, padding: 14, marginTop: 16,
  },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  removeBtn: {
    alignItems: 'center', padding: 10, marginTop: 8,
  },
  removeBtnText: { color: t.danger, fontSize: 13, fontWeight: '600' },
  // Form
  label: { fontSize: 14, fontWeight: '600', color: t.textMuted, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: t.inputBg, borderRadius: 12, padding: 14,
    color: t.text, fontSize: 15, borderWidth: 1, borderColor: t.inputBorder,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: t.textMuted, textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginTop: 28, marginBottom: 12 },
  equippedRow: { flexDirection: 'row', gap: 12 },
  equippedItem: {
    flex: 1, backgroundColor: t.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  equippedLabel: { fontSize: 12, color: t.textMuted, marginBottom: 4 },
  equippedValue: { fontSize: 15, fontWeight: '600', color: t.text },
  saveBtn: {
    backgroundColor: t.accent, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';
import Colors from '../../constants/Colors';
import AnimatedAvatar from '../../components/AnimatedAvatar';

const TIER_INFO: Record<string, { label: string; color: string; emoji: string }> = {
  free: { label: 'Free', color: '#94a3b8', emoji: '🆓' },
  pro: { label: 'Pro', color: '#7c5cfc', emoji: '⚡' },
  ultra: { label: 'Ultra', color: '#fbbf24', emoji: '👑' },
  legendary: { label: 'Legendary', color: '#ff4d6a', emoji: '🐐' },
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function EditProfileScreen() {
  const { profile, session, fetchProfile } = useAuthContext();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!profile || !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const tier = TIER_INFO[profile.tier] || TIER_INFO.free;

  // Find active frame info from profile
  const activeFrameId = profile.active_frame_id;

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  function validateUsername(value: string): string | null {
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must be 20 characters or less';
    if (!USERNAME_REGEX.test(value)) return 'Only letters, numbers, and underscores allowed';
    return null;
  }

  function handleUsernameChange(value: string) {
    setUsername(value);
    setError(null);
    setSuccess(false);
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarChanged(true);
      setSuccess(false);
    }
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarUri || !avatarChanged) return profile?.avatar_url ?? null;

    const ext = avatarUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${session!.user.id}/${Date.now()}.${ext}`;

    // Fetch the image as a blob
    const response = await fetch(avatarUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async function handleSave() {
    const validationError = validateUsername(username.trim());
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmed = username.trim();

    // No changes made
    if (trimmed === profile!.username && !avatarChanged) {
      showAlert('No Changes', 'Nothing has changed.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Check if username is taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .neq('id', session!.user.id)
        .maybeSingle();

      if (existing) {
        setError('This username is already taken');
        setSaving(false);
        return;
      }

      // Upload avatar if changed
      let newAvatarUrl = profile!.avatar_url;
      if (avatarChanged) {
        newAvatarUrl = await uploadAvatar();
      }

      const updates: any = {};
      if (trimmed !== profile!.username) updates.username = trimmed;
      if (avatarChanged && newAvatarUrl !== profile!.avatar_url) updates.avatar_url = newAvatarUrl;

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', session!.user.id);

        if (updateError) {
          setError(updateError.message);
          setSaving(false);
          return;
        }
      }

      await fetchProfile(session!.user.id);
      setAvatarChanged(false);
      setSuccess(true);
      showAlert('Success', 'Your profile has been updated.');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const usernameValidation = username.trim().length > 0 ? validateUsername(username.trim()) : null;
  const isValid = username.trim().length > 0 && !usernameValidation;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar preview */}
        <TouchableOpacity style={styles.avatarSection} onPress={pickImage} activeOpacity={0.7}>
          <AnimatedAvatar
            letter={username.charAt(0)?.toUpperCase() || profile.username.charAt(0).toUpperCase()}
            size={88}
            tierColor={tier.color}
            imageUri={avatarUri}
          />
          <View style={styles.avatarOverlay}>
            <Text style={styles.avatarOverlayText}>Tap to change</Text>
          </View>
        </TouchableOpacity>

        {/* Username input */}
        <View style={styles.card}>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            style={[
              styles.input,
              error ? styles.inputError : null,
              success ? styles.inputSuccess : null,
            ]}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="Enter username"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <View style={styles.validationRow}>
            {usernameValidation ? (
              <Text style={styles.errorText}>{usernameValidation}</Text>
            ) : username.trim().length > 0 ? (
              <Text style={styles.successText}>Username looks good</Text>
            ) : null}
            <Text style={styles.charCount}>
              {username.length}/20
            </Text>
          </View>
        </View>

        {/* Read-only info */}
        <View style={styles.card}>
          <Text style={styles.label}>MEMBER SINCE</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyValue}>{memberSince}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>CURRENT TIER</Text>
          <View style={styles.readOnlyField}>
            <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
              <Text style={styles.tierText}>{tier.emoji} {tier.label}</Text>
            </View>
          </View>
        </View>

        {/* Feedback messages */}
        {error && (
          <View style={styles.feedbackCard}>
            <Text style={styles.feedbackError}>{error}</Text>
          </View>
        )}
        {success && (
          <View style={[styles.feedbackCard, styles.feedbackSuccessCard]}>
            <Text style={styles.feedbackSuccess}>Profile updated successfully!</Text>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!isValid || saving) && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={!isValid || saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    scroll: {
      padding: 16,
      paddingBottom: 40,
    },

    // Avatar
    avatarSection: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    avatarOverlay: {
      marginTop: 10,
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: Colors.primary + '18',
      borderRadius: 12,
    },
    avatarOverlayText: {
      fontSize: 12,
      fontWeight: '600',
      color: Colors.primary,
    },

    // Cards
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    label: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 1.2,
      marginBottom: 10,
    },

    // Input
    input: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      borderWidth: 1.5,
      borderColor: colors.surfaceBorder,
    },
    inputError: {
      borderColor: colors.error,
    },
    inputSuccess: {
      borderColor: colors.success,
    },
    validationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    errorText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.error,
      flex: 1,
    },
    successText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.success,
      flex: 1,
    },
    charCount: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    // Read-only fields
    readOnlyField: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      flexDirection: 'row',
      alignItems: 'center',
    },
    readOnlyValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },

    // Tier badge
    tierBadge: {
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 12,
    },
    tierText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },

    // Feedback
    feedbackCard: {
      backgroundColor: colors.error + '15',
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.error + '40',
    },
    feedbackSuccessCard: {
      backgroundColor: colors.success + '15',
      borderColor: colors.success + '40',
    },
    feedbackError: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.error,
      textAlign: 'center',
    },
    feedbackSuccess: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.success,
      textAlign: 'center',
    },

    // Save button
    saveBtn: {
      backgroundColor: Colors.primary,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme, Theme } from '../../lib/theme';

function notify(title: string, msg: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${msg}`);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Alert } = require('react-native');
    Alert.alert(title, msg);
  }
}

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  async function handleSubmit() {
    if (password.length < 6) {
      notify('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      notify('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      notify('Error', error.message);
      return;
    }
    notify('Success', 'Your password has been updated. Please sign in.');
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  const s = styles(theme);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.title}>Set New Password</Text>
          <Text style={s.subtitle}>Enter and confirm your new password.</Text>
        </View>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="New password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={s.input}
            placeholder="Confirm new password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
          <TouchableOpacity style={s.button} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Update Password</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', color: t.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: t.textMuted, marginTop: 8, textAlign: 'center' },
  form: { gap: 14 },
  input: {
    backgroundColor: t.inputBg, borderRadius: 14, padding: 16,
    color: t.text, fontSize: 16, borderWidth: 1, borderColor: t.inputBorder,
  },
  button: {
    backgroundColor: t.accent, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

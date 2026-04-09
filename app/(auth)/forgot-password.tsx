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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const { theme } = useTheme();

  async function handleSubmit() {
    if (!email.trim()) {
      notify('Error', 'Please enter your email');
      return;
    }
    setLoading(true);
    const redirectTo = Platform.OS === 'web'
      ? `${window.location.origin}/reset-password`
      : 'prodvote://reset-password';
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) {
      notify('Error', error.message);
      return;
    }
    setSent(true);
  }

  const s = styles(theme);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.title}>Forgot Password?</Text>
          <Text style={s.subtitle}>
            {sent
              ? 'Check your email for the reset link.'
              : 'Enter your email and we\'ll send you a reset link.'}
          </Text>
        </View>

        {!sent && (
          <View style={s.form}>
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            <TouchableOpacity style={s.button} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={s.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', color: t.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: t.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 22 },
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
  linkText: { color: t.accent, textAlign: 'center', fontSize: 15, fontWeight: '600' },
});

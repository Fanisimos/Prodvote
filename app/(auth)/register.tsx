import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme, Theme } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState(ref || '');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signUp } = useAuthContext();
  const router = useRouter();
  const { theme } = useTheme();

  function notify(title: string, msg: string) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  }

  async function handleRegister() {
    if (!agreedToTerms) {
      notify('Terms Required', 'Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    if (!username.trim() || !email.trim() || !password.trim()) {
      notify('Error', 'Please fill in all fields');
      return;
    }
    if (username.trim().length < 3) {
      notify('Error', 'Username must be at least 3 characters');
      return;
    }
    if (password.length < 6) {
      notify('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email.trim(), password, username.trim());
    if (error) {
      setLoading(false);
      notify('Registration Failed', error.message);
      return;
    }

    // Apply referral code if provided
    if (referralCode.trim()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.rpc('apply_referral_reward', {
          p_referral_code: referralCode.trim().toUpperCase(),
          p_new_user_id: session.user.id,
        });
      }
    }

    setLoading(false);
    notify('Success', 'Account created! You can now sign in.');
    router.back();
  }

  const s = styles(theme);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <View style={s.header}>
          <Text style={s.title}>Create Account</Text>
          <Text style={s.subtitle}>Join Prodvote and start voting</Text>
        </View>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Username"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            maxLength={30}
          />
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={theme.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={[s.input, s.referralInput]}
            placeholder="Referral code (optional)"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="characters"
            value={referralCode}
            onChangeText={setReferralCode}
            maxLength={10}
          />
          <TouchableOpacity
            style={s.termsRow}
            onPress={() => setAgreedToTerms(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, agreedToTerms && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
              {agreedToTerms && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={s.termsText}>
              I agree to the{' '}
              <Text
                style={s.termsLink}
                onPress={(e) => { e.stopPropagation?.(); Linking.openURL('https://litsaitechnologies.com/legal/prodvote/terms'); }}
              >
                Terms
              </Text>
              {' '}&{' '}
              <Text
                style={s.termsLink}
                onPress={(e) => { e.stopPropagation?.(); Linking.openURL('https://litsaitechnologies.com/legal/prodvote/privacy'); }}
              >
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.button, !agreedToTerms && { opacity: 0.5 }]} onPress={handleRegister} disabled={loading || !agreedToTerms}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.linkText}>
              Already have an account? <Text style={s.linkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 32, fontWeight: '800', color: t.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: t.textMuted, marginTop: 4 },
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
  linkText: { color: t.textMuted, textAlign: 'center', marginTop: 16, fontSize: 15 },
  linkBold: { color: t.accent, fontWeight: '600' },
  referralInput: { borderStyle: 'dashed' },
  termsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: t.inputBorder, alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  termsText: { fontSize: 13, color: t.textMuted, flex: 1 },
  termsLink: { color: t.accent, fontWeight: '600', textDecorationLine: 'underline' },
});

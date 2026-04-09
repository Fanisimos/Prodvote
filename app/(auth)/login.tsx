import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme, Theme } from '../../lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const { signIn, signInAsGuest } = useAuthContext();
  const router = useRouter();
  const { theme } = useTheme();

  function notify(title: string, msg: string) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      notify('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) notify('Login Failed', error.message);
  }

  const s = styles(theme);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <View style={s.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={s.logo}
            resizeMode="contain"
          />
          <Text style={s.title}>Prodvote</Text>
          <Text style={s.subtitle}>Shape the product you want</Text>
        </View>

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
          <TextInput
            style={s.input}
            placeholder="Password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={s.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password' as any)}>
            <Text style={[s.linkText, { marginTop: 12 }]}>
              <Text style={s.linkBold}>Forgot password?</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={s.linkText}>
              Don't have an account? <Text style={s.linkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or</Text>
            <View style={s.dividerLine} />
          </View>

          <TouchableOpacity
            style={s.demoButton}
            onPress={async () => {
              setDemoLoading(true);
              const { error } = await signInAsGuest();
              setDemoLoading(false);
              if (error) notify('Guest Mode Unavailable', error.message || 'Please try again later.');
            }}
            disabled={demoLoading}
          >
            {demoLoading ? (
              <ActivityIndicator color={theme.accent} />
            ) : (
              <Text style={s.demoButtonText}>Try as Guest</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logo: { width: 100, height: 100, borderRadius: 24, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '800', color: t.text, letterSpacing: -1 },
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
  divider: {
    flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.cardBorder },
  dividerText: { color: t.textMuted, fontSize: 13, marginHorizontal: 12 },
  demoButton: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: t.cardBorder, backgroundColor: t.card,
  },
  demoButtonText: { color: t.text, fontSize: 16, fontWeight: '600' },
});

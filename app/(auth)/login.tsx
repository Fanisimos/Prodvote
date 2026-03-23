import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuthContext();
  const router = useRouter();

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Login Failed', error.message);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <View style={[styles.logoCell, { backgroundColor: '#7c5cfc' }]} />
            <View style={[styles.logoCell, { backgroundColor: '#ff4d6a' }]} />
            <View style={[styles.logoCell, { backgroundColor: '#34d399' }]} />
            <View style={[styles.logoCell, { backgroundColor: '#ffb347' }]} />
          </View>
          <Text style={styles.title}>Prodvote</Text>
          <Text style={styles.subtitle}>Shape the product you want</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logo: {
    width: 72, height: 72, flexDirection: 'row', flexWrap: 'wrap',
    gap: 4, padding: 12, borderRadius: 20, backgroundColor: '#1a1a2e',
    marginBottom: 16,
  },
  logoCell: { width: 24, height: 24, borderRadius: 4 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#888', marginTop: 4 },
  form: { gap: 14 },
  input: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
    color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#2a2a3e',
  },
  button: {
    backgroundColor: '#7c5cfc', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkText: { color: '#888', textAlign: 'center', marginTop: 16, fontSize: 15 },
  linkBold: { color: '#7c5cfc', fontWeight: '600' },
});

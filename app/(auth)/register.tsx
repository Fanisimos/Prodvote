import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { LogoIcon } from '../../components/Logo';
import Colors from '../../constants/Colors';

export default function RegisterScreen() {
  const { signUp } = useAuthContext();
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must include an uppercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must include a number');
      return;
    }
    setError('');
    setLoading(true);
    const { error: err } = await signUp(email, password, username);
    setLoading(false);
    if (err) setError(err.message);
  }

  const styles = getStyles(colors);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.logoSection}>
          <LogoIcon size={64} glow />
          <Text style={styles.logo}>Prodvote</Text>
          <Text style={styles.subtitle}>Join the community</Text>
        </View>

        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#64748b"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            accessibilityLabel="Username"
            accessibilityHint="Choose a username, at least 3 characters"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email address"
            accessibilityHint="Enter your email to create an account"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Password"
            accessibilityHint="Must be 8 or more characters with an uppercase letter and number"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            accessibilityLabel="Create account"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkButton} accessibilityLabel="Go to sign in" accessibilityRole="link">
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Text style={styles.companyText}>by LitsAI Technologies</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
      maxWidth: 420,
      width: '100%',
      alignSelf: 'center',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: 36,
    },
    logo: {
      fontSize: 44,
      fontWeight: '800',
      color: '#fff',
      marginTop: 16,
      letterSpacing: -1,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 6,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
    },
    error: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
    },
    button: {
      backgroundColor: Colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
    },
    linkButton: {
      alignItems: 'center',
      marginTop: 4,
    },
    linkText: {
      color: colors.textSecondary,
      fontSize: 15,
    },
    linkBold: {
      color: Colors.primaryLight,
      fontWeight: '600',
    },
    companyText: {
      textAlign: 'center',
      color: colors.textSecondary + '88',
      fontSize: 13,
      marginTop: 32,
      letterSpacing: 0.3,
    },
  });
}

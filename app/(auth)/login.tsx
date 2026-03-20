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

export default function LoginScreen() {
  const { signIn } = useAuthContext();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
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
          <LogoIcon size={72} glow />
          <Text style={styles.logo}>Prodvote</Text>
          <Text style={styles.subtitle}>Shape the product you love</Text>
          <View style={styles.betaBadge}>
            <Text style={styles.betaText}>EARLY ACCESS</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email address"
            accessibilityHint="Enter your email to sign in"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Password"
            accessibilityHint="Enter your password to sign in"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityLabel="Sign in"
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.linkButton} accessibilityLabel="Go to sign up" accessibilityRole="link">
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
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
    betaBadge: {
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: Colors.primary + '55',
      backgroundColor: Colors.primary + '15',
    },
    betaText: {
      color: Colors.primaryLight,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.5,
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

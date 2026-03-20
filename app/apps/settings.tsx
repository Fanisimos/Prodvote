import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import { supabase } from '../../lib/supabase';
import { clearCache } from '../../lib/cache';
import Colors from '../../constants/Colors';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

const PRIVACY_URL = 'https://litsaitechnologies.com/privacy.html';
const TERMS_URL = 'https://litsaitechnologies.com/terms.html';
const SUPPORT_EMAIL = 'support@litsaitechnologies.com';

function showAlert(title: string, message: string, buttons?: any[]) {
  if (Platform.OS === 'web') {
    alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message, buttons);
  }
}

export default function SettingsScreen() {
  const { profile, session, signOut } = useAuthContext();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleReacceptTerms() {
    router.push('/(auth)/agreement');
  }

  async function handleClearCache() {
    await clearCache();
    showAlert('Done', 'Cache cleared successfully.');
  }

  function handleDeleteAccount() {
    if (Platform.OS === 'web') {
      if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
      deleteAccount();
    } else {
      Alert.alert(
        'Delete Account',
        'Are you sure you want to permanently delete your account and all your data? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete My Account',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Final Confirmation',
                'This is irreversible. All your votes, comments, features, coins, and badges will be permanently deleted.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Yes, Delete Everything', style: 'destructive', onPress: deleteAccount },
                ],
              );
            },
          },
        ],
      );
    }
  }

  async function deleteAccount() {
    if (!session?.user.id) return;
    setDeleting(true);
    try {
      // Call server-side function to delete all user data
      const { error } = await supabase.rpc('delete_user_account', { p_user_id: session.user.id });
      if (error) throw error;

      await clearCache();
      await signOut();
      showAlert('Account Deleted', 'Your account and all data have been permanently deleted.');
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to delete account. Please contact support.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Account section */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{session?.user.email || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{profile?.username || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tier</Text>
            <Text style={[styles.value, { color: Colors.primary }]}>{profile?.tier?.toUpperCase() || 'FREE'}</Text>
          </View>
        </View>

        {/* Preferences section */}
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={toggleTheme}>
            <Text style={styles.actionText}>{isDark ? '☀️  Light Mode' : '🌙  Dark Mode'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={handleClearCache}>
            <Text style={styles.actionText}>🗑️  Clear Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Legal section */}
        <Text style={styles.sectionTitle}>LEGAL</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={() => Linking.openURL(TERMS_URL)}>
            <Text style={styles.actionText}>📄  Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={styles.actionText}>🔒  Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={handleReacceptTerms}>
            <Text style={styles.actionText}>✅  Review & Re-accept Terms</Text>
          </TouchableOpacity>
        </View>

        {/* Support section */}
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
            <Text style={styles.actionText}>📧  Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <Text style={[styles.sectionTitle, { color: colors.error }]}>DANGER ZONE</Text>
        <View style={[styles.card, { borderColor: colors.error + '40' }]}>
          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount} disabled={deleting}>
            {deleting ? (
              <ActivityIndicator color={colors.error} size="small" />
            ) : (
              <Text style={[styles.actionText, { color: colors.error }]}>🗑️  Delete My Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Prodvote v{APP_VERSION}</Text>
          <Text style={styles.appInfoText}>by LitsAI Technologies</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 16, paddingBottom: 40 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      letterSpacing: 1.5,
      marginBottom: 8,
      marginTop: 20,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    label: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    value: { fontSize: 15, color: colors.text, fontWeight: '600' },
    actionRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    actionText: { fontSize: 15, color: colors.text, fontWeight: '600' },
    appInfo: { alignItems: 'center', marginTop: 32, gap: 4 },
    appInfoText: { fontSize: 13, color: colors.textSecondary + '88' },
  });
}

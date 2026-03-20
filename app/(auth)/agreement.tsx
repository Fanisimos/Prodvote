import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';
import { LogoIcon } from '../../components/Logo';

const PRIVACY_URL = 'https://litsaitechnologies.com/privacy.html';
const TERMS_URL = 'https://litsaitechnologies.com/terms.html';

export default function AgreementScreen() {
  const router = useRouter();
  const { session, fetchProfile } = useAuthContext();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    if (!session?.user.id) return;
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({ accepted_terms_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (!error) {
      await fetchProfile(session.user.id);
      router.replace('/(tabs)');
    }
    setLoading(false);
  }

  function openLink(url: string) {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoWrap}>
          <LogoIcon size={80} glow />
        </View>
        <Text style={styles.title}>Welcome to Prodvote</Text>
        <Text style={styles.subtitle}>
          Before you continue, please review and accept our terms.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you should know:</Text>

          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>📋</Text>
            <Text style={styles.bulletText}>
              We collect minimal data needed to run the app (email, username, usage data)
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>🔒</Text>
            <Text style={styles.bulletText}>
              Your data is stored securely and never sold to third parties
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>💬</Text>
            <Text style={styles.bulletText}>
              Community guidelines apply — be respectful in chats and submissions
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>💳</Text>
            <Text style={styles.bulletText}>
              Subscriptions auto-renew monthly and can be cancelled anytime via your device settings
            </Text>
          </View>

          <View style={styles.bulletRow}>
            <Text style={styles.bullet}>🗑️</Text>
            <Text style={styles.bulletText}>
              You can request deletion of your account and data at any time
            </Text>
          </View>
        </View>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => openLink(PRIVACY_URL)}>
            <Text style={styles.link}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.linkSep}>·</Text>
          <TouchableOpacity onPress={() => openLink(TERMS_URL)}>
            <Text style={styles.link}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          By tapping "I Agree & Continue" you confirm that you have read and accept our Privacy Policy and Terms of Service.
        </Text>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={handleAccept}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.acceptBtnText}>I Agree & Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 24,
      paddingTop: 60,
      paddingBottom: 40,
      alignItems: 'center',
    },
    logoWrap: {
      marginBottom: 20,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      marginBottom: 20,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
      gap: 12,
    },
    bullet: {
      fontSize: 18,
      marginTop: 1,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    linksRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    link: {
      fontSize: 14,
      fontWeight: '700',
      color: Colors.primary,
      textDecorationLine: 'underline',
    },
    linkSep: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    disclaimer: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 24,
      paddingHorizontal: 10,
    },
    acceptBtn: {
      backgroundColor: Colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 40,
      borderRadius: 14,
      width: '100%',
      alignItems: 'center',
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    acceptBtnText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '800',
    },
  });
}

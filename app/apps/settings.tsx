import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Linking, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useTheme, Theme, tierColor } from '../../lib/theme';
import { useAuthContext } from '../../lib/AuthContext';
import { confirmDeleteAccount } from '../../lib/deleteAccount';
import Watermark from '../../components/Watermark';

const PRIVACY_URL = 'https://litsaitechnologies.com/privacy';
const TERMS_URL = 'https://litsaitechnologies.com/terms';
const SUPPORT_EMAIL = 'support@litsaitechnologies.com';
const MANAGE_SUB_URL = 'https://apps.apple.com/account/subscriptions';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuthContext();
  const { theme, isDark, toggleTheme } = useTheme();
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setPushEnabled(status === 'granted');
    })();
  }, []);

  async function togglePush() {
    if (pushEnabled) {
      Alert.alert(
        'Disable notifications',
        'To disable push notifications, go to iOS Settings → Prodvote → Notifications.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      setPushEnabled(status === 'granted');
      if (status !== 'granted') {
        Linking.openSettings();
      }
    }
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const s = styles(theme);
  const tColor = profile ? tierColor(profile.tier, theme) : theme.accent;
  const appVersion = Constants.expoConfig?.version || '—';

  return (
    <View style={s.container}>
      <Watermark />
      <ScrollView contentContainerStyle={s.content}>

        {/* Account */}
        <SectionLabel theme={theme}>Account</SectionLabel>
        <Group theme={theme}>
          <Row theme={theme} label="Edit profile" onPress={() => router.push('/apps/edit-profile' as any)} />
          <Row theme={theme} label="Blocked users" onPress={() => router.push('/apps/blocked-users' as any)} />
        </Group>

        {/* Subscription */}
        <SectionLabel theme={theme}>Subscription</SectionLabel>
        <Group theme={theme}>
          <Row
            theme={theme}
            label="Current plan"
            value={profile?.tier ? profile.tier.charAt(0).toUpperCase() + profile.tier.slice(1) : 'Free'}
            valueColor={tColor}
            disabled
          />
          {profile?.tier === 'free' ? (
            <Row theme={theme} label="Upgrade plan" onPress={() => router.push('/paywall')} />
          ) : (
            <Row theme={theme} label="Manage subscription" onPress={() => Linking.openURL(MANAGE_SUB_URL)} />
          )}
          <Row theme={theme} label="Restore purchases" onPress={async () => {
            try {
              const { restorePurchases } = await import('../../lib/revenue');
              await restorePurchases();
              Alert.alert('Done', 'Purchases restored.');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not restore purchases.');
            }
          }} />
        </Group>

        {/* Notifications */}
        <SectionLabel theme={theme}>Notifications</SectionLabel>
        <Group theme={theme}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Push notifications</Text>
            <Switch
              value={pushEnabled === true}
              onValueChange={togglePush}
              trackColor={{ false: theme.cardBorder, true: theme.accent }}
              thumbColor="#fff"
            />
          </View>
        </Group>

        {/* Appearance */}
        <SectionLabel theme={theme}>Appearance</SectionLabel>
        <Group theme={theme}>
          <View style={s.row}>
            <Text style={s.rowLabel}>Dark mode</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.cardBorder, true: theme.accent }}
              thumbColor="#fff"
            />
          </View>
        </Group>

        {/* Support */}
        <SectionLabel theme={theme}>Support</SectionLabel>
        <Group theme={theme}>
          <Row theme={theme} label="Contact support" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Prodvote%20support`)} />
          <Row theme={theme} label="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
          <Row theme={theme} label="Terms of service" onPress={() => Linking.openURL(TERMS_URL)} />
        </Group>

        {/* About */}
        <SectionLabel theme={theme}>About</SectionLabel>
        <Group theme={theme}>
          <Row theme={theme} label="Version" value={appVersion} disabled />
        </Group>

        {/* Danger zone */}
        <View style={{ marginTop: 24 }}>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={confirmDeleteAccount}>
            <Text style={s.deleteText}>Delete account</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function SectionLabel({ theme, children }: { theme: Theme; children: string }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginTop: 24, marginBottom: 8, paddingHorizontal: 4 }}>
      {children.toUpperCase()}
    </Text>
  );
}

function Group({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, overflow: 'hidden' }}>
      {children}
    </View>
  );
}

function Row({
  theme, label, value, valueColor, onPress, disabled,
}: {
  theme: Theme;
  label: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.cardBorder,
    }}>
      <Text style={{ fontSize: 15, color: theme.text, fontWeight: '500' }}>{label}</Text>
      {value ? (
        <Text style={{ fontSize: 14, color: valueColor || theme.textMuted, fontWeight: '600' }}>{value}</Text>
      ) : (
        <Text style={{ fontSize: 18, color: theme.textMuted }}>›</Text>
      )}
    </View>
  );
  if (disabled || !onPress) return content;
  return <TouchableOpacity onPress={onPress} activeOpacity={0.6}>{content}</TouchableOpacity>;
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingTop: Platform.OS === 'ios' ? 8 : 24 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 16,
  },
  rowLabel: { fontSize: 15, color: t.text, fontWeight: '500' },
  signOutBtn: {
    backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder,
    paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 12,
  },
  signOutText: { color: t.danger, fontSize: 16, fontWeight: '700' },
  deleteBtn: { alignItems: 'center', paddingVertical: 12 },
  deleteText: { color: t.textMuted, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});

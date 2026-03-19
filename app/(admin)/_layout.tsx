import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import Colors from '../../constants/Colors';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', emoji: '📊', path: '/(admin)/dashboard' },
  { key: 'features', label: 'Features', emoji: '💡', path: '/(admin)/features' },
  { key: 'users', label: 'Users', emoji: '👥', path: '/(admin)/users' },
  { key: 'badges', label: 'Badges', emoji: '🏅', path: '/(admin)/badges' },
  { key: 'channels', label: 'Channels', emoji: '💬', path: '/(admin)/channels' },
];

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut, profile } = useAuthContext();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.logo}>Prodvote</Text>
          <Text style={styles.adminTag}>ADMIN</Text>
        </View>

        <ScrollView style={styles.nav}>
          {NAV_ITEMS.map(item => {
            const active = pathname.includes(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => router.push(item.path as any)}
              >
                <Text style={styles.navEmoji}>{item.emoji}</Text>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.switchEmoji}>📱</Text>
            <Text style={styles.switchText}>View App</Text>
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>@{profile?.username}</Text>
            <Text style={styles.userEmail}>{profile?.tier} tier</Text>
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.main}>
        <Slot />
      </View>
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },

    // Sidebar
    sidebar: {
      width: 220, backgroundColor: colors.surface, borderRightWidth: 1,
      borderRightColor: colors.surfaceBorder, paddingVertical: 20,
    },
    sidebarHeader: {
      paddingHorizontal: 20, marginBottom: 24, flexDirection: 'row',
      alignItems: 'center', gap: 10,
    },
    logo: { fontSize: 20, fontWeight: '800', color: Colors.primary },
    adminTag: {
      fontSize: 9, fontWeight: '900', color: '#fff', backgroundColor: '#ff4d6a',
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, letterSpacing: 1,
    },

    nav: { flex: 1, paddingHorizontal: 12 },
    navItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4,
    },
    navItemActive: { backgroundColor: Colors.primary + '18' },
    navEmoji: { fontSize: 18 },
    navLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    navLabelActive: { color: Colors.primary, fontWeight: '700' },

    // Footer
    sidebarFooter: { paddingHorizontal: 12, gap: 10 },
    switchBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
      backgroundColor: Colors.primary + '12', borderWidth: 1, borderColor: Colors.primary + '30',
    },
    switchEmoji: { fontSize: 16 },
    switchText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
    userInfo: { paddingHorizontal: 12, paddingVertical: 6 },
    userName: { fontSize: 13, fontWeight: '700', color: colors.text },
    userEmail: { fontSize: 11, color: colors.textSecondary },
    signOutBtn: {
      paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10,
      borderWidth: 1, borderColor: colors.error + '40', alignItems: 'center',
    },
    signOutText: { fontSize: 13, fontWeight: '600', color: colors.error },

    // Main
    main: { flex: 1 },
  });
}

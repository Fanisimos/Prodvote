import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

async function callDelete(): Promise<{ error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not signed in' };

  // Call edge function directly with fetch so we control headers
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lmnpydvkoxbzhddyxjpc.supabase.co'}/functions/v1/delete-account`;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_MjGTUHN806-604taK5yCPw_V-81AhAc';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({}),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body?.error || `HTTP ${res.status}` };
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function performDelete() {
  const { error } = await callDelete();
  if (error) {
    if (Platform.OS === 'web') window.alert(`Could not delete account: ${error}`);
    else Alert.alert('Error', `Could not delete account: ${error}`);
    return;
  }
  await supabase.auth.signOut();
  router.replace('/(auth)/login');
}

export function confirmDeleteAccount() {
  const title = 'Delete Account?';
  const msg = 'This permanently deletes your account, submissions, votes, comments, coins, and badges. This CANNOT be undone.';

  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(`${title}\n\n${msg}`);
    if (!ok) return;
    const ok2 = window.confirm('Are you absolutely sure? This is your final warning.');
    if (ok2) performDelete();
    return;
  }

  Alert.alert(title, msg, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        Alert.alert(
          'Final Confirmation',
          'Are you absolutely sure? This is your final warning.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete Forever', style: 'destructive', onPress: performDelete },
          ]
        );
      },
    },
  ]);
}

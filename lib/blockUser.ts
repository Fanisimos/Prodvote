import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';

function notify(title: string, msg: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${msg}`);
  } else {
    Alert.alert(title, msg);
  }
}

function confirm(title: string, msg: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${msg}`));
      return;
    }
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Block', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export async function blockUser(blockedId: string, username?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    notify('Sign In Required', 'You need to be signed in to block users.');
    return false;
  }
  if (session.user.id === blockedId) {
    notify('Error', 'You cannot block yourself.');
    return false;
  }

  const ok = await confirm(
    `Block ${username || 'this user'}?`,
    'You will no longer see their features, comments, or messages. You can unblock them later from your profile settings.'
  );
  if (!ok) return false;

  const { error } = await supabase.from('blocked_users').insert({
    blocker_id: session.user.id,
    blocked_id: blockedId,
  });

  if (error) {
    if (error.code === '23505') {
      notify('Already Blocked', 'You have already blocked this user.');
    } else {
      notify('Error', 'Could not block user. Please try again.');
    }
    return false;
  }

  notify('User Blocked', 'You will no longer see their content.');
  return true;
}

export async function unblockUser(blockedId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', session.user.id)
    .eq('blocked_id', blockedId);

  if (error) {
    notify('Error', 'Could not unblock user.');
    return false;
  }
  return true;
}

export async function getBlockedUserIds(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data } = await supabase
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', session.user.id);
  return (data || []).map((r: any) => r.blocked_id);
}

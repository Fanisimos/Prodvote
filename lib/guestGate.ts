import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

async function goToSignUp() {
  await supabase.auth.signOut();
  router.replace('/(auth)/register');
}

export function promptSignUp(action: string = 'continue') {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(
      `Sign up to ${action}\n\nCreate a free account to unlock voting, submitting, AI, and more.`
    );
    if (ok) goToSignUp();
    return;
  }
  Alert.alert(
    'Sign up to ' + action,
    'Create a free account to unlock voting, submitting, AI, and more.',
    [
      { text: 'Maybe Later', style: 'cancel' },
      { text: 'Sign Up', onPress: goToSignUp },
    ]
  );
}

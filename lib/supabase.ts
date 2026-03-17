import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = 'https://lmnpydvkoxbzhddyxjpc.supabase.co';
const supabaseAnonKey = 'sb_publishable_MjGTUHN806-604taK5yCPw_V-81AhAc';

// Secure storage adapter for auth tokens
const SecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') return localStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') return localStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

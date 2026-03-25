import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

const LIGHT = {
  mode: 'light' as ThemeMode,
  bg: '#F5F0FF',
  card: '#FFFFFF',
  cardBorder: '#E8E0F0',
  surface: '#EDE5F7',
  text: '#1a1a2e',
  textSecondary: '#666680',
  textMuted: '#9090A0',
  accent: '#7c5cfc',
  accentLight: '#7c5cfc22',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E8E0F0',
  headerBg: '#F5F0FF',
  headerText: '#1a1a2e',
  inputBg: '#FFFFFF',
  inputBorder: '#E8E0F0',
  statusBar: 'dark' as 'dark' | 'light',
  gold: '#D4A017',
  goldBg: '#D4A01722',
  danger: '#ff4d6a',
  dangerBg: '#ff4d6a15',
  success: '#34d399',
  successBg: '#34d39915',
  pro: '#7c5cfc',
  ultra: '#fbbf24',
  legendary: '#ff4d6a',
  coinText: '#D4A017',
  badgeBg: '#7c5cfc',
  sortActive: '#7c5cfc',
  sortInactive: '#E8E0F0',
  sortTextActive: '#fff',
  sortTextInactive: '#666680',
  watermarkTint: '#A78BFA',
};

const DARK = {
  mode: 'dark' as ThemeMode,
  bg: '#0a0a14',
  card: '#1a1a2e',
  cardBorder: '#2a2a3e',
  surface: '#12121e',
  text: '#ffffff',
  textSecondary: '#aaaacc',
  textMuted: '#666680',
  accent: '#7c5cfc',
  accentLight: '#7c5cfc22',
  tabBar: '#0a0a14',
  tabBarBorder: '#1a1a2e',
  headerBg: '#0a0a14',
  headerText: '#ffffff',
  inputBg: '#1a1a2e',
  inputBorder: '#2a2a3e',
  statusBar: 'light' as 'dark' | 'light',
  gold: '#fbbf24',
  goldBg: '#fbbf2422',
  danger: '#ff4d6a',
  dangerBg: '#ff4d6a22',
  success: '#34d399',
  successBg: '#34d39922',
  pro: '#7c5cfc',
  ultra: '#fbbf24',
  legendary: '#ff4d6a',
  coinText: '#fbbf24',
  badgeBg: '#7c5cfc',
  sortActive: '#7c5cfc',
  sortInactive: '#1a1a2e',
  sortTextActive: '#fff',
  sortTextInactive: '#888',
  watermarkTint: '#3B2D6B',
};

export type Theme = typeof LIGHT;

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: LIGHT,
  isDark: false,
  toggleTheme: () => {},
});

const STORAGE_KEY = 'prodvote_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light') setMode(stored);
      setLoaded(true);
    });
  }, []);

  const toggleTheme = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const theme = mode === 'dark' ? DARK : LIGHT;
  const isDark = mode === 'dark';

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function tierColor(tier: string, theme: Theme) {
  const map: Record<string, string> = {
    free: theme.textMuted,
    pro: theme.pro,
    ultra: theme.ultra,
    legendary: theme.legendary,
  };
  return map[tier] || theme.textMuted;
}

export function tierEmoji(tier: string) {
  const map: Record<string, string> = {
    free: '🛡️',
    pro: '⚡',
    ultra: '👑',
    legendary: '🐐',
  };
  return map[tier] || '';
}

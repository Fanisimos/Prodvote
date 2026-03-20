import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';

const THEME_KEY = 'prodvote_theme';

type ThemeColors = typeof Colors.dark;

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: Colors.dark,
  isDark: true,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      if (Platform.OS === 'web') {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light') setIsDark(false);
      } else {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'light') setIsDark(false);
      }
    } catch {}
    setLoaded(true);
  }

  async function saveTheme(dark: boolean) {
    const value = dark ? 'dark' : 'light';
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(THEME_KEY, value);
      } else {
        await AsyncStorage.setItem(THEME_KEY, value);
      }
    } catch {}
  }

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      saveTheme(next);
      return next;
    });
  }

  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

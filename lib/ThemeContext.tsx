import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import Colors from '../constants/Colors';

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

  useEffect(() => {
    // Load saved preference
    if (Platform.OS === 'web') {
      const saved = localStorage.getItem('prodvote_theme');
      if (saved === 'light') setIsDark(false);
    }
  }, []);

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      if (Platform.OS === 'web') {
        localStorage.setItem('prodvote_theme', next ? 'dark' : 'light');
      }
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

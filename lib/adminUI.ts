import { Alert, Platform } from 'react-native';

export function notify(title: string, msg?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(msg ? `${title}\n\n${msg}` : title);
  } else {
    Alert.alert(title, msg);
  }
}

export function confirmAction(title: string, msg?: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      resolve(typeof window !== 'undefined' && window.confirm(msg ? `${title}\n\n${msg}` : title));
      return;
    }
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function promptText(title: string, defaultValue = ''): Promise<string | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      const v = typeof window !== 'undefined' ? window.prompt(title, defaultValue) : null;
      resolve(v);
      return;
    }
    Alert.prompt?.(title, undefined, (v) => resolve(v ?? null), 'plain-text', defaultValue);
  });
}

export function pickOption<T extends string>(title: string, options: { label: string; value: T }[]): Promise<T | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      const msg = `${title}\n\n${options.map((o, i) => `${i + 1}. ${o.label}`).join('\n')}\n\nEnter a number (1-${options.length}):`;
      const choice = typeof window !== 'undefined' ? window.prompt(msg) : null;
      if (!choice) { resolve(null); return; }
      const idx = parseInt(choice, 10) - 1;
      resolve(options[idx]?.value ?? null);
      return;
    }
    Alert.alert(title, undefined, [
      ...options.map(o => ({ text: o.label, onPress: () => resolve(o.value) })),
      { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
    ]);
  });
}

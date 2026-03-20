import { Platform, Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

const STORE_URLS: Record<string, string> = {
  ios: 'https://apps.apple.com/app/prodvote/id_YOUR_APP_ID',
  android: 'https://play.google.com/store/apps/details?id=com.litsai.prodvote',
};

function compareVersions(current: string, minimum: string): number {
  const a = current.split('.').map(Number);
  const b = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) < (b[i] || 0)) return -1;
    if ((a[i] || 0) > (b[i] || 0)) return 1;
  }
  return 0;
}

export async function checkAppVersion(): Promise<{
  needsUpdate: boolean;
  maintenance: boolean;
  message?: string;
}> {
  try {
    const { data } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['min_version', 'force_update_message', 'maintenance_mode']);

    if (!data) return { needsUpdate: false, maintenance: false };

    const config: Record<string, string> = {};
    data.forEach((row) => { config[row.key] = row.value; });

    if (config.maintenance_mode === 'true') {
      return { needsUpdate: false, maintenance: true, message: 'Prodvote is undergoing maintenance. Please try again later.' };
    }

    const minVersion = config.min_version || '1.0.0';
    if (compareVersions(APP_VERSION, minVersion) < 0) {
      return {
        needsUpdate: true,
        maintenance: false,
        message: config.force_update_message || 'Please update Prodvote to continue.',
      };
    }

    return { needsUpdate: false, maintenance: false };
  } catch {
    return { needsUpdate: false, maintenance: false };
  }
}

export function promptUpdate(message: string) {
  if (Platform.OS === 'web') return;

  Alert.alert(
    'Update Required',
    message,
    [
      {
        text: 'Update Now',
        onPress: () => {
          const url = STORE_URLS[Platform.OS];
          if (url) Linking.openURL(url);
        },
      },
    ],
    { cancelable: false },
  );
}

export function promptMaintenance(message: string) {
  if (Platform.OS === 'web') {
    alert(message);
    return;
  }
  Alert.alert('Maintenance', message, [{ text: 'OK' }], { cancelable: false });
}

import { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from 'expo-router';
import { useTheme, Theme } from '../../lib/theme';

let WebView: any = null;
let Asset: any = null;

if (Platform.OS !== 'web') {
  try { WebView = require('react-native-webview').WebView; } catch {}
  try { Asset = require('expo-asset').Asset; } catch {}
}

export default function LunarPatrolScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const webViewRef = useRef<any>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Disable iOS swipe-back gesture so swipe-right controls the rover
  useEffect(() => {
    navigation.getParent()?.setOptions({ gestureEnabled: false });
    return () => {
      navigation.getParent()?.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      loadAsset();
    }
  }, []);

  async function loadAsset() {
    try {
      const asset = Asset.fromModule(require('../../assets/lunar-patrol.html'));
      await asset.downloadAsync();
      if (asset.localUri) {
        setUri(asset.localUri);
      } else {
        setError('Could not load game asset');
      }
    } catch (e: any) {
      console.error('Failed to load Lunar Patrol:', e);
      setError(e.message || 'Failed to load game');
    }
  }

  const s = styles(theme);

  if (Platform.OS === 'web') {
    return (
      <View style={s.container}>
        <iframe
          src="/lunar-patrol.html"
          style={{ flex: 1, width: '100%', height: '100%', border: 'none' } as any}
          allowFullScreen
        />
      </View>
    );
  }

  if (!WebView || !Asset) {
    return (
      <View style={[s.container, s.loading]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🚀</Text>
        <Text style={s.errorText}>Lunar Patrol requires a production build.{'\n'}Not available in Expo Go.</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[s.container, s.loading]}>
        <Text style={s.errorText}>{error}</Text>
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={[s.container, s.loading]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={s.gameContainer}>
      <WebView
        ref={webViewRef}
        source={{ uri }}
        style={s.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        originWhitelist={['*']}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
      />
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ff4d6a',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
});

import { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';

let WebView: any = null;
let Asset: any = null;

if (Platform.OS !== 'web') {
  try { WebView = require('react-native-webview').WebView; } catch {}
  try { Asset = require('expo-asset').Asset; } catch {}
}

export default function MoonPatrolScreen() {
  const webViewRef = useRef<any>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      loadAsset();
    }
  }, []);

  async function loadAsset() {
    try {
      const asset = Asset.fromModule(require('../../assets/moon-patrol.html'));
      await asset.downloadAsync();
      if (asset.localUri) {
        setUri(asset.localUri);
      } else {
        setError('Could not load game asset');
      }
    } catch (e: any) {
      console.error('Failed to load Moon Patrol:', e);
      setError(e.message || 'Failed to load game');
    }
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src="/moon-patrol.html"
          style={{ flex: 1, width: '100%', height: '100%', border: 'none' } as any}
          allowFullScreen
        />
      </View>
    );
  }

  if (!WebView || !Asset) {
    return (
      <View style={[styles.container, styles.loading]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🚀</Text>
        <Text style={styles.errorText}>Moon Patrol requires a production build.{'\n'}Not available in Expo Go.</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.loading]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!uri) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#7c5cfc" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri }}
        style={styles.webview}
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

const styles = StyleSheet.create({
  container: {
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

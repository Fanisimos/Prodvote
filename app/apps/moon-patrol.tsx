import { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';

let WebView: any = null;
let FileSystem: any = null;
let Asset: any = null;

if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
  FileSystem = require('expo-file-system');
  Asset = require('expo-asset').Asset;
}

export default function MoonPatrolScreen() {
  const webViewRef = useRef<any>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      loadHtml();
    }
  }, []);

  async function loadHtml() {
    try {
      const asset = Asset.fromModule(require('../../assets/moon-patrol.html'));
      await asset.downloadAsync();
      if (asset.localUri) {
        const content = await FileSystem.readAsStringAsync(asset.localUri);
        setHtml(content);
      } else {
        setError('Could not load game asset');
      }
    } catch (e: any) {
      console.error('Failed to load Moon Patrol HTML:', e);
      setError(e.message || 'Failed to load game');
    }
  }

  // Web: use an iframe pointing to the static HTML file in public/
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

  if (error) {
    return (
      <View style={[styles.container, styles.loading]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!html) {
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
        source={{ html, baseUrl: '' }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        originWhitelist={['*']}
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

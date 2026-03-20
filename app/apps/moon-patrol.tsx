import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { WebView } from 'react-native-webview';
import { useRef, useState, useEffect } from 'react';
import { Asset } from 'expo-asset';

const GAME_ASSET = require('../../public/games/moon-patrol.html');

export default function MoonPatrolScreen() {
  const { colors } = useTheme();
  const webViewRef = useRef(null);
  const [gameUri, setGameUri] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      const asset = Asset.fromModule(GAME_ASSET);
      await asset.downloadAsync();
      if (asset.localUri) {
        setGameUri(asset.localUri);
      }
    })();
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src="/games/moon-patrol.html"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#000',
          }}
          allow="autoplay"
        />
      </View>
    );
  }

  if (!gameUri) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#4dc9f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: gameUri }}
        style={{ flex: 1, backgroundColor: '#000' }}
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
  container: { flex: 1, backgroundColor: '#000' },
  loading: { justifyContent: 'center', alignItems: 'center' },
});

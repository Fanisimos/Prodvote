import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../lib/ThemeContext';
import { WebView } from 'react-native-webview';
import { useRef } from 'react';

const GAME_HTML = require('../../public/games/moon-patrol.html');

export default function MoonPatrolScreen() {
  const { colors } = useTheme();
  const webViewRef = useRef(null);

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

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={GAME_HTML}
        style={{ flex: 1, backgroundColor: '#000' }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});

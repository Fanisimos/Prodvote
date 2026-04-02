import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { useNavigation } from 'expo-router';
import { useTheme } from '../../lib/theme';

const asset = Asset.fromModule(require('../../assets/snake.html'));

export default function SnakeScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  // Disable iOS swipe-back gesture so swipe-right controls the snake
  useEffect(() => {
    navigation.getParent()?.setOptions({ gestureEnabled: false });
    return () => {
      navigation.getParent()?.setOptions({ gestureEnabled: true });
    };
  }, [navigation]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ fontSize: 48 }}>🐍</Text>
        <Text style={{ color: theme.textMuted, marginTop: 12, fontSize: 16 }}>
          Play Snake in the mobile app!
        </Text>
      </View>
    );
  }

  const uri = asset.localUri || asset.uri;

  if (!uri) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={{ color: theme.textMuted }}>Loading game...</Text>
      </View>
    );
  }

  return (
    <WebView
      style={{ flex: 1, backgroundColor: theme.bg }}
      source={{ uri }}
      allowFileAccess
      allowFileAccessFromFileURLs
      allowUniversalAccessFromFileURLs
      originWhitelist={['*']}
      javaScriptEnabled
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

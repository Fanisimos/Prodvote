import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.title}>Something went wrong</Text>
          <ScrollView style={s.scroll}>
            <Text style={s.error}>{this.state.error?.message}</Text>
            <Text style={s.stack}>{this.state.error?.stack}</Text>
          </ScrollView>
          <TouchableOpacity
            style={s.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={s.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 80, backgroundColor: '#0a0a0f' },
  title: { fontSize: 20, fontWeight: '800', color: '#ff4d6a', marginBottom: 16 },
  scroll: { flex: 1, marginBottom: 16 },
  error: { fontSize: 14, color: '#fbbf24', fontWeight: '600', marginBottom: 12 },
  stack: { fontSize: 11, color: '#94a3b8', lineHeight: 18 },
  btn: { backgroundColor: '#7c5cfc', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

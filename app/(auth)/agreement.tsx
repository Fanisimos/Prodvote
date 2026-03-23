import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function AgreementScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.body}>
          By using Prodvote, you agree to the following terms:{'\n\n'}
          1. You must be at least 13 years old to use this service.{'\n\n'}
          2. You are responsible for all activity under your account.{'\n\n'}
          3. You agree not to post spam, harmful content, or abuse other users.{'\n\n'}
          4. Feature requests and votes are public. Comments are public.{'\n\n'}
          5. We reserve the right to remove content or ban accounts that violate these terms.{'\n\n'}
          6. Subscription purchases are handled through Apple's App Store. Refunds follow Apple's refund policy.{'\n\n'}
          7. We may update these terms at any time. Continued use constitutes acceptance.
        </Text>

        <Text style={[styles.title, { marginTop: 32 }]}>Privacy Policy</Text>
        <Text style={styles.body}>
          We collect the following data:{'\n\n'}
          • Email address and username for authentication{'\n\n'}
          • Feature requests, votes, and comments you submit{'\n\n'}
          • App usage data to improve the service{'\n\n'}
          We do not sell your data to third parties. Your data is stored securely on Supabase infrastructure.
        </Text>
      </ScrollView>

      <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
        <Text style={styles.btnText}>I Agree</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 24, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 16 },
  body: { fontSize: 14, color: '#aaa', lineHeight: 22 },
  btn: {
    backgroundColor: '#7c5cfc',
    margin: 24,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

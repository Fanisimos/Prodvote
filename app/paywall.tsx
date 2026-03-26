import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import Watermark from '../components/Watermark';
import { router } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases, isRevenueCatReady } from '../lib/revenue';
import { useAuthContext } from '../lib/AuthContext';
import { useTheme, Theme, tierColor } from '../lib/theme';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    emoji: '🛡️',
    price: '£0',
    period: 'forever',
    color: '#888',
    tag: null,
    tagColor: '',
    features: [
      '3 votes per month',
      '500 starting coins',
      'Access to all apps',
      'Basic badges',
    ],
    checkColor: '#888',
    btnColor: '',
    productId: null,
  },
  {
    key: 'pro',
    name: 'Pro',
    emoji: '⚡',
    price: '£1.99',
    period: '/month',
    color: '#7c5cfc',
    tag: 'BEST VALUE',
    tagColor: '#7c5cfc',
    features: [
      '10 votes per month',
      '300 coins every month',
      'Pro badge next to your name',
      'Early access to new apps',
      'Priority feature submissions',
    ],
    checkColor: '#7c5cfc',
    btnColor: '#7c5cfc',
    productId: 'prodvote_pro_monthly',
  },
  {
    key: 'ultra',
    name: 'Ultra',
    emoji: '👑',
    price: '£4.99',
    period: '/month',
    color: '#fbbf24',
    tag: 'POWER USER',
    tagColor: '#fbbf24',
    features: [
      'Everything in Pro',
      'Unlimited votes',
      '1,000 coins every month',
      'Exclusive Ultra badge + glow',
      'Votes count 3x more weight',
      'Priority feature requests',
    ],
    checkColor: '#fbbf24',
    btnColor: '#fbbf24',
    productId: 'prodvote_ultra_monthly',
  },
  {
    key: 'legendary',
    name: 'Legendary',
    emoji: '🐐',
    price: '£9.99',
    period: '/month',
    color: '#ff4d6a',
    tag: 'GOAT STATUS',
    tagColor: '#ff4d6a',
    features: [
      'Everything in Ultra',
      '+1,500 extra coins every month',
      'Exclusive 🐐 GOAT badge',
      'Name in gold on comments',
      "You're literally just supporting us",
      'And we love you for it',
      'Seriously, thank you ❤️',
    ],
    checkColor: '#ff4d6a',
    btnColor: '#ff4d6a',
    productId: 'prodvote_legendary_monthly',
  },
];

const COMPARE_ROWS = [
  { feature: 'Monthly votes', free: '3', pro: '10', ultra: '∞', legendary: '∞' },
  { feature: 'Monthly coins', free: '0', pro: '300', ultra: '1,000', legendary: '2,500' },
  { feature: 'Vote weight', free: '1x', pro: '1x', ultra: '3x', legendary: '3x' },
  { feature: 'Profile badge', free: '—', pro: '⚡', ultra: '👑', legendary: '🐐' },
  { feature: 'Early access', free: '—', pro: '✓', ultra: '✓', legendary: '✓' },
  { feature: 'Priority subs', free: '—', pro: '✓', ultra: '✓', legendary: '✓' },
];

export default function PaywallScreen() {
  const { profile, fetchProfile } = useAuthContext();
  const { theme } = useTheme();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    async function loadOfferings() {
      const offering = await getOfferings();
      if (offering) {
        setPackages(offering.availablePackages);
        setLoading(false);
      } else if (attempts < 3) {
        // RevenueCat might not be initialized yet — retry
        attempts++;
        setTimeout(loadOfferings, 1500);
      } else {
        setLoading(false);
      }
    }
    loadOfferings();
  }, []);

  async function handlePurchase(productId: string) {
    const pkg = packages.find(p => p.product.identifier === productId);
    if (!pkg) {
      Alert.alert('Error', 'Package not available. Please try again later.');
      return;
    }

    setPurchasing(productId);
    const result = await purchasePackage(pkg);
    setPurchasing(null);

    if (result.success) {
      await fetchProfile();
      Alert.alert('Welcome!', 'Your subscription is now active.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else if (!result.cancelled) {
      Alert.alert('Error', result.error || 'Purchase failed');
    }
  }

  async function handleRestore() {
    setPurchasing('restore');
    const result = await restorePurchases();
    setPurchasing(null);
    if (result.success) {
      await fetchProfile();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } else {
      Alert.alert('Error', result.error || 'Restore failed');
    }
  }

  const s = styles(theme);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={theme.accent} size="large" /></View>;
  }

  return (
    <View style={s.container}>
      <Watermark />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>

      <Text style={s.heading}>Choose Your Plan</Text>
      <Text style={s.subheading}>Unlock more power. Support the community.</Text>

      {/* Plan Cards */}
      {PLANS.map(plan => {
        const isCurrent = profile?.tier === plan.key;
        return (
          <View key={plan.key} style={[s.planCard, { borderColor: plan.color + '66' }]}>
            {plan.tag && (
              <View style={[s.planTag, { backgroundColor: plan.tagColor }]}>
                <Text style={s.planTagText}>{plan.tag}</Text>
              </View>
            )}
            <View style={s.planHeader}>
              <Text style={{ fontSize: 28 }}>{plan.emoji}</Text>
              <View style={{ marginLeft: 10 }}>
                <Text style={[s.planName, { color: plan.color }]}>{plan.name}</Text>
                <View style={s.priceRow}>
                  <Text style={s.planPrice}>{plan.price}</Text>
                  <Text style={s.planPeriod}>{plan.period}</Text>
                </View>
              </View>
            </View>

            {plan.features.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <Text style={[s.check, { color: plan.checkColor }]}>✓</Text>
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}

            {plan.productId && (
              <TouchableOpacity
                style={[s.subscribeBtn, { backgroundColor: plan.btnColor }, isCurrent && s.currentBtn, purchasing === plan.productId && { opacity: 0.6 }]}
                onPress={() => isCurrent ? null : handlePurchase(plan.productId!)}
                disabled={isCurrent || purchasing !== null}
              >
                {purchasing === plan.productId ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[s.subscribeBtnText, isCurrent && { color: plan.color }]}>
                    {isCurrent ? 'Current Plan' : `Subscribe to ${plan.name}`}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {plan.key === 'free' && !plan.productId && profile?.tier === 'free' && (
              <View style={[s.subscribeBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#888' }]}>
                <Text style={[s.subscribeBtnText, { color: '#888' }]}>Current Plan</Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Compare Plans Table */}
      <Text style={s.compareTitle}>Compare Plans</Text>
      <View style={s.table}>
        {/* Header */}
        <View style={s.tableRow}>
          <Text style={[s.tableCell, s.tableHeader, { flex: 1.5 }]}>FEATURE</Text>
          <Text style={[s.tableCell, s.tableHeader]}>FREE</Text>
          <Text style={[s.tableCell, s.tableHeader, { color: '#7c5cfc' }]}>PRO</Text>
          <Text style={[s.tableCell, s.tableHeader, { color: '#fbbf24' }]}>ULTRA</Text>
          <Text style={[s.tableCell, s.tableHeader]}>🐐</Text>
        </View>
        {COMPARE_ROWS.map((row, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 0 && { backgroundColor: theme.surface }]}>
            <Text style={[s.tableCell, { flex: 1.5, fontWeight: '600' }]}>{row.feature}</Text>
            <Text style={s.tableCell}>{row.free}</Text>
            <Text style={[s.tableCell, { color: '#7c5cfc', fontWeight: '600' }]}>{row.pro}</Text>
            <Text style={[s.tableCell, { color: '#fbbf24', fontWeight: '600' }]}>{row.ultra}</Text>
            <Text style={[s.tableCell, { color: '#ff4d6a', fontWeight: '600' }]}>{row.legendary}</Text>
          </View>
        ))}
      </View>

      {/* Restore */}
      <TouchableOpacity onPress={handleRestore} style={s.restoreBtn}>
        <Text style={s.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={s.legal}>
        Payment will be charged to your Apple ID account at the confirmation of purchase.
        Subscription automatically renews unless it is canceled at least 24 hours before
        the end of the current period. Your account will be charged for renewal within
        24 hours prior to the end of the current period.
      </Text>
    </ScrollView>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 28, fontWeight: '800', color: t.text, textAlign: 'center' },
  subheading: { fontSize: 15, color: t.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  planCard: {
    backgroundColor: t.card, borderRadius: 18, padding: 22, marginBottom: 16,
    borderWidth: 1.5,
  },
  planTag: {
    position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  planTagText: { color: '#fff', fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  planName: { fontSize: 22, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  planPrice: { fontSize: 28, fontWeight: '800', color: t.text },
  planPeriod: { fontSize: 14, color: t.textMuted, marginLeft: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  check: { fontSize: 16, marginRight: 10, fontWeight: '700' },
  featureText: { color: t.textSecondary, fontSize: 15, flex: 1 },
  subscribeBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  currentBtn: {
    backgroundColor: 'transparent', borderWidth: 1.5,
  },
  subscribeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  compareTitle: { fontSize: 22, fontWeight: '800', color: t.text, marginTop: 10, marginBottom: 16 },
  table: {
    backgroundColor: t.card, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: t.cardBorder,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10 },
  tableCell: { flex: 1, fontSize: 13, color: t.text, textAlign: 'center' },
  tableHeader: { fontWeight: '800', fontSize: 11, color: t.textMuted, letterSpacing: 0.5 },
  restoreBtn: { padding: 16, alignItems: 'center', marginTop: 10 },
  restoreText: { color: t.textMuted, fontSize: 14 },
  legal: { color: t.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 8 },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuthContext } from '../../lib/AuthContext';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';
import { getOfferings, purchasePackage, restorePurchases } from '../../lib/purchases';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  color: string;
  badge: string;
  features: string[];
  highlight?: boolean;
  tag?: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '£0',
    period: 'forever',
    color: '#94a3b8',
    badge: '🆓',
    features: [
      '3 votes per month',
      '500 starting coins',
      'Access to all apps',
      'Basic badges',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '£1.99',
    period: '/month',
    color: '#7c5cfc',
    badge: '⚡',
    highlight: true,
    tag: 'BEST VALUE',
    features: [
      '10 votes per month',
      '600 coins every month',
      'Pro badge next to your name',
      'Early access to new apps',
      'Priority feature submissions',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: '£4.99',
    period: '/month',
    color: '#fbbf24',
    badge: '👑',
    tag: 'POWER USER',
    features: [
      'Everything in Pro',
      'Unlimited votes',
      '1,000 coins every month',
      'Exclusive Ultra badge + glow',
      'Votes count 3x more weight',
      'Priority feature requests',
    ],
  },
  {
    id: 'legendary',
    name: 'Legendary',
    price: '£9.99',
    period: '/month',
    color: '#ff4d6a',
    badge: '🐐',
    tag: 'GOAT STATUS',
    features: [
      'Everything in Ultra',
      '+1,500 extra coins every month',
      'Exclusive 🐐 GOAT badge',
      'Name in gold on comments',
      'You\'re literally just supporting us',
      'And we love you for it',
      'Seriously, thank you ❤️',
    ],
  },
];

const COMPARISON = [
  { feature: 'Monthly votes', free: '3', pro: '10', ultra: '∞', legendary: '∞' },
  { feature: 'Monthly coins', free: '0', pro: '600', ultra: '1,000', legendary: '2,500' },
  { feature: 'Vote weight', free: '1x', pro: '1x', ultra: '3x', legendary: '3x' },
  { feature: 'Profile badge', free: '—', pro: '⚡', ultra: '👑', legendary: '🐐' },
  { feature: 'Early access', free: '—', pro: '✓', ultra: '✓', legendary: '✓' },
  { feature: 'Priority subs', free: '—', pro: '✓', ultra: '✓', legendary: '✓' },
  { feature: 'Gold name', free: '—', pro: '—', ultra: '—', legendary: '✓' },
  { feature: 'Our love', free: '—', pro: '—', ultra: '—', legendary: '∞' },
];

export default function PlansScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { profile, fetchProfile, session } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [offerings, setOfferings] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      getOfferings().then(o => setOfferings(o));
    }
  }, []);

  async function handleSubscribe(plan: Plan) {
    if (plan.id === 'free') return;

    // On web, show coming soon (Stripe integration later)
    if (Platform.OS === 'web') {
      alert(`Subscribe on the mobile app to unlock ${plan.name}!`);
      return;
    }

    // Find the matching package from RevenueCat offerings
    if (!offerings?.availablePackages) {
      Alert.alert('Not Available', 'Subscription packages are being set up. Please try again later.');
      return;
    }

    // Match plan to package by identifier
    const pkg = offerings.availablePackages.find((p: any) =>
      p.identifier.toLowerCase().includes(plan.id)
    );

    if (!pkg) {
      Alert.alert('Not Available', `${plan.name} package is not available yet.`);
      return;
    }

    setPurchasing(true);
    const result = await purchasePackage(pkg);
    setPurchasing(false);

    if (result.success) {
      // Refresh profile to get updated tier
      if (session?.user.id) await fetchProfile(session.user.id);
      Alert.alert('Welcome!', `You're now a ${plan.name} member! 🎉`);
    } else if (!result.cancelled) {
      Alert.alert('Error', result.error || 'Something went wrong. Please try again.');
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    const info = await restorePurchases();
    setPurchasing(false);
    if (info) {
      if (session?.user.id) await fetchProfile(session.user.id);
      Alert.alert('Restored', 'Your purchases have been restored.');
    } else {
      Alert.alert('No Purchases', 'No previous purchases found.');
    }
  }

  const currentTier = profile?.tier || 'free';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <Text style={styles.headerSub}>
          Unlock more power. Support the community.
        </Text>
      </View>

      {/* Plan cards */}
      {PLANS.map(plan => {
        const isCurrent = currentTier === plan.id;
        return (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              plan.highlight && styles.planHighlight,
              plan.highlight && { borderColor: plan.color },
            ]}
          >
            {plan.tag && (
              <View style={[styles.planTag, { backgroundColor: plan.color }]}>
                <Text style={styles.planTagText}>{plan.tag}</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <Text style={styles.planBadge}>{plan.badge}</Text>
              <View>
                <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </View>
            </View>

            <View style={styles.featureList}>
              {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={[styles.featureCheck, { color: plan.color }]}>✓</Text>
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            {isCurrent ? (
              <View style={[styles.currentBtn, { borderColor: plan.color }]}>
                <Text style={[styles.currentBtnText, { color: plan.color }]}>Current Plan</Text>
              </View>
            ) : plan.id === 'free' ? null : (
              <TouchableOpacity
                style={[styles.subscribeBtn, { backgroundColor: plan.color }]}
                onPress={() => handleSubscribe(plan)}
              >
                <Text style={styles.subscribeBtnText}>
                  Subscribe to {plan.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Comparison table */}
      <View style={styles.compSection}>
        <Text style={styles.compTitle}>Compare Plans</Text>
        <View style={styles.compTable}>
          {/* Header row */}
          <View style={styles.compHeaderRow}>
            <Text style={[styles.compCell, styles.compFeatureCell, styles.compHeaderText]}>Feature</Text>
            <Text style={[styles.compCell, styles.compHeaderText]}>Free</Text>
            <Text style={[styles.compCell, styles.compHeaderText, { color: '#7c5cfc' }]}>Pro</Text>
            <Text style={[styles.compCell, styles.compHeaderText, { color: '#fbbf24' }]}>Ultra</Text>
            <Text style={[styles.compCell, styles.compHeaderText, { color: '#ff4d6a' }]}>🐐</Text>
          </View>
          {COMPARISON.map((row, i) => (
            <View key={i} style={[styles.compRow, i % 2 === 0 && styles.compRowAlt]}>
              <Text style={[styles.compCell, styles.compFeatureCell, styles.compFeatureText]}>{row.feature}</Text>
              <Text style={[styles.compCell, styles.compValueText]}>{row.free}</Text>
              <Text style={[styles.compCell, styles.compValueText, { color: '#7c5cfc' }]}>{row.pro}</Text>
              <Text style={[styles.compCell, styles.compValueText, { color: '#fbbf24' }]}>{row.ultra}</Text>
              <Text style={[styles.compCell, styles.compValueText, { color: '#ff4d6a' }]}>{row.legendary}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* FAQ */}
      <View style={styles.faqSection}>
        <Text style={styles.faqTitle}>FAQ</Text>

        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>Can I cancel anytime?</Text>
          <Text style={styles.faqA}>Yes. Cancel anytime from your profile. You keep benefits until the end of your billing period.</Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>What happens to my coins if I downgrade?</Text>
          <Text style={styles.faqA}>You keep all coins and purchased badges. You just stop receiving monthly coins.</Text>
        </View>

        <View style={styles.faqItem}>
          <Text style={styles.faqQ}>Do unused votes roll over?</Text>
          <Text style={styles.faqA}>No, votes reset monthly. Coins never expire though.</Text>
        </View>

        <View style={[styles.faqItem, { borderBottomWidth: 0 }]}>
          <Text style={styles.faqQ}>Can I switch plans?</Text>
          <Text style={styles.faqA}>Yes, upgrade or downgrade at any time. Changes take effect immediately.</Text>
        </View>
      </View>

      {/* Restore purchases */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={purchasing}>
          <Text style={styles.restoreBtnText}>Restore Purchases</Text>
        </TouchableOpacity>
      )}

      {/* Guarantee */}
      <View style={styles.guarantee}>
        <Text style={styles.guaranteeEmoji}>🛡️</Text>
        <Text style={styles.guaranteeTitle}>7-Day Money-Back Guarantee</Text>
        <Text style={styles.guaranteeSub}>Not happy? Full refund within 7 days, no questions asked.</Text>
      </View>

      {/* Loading overlay */}
      {purchasing && (
        <View style={styles.purchasingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.purchasingText}>Processing...</Text>
        </View>
      )}
    </ScrollView>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },

    // Header
    header: { alignItems: 'center', paddingVertical: 20 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
    headerSub: { fontSize: 15, color: colors.textSecondary },

    // Plan cards
    planCard: {
      backgroundColor: colors.surface, borderRadius: 20, padding: 22, marginBottom: 14,
      borderWidth: 1.5, borderColor: colors.surfaceBorder, overflow: 'hidden',
    },
    planHighlight: { borderWidth: 2 },
    planTag: {
      position: 'absolute', top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 6,
      borderBottomLeftRadius: 12,
    },
    planTagText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    planBadge: { fontSize: 36 },
    planName: { fontSize: 22, fontWeight: '800' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
    planPrice: { fontSize: 28, fontWeight: '800', color: colors.text },
    planPeriod: { fontSize: 14, color: colors.textSecondary },

    featureList: { gap: 10, marginBottom: 18 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureCheck: { fontSize: 14, fontWeight: '800' },
    featureText: { fontSize: 14, color: colors.text },

    subscribeBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
    subscribeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    currentBtn: {
      borderRadius: 14, padding: 16, alignItems: 'center',
      borderWidth: 2, backgroundColor: 'transparent',
    },
    currentBtnText: { fontSize: 16, fontWeight: '800' },

    // Comparison
    compSection: { marginTop: 16 },
    compTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 14 },
    compTable: {
      backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden',
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    compHeaderRow: {
      flexDirection: 'row', backgroundColor: colors.surfaceBorder + '40',
      paddingVertical: 12, paddingHorizontal: 4,
    },
    compRow: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 4 },
    compRowAlt: { backgroundColor: colors.background + '40' },
    compCell: { flex: 1, textAlign: 'center', fontSize: 12 },
    compFeatureCell: { flex: 1.5, textAlign: 'left', paddingLeft: 12 },
    compHeaderText: { fontWeight: '800', color: colors.textSecondary, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
    compFeatureText: { color: colors.text, fontWeight: '600' },
    compValueText: { color: colors.textSecondary, fontWeight: '700' },

    // FAQ
    faqSection: {
      marginTop: 24, backgroundColor: colors.surface, borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    faqTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
    faqItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
    faqQ: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
    faqA: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

    // Guarantee
    guarantee: {
      marginTop: 20, alignItems: 'center', backgroundColor: Colors.primary + '0a',
      borderRadius: 16, padding: 24, borderWidth: 1, borderColor: Colors.primary + '20',
    },
    guaranteeEmoji: { fontSize: 32, marginBottom: 8 },
    guaranteeTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
    guaranteeSub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

    // Restore
    restoreBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 16 },
    restoreBtnText: { fontSize: 14, color: colors.textSecondary, textDecorationLine: 'underline' },

    // Purchasing overlay
    purchasingOverlay: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
    },
    purchasingText: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 12 },
  });
}

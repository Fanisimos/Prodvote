import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/revenue';
import { useAuthContext } from '../lib/AuthContext';

const TIER_BENEFITS = {
  pro: {
    name: 'Pro',
    color: '#7c5cfc',
    features: [
      '10 votes per month',
      '2x daily coin rewards',
      '600 bonus coins monthly',
      'Exclusive badges & frames',
    ],
  },
  ultra: {
    name: 'Ultra',
    color: '#fbbf24',
    features: [
      'Unlimited votes',
      '3x vote weight',
      '3x daily coin rewards',
      '1,000 bonus coins monthly',
      'Priority feature requests',
      'All animated avatar frames',
    ],
  },
  legendary: {
    name: 'Legendary',
    color: '#ff4d6a',
    features: [
      'Unlimited votes',
      '3x vote weight',
      '4x daily coin rewards',
      '2,500 bonus coins monthly',
      'Gold username',
      'All badges & frames unlocked',
    ],
  },
};

export default function PaywallScreen() {
  const { profile, fetchProfile } = useAuthContext();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const offering = await getOfferings();
      if (offering) {
        setPackages(offering.availablePackages);
        if (offering.availablePackages.length > 0) {
          setSelectedPkg(offering.availablePackages[0].identifier);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function handlePurchase() {
    const pkg = packages.find(p => p.identifier === selectedPkg);
    if (!pkg) return;

    setPurchasing(true);
    const result = await purchasePackage(pkg);
    setPurchasing(false);

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
    setPurchasing(true);
    const result = await restorePurchases();
    setPurchasing(false);

    if (result.success) {
      await fetchProfile();
      Alert.alert('Restored', 'Your purchases have been restored.');
    } else {
      Alert.alert('Error', result.error || 'Restore failed');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#7c5cfc" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Choose Your Plan</Text>
      <Text style={styles.subheading}>Unlock the full Prodvote experience</Text>

      {profile?.tier !== 'free' && (
        <View style={styles.currentTier}>
          <Text style={styles.currentTierText}>CURRENT TIER: {profile?.tier.toUpperCase()}</Text>
        </View>
      )}

      {/* Plan Cards */}
      {Object.entries(TIER_BENEFITS).map(([key, tier]) => (
        <View key={key} style={[styles.planCard, { borderColor: tier.color + '66' }]}>
          {key === 'ultra' && (
            <View style={styles.bestValue}>
              <Text style={styles.bestValueText}>BEST VALUE</Text>
            </View>
          )}
          <Text style={[styles.planName, { color: tier.color }]}>{tier.name}</Text>
          {tier.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Package Selection */}
      {packages.length > 0 && (
        <View style={styles.packageSection}>
          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.identifier}
              style={[
                styles.packageBtn,
                selectedPkg === pkg.identifier && styles.packageBtnActive,
              ]}
              onPress={() => setSelectedPkg(pkg.identifier)}
            >
              <Text style={styles.packageTitle}>{pkg.product.title}</Text>
              <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Subscribe Button */}
      <TouchableOpacity
        style={[styles.subscribeBtn, purchasing && { opacity: 0.6 }]}
        onPress={handlePurchase}
        disabled={purchasing || !selectedPkg}
      >
        {purchasing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
        <Text style={styles.restoreText}>Restore Purchases</Text>
      </TouchableOpacity>

      <Text style={styles.legal}>
        Payment will be charged to your Apple ID account at the confirmation of purchase.
        Subscription automatically renews unless it is canceled at least 24 hours before
        the end of the current period.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 24, paddingBottom: 60 },
  center: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subheading: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  currentTier: {
    backgroundColor: '#7c5cfc22',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  currentTierText: { color: '#7c5cfc', fontWeight: '700', fontSize: 13 },
  planCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  bestValue: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  bestValueText: { color: '#000', fontWeight: '800', fontSize: 11 },
  planName: { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkmark: { color: '#34d399', fontSize: 16, marginRight: 10 },
  featureText: { color: '#ccc', fontSize: 14 },
  packageSection: { marginVertical: 16, gap: 10 },
  packageBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  packageBtnActive: { borderColor: '#7c5cfc', backgroundColor: '#7c5cfc11' },
  packageTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  packagePrice: { color: '#7c5cfc', fontSize: 16, fontWeight: '700' },
  subscribeBtn: {
    backgroundColor: '#7c5cfc',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  subscribeBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  restoreBtn: { padding: 16, alignItems: 'center' },
  restoreText: { color: '#888', fontSize: 14 },
  legal: { color: '#555', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 16 },
});

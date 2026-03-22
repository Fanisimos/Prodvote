import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthContext } from '../../lib/AuthContext';
import { useBadges } from '../../hooks/useFeatures';
import { useAvatarFrames } from '../../hooks/useAvatarFrames';
import { purchaseCoinPack } from '../../lib/purchases';
import Watermark from '../../components/Watermark';
import Colors from '../../constants/Colors';
import { useTheme } from '../../lib/ThemeContext';
import AnimatedAvatar from '../../components/AnimatedAvatar';

const COIN_PACKS = [
  { id: 'prodvote_coins_1000', coins: 1000, price: '£4.99', label: 'Starter', perCoin: '£0.005', color: '#ffb347', popular: false },
  { id: 'prodvote_coins_2500', coins: 2500, price: '£8.99', label: 'Popular', perCoin: '£0.004', color: '#7c5cfc', popular: true },
  { id: 'prodvote_coins_5000', coins: 5000, price: '£14.99', label: 'Best Value', perCoin: '£0.003', color: '#fbbf24', popular: false },
];

export default function ShopScreen() {
  const { session, profile, fetchProfile } = useAuthContext();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { badges, loading, purchaseBadge } = useBadges(session?.user.id);
  const { frames, loading: framesLoading, purchaseFrame } = useAvatarFrames(session?.user.id);
  const [buying, setBuying] = useState<number | null>(null);
  const [buyingFrame, setBuyingFrame] = useState<number | null>(null);
  const [tab, setTab] = useState<'badges' | 'frames' | 'coins'>('badges');

  async function handleBuy(badgeId: number, price: number, name: string) {
    if (!session?.user.id) return;
    if (!profile || profile.coins < price) {
      if (Platform.OS === 'web') {
        alert('Not enough coins!');
      } else {
        Alert.alert('Not enough coins', `You need ${price} coins to buy ${name}.`);
      }
      return;
    }

    setBuying(badgeId);
    const { error } = await purchaseBadge(badgeId, price);
    if (error) {
      if (Platform.OS === 'web') alert(error);
      else Alert.alert('Error', String(error));
    } else {
      fetchProfile(session.user.id);
    }
    setBuying(null);
  }

  async function handleBuyFrame(frameId: number, price: number, name: string) {
    if (!session?.user.id) return;
    if (!profile || profile.coins < price) {
      if (Platform.OS === 'web') {
        alert('Not enough coins!');
      } else {
        Alert.alert('Not enough coins', `You need ${price} coins to buy ${name}.`);
      }
      return;
    }

    setBuyingFrame(frameId);
    const { error } = await purchaseFrame(frameId, price);
    if (error) {
      if (Platform.OS === 'web') alert(error);
      else Alert.alert('Error', String(error));
    } else {
      fetchProfile(session.user.id);
    }
    setBuyingFrame(null);
  }

  const [buyingCoins, setBuyingCoins] = useState<string | null>(null);

  async function handleBuyCoins(packId: string, coins: number, price: string) {
    if (Platform.OS === 'web') {
      alert(`Coin purchases are only available in the mobile app.`);
      return;
    }
    if (!session?.user.id) return;

    setBuyingCoins(packId);
    const result = await purchaseCoinPack(packId, coins);
    if (result.success) {
      fetchProfile(session.user.id);
      Alert.alert('Success!', `${coins.toLocaleString()} coins added to your account!`);
    } else if (!result.cancelled) {
      Alert.alert('Error', result.error || 'Purchase failed. Please try again.');
    }
    setBuyingCoins(null);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Watermark />
      {/* Coins header */}
      <View style={styles.coinsBar}>
        <View style={styles.coinsLeft}>
          <Text style={styles.coinsEmoji}>🪙</Text>
          <View>
            <Text style={styles.coinsValue}>{profile?.coins ?? 0}</Text>
            <Text style={styles.coinsLabel}>Your Coins</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.buyCoinsBtn}
          onPress={() => setTab('coins')}
          accessibilityLabel="Buy coins"
          accessibilityRole="button"
        >
          <Text style={styles.buyCoinsBtnText}>+ Buy Coins</Text>
        </TouchableOpacity>
      </View>

      {/* Tab toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'badges' && styles.toggleActive]}
          onPress={() => setTab('badges')}
          accessibilityLabel="Badges tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'badges' }}
        >
          <Text style={[styles.toggleText, tab === 'badges' && styles.toggleTextActive]}>Badges</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'frames' && styles.toggleActive]}
          onPress={() => setTab('frames')}
          accessibilityLabel="Frames tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'frames' }}
        >
          <Text style={[styles.toggleText, tab === 'frames' && styles.toggleTextActive]}>Frames</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'coins' && styles.toggleActive]}
          onPress={() => setTab('coins')}
          accessibilityLabel="Coins tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'coins' }}
        >
          <Text style={[styles.toggleText, tab === 'coins' && styles.toggleTextActive]}>Coins</Text>
        </TouchableOpacity>
      </View>

      {tab === 'frames' ? (
        <FlatList
          key="frames-list"
          data={frames}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.frameList}
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <Text style={styles.sectionTitle}>AVATAR FRAMES</Text>
              <Text style={styles.sectionSub}>
                Animated effects around your avatar. Stand out in chat and profiles.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const owned = item.owned;
            const canAfford = (profile?.coins ?? 0) >= item.price;
            return (
              <View style={[styles.frameCard, owned && styles.frameOwned]}>
                <View style={styles.framePreview}>
                  <AnimatedAvatar
                    letter={profile?.username?.charAt(0).toUpperCase() || '?'}
                    size={56}
                    frameType={item.animation_type}
                    frameColor={item.color}
                  />
                </View>
                <View style={styles.frameInfo}>
                  <Text style={styles.frameName}>{item.name}</Text>
                  <Text style={styles.frameDesc} numberOfLines={2}>{item.description}</Text>
                  {owned ? (
                    <View style={styles.ownedBadge}>
                      <Text style={styles.ownedText}>✓ Owned</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled, { alignSelf: 'flex-start' }]}
                      onPress={() => handleBuyFrame(item.id, item.price, item.name)}
                      disabled={buyingFrame === item.id || !canAfford}
                      accessibilityLabel={`Buy ${item.name} frame for ${item.price} coins`}
                      accessibilityRole="button"
                    >
                      {buyingFrame === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.buyBtnText}>🪙 {item.price}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyText}>No frames available</Text>
              <Text style={styles.emptySub}>Check back soon!</Text>
            </View>
          }
        />
      ) : tab === 'badges' ? (
        <FlatList
          key="badges-grid"
          data={badges}
          keyExtractor={item => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => {
            const owned = item.owned;
            const canAfford = (profile?.coins ?? 0) >= item.price;
            return (
              <View style={[styles.badgeCard, owned && styles.badgeOwned]}>
                <View style={styles.badgeContent}>
                  <Text style={styles.badgeEmoji}>{item.emoji}</Text>
                  <Text style={styles.badgeName}>{item.name}</Text>
                  <Text style={styles.badgeDesc} numberOfLines={2}>{item.description}</Text>
                </View>
                {owned ? (
                  <View style={styles.ownedBadge}>
                    <Text style={styles.ownedText}>✓ Owned</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
                    onPress={() => handleBuy(item.id, item.price, item.name)}
                    disabled={buying === item.id || !canAfford}
                    accessibilityLabel={`Buy ${item.name} badge for ${item.price} coins`}
                    accessibilityRole="button"
                  >
                    {buying === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.buyBtnText}>
                        🪙 {item.price}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <Text style={styles.sectionTitle}>BADGE SHOP</Text>
              <Text style={styles.sectionSub}>
                Buy badges to flex on comments. Show off your style.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={styles.emptyText}>No badges available</Text>
              <Text style={styles.emptySub}>Check back soon!</Text>
            </View>
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.coinContent}>
          <Text style={styles.coinTitle}>Get More Coins</Text>
          <Text style={styles.coinSub}>
            Use coins to buy badges and unlock exclusive features
          </Text>

          {COIN_PACKS.map(pack => (
            <TouchableOpacity
              key={pack.id}
              style={[styles.packCard, pack.popular && styles.packPopular]}
              onPress={() => handleBuyCoins(pack.id, pack.coins, pack.price)}
              activeOpacity={0.7}
              accessibilityLabel={`Buy ${pack.coins} coins for ${pack.price}`}
              accessibilityRole="button"
            >
              {pack.popular && (
                <View style={styles.popularTag}>
                  <Text style={styles.popularTagText}>MOST POPULAR</Text>
                </View>
              )}
              <View style={styles.packLeft}>
                <View style={[styles.packIcon, { backgroundColor: pack.color + '20' }]}>
                  <Text style={styles.packIconText}>🪙</Text>
                </View>
                <View>
                  <Text style={styles.packCoins}>
                    {pack.coins.toLocaleString()} Coins
                  </Text>
                  <Text style={styles.packLabel}>{pack.label}</Text>
                </View>
              </View>
              <View style={styles.packRight}>
                <Text style={[styles.packPrice, pack.popular && { color: Colors.primary }]}>
                  {pack.price}
                </Text>
                <Text style={styles.packPerCoin}>{pack.perCoin}/coin</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* What you get */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What can you do with coins?</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>🏷️</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoItemTitle}>Buy Badges</Text>
                <Text style={styles.infoItemDesc}>Show off unique badges next to your name on comments</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>🚀</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoItemTitle}>Boost Features</Text>
                <Text style={styles.infoItemDesc}>Push your favourite feature requests to the top</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>✨</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoItemTitle}>Avatar Frames</Text>
                <Text style={styles.infoItemDesc}>Animated effects that make your avatar stand out everywhere</Text>
              </View>
            </View>
          </View>

          {/* Free coins info */}
          <View style={styles.freeCard}>
            <Text style={styles.freeTitle}>Earn Free Coins</Text>
            <View style={styles.freeRow}>
              <Text style={styles.freeItem}>Vote on features</Text>
              <Text style={styles.freeReward}>+10 🪙</Text>
            </View>
            <View style={styles.freeRow}>
              <Text style={styles.freeItem}>Submit a feature</Text>
              <Text style={styles.freeReward}>+50 🪙</Text>
            </View>
            <View style={styles.freeRow}>
              <Text style={styles.freeItem}>Comment on a feature</Text>
              <Text style={styles.freeReward}>+5 🪙</Text>
            </View>
            <View style={styles.freeRow}>
              <Text style={styles.freeItem}>Feature gets shipped</Text>
              <Text style={styles.freeReward}>+500 🪙</Text>
            </View>
            <View style={[styles.freeRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.freeItem}>Daily login bonus</Text>
              <Text style={styles.freeReward}>+25 🪙</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function getStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    // Coins bar
    coinsBar: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: colors.surface, margin: 16, marginBottom: 0, borderRadius: 16,
      padding: 18, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    coinsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    coinsEmoji: { fontSize: 32 },
    coinsValue: { fontSize: 24, fontWeight: '800', color: '#fbbf24' },
    coinsLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    buyCoinsBtn: {
      backgroundColor: '#fbbf24', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
    },
    buyCoinsBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

    // Toggle
    toggle: {
      flexDirection: 'row', margin: 16, marginBottom: 0, backgroundColor: colors.surface,
      borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    toggleActive: { backgroundColor: Colors.primary },
    toggleText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    toggleTextActive: { color: '#fff' },

    // Badges tab
    headerSection: { marginBottom: 16 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1.5 },
    sectionSub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    grid: { padding: 16, paddingBottom: 40 },
    row: { gap: 10 },
    badgeCard: {
      flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16,
      marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
      justifyContent: 'space-between', gap: 12,
    },
    badgeOwned: { borderColor: '#fbbf24' + '40', backgroundColor: '#fbbf24' + '08' },
    badgeContent: { alignItems: 'center', flex: 1 },
    badgeEmoji: { fontSize: 40, marginBottom: 8 },
    badgeName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4, textAlign: 'center' },
    badgeDesc: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginBottom: 0, lineHeight: 16 },
    buyBtn: {
      backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
      width: '100%', alignItems: 'center',
    },
    buyBtnDisabled: { opacity: 0.4 },
    buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    ownedBadge: {
      backgroundColor: '#fbbf24' + '20', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
      width: '100%', alignItems: 'center',
    },
    ownedText: { color: '#fbbf24', fontWeight: '700', fontSize: 14 },
    // Frames tab
    frameList: { padding: 16, paddingBottom: 40 },
    frameCard: {
      flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 16,
      marginBottom: 10, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: 'center',
    },
    frameOwned: { borderColor: '#fbbf24' + '40', backgroundColor: '#fbbf24' + '08' },
    framePreview: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    frameInfo: { flex: 1 },
    frameName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    frameDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 10, lineHeight: 17 },

    empty: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 18, fontWeight: '600', color: colors.text },
    emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },

    // Coins tab
    coinContent: { padding: 16, paddingBottom: 40 },
    coinTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
    coinSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },

    // Packs
    packCard: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 12,
      borderWidth: 1.5, borderColor: colors.surfaceBorder, overflow: 'hidden',
    },
    packPopular: {
      borderColor: Colors.primary, backgroundColor: Colors.primary + '08',
    },
    popularTag: {
      position: 'absolute', top: 0, right: 0, backgroundColor: Colors.primary,
      paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 10,
    },
    popularTagText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },
    packLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    packIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    packIconText: { fontSize: 24 },
    packCoins: { fontSize: 18, fontWeight: '800', color: colors.text },
    packLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    packRight: { alignItems: 'flex-end' },
    packPrice: { fontSize: 22, fontWeight: '800', color: '#fbbf24' },
    packPerCoin: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

    // Info card
    infoCard: {
      backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginTop: 12,
      borderWidth: 1, borderColor: colors.surfaceBorder,
    },
    infoTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 16 },
    infoRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
    infoEmoji: { fontSize: 24 },
    infoContent: { flex: 1 },
    infoItemTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
    infoItemDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

    // Free coins card
    freeCard: {
      backgroundColor: '#fbbf24' + '0a', borderRadius: 16, padding: 20, marginTop: 16,
      borderWidth: 1, borderColor: '#fbbf24' + '20',
    },
    freeTitle: { fontSize: 16, fontWeight: '700', color: '#fbbf24', marginBottom: 14 },
    freeRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
    },
    freeItem: { fontSize: 14, color: colors.text },
    freeReward: { fontSize: 14, fontWeight: '800', color: '#fbbf24' },
  });
}

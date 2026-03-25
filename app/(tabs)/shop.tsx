import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { useTheme, Theme } from '../../lib/theme';
import { Badge, AvatarFrame } from '../../lib/types';
import { purchasePackage, getOfferings, purchaseByProductId } from '../../lib/revenue';

type Tab = 'badges' | 'frames' | 'coins';

const COIN_USES = [
  { emoji: '🛡️', title: 'Buy Badges', desc: 'Show off unique badges next to your name on comments' },
  { emoji: '🚀', title: 'Boost Features', desc: 'Push your favourite feature requests to the top' },
  { emoji: '✨', title: 'Avatar Frames', desc: 'Animated effects that make your avatar stand out everywhere' },
];

export default function ShopScreen() {
  const { profile, fetchProfile } = useAuthContext();
  const { theme } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('badges');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [frames, setFrames] = useState<AvatarFrame[]>([]);
  const [ownedBadgeIds, setOwnedBadgeIds] = useState<Set<number>>(new Set());
  const [ownedFrameIds, setOwnedFrameIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    const [badgeRes, frameRes, ownBadgeRes, ownFrameRes] = await Promise.all([
      supabase.from('badges').select('*').order('price'),
      supabase.from('avatar_frames').select('*').eq('is_active', true).order('sort_order'),
      profile ? supabase.from('user_badges').select('badge_id').eq('user_id', profile.id) : { data: [] },
      profile ? supabase.from('user_avatar_frames').select('frame_id').eq('user_id', profile.id) : { data: [] },
    ]);
    setBadges(badgeRes.data || []);
    setFrames(frameRes.data || []);
    setOwnedBadgeIds(new Set((ownBadgeRes.data || []).map((b: any) => b.badge_id)));
    setOwnedFrameIds(new Set((ownFrameRes.data || []).map((f: any) => f.frame_id)));
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchShop(); }, [fetchShop]);

  async function buyBadge(badge: Badge) {
    if (!profile) return;
    if (ownedBadgeIds.has(badge.id)) {
      await supabase.from('profiles').update({ active_badge_id: badge.id }).eq('id', profile.id);
      fetchProfile();
      Alert.alert('Equipped!', `${badge.emoji} ${badge.name} is now your active badge.`);
      return;
    }
    if (badge.price === 0) {
      await supabase.from('user_badges').insert({ user_id: profile.id, badge_id: badge.id });
      await supabase.from('profiles').update({ active_badge_id: badge.id }).eq('id', profile.id);
      fetchProfile();
      fetchShop();
      Alert.alert('Acquired!', `${badge.emoji} ${badge.name} is now yours!`);
      return;
    }
    if (profile.coins < badge.price) {
      Alert.alert('Not enough coins', `You need ${badge.price} coins. You have ${profile.coins}.`);
      return;
    }
    Alert.alert('Buy Badge', `Spend ${badge.price} coins on ${badge.emoji} ${badge.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Buy',
        onPress: async () => {
          await supabase.from('profiles').update({ coins: profile.coins - badge.price }).eq('id', profile.id);
          await supabase.from('user_badges').insert({ user_id: profile.id, badge_id: badge.id });
          await supabase.from('profiles').update({ active_badge_id: badge.id }).eq('id', profile.id);
          await supabase.from('coin_rewards').insert({
            user_id: profile.id, amount: -badge.price, reward_type: `badge_purchase_${badge.name}`,
          });
          fetchProfile();
          fetchShop();
          Alert.alert('Purchased!', `${badge.emoji} ${badge.name} is now yours!`);
        },
      },
    ]);
  }

  async function buyFrame(frame: AvatarFrame) {
    if (!profile) return;
    if (ownedFrameIds.has(frame.id)) {
      await supabase.from('profiles').update({ active_frame_id: frame.id }).eq('id', profile.id);
      fetchProfile();
      Alert.alert('Equipped!', `${frame.name} frame is now active.`);
      return;
    }
    if (profile.coins < frame.price) {
      Alert.alert('Not enough coins', `You need ${frame.price} coins. You have ${profile.coins}.`);
      return;
    }
    Alert.alert('Buy Frame', `Spend ${frame.price} coins on ${frame.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Buy',
        onPress: async () => {
          const { error } = await supabase.rpc('purchase_avatar_frame', {
            p_user_id: profile.id,
            p_frame_id: frame.id,
            p_price: frame.price,
          });
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            fetchProfile();
            fetchShop();
            Alert.alert('Purchased!', `${frame.name} frame is now yours!`);
          }
        },
      },
    ]);
  }

  async function buyCoinPack(productId: string) {
    try {
      // Try offering first, fall back to direct product purchase
      const offering = await getOfferings();
      const pkg = offering?.availablePackages.find(p => p.product.identifier === productId);
      let result;
      if (pkg) {
        result = await purchasePackage(pkg);
      } else {
        // Coins may not be in the offering — purchase directly by product ID
        result = await purchaseByProductId(productId);
      }
      if (result.success) {
        await fetchProfile();
        Alert.alert('Coins Added!', 'Your coins have been credited to your account.');
      } else if (!result.cancelled) {
        Alert.alert('Error', result.error || 'Purchase failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Purchase failed. Please try again.');
    }
  }

  const s = styles(theme);

  return (
    <View style={s.container}>
      <Image
        source={require('../../assets/images/logo-watermark.png')}
        style={s.watermark}
        tintColor={theme.watermarkTint}
        resizeMode="contain"
      />

      {/* Coin Balance Header */}
      <View style={s.coinHeader}>
        <View style={s.coinLeft}>
          <Text style={{ fontSize: 28 }}>🪙</Text>
          <View>
            <Text style={s.coinAmount}>{profile?.coins ?? 0}</Text>
            <Text style={s.coinLabel}>Your Coins</Text>
          </View>
        </View>
        <TouchableOpacity style={s.buyCoinBtn} onPress={() => setTab('coins')}>
          <Text style={s.buyCoinText}>+ Buy Coins</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={s.tabRow}>
        {(['badges', 'frames', 'coins'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'badges' && (
        <>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>BADGE SHOP</Text>
            <Text style={s.sectionDesc}>Buy badges to flex on comments. Show off your style.</Text>
          </View>
          <FlatList
            data={badges}
            keyExtractor={item => String(item.id)}
            numColumns={2}
            columnWrapperStyle={s.badgeRow}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchShop} tintColor={theme.accent} />}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            renderItem={({ item }) => {
              const owned = ownedBadgeIds.has(item.id);
              const isActive = profile?.active_badge_id === item.id;
              return (
                <TouchableOpacity
                  style={[s.badgeCard, owned && { borderColor: theme.accent + '66' }]}
                  onPress={() => buyBadge(item)}
                >
                  <Text style={{ fontSize: 40, textAlign: 'center' }}>{item.emoji}</Text>
                  <Text style={s.badgeName}>{item.name}</Text>
                  {item.description && <Text style={s.badgeDesc} numberOfLines={1}>{item.description}</Text>}
                  <View style={[s.badgePriceBtn, owned && s.badgePriceOwned]}>
                    <Text style={[s.badgePriceText, owned && { color: theme.success }]}>
                      {isActive ? '✓ Active' : owned ? '✓ Owned' : item.price === 0 ? 'Free' : `🪙 ${item.price}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      {tab === 'frames' && (
        <FlatList
          data={frames}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={s.badgeRow}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchShop} tintColor={theme.accent} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 16 }}
          renderItem={({ item }) => {
            const owned = ownedFrameIds.has(item.id);
            const isActive = profile?.active_frame_id === item.id;
            return (
              <TouchableOpacity
                style={[s.badgeCard, owned && { borderColor: theme.success + '66' }]}
                onPress={() => buyFrame(item)}
              >
                <View style={[s.frameCircle, { borderColor: item.color }]}>
                  <Text style={{ fontSize: 22 }}>👤</Text>
                </View>
                <Text style={s.badgeName}>{item.name}</Text>
                <Text style={[s.badgeDesc, { fontSize: 11 }]}>{item.animation_type} effect</Text>
                <View style={[s.badgePriceBtn, owned && s.badgePriceOwned]}>
                  <Text style={[s.badgePriceText, owned && { color: theme.success }]}>
                    {isActive ? '✓ Active' : owned ? 'Equip' : `🪙 ${item.price}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {tab === 'coins' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <Text style={s.coinSectionTitle}>Get More Coins</Text>
          <Text style={s.coinSectionDesc}>Use coins to buy badges and unlock exclusive features</Text>

          {/* 1000 Coins */}
          <TouchableOpacity style={s.coinPack} onPress={() => buyCoinPack('prodvote_coins_1000')}>
            <Text style={{ fontSize: 28 }}>🪙</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.coinPackTitle}>1,000 Coins</Text>
              <Text style={s.coinPackSub}>Starter</Text>
            </View>
            <View>
              <Text style={s.coinPackPrice}>£4.99</Text>
              <Text style={s.coinPackPer}>£0.005/coin</Text>
            </View>
          </TouchableOpacity>

          {/* 2500 Coins - MOST POPULAR */}
          <View>
            <View style={s.popularBadge}>
              <Text style={s.popularText}>MOST POPULAR</Text>
            </View>
            <TouchableOpacity style={[s.coinPack, { borderColor: theme.accent }]} onPress={() => buyCoinPack('prodvote_coins_2500')}>
              <Text style={{ fontSize: 28 }}>🪙</Text>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.coinPackTitle}>2,500 Coins</Text>
                <Text style={s.coinPackSub}>Popular</Text>
              </View>
              <View>
                <Text style={[s.coinPackPrice, { color: theme.accent }]}>£8.99</Text>
                <Text style={s.coinPackPer}>£0.004/coin</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 5000 Coins */}
          <TouchableOpacity style={s.coinPack} onPress={() => buyCoinPack('prodvote_coins_5000')}>
            <Text style={{ fontSize: 28 }}>🪙</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.coinPackTitle}>5,000 Coins</Text>
              <Text style={s.coinPackSub}>Best Value</Text>
            </View>
            <View>
              <Text style={[s.coinPackPrice, { color: theme.danger }]}>£14.99</Text>
              <Text style={s.coinPackPer}>£0.003/coin</Text>
            </View>
          </TouchableOpacity>

          {/* What can you do with coins */}
          <View style={s.coinUsesCard}>
            <Text style={s.coinUsesTitle}>What can you do with coins?</Text>
            {COIN_USES.map((item, i) => (
              <View key={i} style={s.coinUseRow}>
                <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.coinUseTitle}>{item.title}</Text>
                  <Text style={s.coinUseDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  watermark: {
    position: 'absolute', width: 600, height: 600, opacity: 0.05,
    top: '15%', left: '50%', marginLeft: -300, zIndex: -1,
  },
  coinHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: t.card, borderBottomWidth: 1, borderBottomColor: t.cardBorder,
  },
  coinLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coinAmount: { fontSize: 24, fontWeight: '800', color: t.coinText },
  coinLabel: { fontSize: 13, color: t.textMuted },
  buyCoinBtn: {
    backgroundColor: t.gold, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
  },
  buyCoinText: { color: '#000', fontWeight: '700', fontSize: 14 },
  tabRow: {
    flexDirection: 'row', backgroundColor: t.card, borderRadius: 12,
    margin: 16, marginBottom: 0, padding: 4, borderWidth: 1, borderColor: t.cardBorder,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: t.accent },
  tabText: { fontSize: 15, fontWeight: '600', color: t.textMuted },
  tabTextActive: { color: '#fff' },
  sectionHeader: { padding: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: t.text, letterSpacing: 1 },
  sectionDesc: { fontSize: 13, color: t.textSecondary, marginTop: 4 },
  badgeRow: { justifyContent: 'space-between', marginBottom: 12 },
  badgeCard: {
    width: '48%', backgroundColor: t.card, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder,
  },
  badgeName: { fontSize: 15, fontWeight: '700', color: t.text, marginTop: 10, textAlign: 'center' },
  badgeDesc: { fontSize: 12, color: t.textMuted, marginTop: 4, textAlign: 'center' },
  badgePriceBtn: {
    backgroundColor: t.accent, paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 20, marginTop: 12, width: '100%', alignItems: 'center',
  },
  badgePriceOwned: { backgroundColor: t.successBg },
  badgePriceText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  frameCircle: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 3,
    backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center',
  },
  coinSectionTitle: { fontSize: 22, fontWeight: '800', color: t.text },
  coinSectionDesc: { fontSize: 14, color: t.textSecondary, marginTop: 4, marginBottom: 20 },
  coinPack: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: t.card,
    borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: t.cardBorder,
  },
  coinPackTitle: { fontSize: 18, fontWeight: '700', color: t.text },
  coinPackSub: { fontSize: 13, color: t.textMuted, marginTop: 2 },
  coinPackPrice: { fontSize: 20, fontWeight: '800', color: t.gold, textAlign: 'right' },
  coinPackPer: { fontSize: 12, color: t.textMuted, textAlign: 'right', marginTop: 2 },
  popularBadge: {
    backgroundColor: t.accent, paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, alignSelf: 'flex-end', marginBottom: -8, marginRight: 8, zIndex: 1,
  },
  popularText: { color: '#fff', fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  coinUsesCard: {
    backgroundColor: t.card, borderRadius: 16, padding: 20, marginTop: 16,
    borderWidth: 1, borderColor: t.cardBorder,
  },
  coinUsesTitle: { fontSize: 17, fontWeight: '700', color: t.text, marginBottom: 16 },
  coinUseRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  coinUseTitle: { fontSize: 15, fontWeight: '700', color: t.text },
  coinUseDesc: { fontSize: 13, color: t.textSecondary, marginTop: 2, lineHeight: 18 },
});

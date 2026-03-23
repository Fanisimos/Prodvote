import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../lib/AuthContext';
import { Badge, AvatarFrame } from '../../lib/types';

type Tab = 'badges' | 'frames';

export default function ShopScreen() {
  const { profile, fetchProfile } = useAuthContext();
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
      // Equip it
      await supabase.from('profiles').update({ active_badge_id: badge.id }).eq('id', profile.id);
      fetchProfile();
      Alert.alert('Equipped!', `${badge.emoji} ${badge.name} is now your active badge.`);
      return;
    }
    if (badge.price === 0) {
      // Free badge, just acquire
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
      // Equip it
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

  return (
    <View style={styles.container}>
      {/* Coin Balance */}
      <View style={styles.coinBar}>
        <Text style={{ fontSize: 20 }}>🪙</Text>
        <Text style={styles.coinText}>{profile?.coins ?? 0} coins</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'badges' && styles.tabActive]}
          onPress={() => setTab('badges')}
        >
          <Text style={[styles.tabText, tab === 'badges' && styles.tabTextActive]}>Badges</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'frames' && styles.tabActive]}
          onPress={() => setTab('frames')}
        >
          <Text style={[styles.tabText, tab === 'frames' && styles.tabTextActive]}>Frames</Text>
        </TouchableOpacity>
      </View>

      {tab === 'badges' ? (
        <FlatList
          data={badges}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchShop} tintColor="#7c5cfc" />}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const owned = ownedBadgeIds.has(item.id);
            const isActive = profile?.active_badge_id === item.id;
            return (
              <TouchableOpacity style={styles.itemCard} onPress={() => buyBadge(item)}>
                <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.description && <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>}
                </View>
                <View style={[styles.priceBadge, owned && { backgroundColor: '#34d39933' }]}>
                  <Text style={[styles.priceText, owned && { color: '#34d399' }]}>
                    {isActive ? '✓ Active' : owned ? 'Equip' : item.price === 0 ? 'Free' : `🪙 ${item.price}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={frames}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchShop} tintColor="#7c5cfc" />}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const owned = ownedFrameIds.has(item.id);
            const isActive = profile?.active_frame_id === item.id;
            return (
              <TouchableOpacity style={styles.itemCard} onPress={() => buyFrame(item)}>
                <View style={[styles.framePreview, { borderColor: item.color }]}>
                  <Text style={{ fontSize: 16 }}>👤</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDesc}>{item.animation_type} effect</Text>
                </View>
                <View style={[styles.priceBadge, owned && { backgroundColor: '#34d39933' }]}>
                  <Text style={[styles.priceText, owned && { color: '#34d399' }]}>
                    {isActive ? '✓ Active' : owned ? 'Equip' : `🪙 ${item.price}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  coinBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, gap: 8, backgroundColor: '#1a1a2e',
    borderBottomWidth: 1, borderBottomColor: '#2a2a3e',
  },
  coinText: { fontSize: 18, fontWeight: '700', color: '#fbbf24' },
  tabRow: { flexDirection: 'row', padding: 16, gap: 12 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1a1a2e', alignItems: 'center' },
  tabActive: { backgroundColor: '#7c5cfc' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e',
    borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e',
  },
  itemInfo: { flex: 1, marginLeft: 14 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  itemDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  priceBadge: { backgroundColor: '#7c5cfc22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  priceText: { fontSize: 13, fontWeight: '700', color: '#7c5cfc' },
  framePreview: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 3,
    backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center',
  },
});

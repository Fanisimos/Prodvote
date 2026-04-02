import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Alert,
  ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../lib/AuthContext';
import { useTheme, Theme } from '../lib/theme';
import { AwardType } from '../lib/types';
import AwardBadge from './AwardBadge';

interface Props {
  featureId: string;
  visible: boolean;
  onClose: () => void;
  onAwarded?: (emoji: string) => void;
}

export default function AwardPicker({ featureId, visible, onClose, onAwarded }: Props) {
  const { profile, fetchProfile } = useAuthContext();
  const { theme } = useTheme();
  const [awards, setAwards] = useState<AwardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [giving, setGiving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    supabase.from('award_types').select('*').order('sort_order')
      .then(({ data }) => {
        setAwards(data || []);
        setLoading(false);
      });
  }, [visible]);

  async function giveAward(award: AwardType) {
    if (!profile) return;
    if (giving) return;
    if (profile.coins < award.coin_cost) {
      Alert.alert('Not enough coins', `You need ${award.coin_cost} coins. You have ${profile.coins}.`);
      return;
    }

    async function doGiveAward() {
      setGiving(true);
      try {
        // Deduct coins
        const { error: coinErr } = await supabase.from('profiles')
          .update({ coins: profile!.coins - award.coin_cost })
          .eq('id', profile!.id);
        if (coinErr) { Alert.alert('Error', coinErr.message); setGiving(false); return; }

        // Insert award
        const { error: awardErr } = await supabase.from('feature_awards').insert({
          feature_id: featureId,
          badge_id: award.id,
          giver_user_id: profile!.id,
        });
        if (awardErr) { Alert.alert('Error', awardErr.message); setGiving(false); return; }

        // Log coin transaction
        await supabase.from('coin_rewards').insert({
          user_id: profile!.id,
          amount: -award.coin_cost,
          reward_type: `award_${award.name.toLowerCase()}`,
        });

        await fetchProfile();
        setGiving(false);
        onClose();
        onAwarded?.(award.emoji);
        Alert.alert('Award Given!', `You gave ${award.emoji} ${award.name}!`);
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to give award');
        setGiving(false);
      }
    }

    if (Platform.OS === 'web') {
      if (confirm(`Give ${award.emoji} ${award.name}? This will cost ${award.coin_cost} coins.`)) {
        doGiveAward();
      }
    } else {
      Alert.alert(
        `Give ${award.emoji} ${award.name}?`,
        `This will cost ${award.coin_cost} coins.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: `Give ${award.emoji}`, onPress: doGiveAward },
        ]
      );
    }
  }

  const s = styles(theme);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.title}>Give an Award</Text>
            <Text style={s.subtitle}>
              🪙 {profile?.coins ?? 0} coins available
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {awards.map(award => {
                  const canAfford = (profile?.coins ?? 0) >= award.coin_cost;
                  return (
                    <TouchableOpacity
                      key={award.id}
                      style={[s.awardRow, !canAfford && { opacity: 0.4 }]}
                      onPress={() => giveAward(award)}
                      disabled={giving || !canAfford}
                    >
                      <AwardBadge
                        emoji={award.emoji}
                        count={1}
                        animation={award.animation}
                        color={award.color}
                        size={36}
                      />
                      <View style={s.awardInfo}>
                        <Text style={s.awardName}>{award.name}</Text>
                        <Text style={s.awardDesc}>{award.description}</Text>
                      </View>
                      <View style={s.awardCost}>
                        <Text style={s.costText}>🪙 {award.coin_cost}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: t.textMuted + '44',
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: t.text, textAlign: 'center' },
  subtitle: {
    fontSize: 14, color: t.textMuted, textAlign: 'center',
    marginTop: 4, marginBottom: 20,
  },
  awardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: t.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: t.cardBorder,
  },
  awardInfo: { flex: 1 },
  awardName: { fontSize: 16, fontWeight: '700', color: t.text },
  awardDesc: { fontSize: 12, color: t.textMuted, marginTop: 2 },
  awardCost: {
    backgroundColor: t.coinText + '18', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10,
  },
  costText: { fontSize: 14, fontWeight: '700', color: t.coinText },
  cancelBtn: {
    alignItems: 'center', paddingVertical: 14, marginTop: 10,
    borderRadius: 14, borderWidth: 1, borderColor: t.cardBorder,
  },
  cancelText: { fontSize: 16, fontWeight: '600', color: t.textMuted },
});

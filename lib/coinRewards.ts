import { supabase } from './supabase';

// Coin rewards for different actions
const REWARD_AMOUNTS: Record<string, number> = {
  vote: 2,
  comment: 5,
  feature_submitted: 15,
};

export async function awardCoins(
  userId: string,
  rewardType: 'vote' | 'comment' | 'feature_submitted',
) {
  const amount = REWARD_AMOUNTS[rewardType];
  if (!amount) return;

  // Insert reward record
  await supabase.from('coin_rewards').insert({
    user_id: userId,
    reward_type: rewardType,
    amount,
  });

  // Update profile coins
  const { data: profile } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', userId)
    .single();

  if (profile) {
    await supabase
      .from('profiles')
      .update({ coins: (profile.coins || 0) + amount })
      .eq('id', userId);
  }

  return amount;
}

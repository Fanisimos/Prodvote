import { supabase } from './supabase';

// Coin rewards for different actions
const REWARD_AMOUNTS: Record<string, number> = {
  vote: 2,
  comment: 5,
  feature_submitted: 15,
};

const VALID_TYPES = new Set(Object.keys(REWARD_AMOUNTS));

export async function awardCoins(
  userId: string,
  rewardType: 'vote' | 'comment' | 'feature_submitted',
) {
  if (!VALID_TYPES.has(rewardType)) return;
  const amount = REWARD_AMOUNTS[rewardType];

  // Single atomic RPC call — no read-then-write race condition
  await supabase.rpc('award_coins_atomic', {
    p_user_id: userId,
    p_reward_type: rewardType,
    p_amount: amount,
  });

  return amount;
}

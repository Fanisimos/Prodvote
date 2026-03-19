import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DailyRewardResult {
  success: boolean;
  reason?: string;
  coins_earned?: number;
  spin_base?: number;
  streak?: number;
  tier_multiplier?: number;
}

export function useDailyReward(userId: string | undefined) {
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<DailyRewardResult | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!userId) return;
    checkClaimStatus(userId);
  }, [userId]);

  async function checkClaimStatus(uid: string) {
    const { data } = await supabase
      .from('profiles')
      .select('last_login_date, login_streak')
      .eq('id', uid)
      .single();

    if (data) {
      setStreak(data.login_streak || 0);
      const today = new Date().toISOString().split('T')[0];
      setCanClaim(data.last_login_date !== today);
    }
  }

  async function claimReward(spinAmount: number): Promise<DailyRewardResult | null> {
    if (!userId || claiming) return null;
    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc('claim_daily_reward', {
        p_user_id: userId,
        p_spin_amount: spinAmount,
      });

      if (error) {
        setClaiming(false);
        return null;
      }

      const res = data as DailyRewardResult;
      setResult(res);

      if (res.success) {
        setCanClaim(false);
        setStreak(res.streak || 0);
      }

      setClaiming(false);
      return res;
    } catch {
      setClaiming(false);
      return null;
    }
  }

  return { canClaim, claiming, result, streak, claimReward, setResult };
}

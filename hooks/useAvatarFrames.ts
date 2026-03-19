import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AvatarFrame } from '../lib/types';

export function useAvatarFrames(userId?: string) {
  const [frames, setFrames] = useState<AvatarFrame[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFrames();
  }, [userId]);

  async function fetchFrames() {
    try {
      const { data: allFrames, error } = await supabase
        .from('avatar_frames')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        // Table may not exist yet
        setLoading(false);
        return;
      }

      let owned = new Set<number>();
      if (userId) {
        const { data: userFrames } = await supabase
          .from('user_avatar_frames')
          .select('frame_id')
          .eq('user_id', userId);
        if (userFrames) {
          owned = new Set(userFrames.map(f => f.frame_id));
        }
      }

      setOwnedIds(owned);
      if (allFrames) {
        setFrames(allFrames.map(f => ({ ...f, owned: owned.has(f.id) })));
      }
    } catch {
      // Gracefully handle missing table
    }
    setLoading(false);
  }

  async function purchaseFrame(frameId: number, price: number) {
    if (!userId) return { error: 'Not logged in' };

    const { error: rpcError } = await supabase.rpc('purchase_avatar_frame', {
      p_user_id: userId,
      p_frame_id: frameId,
      p_price: price,
    });

    if (rpcError) {
      // Fallback: manual deduct
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      if (!profile || profile.coins < price) {
        return { error: 'Not enough coins' };
      }

      const { error: deductErr } = await supabase
        .from('profiles')
        .update({ coins: profile.coins - price })
        .eq('id', userId);

      if (deductErr) return { error: deductErr.message };

      const { error: insertErr } = await supabase
        .from('user_avatar_frames')
        .insert({ user_id: userId, frame_id: frameId });

      if (insertErr) {
        // Refund
        await supabase.from('profiles').update({ coins: profile.coins }).eq('id', userId);
        return { error: insertErr.message };
      }
    }

    await fetchFrames();
    return { error: null };
  }

  async function setActiveFrame(frameId: number | null) {
    if (!userId) return;
    await supabase.from('profiles').update({ active_frame_id: frameId }).eq('id', userId);
  }

  return { frames, ownedIds, loading, purchaseFrame, setActiveFrame, refresh: fetchFrames };
}

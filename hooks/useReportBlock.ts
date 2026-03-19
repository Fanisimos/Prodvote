import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useReportBlock() {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBlocked();
  }, []);

  async function fetchBlocked() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_blocks')
      .select('blocked_user_id')
      .eq('blocker_id', user.id);

    if (data) {
      setBlockedIds(new Set(data.map((row) => row.blocked_user_id)));
    }
  }

  async function reportUser(reportedUserId: string, reason: string, messageId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('user_reports').insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      reason,
      message_id: messageId ?? null,
    });

    if (error) throw error;
  }

  async function blockUser(blockedUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('user_blocks').insert({
      blocker_id: user.id,
      blocked_user_id: blockedUserId,
    });

    if (error) throw error;

    setBlockedIds((prev) => new Set([...prev, blockedUserId]));
  }

  async function unblockUser(blockedUserId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_user_id', blockedUserId);

    if (error) throw error;

    setBlockedIds((prev) => {
      const next = new Set(prev);
      next.delete(blockedUserId);
      return next;
    });
  }

  function isBlocked(userId: string): boolean {
    return blockedIds.has(userId);
  }

  return { reportUser, blockUser, unblockUser, blockedIds, isBlocked };
}

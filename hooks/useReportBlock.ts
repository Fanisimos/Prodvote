import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useReportBlock() {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBlocked();
  }, []);

  async function fetchBlocked() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_blocks')
        .select('blocked_user_id')
        .eq('blocker_id', user.id);

      if (data) {
        setBlockedIds(new Set(data.map((row) => row.blocked_user_id)));
      }
    } catch {}
  }

  async function reportUser(reportedUserId: string, reason: string, messageId?: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason,
        message_id: messageId ?? null,
      });
    } catch {}
  }

  async function blockUser(blockedUserId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_blocks').insert({
        blocker_id: user.id,
        blocked_user_id: blockedUserId,
      });

      setBlockedIds((prev) => new Set([...prev, blockedUserId]));
    } catch {}
  }

  async function unblockUser(blockedUserId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', blockedUserId);

      setBlockedIds((prev) => {
        const next = new Set(prev);
        next.delete(blockedUserId);
        return next;
      });
    } catch {}
  }

  function isBlocked(userId: string): boolean {
    return blockedIds.has(userId);
  }

  return { reportUser, blockUser, unblockUser, blockedIds, isBlocked };
}

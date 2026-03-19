import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PublicProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  tier: string;
  coins: number;
  created_at: string;
  active_badge_id: number | null;
  active_badge_emoji: string | null;
  active_badge_name: string | null;
  active_badge_color: string | null;
}

export interface OwnedBadge {
  badge_id: number;
  emoji: string;
  name: string;
  color: string;
  purchased_at: string;
}

export function usePublicProfile(userId: string) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [badges, setBadges] = useState<OwnedBadge[]>([]);
  const [stats, setStats] = useState({ features: 0, comments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchAll();
  }, [userId]);

  async function fetchAll() {
    setLoading(true);

    // Fetch profile
    const { data: prof } = await supabase
      .from('public_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (prof) setProfile(prof);

    // Fetch owned badges
    const { data: ub } = await supabase
      .from('user_badges')
      .select('badge_id, purchased_at, badges:badge_id (emoji, name, color)')
      .eq('user_id', userId);
    if (ub) {
      setBadges(
        ub.map((b: any) => ({
          badge_id: b.badge_id,
          emoji: b.badges?.emoji,
          name: b.badges?.name,
          color: b.badges?.color,
          purchased_at: b.purchased_at,
        }))
      );
    }

    // Fetch stats
    const [{ count: featureCount }, { count: commentCount }] = await Promise.all([
      supabase.from('features').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    setStats({ features: featureCount || 0, comments: commentCount || 0 });

    setLoading(false);
  }

  return { profile, badges, stats, loading };
}

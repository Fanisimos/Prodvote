import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Feature, Badge } from '../lib/types';
import { awardCoins } from '../lib/coinRewards';
import { getCached, setCache } from '../lib/cache';

type SortBy = 'score' | 'newest' | 'comments';
type FilterStatus = 'all' | 'open' | 'planned' | 'in_progress' | 'shipped';

const PAGE_SIZE = 20;

export function useFeatures(sortBy: SortBy = 'score', filterStatus: FilterStatus = 'all') {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchAwards = useCallback(async (featureIds: string[]) => {
    let awardsMap: Record<string, { emoji: string; name: string; color: string; count: number }[]> = {};
    if (featureIds.length === 0) return awardsMap;

    const { data: awards } = await supabase
      .from('feature_awards')
      .select('feature_id, badges:badge_id (emoji, name, color)')
      .in('feature_id', featureIds);

    if (awards) {
      const grouped: Record<string, Record<string, { emoji: string; name: string; color: string; count: number }>> = {};
      for (const a of awards as any[]) {
        const fid = a.feature_id;
        const key = a.badges?.emoji || '?';
        if (!grouped[fid]) grouped[fid] = {};
        if (!grouped[fid][key]) {
          grouped[fid][key] = { emoji: a.badges?.emoji, name: a.badges?.name, color: a.badges?.color, count: 0 };
        }
        grouped[fid][key].count++;
      }
      for (const [fid, badgeMap] of Object.entries(grouped)) {
        awardsMap[fid] = Object.values(badgeMap);
      }
    }
    return awardsMap;
  }, []);

  const fetchFeatures = useCallback(async (isRefresh = false) => {
    const cacheKey = `features_${sortBy}_${filterStatus}`;

    // Show cached data immediately on first load
    if (!isRefresh) {
      const cached = await getCached<Feature[]>(cacheKey);
      if (cached && cached.length > 0) {
        setFeatures(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
    } else {
      setRefreshing(true);
    }

    let query = supabase.from('features_with_details').select('*');

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    switch (sortBy) {
      case 'score':
        query = query.order('score', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'comments':
        query = query.order('comment_count', { ascending: false });
        break;
    }

    const { data, error } = await query.range(0, PAGE_SIZE - 1);

    if (!error && data) {
      const awardsMap = await fetchAwards(data.map((f: any) => f.id));
      const enriched = data.map((f: any) => ({ ...f, awards: awardsMap[f.id] || [] }));
      setFeatures(enriched);
      setHasMore(data.length === PAGE_SIZE);
      setPage(1);
      // Cache for offline access
      await setCache(cacheKey, enriched, 5 * 60 * 1000);
    }
    setLoading(false);
    setRefreshing(false);
  }, [sortBy, filterStatus, fetchAwards]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    let query = supabase.from('features_with_details').select('*');

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    switch (sortBy) {
      case 'score':
        query = query.order('score', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'comments':
        query = query.order('comment_count', { ascending: false });
        break;
    }

    const from = page * PAGE_SIZE;
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (!error && data) {
      const awardsMap = await fetchAwards(data.map((f: any) => f.id));
      const newFeatures = data.map((f: any) => ({ ...f, awards: awardsMap[f.id] || [] }));
      setFeatures(prev => [...prev, ...newFeatures]);
      setHasMore(data.length === PAGE_SIZE);
      setPage(prev => prev + 1);
    }
    setLoadingMore(false);
  }, [page, loadingMore, hasMore, sortBy, filterStatus, fetchAwards]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Mark which features the current user has voted on
  async function markUserVotes(userId: string) {
    const { data: votes } = await supabase
      .from('votes')
      .select('feature_id')
      .eq('user_id', userId);

    if (votes) {
      const votedIds = new Set(votes.map(v => v.feature_id));
      setFeatures(prev =>
        prev.map(f => ({ ...f, user_has_voted: votedIds.has(f.id) }))
      );
    }
  }

  return {
    features,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    refresh: () => fetchFeatures(true),
    loadMore,
    markUserVotes,
  };
}

export function useVote() {
  const [voting, setVoting] = useState(false);

  async function toggleVote(featureId: string, userId: string, hasVoted: boolean) {
    setVoting(true);
    try {
      if (hasVoted) {
        // Try RPC first, fallback to direct delete
        const { error: rpcError } = await supabase.rpc('remove_vote', {
          p_user_id: userId,
          p_feature_id: featureId,
        });
        if (rpcError) {
          await supabase.from('votes').delete().eq('feature_id', featureId).eq('user_id', userId);
        }
        return { success: true };
      } else {
        // Try RPC with vote limits + weight
        const { data, error: rpcError } = await supabase.rpc('use_vote', {
          p_user_id: userId,
          p_feature_id: featureId,
        });

        if (rpcError) {
          // Fallback: direct insert (no limit enforcement)
          await supabase.from('votes').insert({ feature_id: featureId, user_id: userId, weight: 1 });
          awardCoins(userId, 'vote');
          return { success: true };
        }

        const result = typeof data === 'string' ? JSON.parse(data) : data;
        if (!result.success) {
          return { success: false, error: result.error, votes_remaining: result.votes_remaining };
        }

        awardCoins(userId, 'vote');
        return { success: true, votes_remaining: result.votes_remaining, weight: result.weight };
      }
    } catch {
      return { success: false, error: 'Something went wrong' };
    } finally {
      setVoting(false);
    }
  }

  return { toggleVote, voting };
}

export function useFeatureDetail(featureId: string) {
  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!featureId) return;
    (async () => {
      const { data } = await supabase
        .from('features_with_details')
        .select('*')
        .eq('id', featureId)
        .single();
      setFeature(data);
      setLoading(false);
    })();
  }, [featureId]);

  async function toggleDevHeart() {
    if (!feature) return;
    const newVal = !feature.dev_hearted;
    await supabase.from('features').update({ dev_hearted: newVal }).eq('id', featureId);
    setFeature(prev => prev ? { ...prev, dev_hearted: newVal } : prev);
  }

  return { feature, loading, setFeature, toggleDevHeart };
}

export function useComments(featureId: string) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!featureId) return;
    fetchComments();
  }, [featureId]);

  async function fetchComments() {
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (username, avatar_url, tier, active_frame_id, active_frame:active_frame_id (animation_type, color)),
        badges:badge_id (emoji, name, color)
      `)
      .eq('feature_id', featureId)
      .order('created_at', { ascending: true });

    if (data) {
      // Fetch all awards for these comments
      const commentIds = data.map((c: any) => c.id);
      let awardsMap: Record<string, { emoji: string; name: string; color: string; count: number }[]> = {};

      if (commentIds.length > 0) {
        const { data: awards } = await supabase
          .from('comment_awards')
          .select('comment_id, badges:badge_id (emoji, name, color)')
          .in('comment_id', commentIds);

        if (awards) {
          // Group awards by comment and badge
          const grouped: Record<string, Record<string, { emoji: string; name: string; color: string; count: number }>> = {};
          for (const a of awards as any[]) {
            const cid = a.comment_id;
            const key = a.badges?.emoji || '?';
            if (!grouped[cid]) grouped[cid] = {};
            if (!grouped[cid][key]) {
              grouped[cid][key] = { emoji: a.badges?.emoji, name: a.badges?.name, color: a.badges?.color, count: 0 };
            }
            grouped[cid][key].count++;
          }
          for (const [cid, badgeMap] of Object.entries(grouped)) {
            awardsMap[cid] = Object.values(badgeMap);
          }
        }
      }

      setComments(
        data.map((c: any) => ({
          ...c,
          username: c.profiles?.username,
          avatar_url: c.profiles?.avatar_url,
          tier: c.profiles?.tier,
          active_frame_type: c.profiles?.active_frame?.animation_type || null,
          active_frame_color: c.profiles?.active_frame?.color || null,
          badge_emoji: c.badges?.emoji,
          badge_name: c.badges?.name,
          badge_color: c.badges?.color,
          awards: awardsMap[c.id] || [],
        }))
      );
    }
    setLoading(false);
  }

  async function addComment(body: string, userId: string, badgeId?: number) {
    const row: any = { feature_id: featureId, user_id: userId, body };
    if (badgeId) row.badge_id = badgeId;
    const { error } = await supabase.from('comments').insert(row);
    if (!error) {
      awardCoins(userId, 'comment'); // +5 coins for commenting
      await fetchComments();
    }
    return { error };
  }

  async function toggleDevHeart(commentId: string, currentValue: boolean) {
    await supabase.from('comments').update({ dev_hearted: !currentValue }).eq('id', commentId);
    await fetchComments();
  }

  async function deleteComment(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId);
    await fetchComments();
  }

  async function giveAward(commentId: string, badgeId: number, price: number, userId: string) {
    // Deduct coins
    const { data: prof } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();

    if (!prof || prof.coins < price) return { error: 'Not enough coins' };

    await supabase.from('profiles').update({ coins: prof.coins - price }).eq('id', userId);
    const { error } = await supabase.from('comment_awards').insert({
      comment_id: commentId,
      badge_id: badgeId,
      giver_user_id: userId,
    });
    if (error) return { error: error.message };
    await fetchComments();
    return { error: null };
  }

  return { comments, loading, addComment, toggleDevHeart, deleteComment, giveAward, refresh: fetchComments };
}

export function useBadges(userId?: string) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  async function fetchBadges() {
    const { data: allBadges } = await supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('price');

    let owned = new Set<number>();
    if (userId) {
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);
      if (userBadges) {
        owned = new Set(userBadges.map(b => b.badge_id));
      }
    }

    setOwnedIds(owned);
    if (allBadges) {
      setBadges(allBadges.map(b => ({ ...b, owned: owned.has(b.id) })));
    }
    setLoading(false);
  }

  async function purchaseBadge(badgeId: number, price: number) {
    if (!userId) return { error: 'Not logged in' };

    // Deduct coins
    const { error: coinError } = await supabase.rpc('purchase_badge', {
      p_user_id: userId,
      p_badge_id: badgeId,
      p_price: price,
    });

    if (coinError) {
      // Fallback: manual deduct
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', userId)
        .single();

      if (!profile || profile.coins < price) return { error: 'Not enough coins' };

      await supabase.from('profiles').update({ coins: profile.coins - price }).eq('id', userId);
      const { error } = await supabase.from('user_badges').insert({ user_id: userId, badge_id: badgeId });
      if (error) return { error: error.message };
    }

    await fetchBadges();
    return { error: null };
  }

  return { badges, ownedIds, loading, purchaseBadge, refresh: fetchBadges };
}

export async function giveFeatureAward(featureId: string, badgeId: number, price: number, userId: string) {
  const { data: prof } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', userId)
    .single();

  if (!prof || prof.coins < price) return { error: 'Not enough coins' };

  await supabase.from('profiles').update({ coins: prof.coins - price }).eq('id', userId);
  const { error } = await supabase.from('feature_awards').insert({
    feature_id: featureId,
    badge_id: badgeId,
    giver_user_id: userId,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export function useCategories() {
  const [categories, setCategories] = useState<{ id: number; name: string; color: string; icon: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('categories').select('*').order('id');
      if (data) setCategories(data);
    })();
  }, []);

  return categories;
}

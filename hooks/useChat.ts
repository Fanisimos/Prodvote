import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  color: string;
  is_locked: boolean;
  sort_order: number;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  // Joined
  username?: string;
  avatar_url?: string | null;
  tier?: string;
  active_badge_emoji?: string | null;
  active_badge_color?: string | null;
  active_frame_type?: string | null;
  active_frame_color?: string | null;
}

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    const { data } = await supabase
      .from('channels')
      .select('*')
      .order('sort_order');
    setChannels(data || []);
    setLoading(false);
  }

  return { channels, loading, refresh: fetchChannels };
}

const MESSAGES_PAGE_SIZE = 50;

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(true);

  const mapMessage = (m: any): Message => ({
    ...m,
    username: m.profiles?.username,
    avatar_url: m.profiles?.avatar_url,
    tier: m.profiles?.tier,
    active_badge_emoji: m.profiles?.badges?.emoji || null,
    active_badge_color: m.profiles?.badges?.color || null,
    active_frame_type: m.profiles?.active_frame?.animation_type || null,
    active_frame_color: m.profiles?.active_frame?.color || null,
  });

  const fetchMessages = useCallback(async () => {
    if (!channelId) return;
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id (username, avatar_url, tier, active_badge_id, badges:active_badge_id (emoji, color), active_frame_id, active_frame:active_frame_id (animation_type, color))
      `)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (data) {
      setMessages(data.map(mapMessage).reverse());
      setHasEarlier(data.length === MESSAGES_PAGE_SIZE);
    }
    setLoading(false);
  }, [channelId]);

  const loadEarlierMessages = useCallback(async () => {
    if (loadingEarlier || !hasEarlier || messages.length === 0) return;
    setLoadingEarlier(true);

    const oldestMessage = messages[0];
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:user_id (username, avatar_url, tier, active_badge_id, badges:active_badge_id (emoji, color), active_frame_id, active_frame:active_frame_id (animation_type, color))
      `)
      .eq('channel_id', channelId)
      .lt('created_at', oldestMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (data && data.length > 0) {
      setMessages(prev => [...data.map(mapMessage).reverse(), ...prev]);
      setHasEarlier(data.length === MESSAGES_PAGE_SIZE);
    } else {
      setHasEarlier(false);
    }
    setLoadingEarlier(false);
  }, [channelId, loadingEarlier, hasEarlier, messages]);

  useEffect(() => {
    fetchMessages();

    // Real-time subscription
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channelId, fetchMessages]);

  async function sendMessage(body: string, userId: string, username?: string, tier?: string) {
    // Optimistically add the message immediately
    const optimisticMsg: Message = {
      id: 'optimistic-' + Date.now(),
      channel_id: channelId,
      user_id: userId,
      body: body.trim(),
      is_pinned: false,
      created_at: new Date().toISOString(),
      username: username || '...',
      tier: tier || 'free',
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from('messages').insert({
      channel_id: channelId,
      user_id: userId,
      body: body.trim(),
    });
    // Real-time subscription will refetch and replace optimistic message
    return { error };
  }

  async function deleteMessage(messageId: string) {
    await supabase.from('messages').delete().eq('id', messageId);
  }

  async function pinMessage(messageId: string, pinned: boolean) {
    await supabase.from('messages').update({ is_pinned: pinned }).eq('id', messageId);
    fetchMessages();
  }

  return { messages, loading, loadingEarlier, hasEarlier, sendMessage, deleteMessage, pinMessage, loadEarlierMessages, refresh: fetchMessages };
}

// Admin channel management
export function useAdminChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    const { data } = await supabase
      .from('channels')
      .select('*')
      .order('sort_order');
    setChannels(data || []);
    setLoading(false);
  }

  async function createChannel(name: string, description: string, emoji: string, color: string) {
    const maxOrder = channels.reduce((max, c) => Math.max(max, c.sort_order), 0);
    const { error } = await supabase.from('channels').insert({
      name,
      description,
      emoji,
      color,
      sort_order: maxOrder + 1,
    });
    if (!error) await fetchChannels();
    return { error };
  }

  async function updateChannel(id: string, updates: Partial<Channel>) {
    const { error } = await supabase.from('channels').update(updates).eq('id', id);
    if (!error) await fetchChannels();
    return { error };
  }

  async function deleteChannel(id: string) {
    const { error } = await supabase.from('channels').delete().eq('id', id);
    if (!error) await fetchChannels();
    return { error };
  }

  return { channels, loading, createChannel, updateChannel, deleteChannel, refresh: fetchChannels };
}

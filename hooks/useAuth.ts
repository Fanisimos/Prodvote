import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';
import { Session } from '@supabase/supabase-js';
import { initRevenueCat, logOutRevenueCat } from '../lib/revenue';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastRcUserId = useRef<string | null>(null);

  const initRC = useCallback(async (userId: string) => {
    if (Platform.OS === 'web') return;
    if (lastRcUserId.current === userId) return;
    try {
      await initRevenueCat(userId);
      lastRcUserId.current = userId;
    } catch (e) {
      console.warn('RevenueCat init failed:', e);
    }
  }, []);

  const fetchProfile = useCallback(async (userId?: string) => {
    const uid = userId || session?.user?.id;
    if (!uid) return;

    const { data } = await supabase
      .from('profiles')
      .select('*, active_badge:active_badge_id(id, name, emoji, color), active_frame:active_frame_id(id, name, animation_type, color, price)')
      .eq('id', uid)
      .single();

    if (data) {
      setProfile(data as unknown as Profile);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        initRC(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        initRC(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, username: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return { error };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signInAsGuest() {
    const { error } = await supabase.auth.signInAnonymously();
    return { error };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[signOut] error:', error);
    await logOutRevenueCat();
    lastRcUserId.current = null;
    setProfile(null);
    setSession(null);
  }

  const isGuest = !!session?.user?.is_anonymous;

  return { session, profile, loading, isGuest, signUp, signIn, signInAsGuest, signOut, fetchProfile };
}

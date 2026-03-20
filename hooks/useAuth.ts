import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';
import { Session } from '@supabase/supabase-js';
import { initPurchases } from '../lib/purchases';
import { registerForPushNotifications, scheduleDailyReminder } from '../lib/notifications';
import { getCached, setCache } from '../lib/cache';
import { initAnalytics, identify, Events } from '../lib/analytics';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '../lib/sentry';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    // Show cached profile immediately while fetching fresh data
    const cached = await getCached<Profile>(`profile_${userId}`);
    if (cached && !profile) {
      setProfile(cached);
      setLoading(false);
    }

    // Check monthly renewal (auto-grants coins + resets votes if 30 days passed)
    try {
      await supabase.rpc('check_monthly_renewal', { p_user_id: userId });
    } catch {}

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);

    // Cache the fresh profile
    if (data) await setCache(`profile_${userId}`, data, 10 * 60 * 1000);

    // Initialize RevenueCat and analytics with user ID
    initPurchases(userId);
    initAnalytics(userId);
    if (data) {
      identify(userId, { username: data.username, tier: data.tier });
      setSentryUser(userId, data.username);
    }

    // Register for push notifications
    registerForPushNotifications(userId);
    scheduleDailyReminder();
  }

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

  async function signOut() {
    Events.signOut();
    clearSentryUser();
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  return { session, profile, loading, signUp, signIn, signOut, fetchProfile };
}

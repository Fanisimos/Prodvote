import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';
import { Session } from '@supabase/supabase-js';
import { initPurchases } from '../lib/purchases';
import { registerForPushNotifications, scheduleDailyReminder } from '../lib/notifications';

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

    // Initialize RevenueCat with user ID
    initPurchases(userId);

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
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  return { session, profile, loading, signUp, signIn, signOut, fetchProfile };
}

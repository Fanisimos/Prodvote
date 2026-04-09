import { supabase } from './supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIUsage {
  current: number;
  limit: number;
}

export interface ChatResponse {
  reply: string;
  usage: AIUsage | null;
  error?: string;
}

export interface ImproveResponse {
  title?: string;
  description?: string;
  error?: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { reply: '', usage: null, error: 'not_authenticated' };
  }
  if (session.user.is_anonymous) {
    return { reply: '', usage: null, error: 'guest_blocked' };
  }

  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { message, history },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        console.error('[sendChatMessage] edge function error body:', body);
        if (body?.error === 'rate_limited' || body?.error === 'monthly_limit') {
          return { reply: '', usage: body.usage || null, error: body.error };
        }
        throw new Error(body?.error || body?.message || 'Edge function error');
      }
    } catch (parseErr) {
      console.error('[sendChatMessage] could not parse error:', parseErr);
    }
    throw error;
  }

  if (data?.error === 'monthly_limit' || data?.error === 'rate_limited') {
    return {
      reply: '',
      usage: data.usage || null,
      error: data.error,
    };
  }

  return {
    reply: data?.reply || '',
    usage: data?.usage || null,
  };
}

export async function improveIdea(
  title: string,
  description: string
): Promise<ImproveResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { error: 'not_authenticated' };
  }
  if (session.user.is_anonymous) {
    return { error: 'guest_blocked' };
  }

  const { data, error } = await supabase.functions.invoke('improve-idea', {
    body: { title, description },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    // Try to read the actual error body from the response
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        console.error('[improveIdea] edge function error body:', body);
        if (body?.error === 'rate_limited' || body?.error === 'monthly_limit') {
          return { error: body.error };
        }
        throw new Error(body?.error || body?.message || 'Edge function error');
      }
    } catch (parseErr) {
      console.error('[improveIdea] could not parse error:', parseErr);
    }
    if (error.message?.includes('429')) {
      return { error: 'rate_limited' };
    }
    throw error;
  }

  if (data?.error === 'monthly_limit' || data?.error === 'rate_limited') {
    return { error: data.error };
  }

  return {
    title: data?.title,
    description: data?.description,
  };
}

export async function getMonthlyUsage(): Promise<AIUsage | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { count } = await supabase
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', monthStart);

  // Get tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const isPro = ['pro', 'ultra', 'legendary'].includes(profile?.tier || '');

  if (!isPro) return null; // Free users don't have a tracked limit

  return {
    current: count || 0,
    limit: 5900,
  };
}

export function getResetDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function formatResetDate(): string {
  const reset = getResetDate();
  return reset.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`

const PRO_MONTHLY_LIMIT = 5900

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No auth header')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { message, history } = await req.json()
    if (!message?.trim()) throw new Error('Empty message')

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier, username')
      .eq('id', user.id)
      .single()

    const isPro = ['pro', 'ultra', 'legendary'].includes(profile?.tier || '')

    // Get monthly usage count
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { count: usageCount } = await supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart)

    const currentUsage = usageCount || 0

    // Pro users: enforce monthly limit
    if (isPro && currentUsage >= PRO_MONTHLY_LIMIT) {
      return new Response(
        JSON.stringify({
          error: 'monthly_limit',
          message: 'You\'ve reached your monthly AI limit (5,900 messages). Resets on the 1st of next month.',
          usage: { current: currentUsage, limit: PRO_MONTHLY_LIMIT },
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Free users: no hard limit, but Google's free tier will rate-limit
    // We just pass through and handle 429 from Gemini

    // Build conversation for Gemini
    const systemPrompt = `You are a friendly and helpful AI assistant inside the Prodvote app. You help users with productivity, brainstorming ideas, writing, and general questions. Keep responses concise and useful. The user's name is ${profile?.username || 'there'}.`

    const contents: any[] = []

    // Add conversation history (last 10 messages max to save tokens)
    const recentHistory = (history || []).slice(-10)
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })
    }

    // Add current message
    contents.push({ role: 'user', parts: [{ text: message }] })

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
      }),
    })

    if (!geminiRes.ok) {
      if (geminiRes.status === 429) {
        return new Response(
          JSON.stringify({
            error: 'rate_limited',
            message: isPro
              ? 'AI is temporarily busy. Please try again in a moment.'
              : 'We\'re currently very busy. Try again later or upgrade to Pro for guaranteed access.',
            usage: isPro ? { current: currentUsage, limit: PRO_MONTHLY_LIMIT } : null,
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const errBody = await geminiRes.text()
      throw new Error(`Gemini error: ${geminiRes.status} ${errBody}`)
    }

    const geminiData = await geminiRes.json()
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I couldn\'t generate a response.'
    const inputTokens = geminiData.usageMetadata?.promptTokenCount || 0
    const outputTokens = geminiData.usageMetadata?.candidatesTokenCount || 0

    // Log usage
    await supabase.from('ai_usage').insert({
      user_id: user.id,
      usage_type: 'chat',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })

    return new Response(
      JSON.stringify({
        reply,
        usage: isPro ? { current: currentUsage + 1, limit: PRO_MONTHLY_LIMIT } : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

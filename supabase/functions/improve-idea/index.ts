import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`

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

    const { title, description } = await req.json()
    if (!title && !description) throw new Error('Nothing to improve')

    // Check user tier for rate limiting
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single()

    const isPro = ['pro', 'ultra', 'legendary'].includes(profile?.tier || '')

    // Pro users: check monthly limit (5900 messages)
    if (isPro) {
      const { data: usage } = await supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

      if ((usage as any)?.count >= 5900) {
        return new Response(
          JSON.stringify({ error: 'monthly_limit', message: 'Monthly AI limit reached. Resets on the 1st.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Call Gemini
    const prompt = `You are a product feature writing assistant. Improve this feature request to be clearer, more compelling, and well-structured. Keep the same intent but make it professional.

Title: ${title}
Description: ${description}

Respond in JSON format only: {"title": "improved title", "description": "improved description"}
Do not include markdown code blocks. Just raw JSON.`

    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    })

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text()
      // If rate limited (free tier), tell user
      if (geminiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: 'rate_limited', message: 'AI is busy right now. Try again later or upgrade to Pro.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Gemini error: ${geminiRes.status} ${errBody}`)
    }

    const geminiData = await geminiRes.json()
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const inputTokens = geminiData.usageMetadata?.promptTokenCount || 0
    const outputTokens = geminiData.usageMetadata?.candidatesTokenCount || 0

    // Log usage
    await supabase.from('ai_usage').insert({
      user_id: user.id,
      usage_type: 'improve',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    })

    // Parse JSON from response
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

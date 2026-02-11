import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth user from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await anonClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = user.email?.toLowerCase()
    if (!email) {
      return new Response(JSON.stringify({ error: 'No email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[claim-arcano-free-trial] Checking eligibility for ${email} (${user.id})`)

    // 1. Check if already claimed
    const { data: existingClaim } = await supabase
      .from('arcano_cloner_free_trials')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingClaim) {
      console.log(`[claim-arcano-free-trial] Already claimed by ${email}`)
      return new Response(JSON.stringify({ already_claimed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Get credit cost from ai_tool_settings
    const { data: toolSettings } = await supabase
      .from('ai_tool_settings')
      .select('credit_cost')
      .eq('tool_name', 'Arcano Cloner')
      .maybeSingle()

    const creditCost = toolSettings?.credit_cost || 80
    const totalCredits = 3 * creditCost

    console.log(`[claim-arcano-free-trial] Granting ${totalCredits} credits (3 x ${creditCost})`)

    // 5. Upsert credits (add to monthly_balance)
    const { data: existingCredits } = await supabase
      .from('upscaler_credits')
      .select('id, monthly_balance, lifetime_balance, balance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingCredits) {
      await supabase
        .from('upscaler_credits')
        .update({
          monthly_balance: existingCredits.monthly_balance + totalCredits,
          balance: existingCredits.balance + totalCredits,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('upscaler_credits')
        .insert({
          user_id: user.id,
          monthly_balance: totalCredits,
          lifetime_balance: 0,
          balance: totalCredits,
        })
    }

    // 6. Record transaction
    await supabase
      .from('upscaler_credit_transactions')
      .insert({
        user_id: user.id,
        amount: totalCredits,
        transaction_type: 'arcano_free_trial',
        description: `Bônus: 3 gerações gratuitas no Arcano Cloner (${totalCredits} créditos)`,
      })

    // 7. Record claim
    await supabase
      .from('arcano_cloner_free_trials')
      .insert({
        user_id: user.id,
        email: email,
        credits_granted: totalCredits,
      })

    console.log(`[claim-arcano-free-trial] Successfully granted ${totalCredits} credits to ${email}`)

    return new Response(JSON.stringify({ success: true, credits_granted: totalCredits }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[claim-arcano-free-trial] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

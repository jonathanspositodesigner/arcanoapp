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

    // Get auth user
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

    console.log(`[claim-free-trial] Checking eligibility for ${email} (${user.id})`)

    // Check email_verified
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.email_verified === false) {
      console.log(`[claim-free-trial] Email not verified for ${email}`)
      return new Response(JSON.stringify({ error: 'Email not verified' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Double-check: promo_claims
    const { data: promoClaim } = await supabase
      .from('promo_claims')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (promoClaim) {
      console.log(`[claim-free-trial] User ${email} already has promo_claims`)
      return new Response(JSON.stringify({ already_claimed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Double-check: arcano_cloner_free_trials
    const { data: freeTrial } = await supabase
      .from('arcano_cloner_free_trials')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (freeTrial) {
      console.log(`[claim-free-trial] User ${email} already has free trial`)
      return new Response(JSON.stringify({ already_claimed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Claim via atomic RPC
    const { data: claimResult, error: claimError } = await supabase
      .rpc('claim_arcano_free_trial_atomic', {
        p_user_id: user.id,
        p_email: email
      })

    if (claimError) {
      console.error(`[claim-free-trial] RPC error:`, claimError)
      if (claimError.message?.includes('already_claimed')) {
        return new Response(JSON.stringify({ already_claimed: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: 'Failed to claim' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const creditsGranted = claimResult?.[0]?.credits_granted || 240

    if (claimResult?.[0]?.already_claimed) {
      return new Response(JSON.stringify({ already_claimed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[claim-free-trial] Granted ${creditsGranted} credits to ${email}`)

    return new Response(JSON.stringify({ success: true, credits_granted: creditsGranted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[claim-free-trial] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

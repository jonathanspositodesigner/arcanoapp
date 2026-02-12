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
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`[check-free-trial-eligibility] Checking: ${normalizedEmail}`)

    // Check promo_claims (1500 credits promo)
    const { data: promoClaim } = await supabase
      .from('promo_claims')
      .select('id')
      .eq('user_id', normalizedEmail)
      .maybeSingle()

    // promo_claims uses user_id as the user UUID, but we need to check by email
    // Let's check by looking up profiles with this email first, then checking promo_claims
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    let hasPromoClaim = false
    if (profileByEmail) {
      const { data: promoClaimByUser } = await supabase
        .from('promo_claims')
        .select('id')
        .eq('user_id', profileByEmail.id)
        .maybeSingle()
      hasPromoClaim = !!promoClaimByUser
    }

    // Check arcano_cloner_free_trials (240 credits)
    const { data: freeTrial } = await supabase
      .from('arcano_cloner_free_trials')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    // Check landing_page_trials (3-use landing trial)
    const { data: landingTrial } = await supabase
      .from('landing_page_trials')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('code_verified', true)
      .maybeSingle()

    if (hasPromoClaim || freeTrial || landingTrial) {
      console.log(`[check-free-trial-eligibility] Already claimed: ${normalizedEmail}`)
      return new Response(JSON.stringify({ 
        eligible: false, 
        has_account: !!profileByEmail,
        reason: 'already_claimed' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user has an account via RPC
    const { data: profileCheck } = await supabase.rpc('check_profile_exists', {
      check_email: normalizedEmail
    })

    const hasAccount = profileCheck && profileCheck.length > 0 && profileCheck[0].exists_in_db === true

    console.log(`[check-free-trial-eligibility] ${normalizedEmail} eligible=true, has_account=${hasAccount}`)

    return new Response(JSON.stringify({ 
      eligible: true, 
      has_account: hasAccount 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[check-free-trial-eligibility] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

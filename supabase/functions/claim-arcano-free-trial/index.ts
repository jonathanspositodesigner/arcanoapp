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

    // 3. Get current credits
    const { data: existingCredits } = await supabase
      .from('upscaler_credits')
      .select('id, monthly_balance, lifetime_balance, balance')
      .eq('user_id', user.id)
      .maybeSingle()

    let newBalance: number

    // 4. Update/insert credits with error checking
    if (existingCredits) {
      newBalance = existingCredits.balance + totalCredits
      const { error: updateError } = await supabase
        .from('upscaler_credits')
        .update({
          monthly_balance: existingCredits.monthly_balance + totalCredits,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error(`[claim-arcano-free-trial] Failed to update credits:`, updateError)
        return new Response(JSON.stringify({ error: 'Failed to update credits' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      newBalance = totalCredits
      const { error: insertError } = await supabase
        .from('upscaler_credits')
        .insert({
          user_id: user.id,
          monthly_balance: totalCredits,
          lifetime_balance: 0,
          balance: newBalance,
        })

      if (insertError) {
        console.error(`[claim-arcano-free-trial] Failed to insert credits:`, insertError)
        return new Response(JSON.stringify({ error: 'Failed to create credits' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 5. Record transaction WITH balance_after and credit_type
    const { error: txError } = await supabase
      .from('upscaler_credit_transactions')
      .insert({
        user_id: user.id,
        amount: totalCredits,
        transaction_type: 'arcano_free_trial',
        description: `Bônus: 3 gerações gratuitas no Arcano Cloner (${totalCredits} créditos)`,
        balance_after: newBalance,
        credit_type: 'monthly',
      })

    if (txError) {
      console.error(`[claim-arcano-free-trial] Failed to record transaction:`, txError)
      // Rollback credits
      if (existingCredits) {
        await supabase
          .from('upscaler_credits')
          .update({
            monthly_balance: existingCredits.monthly_balance,
            balance: existingCredits.balance,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('upscaler_credits')
          .delete()
          .eq('user_id', user.id)
      }
      return new Response(JSON.stringify({ error: 'Failed to record transaction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 6. Record claim ONLY after credits and transaction succeeded
    const { error: claimError } = await supabase
      .from('arcano_cloner_free_trials')
      .insert({
        user_id: user.id,
        email: email,
        credits_granted: totalCredits,
      })

    if (claimError) {
      console.error(`[claim-arcano-free-trial] Failed to record claim:`, claimError)
      // Credits were added successfully, so don't rollback - just log the error
      // User got the credits but claim wasn't recorded, they might be able to claim again (better than losing credits)
    }

    console.log(`[claim-arcano-free-trial] Successfully granted ${totalCredits} credits to ${email} (new balance: ${newBalance})`)

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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GreennWebhookPayload {
  type?: string
  event?: string
  currentStatus?: string
  client?: {
    email?: string
    name?: string
    phone?: string
  }
  product?: {
    id?: number
    name?: string
    period?: number
  }
  offer?: {
    name?: string
    id?: number
  }
  contract?: {
    id?: string
    start_date?: string
    current_period_end?: string
  }
  sale?: {
    id?: string
  }
  trial?: {
    days?: number
    end_date?: string
  }
}

// Helper function to find user by email with pagination
async function findUserByEmail(supabase: any, email: string): Promise<string | null> {
  // First try to find in profiles table (faster)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile?.id) {
    console.log('Found user via profiles table:', existingProfile.id);
    return existingProfile.id;
  }

  // If not found in profiles, search in auth.users with pagination
  let page = 1;
  while (page <= 10) { // Max 10000 users
    const { data: usersPage, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });

    if (error) {
      console.error('Error listing users page', page, error);
      break;
    }

    const matchingUser = usersPage?.users.find((u: any) => u.email?.toLowerCase() === email);
    if (matchingUser) {
      console.log('Found user via auth.users pagination:', matchingUser.id);
      return matchingUser.id;
    }

    if (!usersPage?.users.length || usersPage.users.length < 1000) {
      break; // Last page
    }
    page++;
  }

  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  let payload: GreennWebhookPayload = {}
  let logId: string | null = null

  try {
    payload = await req.json()
    
    console.log('=== GREENN WEBHOOK RECEIVED (PROMPTVERSO) ===')
    console.log('Payload:', JSON.stringify(payload, null, 2))

    const email = payload.client?.email?.toLowerCase().trim()
    const clientName = payload.client?.name || ''
    const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
    const productName = payload.product?.name || ''
    const productId = payload.product?.id
    const productPeriod = payload.product?.period || 30
    const status = payload.currentStatus
    const contractId = payload.contract?.id || payload.sale?.id

    // Log webhook receipt immediately
    const { data: logData } = await supabase
      .from('webhook_logs')
      .insert({
        payload: payload,
        status: status || 'unknown',
        product_id: productId,
        email: email || 'no-email',
        result: 'processing',
        from_app: false
      })
      .select('id')
      .single()
    
    logId = logData?.id
    console.log('Webhook logged with ID:', logId)
    
    if (!email) {
      console.error('No email provided in webhook payload')
      
      // Update log with error
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'error',
          error_message: 'No email provided'
        }).eq('id', logId)
      }
      
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check blacklist
    const { data: blacklisted } = await supabase
      .from('blacklisted_emails')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (blacklisted) {
      console.log('Email is blacklisted, ignoring webhook:', email)
      
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'blocked',
          error_message: 'Email blacklisted'
        }).eq('id', logId)
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Email blacklisted, webhook ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const offerName = payload.offer?.name || ''
    const trialDays = payload.trial?.days || 7
    const trialEndDate = payload.trial?.end_date
    
    console.log(`Processing webhook for email: ${email}, name: ${clientName}, phone: ${clientPhone}, status: ${status}`)
    console.log(`Product: ${productName}, Offer: ${offerName}, Period: ${productPeriod} days`)

    // Determine plan type
    let planType = 'arcano_basico'
    const productLower = productName.toLowerCase()
    const offerLower = offerName.toLowerCase()
    
    if (productLower.includes('unlimited') || productLower.includes('ilimitado') || 
        offerLower.includes('unlimited') || offerLower.includes('ilimitado')) {
      planType = 'arcano_unlimited'
    } else if (productLower.includes('pro') || offerLower.includes('pro')) {
      planType = 'arcano_pro'
    }
    
    console.log(`Detected plan type: ${planType}`)

    // Determine billing period
    let billingPeriod = 'monthly'
    if (offerLower.includes('anual') || productPeriod >= 365) {
      billingPeriod = 'yearly'
    }
    
    console.log(`Detected billing period: ${billingPeriod}`)

    const isTrialStatus = status === 'trial' || status === 'trial_started' || status === 'trialing' || status === 'waiting_payment'
    
    // Handle paid status OR trial status - activate or renew premium
    if (status === 'paid' || status === 'approved' || isTrialStatus) {
      const statusType = isTrialStatus ? 'TRIAL' : 'PAID'
      console.log(`Processing ${statusType} status - activating/renewing premium`)
      
      // Find or create user - FIXED: using profiles + pagination instead of single listUsers
      let userId: string | null = null
      
      // First try to find existing user
      userId = await findUserByEmail(supabase, email)
      
      if (!userId) {
        // User not found, try to create
        console.log(`Creating new user with email: ${email}`)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: email,
          email_confirm: true
        })

        if (createError) {
          // If email_exists error, search again with pagination
          if (createError.message.includes('already been registered') || createError.message.includes('email_exists')) {
            console.log('User exists in auth but not found initially, searching with pagination...')
            
            let page = 1
            let found = false
            while (!found && page <= 10) {
              const { data: usersPage } = await supabase.auth.admin.listUsers({
                page: page,
                perPage: 1000
              })
              
              const matchingUser = usersPage?.users.find((u: any) => u.email?.toLowerCase() === email)
              if (matchingUser) {
                userId = matchingUser.id
                found = true
                console.log('Found existing user via listUsers pagination:', userId)
              }
              
              if (!usersPage?.users.length || usersPage.users.length < 1000) break
              page++
            }
            
            if (!found) {
              throw new Error('User exists but could not be found after pagination search')
            }
          } else {
            throw createError
          }
        } else {
          userId = newUser.user.id
          console.log(`New user created with ID: ${userId}`)
        }
      }

      if (!userId) {
        throw new Error('Could not find or create user')
      }

      // Upsert profile with name and phone
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: clientName,
          phone: clientPhone,
          email: email,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('Error upserting profile:', profileError)
      } else {
        console.log(`Profile upserted for user: ${userId}, name: ${clientName}, phone: ${clientPhone}`)
      }

      // Calculate expiration date
      let expiresAt: Date
      const now = new Date()
      
      if (isTrialStatus) {
        if (trialEndDate) {
          expiresAt = new Date(trialEndDate)
          console.log(`Using trial end date: ${expiresAt.toISOString()}`)
        } else {
          expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + trialDays)
          console.log(`Calculated trial expiration (${trialDays} days): ${expiresAt.toISOString()}`)
        }
      } else {
        const payloadDate = payload.contract?.current_period_end 
          ? new Date(payload.contract.current_period_end) 
          : null

        if (payloadDate && payloadDate > now) {
          expiresAt = payloadDate
          console.log(`Using payload date: ${expiresAt.toISOString()}`)
        } else {
          expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + productPeriod)
          console.log(`Calculated date (payload invalid/past): ${expiresAt.toISOString()}`)
        }
      }

      console.log(`Setting expires_at to: ${expiresAt.toISOString()}`)

      // Check if premium record exists
      const { data: existingPremium, error: premiumCheckError } = await supabase
        .from('premium_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (premiumCheckError) {
        console.error('Error checking premium status:', premiumCheckError)
        throw premiumCheckError
      }

      if (existingPremium) {
        console.log('Updating existing premium record')
        const { error: updateError } = await supabase
          .from('premium_users')
          .update({
            is_active: true,
            plan_type: planType,
            billing_period: billingPeriod,
            expires_at: expiresAt.toISOString(),
            greenn_contract_id: contractId,
            greenn_product_id: productId
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error updating premium status:', updateError)
          throw updateError
        }
      } else {
        console.log('Creating new premium record')
        const { error: insertError } = await supabase
          .from('premium_users')
          .insert({
            user_id: userId,
            is_active: true,
            plan_type: planType,
            billing_period: billingPeriod,
            expires_at: expiresAt.toISOString(),
            subscribed_at: new Date().toISOString(),
            greenn_contract_id: contractId,
            greenn_product_id: productId
          })

        if (insertError) {
          console.error('Error inserting premium status:', insertError)
          throw insertError
        }
      }

      console.log(`Premium activated for ${email} until ${expiresAt.toISOString()}`)
      
      // Update log with success
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'success',
          mapping_type: planType
        }).eq('id', logId)
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Premium activated for ${email}`,
          expires_at: expiresAt.toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle canceled, unpaid, refunded, chargeback status - deactivate premium
    if (status === 'canceled' || status === 'unpaid' || status === 'refunded' || status === 'chargeback') {
      console.log(`Processing ${status} status - deactivating premium`)
      
      // Find user using profiles + pagination - FIXED
      const userId = await findUserByEmail(supabase, email)

      if (userId) {
        const { error: updateError } = await supabase
          .from('premium_users')
          .update({ is_active: false })
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error deactivating premium:', updateError)
          throw updateError
        }

        console.log(`Premium deactivated for ${email}`)
        
        // Auto-blacklist on chargeback
        if (status === 'chargeback') {
          await supabase.from('blacklisted_emails').upsert({
            email: email,
            reason: 'chargeback',
            auto_blocked: true,
            blocked_at: new Date().toISOString()
          }, { onConflict: 'email' })
          console.log(`Email blacklisted due to chargeback: ${email}`)
        }
      } else {
        console.log(`User not found for email: ${email}`)
      }

      // Update log with success
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'success',
          mapping_type: `deactivated_${status}`
        }).eq('id', logId)
      }

      return new Response(
        JSON.stringify({ success: true, message: `Premium deactivated for ${email}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For other statuses, just log and acknowledge
    console.log(`Received status ${status} - no action taken`)
    
    if (logId) {
      await supabase.from('webhook_logs').update({
        result: 'ignored',
        error_message: `Status ${status} not handled`
      }).eq('id', logId)
    }
    
    return new Response(
      JSON.stringify({ success: true, message: `Webhook received with status: ${status}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Webhook processing error:', error)
    
    // Update log with error
    if (logId) {
      await supabase.from('webhook_logs').update({
        result: 'error',
        error_message: errorMessage
      }).eq('id', logId)
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

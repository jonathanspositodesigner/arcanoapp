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
  contract?: {
    id?: string
    start_date?: string
    current_period_end?: string
  }
  sale?: {
    id?: string
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const payload: GreennWebhookPayload = await req.json()
    
    console.log('=== GREENN WEBHOOK RECEIVED ===')
    console.log('Payload:', JSON.stringify(payload, null, 2))

    const email = payload.client?.email?.toLowerCase().trim()
    const productName = payload.product?.name || ''
    const productId = payload.product?.id
    const productPeriod = payload.product?.period || 30
    const status = payload.currentStatus
    const contractId = payload.contract?.id || payload.sale?.id
    
    if (!email) {
      console.error('No email provided in webhook payload')
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing webhook for email: ${email}, status: ${status}, product: ${productName}`)

    // Determine plan type based on product name
    let planType = 'arcano_basico'
    if (productName.toLowerCase().includes('pro')) {
      planType = 'arcano_pro'
    } else if (productName.toLowerCase().includes('unlimited') || productName.toLowerCase().includes('ilimitado')) {
      planType = 'arcano_unlimited'
    }

    // Determine billing period
    let billingPeriod = 'monthly'
    if (productPeriod >= 365) {
      billingPeriod = 'yearly'
    }

    // Handle paid status - activate or renew premium
    if (status === 'paid' || status === 'approved') {
      console.log('Processing PAID status - activating/renewing premium')
      
      // Check if user exists in auth
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.error('Error listing users:', listError)
        throw listError
      }

      let userId: string | null = null
      const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email)

      if (existingUser) {
        userId = existingUser.id
        console.log(`User already exists with ID: ${userId}`)
      } else {
        // Create new user with email as password
        console.log(`Creating new user with email: ${email}`)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: email, // Using email as password
          email_confirm: true
        })

        if (createError) {
          console.error('Error creating user:', createError)
          throw createError
        }

        userId = newUser.user.id
        console.log(`New user created with ID: ${userId}`)
      }

      // Calculate expiration date with validation
      let expiresAt: Date
      const payloadDate = payload.contract?.current_period_end 
        ? new Date(payload.contract.current_period_end) 
        : null
      const now = new Date()

      // Use payload date only if it's valid and in the future
      if (payloadDate && payloadDate > now) {
        expiresAt = payloadDate
        console.log(`Using payload date: ${expiresAt.toISOString()}`)
      } else {
        // Calculate based on product period
        expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + productPeriod)
        console.log(`Calculated date (payload invalid/past): ${expiresAt.toISOString()}`)
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
        // Update existing record
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
        // Insert new record
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
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Premium activated for ${email}`,
          expires_at: expiresAt.toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle canceled, unpaid, refunded status - deactivate premium
    if (status === 'canceled' || status === 'unpaid' || status === 'refunded' || status === 'chargeback') {
      console.log(`Processing ${status} status - deactivating premium`)
      
      // Find user by email
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.error('Error listing users:', listError)
        throw listError
      }

      const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email)

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('premium_users')
          .update({ is_active: false })
          .eq('user_id', existingUser.id)

        if (updateError) {
          console.error('Error deactivating premium:', updateError)
          throw updateError
        }

        console.log(`Premium deactivated for ${email}`)
      } else {
        console.log(`User not found for email: ${email}`)
      }

      return new Response(
        JSON.stringify({ success: true, message: `Premium deactivated for ${email}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For other statuses, just log and acknowledge
    console.log(`Received status ${status} - no action taken`)
    return new Response(
      JSON.stringify({ success: true, message: `Webhook received with status: ${status}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

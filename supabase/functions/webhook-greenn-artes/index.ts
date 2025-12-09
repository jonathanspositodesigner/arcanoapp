import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GreennArtesWebhookPayload {
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
}

Deno.serve(async (req) => {
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

    const payload: GreennArtesWebhookPayload = await req.json()
    
    console.log('=== GREENN ARTES WEBHOOK RECEIVED ===')
    console.log('Payload:', JSON.stringify(payload, null, 2))

    const email = payload.client?.email?.toLowerCase().trim()
    const clientName = payload.client?.name || ''
    const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
    const productName = payload.product?.name || ''
    const offerName = payload.offer?.name || ''
    const status = payload.currentStatus
    const contractId = payload.contract?.id || payload.sale?.id
    
    if (!email) {
      console.error('No email provided in webhook payload')
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing webhook for email: ${email}, name: ${clientName}, status: ${status}`)
    console.log(`Product: ${productName}, Offer: ${offerName}`)

    // Detect pack slug from product/offer name
    // Expected format: "Pack Arcano Vol.1 - 6 meses", "Pack Halloween - 1 ano", etc.
    const nameLower = (productName + ' ' + offerName).toLowerCase()
    
    // Extract pack slug
    let packSlug = ''
    if (nameLower.includes('vol.1') || nameLower.includes('vol 1') || nameLower.includes('volume 1')) {
      packSlug = 'arcano-vol-1'
    } else if (nameLower.includes('vol.2') || nameLower.includes('vol 2') || nameLower.includes('volume 2')) {
      packSlug = 'arcano-vol-2'
    } else if (nameLower.includes('vol.3') || nameLower.includes('vol 3') || nameLower.includes('volume 3')) {
      packSlug = 'arcano-vol-3'
    } else if (nameLower.includes('halloween')) {
      packSlug = 'halloween'
    } else if (nameLower.includes('carnaval')) {
      packSlug = 'carnaval'
    } else if (nameLower.includes('fim de ano') || nameLower.includes('ano novo')) {
      packSlug = 'fim-de-ano'
    } else if (nameLower.includes('agenda')) {
      packSlug = 'agendas'
    } else if (nameLower.includes('free') || nameLower.includes('grátis') || nameLower.includes('gratis')) {
      packSlug = 'free-updates'
    } else {
      // Try to extract pack name from product name
      const packMatch = nameLower.match(/pack\s+([^\-]+)/)
      if (packMatch) {
        packSlug = packMatch[1].trim().replace(/\s+/g, '-')
      }
    }

    if (!packSlug) {
      console.error('Could not determine pack from product/offer name:', productName, offerName)
      return new Response(
        JSON.stringify({ error: 'Could not determine pack from product name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Detected pack: ${packSlug}`)

    // Detect access type from product/offer name
    let accessType: '6_meses' | '1_ano' | 'vitalicio' = '6_meses'
    let hasBonusAccess = false
    
    if (nameLower.includes('vitalício') || nameLower.includes('vitalicio') || nameLower.includes('lifetime')) {
      accessType = 'vitalicio'
      hasBonusAccess = true
    } else if (nameLower.includes('1 ano') || nameLower.includes('anual') || nameLower.includes('12 meses')) {
      accessType = '1_ano'
      hasBonusAccess = true
    } else if (nameLower.includes('6 meses') || nameLower.includes('semestral')) {
      accessType = '6_meses'
      hasBonusAccess = false
    }

    console.log(`Detected access type: ${accessType}, has bonus: ${hasBonusAccess}`)

    // Handle paid status - activate pack access
    if (status === 'paid' || status === 'approved') {
      console.log('Processing PAID status - activating pack access')
      
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
          password: email,
          email_confirm: true
        })

        if (createError) {
          console.error('Error creating user:', createError)
          throw createError
        }

        userId = newUser.user.id
        console.log(`New user created with ID: ${userId}`)
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
      }

      // Calculate expiration date
      let expiresAt: Date | null = null
      const now = new Date()
      
      if (accessType === '6_meses') {
        expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 6)
      } else if (accessType === '1_ano') {
        expiresAt = new Date()
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      }
      // vitalicio = null (never expires)

      console.log(`Setting expires_at to: ${expiresAt ? expiresAt.toISOString() : 'never (lifetime)'}`)

      // Check if user already has this pack
      const { data: existingPurchase, error: checkError } = await supabase
        .from('user_pack_purchases')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('pack_slug', packSlug)
        .eq('is_active', true)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing purchase:', checkError)
        throw checkError
      }

      if (existingPurchase) {
        // Extend or upgrade existing access
        console.log('Updating existing pack purchase')
        
        // If new purchase is lifetime, upgrade to lifetime
        // If current is not lifetime, extend the expiration
        let newExpiresAt = expiresAt
        if (accessType !== 'vitalicio' && existingPurchase.expires_at) {
          const currentExpires = new Date(existingPurchase.expires_at)
          if (currentExpires > now && expiresAt) {
            // Extend from current expiration
            if (accessType === '6_meses') {
              newExpiresAt = new Date(currentExpires)
              newExpiresAt.setMonth(newExpiresAt.getMonth() + 6)
            } else if (accessType === '1_ano') {
              newExpiresAt = new Date(currentExpires)
              newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1)
            }
          }
        }

        const { error: updateError } = await supabase
          .from('user_pack_purchases')
          .update({
            access_type: accessType,
            has_bonus_access: hasBonusAccess || existingPurchase.expires_at === null, // Keep bonus if already lifetime
            expires_at: newExpiresAt ? newExpiresAt.toISOString() : null,
            greenn_contract_id: contractId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPurchase.id)

        if (updateError) {
          console.error('Error updating purchase:', updateError)
          throw updateError
        }
      } else {
        // Insert new purchase
        console.log('Creating new pack purchase')
        const { error: insertError } = await supabase
          .from('user_pack_purchases')
          .insert({
            user_id: userId,
            pack_slug: packSlug,
            access_type: accessType,
            has_bonus_access: hasBonusAccess,
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            greenn_contract_id: contractId
          })

        if (insertError) {
          console.error('Error inserting purchase:', insertError)
          throw insertError
        }
      }

      console.log(`Pack access activated for ${email}: ${packSlug} (${accessType})`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Pack access activated for ${email}`,
          pack: packSlug,
          access_type: accessType,
          expires_at: expiresAt ? expiresAt.toISOString() : null
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle refunded/chargeback - deactivate specific pack
    if (status === 'refunded' || status === 'chargeback') {
      console.log(`Processing ${status} status - deactivating pack access`)
      
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email)

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('user_pack_purchases')
          .update({ is_active: false })
          .eq('user_id', existingUser.id)
          .eq('pack_slug', packSlug)

        if (updateError) {
          console.error('Error deactivating pack:', updateError)
          throw updateError
        }

        console.log(`Pack access deactivated for ${email}: ${packSlug}`)
      }

      return new Response(
        JSON.stringify({ success: true, message: `Pack access deactivated for ${email}` }),
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

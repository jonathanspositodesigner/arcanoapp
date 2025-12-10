import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para mapeamento de produtos por ID
interface ProductMapping {
  packSlug: string
  accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio'
  hasBonusAccess: boolean
}

// Mapeamento de Product ID para pack e tipo de acesso
// Pack Arcano Vol.1:
// - 89608: 6 meses (sem bônus)
// - 89595: 1 ano (com bônus)
// - 92417: Vitalício order bump (com bônus)
// - 149334: Vitalício standalone (com bônus)
const PRODUCT_ID_MAPPING: Record<number, ProductMapping> = {
  // Pack Arcano Vol.1
  89608: { packSlug: 'pack-arcano-vol-1', accessType: '6_meses', hasBonusAccess: false },
  89595: { packSlug: 'pack-arcano-vol-1', accessType: '1_ano', hasBonusAccess: true },
  92417: { packSlug: 'pack-arcano-vol-1', accessType: 'vitalicio', hasBonusAccess: true },
  149334: { packSlug: 'pack-arcano-vol-1', accessType: 'vitalicio', hasBonusAccess: true },
  // Outros packs serão adicionados conforme mapeamento...
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
    hash?: string
  }
  contract?: {
    id?: string
    start_date?: string
    current_period_end?: string
  }
  sale?: {
    id?: string
    amount?: number
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
    const productId = payload.product?.id
    const offerName = payload.offer?.name || ''
    const offerHash = payload.offer?.hash || ''
    const status = payload.currentStatus
    const contractId = payload.contract?.id || payload.sale?.id
    const saleAmount = payload.sale?.amount
    
    if (!email) {
      console.error('No email provided in webhook payload')
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing webhook for email: ${email}, name: ${clientName}, status: ${status}`)
    console.log(`Product ID: ${productId}, Product: ${productName}, Offer: ${offerName}, Offer Hash: ${offerHash}`)
    console.log(`Sale Amount: ${saleAmount}`)

    // Detectar pack e tipo de acesso
    let packSlug = ''
    let accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio' = '6_meses'
    let hasBonusAccess = false

    // PRIMEIRO: Tentar mapear por Product ID (mais preciso)
    if (productId && PRODUCT_ID_MAPPING[productId]) {
      const mapping = PRODUCT_ID_MAPPING[productId]
      packSlug = mapping.packSlug
      accessType = mapping.accessType
      hasBonusAccess = mapping.hasBonusAccess
      console.log(`✅ Product ID ${productId} MAPPED to: ${packSlug} (${accessType}, bonus: ${hasBonusAccess})`)
    } else {
      // FALLBACK: Usar detecção por nome (para produtos ainda não mapeados)
      console.log(`⚠️ Product ID ${productId} NOT in mapping, falling back to name detection`)
      
      const nameLower = (productName + ' ' + offerName).toLowerCase()
      
      // Detectar pack pelo nome
      if (nameLower.includes('vol.1') || nameLower.includes('vol 1') || nameLower.includes('volume 1')) {
        packSlug = 'pack-arcano-vol-1'
      } else if (nameLower.includes('vol.2') || nameLower.includes('vol 2') || nameLower.includes('volume 2')) {
        packSlug = 'pack-arcano-vol-2'
      } else if (nameLower.includes('vol.3') || nameLower.includes('vol 3') || nameLower.includes('volume 3')) {
        packSlug = 'pack-arcano-vol-3'
      } else if (nameLower.includes('halloween')) {
        packSlug = 'pack-de-halloween'
      } else if (nameLower.includes('carnaval')) {
        packSlug = 'pack-de-carnaval'
      } else if (nameLower.includes('fim de ano') || nameLower.includes('ano novo')) {
        packSlug = 'pack-fim-de-ano'
      } else if (nameLower.includes('agenda')) {
        packSlug = 'pack-agendas'
      } else if (nameLower.includes('free') || nameLower.includes('grátis') || nameLower.includes('gratis')) {
        packSlug = 'free-updates'
      } else if (nameLower.includes('arcano')) {
        // Fallback genérico para produtos Arcano sem volume especificado
        packSlug = 'pack-arcano-vol-1'
      }

      // Detectar tipo de acesso pelo nome
      if (nameLower.includes('vitalício') || nameLower.includes('vitalicio') || nameLower.includes('lifetime')) {
        accessType = 'vitalicio'
        hasBonusAccess = true
      } else if (nameLower.includes('1 ano') || nameLower.includes('anual') || nameLower.includes('12 meses')) {
        accessType = '1_ano'
        hasBonusAccess = true
      } else if (nameLower.includes('3 meses') || nameLower.includes('trimestral')) {
        accessType = '3_meses'
        hasBonusAccess = false
      } else if (nameLower.includes('6 meses') || nameLower.includes('semestral')) {
        accessType = '6_meses'
        hasBonusAccess = false
      }

      console.log(`Name detection result: ${packSlug} (${accessType}, bonus: ${hasBonusAccess})`)
    }

    if (!packSlug) {
      console.error(`❌ Could not determine pack from productId=${productId}, product=${productName}, offer=${offerName}`)
      return new Response(
        JSON.stringify({ 
          error: 'Could not determine pack from product',
          productId,
          productName,
          offerName
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Final detection: pack=${packSlug}, accessType=${accessType}, hasBonusAccess=${hasBonusAccess}`)

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
          password_changed: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileError) {
        console.error('Error upserting profile:', profileError)
      }

      // Calculate expiration date
      let expiresAt: Date | null = null
      
      if (accessType === '3_meses') {
        expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 3)
      } else if (accessType === '6_meses') {
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
        .select('id, expires_at, access_type, has_bonus_access')
        .eq('user_id', userId)
        .eq('pack_slug', packSlug)
        .eq('is_active', true)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing purchase:', checkError)
        throw checkError
      }

      if (existingPurchase) {
        // Update existing purchase - check if should upgrade
        console.log('User already has this pack, checking for upgrade')
        
        const accessPriority: Record<string, number> = { '3_meses': 1, '6_meses': 2, '1_ano': 3, 'vitalicio': 4 }
        const currentPriority = accessPriority[existingPurchase.access_type] || 0
        const newPriority = accessPriority[accessType] || 0
        
        // Upgrade if new access is higher priority OR extend if same type
        if (newPriority >= currentPriority) {
          let newExpiresAt = expiresAt
          
          // If not upgrading to lifetime and currently not lifetime, extend from current expiration
          if (accessType !== 'vitalicio' && existingPurchase.access_type !== 'vitalicio' && existingPurchase.expires_at) {
            const currentExpires = new Date(existingPurchase.expires_at)
            const now = new Date()
            
            if (currentExpires > now && expiresAt) {
              // Extend from current expiration
              if (accessType === '3_meses') {
                newExpiresAt = new Date(currentExpires)
                newExpiresAt.setMonth(newExpiresAt.getMonth() + 3)
              } else if (accessType === '6_meses') {
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
              has_bonus_access: hasBonusAccess || existingPurchase.has_bonus_access,
              expires_at: newExpiresAt ? newExpiresAt.toISOString() : null,
              greenn_contract_id: contractId,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPurchase.id)

          if (updateError) {
            console.error('Error updating purchase:', updateError)
            throw updateError
          }
          
          console.log(`Updated pack purchase: ${packSlug} (${accessType})`)
        } else {
          console.log(`Skipping update - current access (${existingPurchase.access_type}) is higher than new (${accessType})`)
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

      console.log(`✅ Pack access activated for ${email}: ${packSlug} (${accessType})`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Pack access activated for ${email}`,
          pack: packSlug,
          access_type: accessType,
          has_bonus_access: hasBonusAccess,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          mapped_by: productId && PRODUCT_ID_MAPPING[productId] ? 'product_id' : 'name_detection'
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
          .update({ is_active: false, updated_at: new Date().toISOString() })
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

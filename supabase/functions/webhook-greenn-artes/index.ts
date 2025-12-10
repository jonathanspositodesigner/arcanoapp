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

// Interface para promoções
interface PromotionMapping {
  promotionId: string
  promotionSlug: string
  hasBonusAccess: boolean
  items: Array<{
    packSlug: string
    accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio'
  }>
}

// Mapeamento LEGADO de Product ID para pack e tipo de acesso
// Novos mapeamentos devem ser feitos via interface admin em artes_packs
const LEGACY_PRODUCT_ID_MAPPING: Record<number, ProductMapping> = {
  // Pack Arcano Vol.1
  89608: { packSlug: 'pack-arcano-vol-1', accessType: '6_meses', hasBonusAccess: false },
  89595: { packSlug: 'pack-arcano-vol-1', accessType: '1_ano', hasBonusAccess: true },
  92417: { packSlug: 'pack-arcano-vol-1', accessType: 'vitalicio', hasBonusAccess: true },
  149334: { packSlug: 'pack-arcano-vol-1', accessType: 'vitalicio', hasBonusAccess: true },
  // Pack Arcano Vol.2
  115168: { packSlug: 'pack-arcano-vol-2', accessType: '6_meses', hasBonusAccess: false },
  115163: { packSlug: 'pack-arcano-vol-2', accessType: '1_ano', hasBonusAccess: true },
  115171: { packSlug: 'pack-arcano-vol-2', accessType: 'vitalicio', hasBonusAccess: true },
  149342: { packSlug: 'pack-arcano-vol-2', accessType: 'vitalicio', hasBonusAccess: true },
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

// Função para buscar promoção no banco de dados
async function findPromotionMappingInDatabase(supabase: any, productId: number): Promise<PromotionMapping | null> {
  console.log(`🔍 Searching PROMOTIONS for product ID: ${productId}`)
  
  // Buscar promoção pelo product ID
  const { data: promotion, error } = await supabase
    .from('artes_promotions')
    .select('id, slug, has_bonus_access, greenn_product_id')
    .eq('greenn_product_id', productId)
    .eq('is_active', true)
    .maybeSingle()
  
  if (error) {
    console.error('Error fetching promotion:', error)
    return null
  }

  if (!promotion) {
    console.log(`❌ Product ID ${productId} not found in promotions`)
    return null
  }

  console.log(`✅ Found PROMOTION: ${promotion.slug} (ID: ${promotion.id})`)

  // Buscar itens da promoção
  const { data: items, error: itemsError } = await supabase
    .from('artes_promotion_items')
    .select('pack_slug, access_type')
    .eq('promotion_id', promotion.id)

  if (itemsError) {
    console.error('Error fetching promotion items:', itemsError)
    return null
  }

  if (!items || items.length === 0) {
    console.error(`⚠️ Promotion ${promotion.slug} has no items configured!`)
    return null
  }

  console.log(`📦 Promotion includes ${items.length} packs:`, items.map((i: { pack_slug: string; access_type: string }) => `${i.pack_slug} (${i.access_type})`).join(', '))

  return {
    promotionId: promotion.id,
    promotionSlug: promotion.slug,
    hasBonusAccess: promotion.has_bonus_access,
    items: items.map((item: { pack_slug: string; access_type: '3_meses' | '6_meses' | '1_ano' | 'vitalicio' }) => ({
      packSlug: item.pack_slug,
      accessType: item.access_type
    }))
  }
}

// Função para buscar mapeamento de pack individual no banco de dados
async function findProductMappingInDatabase(supabase: any, productId: number): Promise<ProductMapping | null> {
  console.log(`🔍 Searching PACKS for product ID: ${productId}`)
  
  // Buscar em todas as colunas de product ID
  const { data: packs, error } = await supabase
    .from('artes_packs')
    .select('slug, greenn_product_id_6_meses, greenn_product_id_1_ano, greenn_product_id_order_bump, greenn_product_id_vitalicio')
  
  if (error) {
    console.error('Error fetching packs:', error)
    return null
  }

  for (const pack of packs || []) {
    // Verificar cada coluna de product ID
    if (pack.greenn_product_id_6_meses === productId) {
      console.log(`✅ Found in DB: ${pack.slug} (6_meses)`)
      return { packSlug: pack.slug, accessType: '6_meses', hasBonusAccess: false }
    }
    if (pack.greenn_product_id_1_ano === productId) {
      console.log(`✅ Found in DB: ${pack.slug} (1_ano)`)
      return { packSlug: pack.slug, accessType: '1_ano', hasBonusAccess: true }
    }
    if (pack.greenn_product_id_order_bump === productId) {
      console.log(`✅ Found in DB: ${pack.slug} (order_bump -> vitalicio)`)
      return { packSlug: pack.slug, accessType: 'vitalicio', hasBonusAccess: true }
    }
    if (pack.greenn_product_id_vitalicio === productId) {
      console.log(`✅ Found in DB: ${pack.slug} (vitalicio standalone)`)
      return { packSlug: pack.slug, accessType: 'vitalicio', hasBonusAccess: true }
    }
  }

  console.log(`❌ Product ID ${productId} not found in packs database`)
  return null
}

// Função para calcular data de expiração
function calculateExpirationDate(accessType: string): Date | null {
  if (accessType === 'vitalicio') {
    return null // Never expires
  }
  
  const expiresAt = new Date()
  
  if (accessType === '3_meses') {
    expiresAt.setMonth(expiresAt.getMonth() + 3)
  } else if (accessType === '6_meses') {
    expiresAt.setMonth(expiresAt.getMonth() + 6)
  } else if (accessType === '1_ano') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  }
  
  return expiresAt
}

// Função para processar compra de um pack
async function processPackPurchase(
  supabase: any,
  userId: string,
  packSlug: string,
  accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio',
  hasBonusAccess: boolean,
  contractId: string | undefined,
  productName: string
): Promise<void> {
  console.log(`📦 Processing pack purchase: ${packSlug} (${accessType}, bonus: ${hasBonusAccess})`)
  
  const expiresAt = calculateExpirationDate(accessType)
  
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
    console.log(`User already has ${packSlug}, checking for upgrade`)
    
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
          newExpiresAt = new Date(currentExpires)
          if (accessType === '3_meses') {
            newExpiresAt.setMonth(newExpiresAt.getMonth() + 3)
          } else if (accessType === '6_meses') {
            newExpiresAt.setMonth(newExpiresAt.getMonth() + 6)
          } else if (accessType === '1_ano') {
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
          product_name: productName,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPurchase.id)

      if (updateError) {
        console.error('Error updating purchase:', updateError)
        throw updateError
      }
      
      console.log(`✅ Updated pack purchase: ${packSlug} (${accessType})`)
    } else {
      console.log(`⏭️ Skipping update - current access (${existingPurchase.access_type}) is higher than new (${accessType})`)
    }
  } else {
    // Insert new purchase
    console.log(`Creating new pack purchase for ${packSlug}`)
    const { error: insertError } = await supabase
      .from('user_pack_purchases')
      .insert({
        user_id: userId,
        pack_slug: packSlug,
        access_type: accessType,
        has_bonus_access: hasBonusAccess,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        greenn_contract_id: contractId,
        product_name: productName
      })

    if (insertError) {
      console.error('Error inserting purchase:', insertError)
      throw insertError
    }
    
    console.log(`✅ Created new pack purchase: ${packSlug} (${accessType})`)
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

    // Variáveis para armazenar o tipo de mapeamento encontrado
    let mappingType: 'promotion' | 'pack' | 'legacy' | 'name_detection' | 'none' = 'none'
    let promotionMapping: PromotionMapping | null = null
    let packMapping: ProductMapping | null = null

    if (productId) {
      // PRIMEIRO: Tentar buscar em PROMOÇÕES (combos)
      promotionMapping = await findPromotionMappingInDatabase(supabase, productId)
      
      if (promotionMapping) {
        mappingType = 'promotion'
        console.log(`🎁 Product ID ${productId} is a PROMOTION: ${promotionMapping.promotionSlug}`)
      } else {
        // SEGUNDO: Tentar buscar em PACKS individuais (configurado via admin interface)
        packMapping = await findProductMappingInDatabase(supabase, productId)
        
        if (packMapping) {
          mappingType = 'pack'
          console.log(`📦 Product ID ${productId} is a PACK: ${packMapping.packSlug}`)
        }
        // TERCEIRO: Fallback para mapeamento legado (hardcoded)
        else if (LEGACY_PRODUCT_ID_MAPPING[productId]) {
          packMapping = LEGACY_PRODUCT_ID_MAPPING[productId]
          mappingType = 'legacy'
          console.log(`📜 Product ID ${productId} found in LEGACY mapping: ${packMapping.packSlug}`)
        }
      }
    }
    
    // QUARTO: Fallback para detecção por nome (para produtos ainda não mapeados)
    if (mappingType === 'none') {
      console.log(`⚠️ Product ID ${productId} NOT in any mapping, falling back to name detection`)
      mappingType = 'name_detection'
      
      const nameLower = (productName + ' ' + offerName).toLowerCase()
      
      let packSlug = ''
      let accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio' = '6_meses'
      let hasBonusAccess = false
      
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

      if (packSlug) {
        packMapping = { packSlug, accessType, hasBonusAccess }
        console.log(`Name detection result: ${packSlug} (${accessType}, bonus: ${hasBonusAccess})`)
      }
    }

    // Se não encontrou nenhum mapeamento, retornar erro
    if (mappingType !== 'promotion' && !packMapping) {
      console.error(`❌ Could not determine pack/promotion from productId=${productId}, product=${productName}, offer=${offerName}`)
      return new Response(
        JSON.stringify({ 
          error: 'Could not determine pack/promotion from product',
          productId,
          productName,
          offerName,
          hint: 'Configure o Product ID na interface admin em Gerenciar Packs > Editar > Webhook OU em Gerenciar Promoções'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Final detection type: ${mappingType}`)

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

      // Processar com base no tipo de mapeamento
      let processedPacks: string[] = []
      
      if (mappingType === 'promotion' && promotionMapping) {
        // PROMOÇÃO: Processar múltiplos packs
        console.log(`🎁 Processing PROMOTION with ${promotionMapping.items.length} packs`)
        
        for (const item of promotionMapping.items) {
          await processPackPurchase(
            supabase,
            userId!,
            item.packSlug,
            item.accessType,
            promotionMapping.hasBonusAccess,
            contractId,
            `${productName} (Promoção: ${promotionMapping.promotionSlug})`
          )
          processedPacks.push(`${item.packSlug} (${item.accessType})`)
        }
        
        console.log(`✅ PROMOTION activated for ${email}: ${promotionMapping.promotionSlug}`)
        console.log(`   Packs granted: ${processedPacks.join(', ')}`)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Promotion activated for ${email}`,
            type: 'promotion',
            promotion: promotionMapping.promotionSlug,
            packs_granted: processedPacks,
            has_bonus_access: promotionMapping.hasBonusAccess,
            mapped_by: mappingType
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else if (packMapping) {
        // PACK INDIVIDUAL: Processar um pack
        await processPackPurchase(
          supabase,
          userId!,
          packMapping.packSlug,
          packMapping.accessType,
          packMapping.hasBonusAccess,
          contractId,
          productName || offerName
        )
        
        const expiresAt = calculateExpirationDate(packMapping.accessType)
        
        console.log(`✅ Pack access activated for ${email}: ${packMapping.packSlug} (${packMapping.accessType})`)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Pack access activated for ${email}`,
            type: 'pack',
            pack: packMapping.packSlug,
            access_type: packMapping.accessType,
            has_bonus_access: packMapping.hasBonusAccess,
            expires_at: expiresAt ? expiresAt.toISOString() : null,
            mapped_by: mappingType
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Handle refunded/chargeback - deactivate specific pack(s)
    if (status === 'refunded' || status === 'chargeback') {
      console.log(`Processing ${status} status - deactivating pack access`)
      
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email)

      if (existingUser) {
        if (mappingType === 'promotion' && promotionMapping) {
          // Deactivate all packs from promotion
          for (const item of promotionMapping.items) {
            const { error: updateError } = await supabase
              .from('user_pack_purchases')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('user_id', existingUser.id)
              .eq('pack_slug', item.packSlug)

            if (updateError) {
              console.error(`Error deactivating pack ${item.packSlug}:`, updateError)
            }
          }
          console.log(`Promotion packs deactivated for ${email}: ${promotionMapping.promotionSlug}`)
        } else if (packMapping) {
          const { error: updateError } = await supabase
            .from('user_pack_purchases')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', existingUser.id)
            .eq('pack_slug', packMapping.packSlug)

          if (updateError) {
            console.error('Error deactivating pack:', updateError)
            throw updateError
          }
          console.log(`Pack access deactivated for ${email}: ${packMapping.packSlug}`)
        }
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

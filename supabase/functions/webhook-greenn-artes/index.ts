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

// Função para extrair UTM source do saleMetas
function extractUtmSource(payload: any): string | null {
  const saleMetas = payload.saleMetas || []
  for (const meta of saleMetas) {
    if (meta.meta_key === 'utm_source') {
      return meta.meta_value || null
    }
  }
  return null
}

// Função para verificar se venda veio do app (UTM = aplicativo)
function isFromApp(payload: any): boolean {
  const utmSource = extractUtmSource(payload)
  return utmSource?.toLowerCase() === 'aplicativo'
}

// Função para registrar log do webhook
async function logWebhook(
  supabase: any,
  payload: any,
  status: string | undefined,
  productId: number | undefined,
  email: string | undefined,
  result: 'success' | 'error' | 'skipped' | 'blacklisted',
  mappingType: string,
  errorMessage?: string,
  platform: string = 'artes-eventos'
): Promise<void> {
  try {
    const utmSource = extractUtmSource(payload)
    const fromApp = isFromApp(payload)
    
    await supabase.from('webhook_logs').insert({
      payload,
      status,
      product_id: productId,
      email,
      result,
      mapping_type: mappingType,
      error_message: errorMessage,
      utm_source: utmSource,
      from_app: fromApp,
      platform
    })
    
    if (fromApp) {
      console.log(`📱 Sale from APP detected (utm_source: ${utmSource})`)
    }
  } catch (e) {
    console.error('Failed to log webhook:', e)
  }
}

// Função para verificar se email está na lista negra
async function isEmailBlacklisted(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('blacklisted_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  
  return !!data
}

// Função para adicionar email à lista negra
async function addToBlacklist(supabase: any, email: string, reason: string): Promise<void> {
  try {
    await supabase.from('blacklisted_emails').upsert({
      email: email.toLowerCase(),
      reason,
      auto_blocked: true,
      blocked_at: new Date().toISOString()
    }, { onConflict: 'email' })
    console.log(`⚠️ Email added to blacklist: ${email} (${reason})`)
  } catch (e) {
    console.error('Failed to add to blacklist:', e)
  }
}

// Send welcome email to new pack purchasers via SendPulse with tracking
async function sendWelcomeEmail(supabase: any, email: string, name: string, packInfo: string): Promise<void> {
  try {
    console.log(`📧 Sending welcome email to: ${email}`)
    
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    
    if (!clientId || !clientSecret) {
      console.error("SendPulse credentials not configured, skipping welcome email")
      return
    }

    // Fetch template from database
    const { data: template } = await supabase
      .from('welcome_email_templates')
      .select('*')
      .eq('platform', 'artes')
      .eq('is_active', true)
      .maybeSingle()

    if (!template) {
      console.log('No active template found for artes, using default')
    }

    // Parse template content
    let templateContent = {
      heading: 'Bem-vindo à Biblioteca de Artes Arcanas!',
      intro: 'Sua compra foi confirmada com sucesso! Agora você tem acesso à nossa biblioteca completa de artes editáveis.',
      button_text: 'Acessar Plataforma',
      footer: 'Se tiver qualquer dúvida, responda este email que iremos te ajudar!'
    }
    
    if (template?.content) {
      try {
        templateContent = JSON.parse(template.content)
      } catch (e) {
        console.log('Error parsing template content, using default')
      }
    }

    const subject = template?.subject || '🎨 Bem-vindo à Biblioteca de Artes Arcanas - Seu acesso está pronto!'
    const senderName = template?.sender_name || 'Biblioteca de Artes Arcanas'
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'

    // Generate unique tracking ID
    const trackingId = crypto.randomUUID()

    // Build tracking URLs
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const openTrackingPixel = `${trackingBaseUrl}?id=${trackingId}&action=open`
    const platformUrl = 'https://arcanolab.voxvisual.com.br/login-artes'
    const clickTrackingUrl = `${trackingBaseUrl}?id=${trackingId}&action=click&redirect=${encodeURIComponent(platformUrl)}`

    // Get SendPulse access token
    const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenResponse.ok) {
      console.error("Failed to get SendPulse token for welcome email")
      return
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Build welcome email HTML with tracking
    const welcomeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f4; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 30px; }
    h1 { color: #d4af37; text-align: center; margin: 0 0 20px 0; font-size: 28px; }
    p { color: #333; line-height: 1.6; margin: 0 0 16px 0; }
    .cta-button { display: block; background: linear-gradient(135deg, #d4af37, #b8962e); color: white; text-align: center; padding: 18px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 30px 0; }
    .credentials { background: linear-gradient(135deg, #fefce8, #fef3c7); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #fde68a; }
    .credentials h3 { margin: 0 0 16px 0; color: #92400e; font-size: 18px; }
    .credentials p { margin: 8px 0; color: #333; }
    .highlight { background: #fff; padding: 10px 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 15px; border: 1px solid #e5e7eb; display: inline-block; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-top: 16px; }
    .warning p { color: #92400e; font-size: 13px; margin: 0; }
    .pack-badge { background: #d4af37; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
    .footer { color: #666; font-size: 13px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🎨 ${templateContent.heading}</h1>
    </div>
    
    <p>Olá${name ? ` <strong>${name}</strong>` : ''}!</p>
    
    <p>${templateContent.intro}</p>
    
    <div style="text-align: center;">
      <span class="pack-badge">✨ ${packInfo}</span>
    </div>
    
    <div class="credentials">
      <h3>📋 Dados do seu primeiro acesso:</h3>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Senha:</strong> <span class="highlight">${email}</span></p>
      <div class="warning">
        <p>⚠️ <strong>Importante:</strong> Por segurança, você deverá trocar sua senha no primeiro acesso.</p>
      </div>
    </div>
    
    <a href="${clickTrackingUrl}" class="cta-button">
      🚀 ${templateContent.button_text}
    </a>
    
    <p style="text-align: center; color: #666;">
      Clique no botão acima para fazer seu primeiro login e começar a explorar artes editáveis em PSD e Canva!
    </p>
    
    <div class="footer">
      <p>${templateContent.footer}</p>
      <p style="margin-top: 8px;">© Biblioteca de Artes Arcanas</p>
    </div>
  </div>
  <img src="${openTrackingPixel}" width="1" height="1" style="display:none" alt="" />
</body>
</html>
`

    // Convert HTML to Base64 (SendPulse requirement)
    const htmlBase64 = btoa(unescape(encodeURIComponent(welcomeHtml)))

    // Send email via SendPulse
    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: {
          html: htmlBase64,
          text: `${templateContent.heading} Seu acesso está pronto. Email: ${email}, Senha: ${email}. Acesse: ${platformUrl}`,
          subject: subject,
          from: {
            name: senderName,
            email: senderEmail,
          },
          to: [{ email, name: name || "" }],
        },
      }),
    })

    const result = await emailResponse.json()
    
    // Log the email send
    await supabase.from('welcome_email_logs').insert({
      email,
      name,
      platform: 'artes',
      tracking_id: trackingId,
      template_used: template?.id || 'default',
      product_info: packInfo,
      status: result.result === true ? 'sent' : 'failed',
      error_message: result.result !== true ? JSON.stringify(result) : null
    })
    
    if (result.result === true) {
      console.log(`✅ Welcome email sent successfully to ${email} (tracking: ${trackingId})`)
    } else {
      console.error(`❌ Failed to send welcome email: ${JSON.stringify(result)}`)
    }
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
}

// Função para buscar promoção no banco de dados
async function findPromotionMappingInDatabase(supabase: any, productId: number): Promise<PromotionMapping | null> {
  console.log(`🔍 Searching PROMOTIONS for product ID: ${productId}`)
  
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
  
  const { data: packs, error } = await supabase
    .from('artes_packs')
    .select('slug, greenn_product_id_6_meses, greenn_product_id_1_ano, greenn_product_id_order_bump, greenn_product_id_vitalicio')
  
  if (error) {
    console.error('Error fetching packs:', error)
    return null
  }

  for (const pack of packs || []) {
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
    return null
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
  productName: string,
  platform: string = 'eventos'
): Promise<void> {
  console.log(`📦 Processing pack purchase: ${packSlug} (${accessType}, bonus: ${hasBonusAccess}, platform: ${platform})`)
  
  const expiresAt = calculateExpirationDate(accessType)
  
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
    console.log(`User already has ${packSlug}, checking for upgrade`)
    
    const accessPriority: Record<string, number> = { '3_meses': 1, '6_meses': 2, '1_ano': 3, 'vitalicio': 4 }
    const currentPriority = accessPriority[existingPurchase.access_type] || 0
    const newPriority = accessPriority[accessType] || 0
    
    if (newPriority >= currentPriority) {
      let newExpiresAt = expiresAt
      
      if (accessType !== 'vitalicio' && existingPurchase.access_type !== 'vitalicio' && existingPurchase.expires_at) {
        const currentExpires = new Date(existingPurchase.expires_at)
        const now = new Date()
        
        if (currentExpires > now && expiresAt) {
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
          platform: platform,
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
        product_name: productName,
        platform: platform
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  let payload: any = {}
  let email: string | undefined
  let status: string | undefined
  let productId: number | undefined
  let mappingType: 'promotion' | 'pack' | 'legacy' | 'name_detection' | 'none' = 'none'

  try {
    payload = await req.json()
    
    console.log('=== GREENN ARTES WEBHOOK RECEIVED ===')
    console.log('Payload:', JSON.stringify(payload, null, 2))

    // Detectar evento de checkout abandonado ANTES de processar como venda
    const eventType = payload.event
    
    if (eventType === 'checkoutAbandoned') {
      const leadEmail = payload.lead?.email?.toLowerCase().trim()
      const leadName = payload.lead?.name || ''
      const leadPhone = payload.lead?.cellphone?.replace(/\D/g, '') || ''
      const leadCpf = payload.lead?.cpf || ''
      const checkoutStep = payload.lead?.step || 0
      const checkoutLink = payload.link_checkout || ''
      productId = payload.product?.id
      const productName = payload.product?.name || ''
      const offerName = payload.offer?.name || ''
      const offerHash = payload.offer?.hash || ''
      const amount = payload.offer?.amount || payload.product?.amount || 0

      console.log(`📋 Checkout abandoned by: ${leadEmail} at step ${checkoutStep}`)
      console.log(`Product: ${productName} (ID: ${productId}), Amount: ${amount}`)
      
      if (leadEmail) {
        // Verificar se o lead já existe para este produto nas últimas 24h (evitar duplicatas)
        const { data: existingLead } = await supabase
          .from('abandoned_checkouts')
          .select('id')
          .eq('email', leadEmail)
          .eq('product_id', productId)
          .gte('abandoned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle()

        if (!existingLead) {
          // Salvar lead para remarketing
          const { error: insertError } = await supabase.from('abandoned_checkouts').insert({
            email: leadEmail,
            name: leadName,
            phone: leadPhone,
            cpf: leadCpf,
            product_id: productId,
            product_name: productName,
            offer_name: offerName,
            offer_hash: offerHash,
            amount: amount,
            checkout_link: checkoutLink,
            checkout_step: checkoutStep,
            remarketing_status: 'pending',
            platform: 'artes-eventos'
          })

          if (insertError) {
            console.error('Error saving abandoned checkout:', insertError)
          } else {
            console.log(`✅ Lead saved for remarketing: ${leadEmail}`)
          }
        } else {
          console.log(`⏭️ Lead already registered recently: ${leadEmail}`)
        }
      }

      await logWebhook(supabase, payload, 'abandoned', productId, leadEmail, 'success', 'lead', undefined)
      
      return new Response(
        JSON.stringify({ success: true, message: 'Lead captured for remarketing' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Processamento normal de vendas
    email = payload.client?.email?.toLowerCase().trim()
    const clientName = payload.client?.name || ''
    const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
    const productName = payload.product?.name || ''
    productId = payload.product?.id
    const offerName = payload.offer?.name || ''
    const offerHash = payload.offer?.hash || ''
    status = payload.currentStatus
    const contractId = payload.contract?.id || payload.sale?.id
    const saleAmount = payload.sale?.amount
    
    if (!email) {
      console.error('No email provided in webhook payload')
      await logWebhook(supabase, payload, status, productId, email, 'error', 'unknown', 'Email is required')
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing webhook for email: ${email}, name: ${clientName}, status: ${status}`)
    console.log(`Product ID: ${productId}, Product: ${productName}, Offer: ${offerName}, Offer Hash: ${offerHash}`)
    console.log(`Sale Amount: ${saleAmount}`)

    // Verificar lista negra para compras
    if (status === 'paid' || status === 'approved') {
      const isBlacklisted = await isEmailBlacklisted(supabase, email)
      if (isBlacklisted) {
        console.log(`🚫 Email ${email} is BLACKLISTED - blocking purchase`)
        await logWebhook(supabase, payload, status, productId, email, 'blacklisted', 'blocked', 'Email is blacklisted')
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Purchase blocked - email is blacklisted',
            email
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Variáveis para armazenar o tipo de mapeamento encontrado
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
      await logWebhook(supabase, payload, status, productId, email, 'error', mappingType, 'Could not determine pack/promotion from product')
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
      
      // PRIMEIRO: Verificar se existe abandoned_checkout para este email+produto
      // Se foi abandonado há menos de 15 minutos, DELETAR (não é abandono real, pessoa pagou rápido)
      // Se foi abandonado há mais de 15 minutos, marcar como CONVERTED
      if (productId) {
        const { data: abandonedCheckout, error: abandonedError } = await supabase
          .from('abandoned_checkouts')
          .select('id, abandoned_at')
          .eq('email', email)
          .eq('product_id', productId)
          .neq('remarketing_status', 'converted')
          .maybeSingle()

        if (abandonedError) {
          console.error('Error checking abandoned checkout:', abandonedError)
        } else if (abandonedCheckout) {
          const abandonedAt = new Date(abandonedCheckout.abandoned_at)
          const now = new Date()
          const minutesSinceAbandonment = (now.getTime() - abandonedAt.getTime()) / (1000 * 60)
          
          if (minutesSinceAbandonment < 15) {
            // Menos de 15 minutos - não foi abandono real, pessoa pagou rápido, DELETAR registro
            const { error: deleteError } = await supabase
              .from('abandoned_checkouts')
              .delete()
              .eq('id', abandonedCheckout.id)

            if (deleteError) {
              console.error('Error deleting quick-converted checkout:', deleteError)
            } else {
              console.log(`🗑️ Deleted quick checkout (${minutesSinceAbandonment.toFixed(1)} min) - not a real abandonment: ${email}`)
            }
          } else {
            // Mais de 15 minutos - foi abandono real que depois converteu
            const { error: updateError } = await supabase
              .from('abandoned_checkouts')
              .update({ 
                remarketing_status: 'converted',
                updated_at: new Date().toISOString()
              })
              .eq('id', abandonedCheckout.id)

            if (updateError) {
              console.error('Error marking abandoned checkout as converted:', updateError)
            } else {
              console.log(`✅ Abandoned checkout marked as CONVERTED (after ${minutesSinceAbandonment.toFixed(1)} min) for ${email} + product ${productId}`)
            }
          }
        }
      }
      
      let userId: string | null = null

      // PRIMEIRO: Tentar criar o usuário diretamente
      console.log(`Attempting to create user with email: ${email}`)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: email,
        email_confirm: true
      })

      if (createError) {
        if (createError.message?.includes('email') || createError.code === 'email_exists') {
          console.log(`User already exists, fetching from profiles table...`)
          
          const { data: profile, error: profileFetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()
          
          if (profileFetchError) {
            console.error('Error fetching profile:', profileFetchError)
          }
          
          if (profile) {
            userId = profile.id
            console.log(`Found user via profiles table with ID: ${userId}`)
          } else {
            // Fallback: buscar via listUsers COM PAGINAÇÃO COMPLETA
            console.log('Profile not found, trying listUsers with full pagination...')
            
            let foundUser = null
            let page = 1
            const perPage = 1000
            
            while (!foundUser) {
              console.log(`Searching page ${page}...`)
              const { data: usersData, error: fetchError } = await supabase.auth.admin.listUsers({
                page: page,
                perPage: perPage
              })
              
              if (fetchError) {
                console.error('Error listing users:', fetchError)
                throw fetchError
              }

              if (!usersData?.users || usersData.users.length === 0) {
                console.log('No more users to search')
                break
              }

              foundUser = usersData.users.find(u => u.email?.toLowerCase() === email)
              
              if (foundUser) {
                userId = foundUser.id
                console.log(`Found existing user via listUsers (page ${page}) with ID: ${userId}`)
              } else if (usersData.users.length < perPage) {
                console.log('Reached last page, user not found')
                break
              } else {
                page++
              }
            }
            
            if (!userId) {
              console.error('Could not find existing user despite email_exists error')
              throw new Error(`User with email ${email} exists but could not be found`)
            }
          }
        } else {
          console.error('Error creating user:', createError)
          throw createError
        }
      } else {
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
        
        // Send welcome email
        await sendWelcomeEmail(supabase, email, clientName, `Promoção: ${promotionMapping.promotionSlug}`)
        
        await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)
        
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
        
        // Send welcome email
        await sendWelcomeEmail(supabase, email, clientName, `${packMapping.packSlug} (${packMapping.accessType})`)
        
        await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)
        
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

    // Handle refunded/chargeback - deactivate specific pack(s) and blacklist on chargeback
    if (status === 'refunded' || status === 'chargeback') {
      console.log(`Processing ${status} status - deactivating pack access for product ID: ${productId}`)
      
      // Adicionar à lista negra automaticamente em caso de chargeback
      if (status === 'chargeback') {
        await addToBlacklist(supabase, email, 'chargeback')
      }
      
      // Buscar usuário com paginação completa
      let userId: string | null = null
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      
      if (profile) {
        userId = profile.id
        console.log(`Found user via profiles: ${userId}`)
      } else {
        let page = 1
        const perPage = 1000
        
        while (!userId) {
          const { data: usersData } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: perPage
          })
          
          if (!usersData?.users || usersData.users.length === 0) break
          
          const foundUser = usersData.users.find(u => u.email?.toLowerCase() === email)
          if (foundUser) {
            userId = foundUser.id
            console.log(`Found user via listUsers (page ${page}): ${userId}`)
          } else if (usersData.users.length < perPage) {
            break
          } else {
            page++
          }
        }
      }

      if (userId) {
        if (mappingType === 'promotion' && promotionMapping) {
          for (const item of promotionMapping.items) {
            const { error: updateError } = await supabase
              .from('user_pack_purchases')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('user_id', userId)
              .eq('pack_slug', item.packSlug)

            if (updateError) {
              console.error(`Error deactivating pack ${item.packSlug}:`, updateError)
            } else {
              console.log(`✅ Pack ${item.packSlug} deactivated for ${email}`)
            }
          }
          console.log(`🚫 Promotion packs deactivated for ${email}: ${promotionMapping.promotionSlug}`)
        } else if (packMapping) {
          const { error: updateError } = await supabase
            .from('user_pack_purchases')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('pack_slug', packMapping.packSlug)

          if (updateError) {
            console.error('Error deactivating pack:', updateError)
            throw updateError
          }
          console.log(`🚫 Pack access deactivated for ${email}: ${packMapping.packSlug}`)
        }
      } else {
        console.log(`User not found for email: ${email}, cannot deactivate pack`)
      }

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)

      return new Response(
        JSON.stringify({ success: true, message: `Pack access deactivated for ${email}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle waiting_payment - save as abandoned checkout for remarketing
    if (status === 'waiting_payment') {
      console.log(`💳 Received waiting_payment - saving as abandoned checkout for remarketing`)
      
      const clientName = payload.client?.name || ''
      const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
      const productName = payload.product?.name || ''
      const offerName = payload.offer?.name || ''
      const offerHash = payload.offer?.hash || ''
      const saleAmount = payload.sale?.amount || 0
      const checkoutLink = payload.link_checkout || ''
      
      // Verificar se já existe abandoned checkout para este email+produto nas últimas 24h
      const { data: existingAbandoned } = await supabase
        .from('abandoned_checkouts')
        .select('id')
        .eq('email', email)
        .eq('product_id', productId)
        .gte('abandoned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (!existingAbandoned) {
        const { error: insertError } = await supabase.from('abandoned_checkouts').insert({
          email: email,
          name: clientName,
          phone: clientPhone,
          product_id: productId,
          product_name: productName,
          offer_name: offerName,
          offer_hash: offerHash,
          amount: saleAmount,
          checkout_link: checkoutLink,
          checkout_step: 0, // waiting_payment não tem step específico
          remarketing_status: 'pending',
          platform: 'artes-eventos'
        })

        if (insertError) {
          console.error('Error saving abandoned checkout from waiting_payment:', insertError)
        } else {
          console.log(`✅ Abandoned checkout saved from waiting_payment: ${email}`)
        }
      } else {
        console.log(`⏭️ Abandoned checkout already exists for ${email} + product ${productId}`)
      }

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Waiting payment captured as abandoned checkout for remarketing`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle canceled/unpaid/expired - just log, no access change (keep until expires_at)
    if (status === 'canceled' || status === 'unpaid' || status === 'expired') {
      console.log(`📋 Received ${status} status - logged but no immediate action (access maintained until expires_at)`)
      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Webhook received with status: ${status}. Access maintained until expiration date.`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For other statuses, just log and acknowledge
    console.log(`Received status ${status} - no action taken`)
    await logWebhook(supabase, payload, status, productId, email, 'skipped', mappingType)
    
    return new Response(
      JSON.stringify({ success: true, message: `Webhook received with status: ${status}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Webhook processing error:', error)
    await logWebhook(supabase, payload, status, productId, email, 'error', mappingType, errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

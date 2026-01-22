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
  isFerramentaIA?: boolean
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

// Função para extrair locale do saleMetas
function extractLocale(payload: any): 'pt' | 'es' {
  const saleMetas = payload.saleMetas || []
  for (const meta of saleMetas) {
    if (meta.meta_key === 'utm_locale' && meta.meta_value === 'es') {
      return 'es'
    }
  }
  return 'pt'
}

// Textos de email por idioma
const emailTexts = {
  pt: {
    greeting: 'Olá',
    accessData: '📋 Dados do seu primeiro acesso:',
    email: 'Email',
    password: 'Senha',
    securityWarning: 'Por segurança, você deverá trocar sua senha no primeiro acesso.',
    clickButtonArtes: 'Clique no botão acima para fazer seu primeiro login e começar a explorar artes editáveis em PSD e Canva!',
    clickButtonIA: 'Clique no botão acima para fazer seu primeiro login e começar a usar sua ferramenta de IA!',
    copyrightArtes: '© Biblioteca de Artes Arcanas',
    copyrightIA: '© Ferramentas IA Arcanas',
    important: 'Importante'
  },
  es: {
    greeting: 'Hola',
    accessData: '📋 Datos de tu primer acceso:',
    email: 'Email',
    password: 'Contraseña',
    securityWarning: 'Por seguridad, deberás cambiar tu contraseña en el primer acceso.',
    clickButtonArtes: '¡Haz clic en el botón de arriba para iniciar sesión y explorar artes editables en PSD y Canva!',
    clickButtonIA: '¡Haz clic en el botón de arriba para iniciar sesión y usar tu herramienta de IA!',
    copyrightArtes: '© Biblioteca de Artes Arcanas',
    copyrightIA: '© Herramientas IA Arcanas',
    important: 'Importante'
  }
}

// Função para verificar se venda veio do app (UTM = aplicativo)
function isFromApp(payload: any): boolean {
  const utmSource = extractUtmSource(payload)
  return utmSource?.toLowerCase() === 'aplicativo'
}

// logWebhook function removed - logs desativados para economizar recursos

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
async function addToBlacklist(supabase: any, email: string, reason: string, requestId: string): Promise<void> {
  try {
    await supabase.from('blacklisted_emails').upsert({
      email: email.toLowerCase(),
      reason,
      auto_blocked: true,
      blocked_at: new Date().toISOString()
    }, { onConflict: 'email' })
    console.log(`   ├─ [${requestId}] 🚫 Email adicionado à blacklist: ${email} (${reason})`)
  } catch (e) {
    console.error(`   ├─ [${requestId}] ❌ Erro ao adicionar à blacklist:`, e)
  }
}

// Send welcome email to new pack purchasers via SendPulse with tracking
async function sendWelcomeEmail(supabase: any, email: string, name: string, packInfo: string, requestId: string, isFerramentaIA: boolean = false, locale: 'pt' | 'es' = 'pt'): Promise<void> {
  console.log(`\n📧 [${requestId}] EMAIL DE BOAS-VINDAS:`)
  console.log(`   ├─ Destinatário: ${email}`)
  console.log(`   ├─ Nome: ${name || 'N/A'}`)
  console.log(`   ├─ Pack: ${packInfo}`)
  console.log(`   ├─ Tipo: ${isFerramentaIA ? 'Ferramenta IA' : 'Pack de Artes'}`)
  console.log(`   ├─ Locale: ${locale}`)
  
  const t = emailTexts[locale]
  
  try {
    // Verificar se já enviou email para este email+pack nos últimos 5 minutos (previne duplicatas de webhooks)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentEmail } = await supabase
      .from('welcome_email_logs')
      .select('id, sent_at')
      .eq('email', email)
      .eq('product_info', packInfo)
      .eq('status', 'sent')
      .gte('sent_at', fiveMinutesAgo)
      .maybeSingle()
    
    if (recentEmail) {
      const secondsAgo = Math.round((Date.now() - new Date(recentEmail.sent_at).getTime()) / 1000)
      console.log(`   └─ ⏭️ Email já enviado há ${secondsAgo}s - IGNORANDO duplicata`)
      return
    }
    
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    
    if (!clientId || !clientSecret) {
      console.log(`   └─ ⚠️ SendPulse não configurado, email não enviado`)
      return
    }

    // Determinar plataforma do template com base no tipo de produto e locale
    const templatePlatform = isFerramentaIA ? 'ferramentas_ia' : 'artes'

    // Fetch template from database with locale
    const { data: template } = await supabase
      .from('welcome_email_templates')
      .select('*')
      .eq('platform', templatePlatform)
      .eq('locale', locale)
      .eq('is_active', true)
      .maybeSingle()

    console.log(`   ├─ Template: ${template?.id || 'default'} (platform: ${templatePlatform}, locale: ${locale})`)

    // Parse template content com defaults baseados no tipo e locale
    const defaultContentPt = isFerramentaIA 
      ? {
          heading: 'Sua Ferramenta de IA está Ativada!',
          intro: 'Sua compra foi confirmada com sucesso! Agora você tem acesso ilimitado a esta poderosa ferramenta de Inteligência Artificial.',
          button_text: 'Acessar Minha Ferramenta',
          footer: 'Se tiver qualquer dúvida, responda este email que iremos te ajudar!'
        }
      : {
          heading: 'Bem-vindo à Biblioteca de Artes Arcanas!',
          intro: 'Sua compra foi confirmada com sucesso! Agora você tem acesso à nossa biblioteca completa de artes editáveis.',
          button_text: 'Acessar Plataforma',
          footer: 'Se tiver qualquer dúvida, responda este email que iremos te ajudar!'
        }
    
    const defaultContentEs = isFerramentaIA 
      ? {
          heading: '¡Tu Herramienta de IA está Activada!',
          intro: '¡Tu compra fue confirmada con éxito! Ahora tienes acceso ilimitado a esta poderosa herramienta de Inteligencia Artificial.',
          button_text: 'Acceder a Mi Herramienta',
          footer: '¡Si tienes alguna duda, responde este email y te ayudaremos!'
        }
      : {
          heading: '¡Bienvenido a la Biblioteca de Artes Arcanas!',
          intro: '¡Tu compra fue confirmada con éxito! Ahora tienes acceso a nuestra biblioteca completa de artes editables.',
          button_text: 'Acceder a la Plataforma',
          footer: '¡Si tienes alguna duda, responde este email y te ayudaremos!'
        }
    
    let templateContent = locale === 'es' ? { ...defaultContentEs } : { ...defaultContentPt }
    
    if (template?.content) {
      try {
        templateContent = JSON.parse(template.content)
      } catch (e) {
        console.log(`   ├─ ⚠️ Erro parsing template, usando default`)
      }
    }

    const defaultSubject = isFerramentaIA 
      ? '🤖 Bem-vindo! Sua Ferramenta de IA está pronta para uso!'
      : '🎨 Bem-vindo à Biblioteca de Artes Arcanas - Seu acesso está pronto!'
    const defaultSenderName = isFerramentaIA ? 'Ferramentas IA Arcanas' : 'Biblioteca de Artes Arcanas'
    
    const subject = template?.subject || defaultSubject
    const senderName = template?.sender_name || defaultSenderName
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'

    // Generate unique tracking ID
    const trackingId = crypto.randomUUID()
    console.log(`   ├─ Tracking ID: ${trackingId}`)

    // Build tracking URLs
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const openTrackingPixel = `${trackingBaseUrl}?id=${trackingId}&action=open`
    const platformUrl = isFerramentaIA 
      ? 'https://arcanoapp.voxvisual.com.br/ferramentas-ia'
      : 'https://arcanolab.voxvisual.com.br/login-artes'
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
      console.log(`   └─ ❌ Falha ao obter token SendPulse`)
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
      <h1>${isFerramentaIA ? '🤖' : '🎨'} ${templateContent.heading}</h1>
    </div>
    
    <p>${t.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p>
    
    <p>${templateContent.intro}</p>
    
    <div style="text-align: center;">
      <span class="pack-badge">✨ ${packInfo}</span>
    </div>
    
    <div class="credentials">
      <h3>${t.accessData}</h3>
      <p><strong>${t.email}:</strong> ${email}</p>
      <p><strong>${t.password}:</strong> <span class="highlight">${email}</span></p>
      <div class="warning">
        <p>⚠️ <strong>${t.important}:</strong> ${t.securityWarning}</p>
      </div>
    </div>
    
    <a href="${clickTrackingUrl}" class="cta-button">
      🚀 ${templateContent.button_text}
    </a>
    
    <p style="text-align: center; color: #666;">
      ${isFerramentaIA ? t.clickButtonIA : t.clickButtonArtes}
    </p>
    
    <div class="footer">
      <p>${templateContent.footer}</p>
      <p style="margin-top: 8px;">${isFerramentaIA ? t.copyrightIA : t.copyrightArtes}</p>
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
      platform: isFerramentaIA ? 'ferramentas_ia' : 'artes',
      tracking_id: trackingId,
      template_used: template?.id || 'default',
      product_info: packInfo,
      status: result.result === true ? 'sent' : 'failed',
      error_message: result.result !== true ? JSON.stringify(result) : null,
      locale
    })
    
    if (result.result === true) {
      console.log(`   └─ ✅ Email enviado com sucesso`)
    } else {
      console.log(`   └─ ❌ Falha no envio: ${JSON.stringify(result)}`)
    }
  } catch (error) {
    console.log(`   └─ ❌ Erro ao enviar email: ${error}`)
  }
}

// Função para buscar promoção no banco de dados
async function findPromotionMappingInDatabase(supabase: any, productId: number, requestId: string): Promise<PromotionMapping | null> {
  console.log(`   ├─ [${requestId}] 🔍 Buscando promoção para Product ID: ${productId}`)
  
  const { data: promotion, error } = await supabase
    .from('artes_promotions')
    .select('id, slug, has_bonus_access, greenn_product_id')
    .eq('greenn_product_id', productId)
    .eq('is_active', true)
    .maybeSingle()
  
  if (error) {
    console.error(`   ├─ [${requestId}] ❌ Erro buscando promoção:`, error)
    return null
  }

  if (!promotion) {
    console.log(`   ├─ [${requestId}] ⚠️ Não encontrado em promoções`)
    return null
  }

  console.log(`   ├─ [${requestId}] ✅ PROMOÇÃO encontrada: ${promotion.slug}`)

  const { data: items, error: itemsError } = await supabase
    .from('artes_promotion_items')
    .select('pack_slug, access_type')
    .eq('promotion_id', promotion.id)

  if (itemsError) {
    console.error(`   ├─ [${requestId}] ❌ Erro buscando itens:`, itemsError)
    return null
  }

  if (!items || items.length === 0) {
    console.error(`   ├─ [${requestId}] ⚠️ Promoção sem itens configurados`)
    return null
  }

  console.log(`   ├─ [${requestId}] 📦 ${items.length} packs na promoção`)

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
async function findProductMappingInDatabase(supabase: any, productId: number, requestId: string): Promise<ProductMapping | null> {
  console.log(`   ├─ [${requestId}] 🔍 Buscando pack para Product ID: ${productId}`)
  
  const { data: packs, error } = await supabase
    .from('artes_packs')
    .select('slug, type, greenn_product_id_6_meses, greenn_product_id_1_ano, greenn_product_id_order_bump, greenn_product_id_vitalicio')
  
  if (error) {
    console.error(`   ├─ [${requestId}] ❌ Erro buscando packs:`, error)
    return null
  }

  for (const pack of packs || []) {
    const isFerramentaIA = pack.type === 'ferramentas_ia'
    
    if (pack.greenn_product_id_6_meses === productId) {
      console.log(`   ├─ [${requestId}] ✅ PACK encontrado: ${pack.slug} (6_meses)${isFerramentaIA ? ' [Ferramenta IA]' : ''}`)
      return { packSlug: pack.slug, accessType: '6_meses', hasBonusAccess: false, isFerramentaIA }
    }
    if (pack.greenn_product_id_1_ano === productId) {
      console.log(`   ├─ [${requestId}] ✅ PACK encontrado: ${pack.slug} (1_ano)${isFerramentaIA ? ' [Ferramenta IA]' : ''}`)
      return { packSlug: pack.slug, accessType: '1_ano', hasBonusAccess: true, isFerramentaIA }
    }
    if (pack.greenn_product_id_order_bump === productId) {
      console.log(`   ├─ [${requestId}] ✅ PACK encontrado: ${pack.slug} (order_bump → vitalicio)${isFerramentaIA ? ' [Ferramenta IA]' : ''}`)
      return { packSlug: pack.slug, accessType: 'vitalicio', hasBonusAccess: true, isFerramentaIA }
    }
    if (pack.greenn_product_id_vitalicio === productId) {
      console.log(`   ├─ [${requestId}] ✅ PACK encontrado: ${pack.slug} (vitalicio)${isFerramentaIA ? ' [Ferramenta IA]' : ''}`)
      return { packSlug: pack.slug, accessType: 'vitalicio', hasBonusAccess: true, isFerramentaIA }
    }
  }

  console.log(`   ├─ [${requestId}] ⚠️ Não encontrado em packs`)
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
  platform: string,
  requestId: string
): Promise<void> {
  console.log(`   ├─ [${requestId}] 📦 Processando: ${packSlug} (${accessType}, bonus: ${hasBonusAccess})`)
  
  const expiresAt = calculateExpirationDate(accessType)
  
  const { data: existingPurchase, error: checkError } = await supabase
    .from('user_pack_purchases')
    .select('id, expires_at, access_type, has_bonus_access')
    .eq('user_id', userId)
    .eq('pack_slug', packSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (checkError) {
    console.error(`   ├─ [${requestId}] ❌ Erro verificando compra:`, checkError)
    throw checkError
  }

  if (existingPurchase) {
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
        console.error(`   ├─ [${requestId}] ❌ Erro atualizando:`, updateError)
        throw updateError
      }
      
      console.log(`   ├─ [${requestId}] ✅ Pack ATUALIZADO: ${packSlug}`)
    } else {
      console.log(`   ├─ [${requestId}] ⏭️ Skipping: acesso atual (${existingPurchase.access_type}) > novo (${accessType})`)
    }
  } else {
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
      console.error(`   ├─ [${requestId}] ❌ Erro inserindo:`, insertError)
      throw insertError
    }
    
    console.log(`   ├─ [${requestId}] ✅ Pack CRIADO: ${packSlug}`)
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now()
  const requestId = crypto.randomUUID().slice(0, 8)
  const timestamp = new Date().toISOString()
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`\n${'='.repeat(70)}`)
  console.log(`🚀 [${requestId}] WEBHOOK ARTES RECEBIDO - ${timestamp}`)
  console.log(`${'='.repeat(70)}`)

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
  let currentStep = 'parsing_payload'

  try {
    payload = await req.json()

    // Detectar evento de checkout abandonado
    const eventType = payload.event
    const utmSource = extractUtmSource(payload)
    const fromApp = isFromApp(payload)
    
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

      console.log(`\n📋 [${requestId}] CHECKOUT ABANDONADO:`)
      console.log(`   ├─ Email: ${leadEmail || 'N/A'}`)
      console.log(`   ├─ Nome: ${leadName || 'N/A'}`)
      console.log(`   ├─ Telefone: ${leadPhone || 'N/A'}`)
      console.log(`   ├─ Step: ${checkoutStep}`)
      console.log(`   ├─ Product ID: ${productId}`)
      console.log(`   ├─ Product: ${productName}`)
      console.log(`   ├─ UTM Source: ${utmSource || 'N/A'}`)
      console.log(`   └─ Amount: R$ ${amount}`)
      
      if (leadEmail) {
        const { data: existingLead } = await supabase
          .from('abandoned_checkouts')
          .select('id')
          .eq('email', leadEmail)
          .eq('product_id', productId)
          .gte('abandoned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle()

        if (!existingLead) {
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
            console.log(`\n❌ [${requestId}] Erro salvando lead: ${insertError.message}`)
          } else {
            console.log(`\n✅ [${requestId}] Lead salvo para remarketing`)
          }
        } else {
          console.log(`\n⏭️ [${requestId}] Lead já registrado recentemente`)
        }
      }

      await logWebhook(supabase, payload, 'abandoned', productId, leadEmail, 'success', 'lead', undefined)
      
      const duration = Date.now() - startTime
      console.log(`\n⏱️ [${requestId}] Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)
      
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

    console.log(`\n📋 [${requestId}] DADOS DO PAYLOAD:`)
    console.log(`   ├─ Email: ${email || 'NÃO FORNECIDO'}`)
    console.log(`   ├─ Nome: ${clientName || 'N/A'}`)
    console.log(`   ├─ Telefone: ${clientPhone || 'N/A'}`)
    console.log(`   ├─ Status: ${status}`)
    console.log(`   ├─ Product ID: ${productId}`)
    console.log(`   ├─ Product Name: ${productName}`)
    console.log(`   ├─ Offer Name: ${offerName}`)
    console.log(`   ├─ Offer Hash: ${offerHash}`)
    console.log(`   ├─ Sale Amount: R$ ${saleAmount || 'N/A'}`)
    console.log(`   ├─ Contract ID: ${contractId || 'N/A'}`)
    console.log(`   ├─ UTM Source: ${utmSource || 'N/A'}`)
    console.log(`   └─ From App: ${fromApp ? 'SIM 📱' : 'NÃO'}`)
    
    if (!email) {
      console.log(`\n❌ [${requestId}] ERRO: Email não fornecido`)
      await logWebhook(supabase, payload, status, productId, email, 'error', 'unknown', 'Email is required')
      
      const duration = Date.now() - startTime
      console.log(`⏱️ [${requestId}] Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)
      
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar lista negra para compras
    if (status === 'paid' || status === 'approved') {
      currentStep = 'checking_blacklist'
      console.log(`\n🔒 [${requestId}] VERIFICANDO BLACKLIST...`)
      
      const isBlacklisted = await isEmailBlacklisted(supabase, email)
      if (isBlacklisted) {
        console.log(`   └─ 🚫 Email BLOQUEADO`)
        await logWebhook(supabase, payload, status, productId, email, 'blacklisted', 'blocked', 'Email is blacklisted')
        
        const duration = Date.now() - startTime
        console.log(`\n⏱️ [${requestId}] Tempo: ${duration}ms`)
        console.log(`${'='.repeat(70)}\n`)
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Purchase blocked - email is blacklisted',
            email
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log(`   └─ ✅ Email liberado`)
    }

    // Variáveis para armazenar o tipo de mapeamento encontrado
    let promotionMapping: PromotionMapping | null = null
    let packMapping: ProductMapping | null = null

    currentStep = 'detecting_mapping'
    console.log(`\n🔍 [${requestId}] DETECÇÃO DE MAPEAMENTO:`)

    if (productId) {
      // PRIMEIRO: Tentar buscar em PROMOÇÕES (combos)
      promotionMapping = await findPromotionMappingInDatabase(supabase, productId, requestId)
      
      if (promotionMapping) {
        mappingType = 'promotion'
      } else {
        // SEGUNDO: Tentar buscar em PACKS individuais
        packMapping = await findProductMappingInDatabase(supabase, productId, requestId)
        
        if (packMapping) {
          mappingType = 'pack'
        }
        // TERCEIRO: Fallback para mapeamento legado
        else if (LEGACY_PRODUCT_ID_MAPPING[productId]) {
          packMapping = LEGACY_PRODUCT_ID_MAPPING[productId]
          mappingType = 'legacy'
          console.log(`   ├─ [${requestId}] 📜 LEGACY encontrado: ${packMapping.packSlug}`)
        }
      }
    }
    
    // QUARTO: Fallback para detecção por nome
    if (mappingType === 'none') {
      console.log(`   ├─ [${requestId}] ⚠️ Product ID não mapeado, usando detecção por nome`)
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
        console.log(`   ├─ [${requestId}] Detecção por nome: ${packSlug} (${accessType})`)
      }
    }

    console.log(`   └─ [${requestId}] Tipo de mapeamento: ${mappingType}`)

    // Se não encontrou nenhum mapeamento, retornar erro
    if (mappingType !== 'promotion' && !packMapping) {
      console.log(`\n❌ [${requestId}] ERRO: Não foi possível determinar pack/promoção`)
      await logWebhook(supabase, payload, status, productId, email, 'error', mappingType, 'Could not determine pack/promotion from product')
      
      const duration = Date.now() - startTime
      console.log(`⏱️ [${requestId}] Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)
      
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

    // Handle paid status - activate pack access
    if (status === 'paid' || status === 'approved') {
      currentStep = 'processing_activation'
      console.log(`\n💳 [${requestId}] PROCESSANDO PAGAMENTO:`)
      console.log(`   ├─ Ação: Ativar Acesso ao Pack`)
      
      // Verificar abandoned_checkout
      if (productId) {
        const { data: abandonedCheckout, error: abandonedError } = await supabase
          .from('abandoned_checkouts')
          .select('id, abandoned_at')
          .eq('email', email)
          .eq('product_id', productId)
          .neq('remarketing_status', 'converted')
          .maybeSingle()

        if (!abandonedError && abandonedCheckout) {
          const abandonedAt = new Date(abandonedCheckout.abandoned_at)
          const now = new Date()
          const minutesSinceAbandonment = (now.getTime() - abandonedAt.getTime()) / (1000 * 60)
          
          if (minutesSinceAbandonment < 15) {
            await supabase.from('abandoned_checkouts').delete().eq('id', abandonedCheckout.id)
            console.log(`   ├─ 🗑️ Checkout rápido deletado (${minutesSinceAbandonment.toFixed(1)} min)`)
          } else {
            await supabase.from('abandoned_checkouts').update({ 
              remarketing_status: 'converted',
              updated_at: new Date().toISOString()
            }).eq('id', abandonedCheckout.id)
            console.log(`   ├─ ✅ Abandoned checkout convertido (${minutesSinceAbandonment.toFixed(1)} min)`)
          }
        }
      }
      
      let userId: string | null = null

      console.log(`\n👤 [${requestId}] PROCESSAMENTO DE USUÁRIO:`)
      console.log(`   ├─ Criando/buscando usuário...`)
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: email,
        email_confirm: true
      })

      if (createError) {
        if (createError.message?.includes('email') || createError.code === 'email_exists') {
          console.log(`   ├─ Usuário já existe, buscando...`)
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()
          
          if (profile) {
            userId = profile.id
            console.log(`   ├─ ✅ Encontrado via profiles: ${userId}`)
          } else {
            // Fallback: buscar via listUsers
            let foundUser = null
            let page = 1
            const perPage = 1000
            
            while (!foundUser) {
              const { data: usersData, error: fetchError } = await supabase.auth.admin.listUsers({
                page: page,
                perPage: perPage
              })
              
              if (fetchError) throw fetchError
              if (!usersData?.users || usersData.users.length === 0) break

              foundUser = usersData.users.find(u => u.email?.toLowerCase() === email)
              
              if (foundUser) {
                userId = foundUser.id
                console.log(`   ├─ ✅ Encontrado via listUsers (página ${page}): ${userId}`)
              } else if (usersData.users.length < perPage) {
                break
              } else {
                page++
              }
            }
            
            if (!userId) {
              throw new Error(`User with email ${email} exists but could not be found`)
            }
          }
        } else {
          throw createError
        }
      } else {
        userId = newUser.user.id
        console.log(`   ├─ ✅ Novo usuário criado: ${userId}`)
      }

      currentStep = 'upserting_profile'
      console.log(`\n💾 [${requestId}] OPERAÇÕES NO BANCO:`)
      console.log(`   ├─ Atualizando profile...`)
      
      // Upsert profile with name, phone and locale
      const userLocale = extractLocale(payload)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: clientName,
          phone: clientPhone,
          email: email,
          locale: userLocale,
          password_changed: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileError) {
        console.log(`   ├─ ⚠️ Erro no profile: ${profileError.message}`)
      } else {
        console.log(`   ├─ ✅ Profile atualizado`)
      }

      currentStep = 'processing_packs'
      
      // Processar com base no tipo de mapeamento
      let processedPacks: string[] = []
      const platform = fromApp ? 'app' : 'eventos'
      
      if (mappingType === 'promotion' && promotionMapping) {
        console.log(`\n🎁 [${requestId}] PROCESSANDO PROMOÇÃO: ${promotionMapping.promotionSlug}`)
        console.log(`   ├─ ${promotionMapping.items.length} packs incluídos`)
        
        for (const item of promotionMapping.items) {
          await processPackPurchase(
            supabase,
            userId!,
            item.packSlug,
            item.accessType,
            promotionMapping.hasBonusAccess,
            contractId,
            productName,
            platform,
            requestId
          )
          processedPacks.push(item.packSlug)
        }
      } else if (packMapping) {
        console.log(`\n📦 [${requestId}] PROCESSANDO PACK: ${packMapping.packSlug}`)
        
        await processPackPurchase(
          supabase,
          userId!,
          packMapping.packSlug,
          packMapping.accessType,
          packMapping.hasBonusAccess,
          contractId,
          productName,
          platform,
          requestId
        )
        processedPacks.push(packMapping.packSlug)
      }

      console.log(`   └─ Packs processados: ${processedPacks.join(', ')}`)

      // Enviar email de boas-vindas
      currentStep = 'sending_email'
      const packInfo = processedPacks.length > 1 
        ? `${processedPacks.length} Packs (Promoção)` 
        : packMapping?.packSlug || 'Pack Arcano'
      
      // Determinar se é ferramenta de IA
      const isFerramentaIA = packMapping?.isFerramentaIA || false
      
      await sendWelcomeEmail(supabase, email, clientName, packInfo, requestId, isFerramentaIA, userLocale)

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)

      const duration = Date.now() - startTime
      console.log(`\n✅ [${requestId}] WEBHOOK PROCESSADO COM SUCESSO`)
      console.log(`   ├─ Email: ${email}`)
      console.log(`   ├─ Ação: Acesso Ativado`)
      console.log(`   ├─ Mapeamento: ${mappingType}`)
      console.log(`   ├─ Packs: ${processedPacks.join(', ')}`)
      console.log(`   ├─ Platform: ${platform}`)
      console.log(`   └─ Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Pack access activated for ${email}`,
          packs: processedPacks,
          mapping_type: mappingType,
          platform
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle refunded/chargeback - deactivate pack access
    if (status === 'refunded' || status === 'chargeback') {
      currentStep = 'processing_deactivation'
      console.log(`\n🚫 [${requestId}] PROCESSANDO ${status.toUpperCase()}:`)
      console.log(`   ├─ Ação: Desativar Acesso`)
      
      if (status === 'chargeback') {
        await addToBlacklist(supabase, email, 'chargeback', requestId)
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      
      if (profile) {
        // Desativar todos os packs do usuário com este product_id (se tiver)
        const { data: purchases, error: fetchError } = await supabase
          .from('user_pack_purchases')
          .select('id, pack_slug')
          .eq('user_id', profile.id)
          .eq('is_active', true)
        
        if (!fetchError && purchases && purchases.length > 0) {
          // Desativar compras relacionadas a este produto
          if (packMapping) {
            const { error: updateError } = await supabase
              .from('user_pack_purchases')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('user_id', profile.id)
              .eq('pack_slug', packMapping.packSlug)

            if (updateError) {
              console.log(`   ├─ ❌ Erro desativando: ${updateError.message}`)
            } else {
              console.log(`   ├─ ✅ Pack desativado: ${packMapping.packSlug}`)
            }
          } else if (promotionMapping) {
            for (const item of promotionMapping.items) {
              const { error: updateError } = await supabase
                .from('user_pack_purchases')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('user_id', profile.id)
                .eq('pack_slug', item.packSlug)

              if (!updateError) {
                console.log(`   ├─ ✅ Pack desativado: ${item.packSlug}`)
              }
            }
          }
        }
      } else {
        console.log(`   ├─ ⚠️ Usuário não encontrado`)
      }

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)

      const duration = Date.now() - startTime
      console.log(`\n✅ [${requestId}] WEBHOOK PROCESSADO COM SUCESSO`)
      console.log(`   ├─ Email: ${email}`)
      console.log(`   ├─ Ação: Acesso Desativado`)
      console.log(`   ├─ Motivo: ${status}`)
      console.log(`   └─ Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)

      return new Response(
        JSON.stringify({ success: true, message: `Pack access deactivated for ${email}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle waiting_payment
    if (status === 'waiting_payment') {
      console.log(`\n💳 [${requestId}] AGUARDANDO PAGAMENTO:`)
      console.log(`   ├─ Salvando como abandoned checkout...`)
      
      const { data: existingAbandoned } = await supabase
        .from('abandoned_checkouts')
        .select('id')
        .eq('email', email)
        .eq('product_id', productId)
        .gte('abandoned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (!existingAbandoned) {
        await supabase.from('abandoned_checkouts').insert({
          email: email,
          name: clientName,
          phone: clientPhone,
          product_id: productId,
          product_name: productName,
          offer_name: offerName,
          offer_hash: offerHash,
          amount: saleAmount,
          checkout_link: payload.link_checkout || '',
          checkout_step: 0,
          remarketing_status: 'pending',
          platform: 'artes-eventos'
        })
        console.log(`   └─ ✅ Lead salvo`)
      } else {
        console.log(`   └─ ⏭️ Lead já existe`)
      }

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)
      
      const duration = Date.now() - startTime
      console.log(`\n⏱️ [${requestId}] Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)
      
      return new Response(
        JSON.stringify({ success: true, message: 'Waiting payment captured as abandoned checkout' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle other statuses
    if (status === 'canceled' || status === 'unpaid' || status === 'expired') {
      console.log(`\n📋 [${requestId}] STATUS ${status.toUpperCase()}: Apenas logado`)
      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)
      
      const duration = Date.now() - startTime
      console.log(`   └─ Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)
      
      return new Response(
        JSON.stringify({ success: true, message: `Webhook received with status: ${status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For other statuses
    console.log(`\n📋 [${requestId}] STATUS NÃO TRATADO: ${status}`)
    await logWebhook(supabase, payload, status, productId, email, 'skipped', mappingType)
    
    const duration = Date.now() - startTime
    console.log(`   └─ Tempo: ${duration}ms`)
    console.log(`${'='.repeat(70)}\n`)
    
    return new Response(
      JSON.stringify({ success: true, message: `Webhook received with status: ${status}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const errorStack = error instanceof Error ? error.stack : ''
    
    console.log(`\n❌ [${requestId}] ERRO NO WEBHOOK:`)
    console.log(`   ├─ Etapa: ${currentStep}`)
    console.log(`   ├─ Email: ${email || 'N/A'}`)
    console.log(`   ├─ Product ID: ${productId || 'N/A'}`)
    console.log(`   ├─ Status: ${status || 'N/A'}`)
    console.log(`   ├─ Erro: ${errorMessage}`)
    console.log(`   └─ Stack: ${errorStack?.split('\n')[0] || 'N/A'}`)
    
    await logWebhook(supabase, payload, status, productId, email, 'error', mappingType, `[${currentStep}] ${errorMessage}`)
    
    const duration = Date.now() - startTime
    console.log(`\n⏱️ [${requestId}] Tempo: ${duration}ms`)
    console.log(`${'='.repeat(70)}\n`)
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

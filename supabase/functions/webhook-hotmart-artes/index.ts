import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Eventos de compra aprovada da Hotmart
const APPROVED_EVENTS = [
  'PURCHASE_APPROVED',
  'PURCHASE_COMPLETE',
  'PURCHASE_PROTEST',
  'PURCHASE_REFUNDED', // Para cancelamento
]

// Eventos de cancelamento/reembolso
const CANCEL_EVENTS = [
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_CANCELED',
  'PURCHASE_EXPIRED',
]

// Mapeamento de Product ID Hotmart para pack e tipo de acesso
// TODO: Atualizar com os IDs reais da Hotmart
const HOTMART_PRODUCT_MAPPING: Record<string, {
  packSlug: string
  accessType: '6_meses' | '1_ano' | 'vitalicio'
  hasBonusAccess: boolean
  isFerramentaIA: boolean
}> = {
  // Upscaler Arcano - Versão Espanhol
  // O ID do produto será adicionado quando você configurar na Hotmart
  // Exemplo: 'PRODUTO_ID_HOTMART': { packSlug: 'upscaller-arcano', accessType: 'vitalicio', hasBonusAccess: true, isFerramentaIA: true }
}

interface HotmartWebhookPayload {
  event?: string
  data?: {
    buyer?: {
      email?: string
      name?: string
      phone?: string
      document?: string
    }
    product?: {
      id?: number | string
      name?: string
      has_co_production?: boolean
    }
    purchase?: {
      transaction?: string
      order_date?: string
      status?: string
      payment?: {
        type?: string
        installments_number?: number
      }
      offer?: {
        code?: string
        name?: string
      }
      approved_date?: string
      full_price?: {
        value?: number
        currency_code?: string
      }
      price?: {
        value?: number
        currency_code?: string
      }
    }
    subscription?: {
      subscriber_code?: string
      status?: string
      plan?: {
        id?: number
        name?: string
      }
    }
    commissions?: Array<{
      value?: number
      currency_code?: string
      source?: string
    }>
    producer?: {
      name?: string
    }
  }
  id?: string
  creation_date?: string
  version?: string
}

// Textos de email em espanhol
const emailTexts = {
  greeting: 'Hola',
  accessData: '📋 Datos de tu primer acceso:',
  email: 'Email',
  password: 'Contraseña',
  securityWarning: 'Por seguridad, deberás cambiar tu contraseña en el primer acceso.',
  clickButtonIA: '¡Haz clic en el botón de arriba para iniciar sesión y usar tu herramienta de IA!',
  copyrightIA: '© Herramientas IA Arcanas',
  important: 'Importante'
}

// Função para gerar request ID único
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

// Função para registrar log do webhook
async function logWebhook(
  supabase: any,
  payload: any,
  status: string | undefined,
  productId: number | string | undefined,
  email: string | undefined,
  result: 'success' | 'error' | 'skipped' | 'blacklisted' | 'cancelled',
  mappingType: string,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('webhook_logs').insert({
      payload,
      status,
      product_id: typeof productId === 'string' ? parseInt(productId) || null : productId,
      email,
      result,
      mapping_type: mappingType,
      error_message: errorMessage,
      utm_source: 'hotmart',
      from_app: false,
      platform: 'hotmart-es'
    })
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

// Send welcome email via SendPulse
async function sendWelcomeEmail(supabase: any, email: string, name: string, packInfo: string, requestId: string): Promise<void> {
  console.log(`\n📧 [${requestId}] EMAIL DE BOAS-VINDAS (ES):`)
  console.log(`   ├─ Destinatário: ${email}`)
  console.log(`   ├─ Nome: ${name || 'N/A'}`)
  console.log(`   ├─ Pack: ${packInfo}`)
  
  try {
    // Verificar se já enviou email para este email+pack nos últimos 5 minutos
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

    // Fetch template from database
    const { data: template } = await supabase
      .from('welcome_email_templates')
      .select('*')
      .eq('platform', 'ferramentas_ia')
      .eq('locale', 'es')
      .eq('is_active', true)
      .maybeSingle()

    console.log(`   ├─ Template: ${template?.id || 'default'} (ferramentas_ia, es)`)

    const templateContent = {
      heading: '¡Tu Herramienta de IA está Activada!',
      intro: '¡Tu compra fue confirmada con éxito! Ahora tienes acceso ilimitado a esta poderosa herramienta de Inteligencia Artificial.',
      button_text: 'Acceder a Mi Herramienta',
      footer: '¡Si tienes alguna duda, responde este email y te ayudaremos!'
    }
    
    if (template?.content) {
      try {
        Object.assign(templateContent, JSON.parse(template.content))
      } catch (e) {
        console.log(`   ├─ ⚠️ Erro parsing template, usando default`)
      }
    }

    const subject = template?.subject || '🤖 ¡Bienvenido! Tu Herramienta de IA está lista para usar!'
    const senderName = template?.sender_name || 'Herramientas IA Arcanas'
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'

    // Generate unique tracking ID
    const trackingId = crypto.randomUUID()
    console.log(`   ├─ Tracking ID: ${trackingId}`)

    // Build tracking URLs
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const openTrackingPixel = `${trackingBaseUrl}?id=${trackingId}&action=open`
    const platformUrl = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-es'
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

    // Build welcome email HTML
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
      <h1>🤖 ${templateContent.heading}</h1>
    </div>
    
    <p>${emailTexts.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p>
    
    <p>${templateContent.intro}</p>
    
    <div style="text-align: center;">
      <span class="pack-badge">✨ ${packInfo}</span>
    </div>
    
    <div class="credentials">
      <h3>${emailTexts.accessData}</h3>
      <p><strong>${emailTexts.email}:</strong> ${email}</p>
      <p><strong>${emailTexts.password}:</strong> <span class="highlight">${email}</span></p>
      <div class="warning">
        <p>⚠️ <strong>${emailTexts.important}:</strong> ${emailTexts.securityWarning}</p>
      </div>
    </div>
    
    <a href="${clickTrackingUrl}" class="cta-button">
      🚀 ${templateContent.button_text}
    </a>
    
    <p style="text-align: center; color: #666;">
      ${emailTexts.clickButtonIA}
    </p>
    
    <div class="footer">
      <p>${templateContent.footer}</p>
      <p style="margin-top: 8px;">${emailTexts.copyrightIA}</p>
    </div>
  </div>
  <img src="${openTrackingPixel}" width="1" height="1" style="display:none" alt="" />
</body>
</html>
`

    // Convert HTML to Base64
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
          text: `${templateContent.heading} Tu acceso está listo. Email: ${email}, Contraseña: ${email}. Accede: ${platformUrl}`,
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
      platform: 'ferramentas_ia',
      tracking_id: trackingId,
      template_used: template?.id || 'default',
      product_info: packInfo,
      status: result.result === true ? 'sent' : 'failed',
      error_message: result.result !== true ? JSON.stringify(result) : null,
      locale: 'es'
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

// Calcula data de expiração baseado no tipo de acesso
function calculateExpirationDate(accessType: string, startDate: Date = new Date()): Date | null {
  switch (accessType) {
    case '6_meses':
      return new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000)
    case '1_ano':
      return new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    case 'vitalicio':
      return null // Sem expiração
    default:
      return null
  }
}

Deno.serve(async (req) => {
  const requestId = generateRequestId()
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🔔 [${requestId}] WEBHOOK HOTMART ARTES (ES) - ${new Date().toISOString()}`)
  console.log(`${'='.repeat(60)}`)

  try {
    const payload: HotmartWebhookPayload = await req.json()
    
    const event = payload.event
    const buyer = payload.data?.buyer
    const product = payload.data?.product
    const purchase = payload.data?.purchase
    
    const email = buyer?.email?.toLowerCase()?.trim()
    const name = buyer?.name || ''
    const productId = product?.id?.toString()
    const productName = product?.name || 'Produto Hotmart'
    const transaction = purchase?.transaction
    const status = purchase?.status || event
    
    console.log(`📦 [${requestId}] DADOS DO WEBHOOK:`)
    console.log(`   ├─ Evento: ${event}`)
    console.log(`   ├─ Product ID: ${productId}`)
    console.log(`   ├─ Product Name: ${productName}`)
    console.log(`   ├─ Email: ${email}`)
    console.log(`   ├─ Nome: ${name}`)
    console.log(`   ├─ Transaction: ${transaction}`)
    console.log(`   ├─ Status: ${status}`)

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for cancel events
    if (event && CANCEL_EVENTS.includes(event)) {
      console.log(`\n🚫 [${requestId}] EVENTO DE CANCELAMENTO/REEMBOLSO`)
      
      if (email) {
        // Find user
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email)
        
        if (authUser) {
          // Deactivate access
          await supabase
            .from('user_pack_purchases')
            .update({ is_active: false })
            .eq('user_id', authUser.id)
            .eq('pack_slug', 'upscaller-arcano')
            .eq('platform', 'hotmart-es')
          
          console.log(`   └─ ✅ Acesso desativado para: ${email}`)
        }
      }
      
      await logWebhook(supabase, payload, status, productId, email, 'cancelled', 'hotmart_cancel')
      return new Response(JSON.stringify({ success: true, message: 'Cancellation processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if it's an approved purchase event
    if (!event || !APPROVED_EVENTS.includes(event) || event === 'PURCHASE_REFUNDED') {
      console.log(`\n⏭️ [${requestId}] Evento ignorado: ${event}`)
      await logWebhook(supabase, payload, status, productId, email, 'skipped', 'ignored_event')
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate required data
    if (!email) {
      console.log(`\n❌ [${requestId}] Email não fornecido`)
      await logWebhook(supabase, payload, status, productId, undefined, 'error', 'missing_email', 'Email not provided')
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check blacklist
    if (await isEmailBlacklisted(supabase, email)) {
      console.log(`\n🚫 [${requestId}] Email na blacklist: ${email}`)
      await logWebhook(supabase, payload, status, productId, email, 'blacklisted', 'blacklisted')
      return new Response(JSON.stringify({ success: true, message: 'Blocked email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get mapping from config or use default for Upscaler Arcano
    let mapping = productId ? HOTMART_PRODUCT_MAPPING[productId] : null
    
    // If no mapping found, assume it's Upscaler Arcano (since that's the only product for now)
    if (!mapping) {
      console.log(`   ├─ [${requestId}] ⚠️ Mapeamento não encontrado para Product ID: ${productId}`)
      console.log(`   ├─ [${requestId}] 🎯 Usando mapeamento padrão: Upscaler Arcano (vitalício)`)
      mapping = {
        packSlug: 'upscaller-arcano',
        accessType: 'vitalicio',
        hasBonusAccess: true,
        isFerramentaIA: true
      }
    }

    console.log(`\n🎯 [${requestId}] MAPEAMENTO:`)
    console.log(`   ├─ Pack Slug: ${mapping.packSlug}`)
    console.log(`   ├─ Access Type: ${mapping.accessType}`)
    console.log(`   ├─ Has Bonus: ${mapping.hasBonusAccess}`)
    console.log(`   ├─ Is Ferramenta IA: ${mapping.isFerramentaIA}`)

    // Check if user exists
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    let authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email)
    let isNewUser = false

    if (!authUser) {
      console.log(`\n👤 [${requestId}] Criando novo usuário...`)
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: email,
        email_confirm: true,
        user_metadata: { name }
      })

      if (createError) {
        console.error(`   └─ ❌ Erro ao criar usuário:`, createError)
        await logWebhook(supabase, payload, status, productId, email, 'error', 'user_creation_error', createError.message)
        return new Response(JSON.stringify({ error: 'Failed to create user' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      authUser = newUser.user
      isNewUser = true
      console.log(`   └─ ✅ Usuário criado: ${authUser?.id}`)
    } else {
      console.log(`\n👤 [${requestId}] Usuário existente: ${authUser.id}`)
    }

    const userId = authUser!.id

    // Create/update profile with Spanish locale
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      name,
      locale: 'es',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })

    console.log(`   ├─ ✅ Profile atualizado (locale: es)`)

    // Check for existing pack access
    const { data: existingPack } = await supabase
      .from('user_pack_purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('pack_slug', mapping.packSlug)
      .eq('platform', 'hotmart-es')
      .maybeSingle()

    if (existingPack) {
      // Update existing
      const expiresAt = calculateExpirationDate(mapping.accessType)
      
      await supabase
        .from('user_pack_purchases')
        .update({
          is_active: true,
          access_type: mapping.accessType,
          has_bonus_access: mapping.hasBonusAccess,
          expires_at: expiresAt?.toISOString() || null,
          hotmart_transaction: transaction,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPack.id)

      console.log(`   ├─ ✅ Acesso atualizado (existente)`)
    } else {
      // Create new pack access
      const expiresAt = calculateExpirationDate(mapping.accessType)
      
      await supabase.from('user_pack_purchases').insert({
        user_id: userId,
        pack_slug: mapping.packSlug,
        access_type: mapping.accessType,
        has_bonus_access: mapping.hasBonusAccess,
        is_active: true,
        expires_at: expiresAt?.toISOString() || null,
        purchased_at: new Date().toISOString(),
        platform: 'hotmart-es',
        hotmart_product_id: productId ? parseInt(productId) : null,
        hotmart_transaction: transaction
      })

      console.log(`   ├─ ✅ Novo acesso criado`)
    }

    // Send welcome email for new users
    if (isNewUser) {
      await sendWelcomeEmail(supabase, email, name, productName, requestId)
    }

    // Log success
    await logWebhook(supabase, payload, status, productId, email, 'success', 'hotmart_purchase')

    console.log(`\n✅ [${requestId}] WEBHOOK PROCESSADO COM SUCESSO`)
    console.log(`${'='.repeat(60)}\n`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Access granted',
      userId,
      packSlug: mapping.packSlug,
      accessType: mapping.accessType,
      isNewUser
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO:`, error)
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

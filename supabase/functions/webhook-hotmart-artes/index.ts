/**
 * ⚠️ ATENÇÃO - REGRA CRÍTICA DO PROJETO ⚠️
 * 
 * NÃO FAZER NENHUMA MIGRAÇÃO NESTE ARQUIVO:
 * - NÃO mudar para Deno.serve()
 * - NÃO alterar imports (std, npm:, etc)
 * - NÃO "modernizar" ou "atualizar" padrões
 * 
 * Qualquer alteração de padrão requer autorização EXPLÍCITA.
 * Regras completas em: .lovable/RULES.md
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Eventos de compra aprovada da Hotmart
const APPROVED_EVENTS = [
  'PURCHASE_APPROVED',
  'PURCHASE_COMPLETE',
]

// Eventos de cancelamento/reembolso/suspensão
const CANCEL_EVENTS = [
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_CANCELED',
  'PURCHASE_EXPIRED',
  'PURCHASE_PROTEST',
  'PURCHASE_DELAYED',
]

// Interface para mapeamento de produto
interface ProductMapping {
  packSlug: string
  accessType: '6_meses' | '1_ano' | 'vitalicio'
  hasBonusAccess: boolean
  isFerramentaIA: boolean
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

// Função para buscar mapeamento de produto Hotmart do banco de dados
async function findHotmartProductMapping(supabase: any, productId: string, requestId: string): Promise<ProductMapping | null> {
  console.log(`   ├─ [${requestId}] 🔍 Buscando pack para Hotmart Product ID: ${productId}`)
  
  try {
    const { data: packs, error } = await supabase
      .from('artes_packs')
      .select('slug, type, tool_versions')
    
    if (error) {
      console.error(`   ├─ [${requestId}] ❌ Erro buscando packs:`, error)
      return null
    }

    for (const pack of packs || []) {
      const isFerramentaIA = pack.type === 'ferramentas_ia'
      
      if (pack.tool_versions && Array.isArray(pack.tool_versions)) {
        for (const version of pack.tool_versions) {
          if (version.webhook?.hotmart_product_id_vitalicio === productId) {
            console.log(`   ├─ [${requestId}] ✅ PACK encontrado: ${pack.slug} (vitalicio) via tool_versions [Hotmart]`)
            return { 
              packSlug: pack.slug, 
              accessType: 'vitalicio', 
              hasBonusAccess: true, 
              isFerramentaIA 
            }
          }
        }
      }
    }

    console.log(`   ├─ [${requestId}] ⚠️ Nenhum pack encontrado para Hotmart Product ID: ${productId}`)
    return null
  } catch (e) {
    console.error(`   ├─ [${requestId}] ❌ Exceção buscando packs:`, e)
    return null
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

// Calcula data de expiração baseado no tipo de acesso
function calculateExpirationDate(accessType: string, startDate: Date = new Date()): Date | null {
  switch (accessType) {
    case '6_meses':
      return new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000)
    case '1_ano':
      return new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    case 'vitalicio':
      return null
    default:
      return null
  }
}

// Send welcome email via SendPulse (background task - não bloqueia)
// isNewUser: true = mostrar credenciais, false = email sem senha (cliente antigo)
async function sendWelcomeEmail(
  supabase: any, 
  email: string, 
  name: string, 
  packInfo: string, 
  requestId: string,
  transaction: string | undefined,
  isNewUser: boolean = true
): Promise<void> {
  console.log(`\n📧 [${requestId}] EMAIL DE BOAS-VINDAS (ES):`)
  console.log(`   ├─ Destinatário: ${email}`)
  console.log(`   ├─ Nome: ${name || 'N/A'}`)
  console.log(`   ├─ Pack: ${packInfo}`)
  console.log(`   ├─ Cliente: ${isNewUser ? 'NOVO (com senha)' : 'ANTIGO (sem senha)'}`)
  console.log(`   └─ Transaction: ${transaction || 'N/A'}`)
  
  try {
    // DEDUPLICAÇÃO POR TRANSACTION - 1 email por compra
    if (transaction) {
      const { data: existingByTx } = await supabase
        .from('welcome_email_logs')
        .select('id, sent_at')
        .eq('product_info', `Hotmart:${transaction}`)
        .eq('status', 'sent')
        .maybeSingle()
      
      if (existingByTx) {
        console.log(`   ⏭️ Email já enviado para transaction ${transaction} - IGNORANDO`)
        return
      }
    }
    
    // Verificar se já enviou email para este email nos últimos 5 minutos (fallback)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentEmail } = await supabase
      .from('welcome_email_logs')
      .select('id, sent_at')
      .eq('email', email)
      .eq('status', 'sent')
      .gte('sent_at', fiveMinutesAgo)
      .maybeSingle()
    
    if (recentEmail) {
      const secondsAgo = Math.round((Date.now() - new Date(recentEmail.sent_at).getTime()) / 1000)
      console.log(`   ⏭️ Email já enviado há ${secondsAgo}s - IGNORANDO duplicata`)
      return
    }
    
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    
    if (!clientId || !clientSecret) {
      console.log(`   ⚠️ SendPulse não configurado, email não enviado`)
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
      footer: '¡Si tienes alguna duda, responde este email y te ayudaremos!',
      heading_returning: '🎉 ¡Compra Confirmada!',
      intro_returning: 'Tu compra fue confirmada exitosamente. Ya tienes acceso en tu cuenta.',
      access_note: 'Usa tu email y contraseña actuales para ingresar.',
      forgot_password: '¿Olvidaste tu contraseña?'
    }
    
    if (template?.content) {
      try {
        Object.assign(templateContent, JSON.parse(template.content))
      } catch (e) {
        console.log(`   ├─ ⚠️ Erro parsing template, usando default`)
      }
    }

    // Usar heading diferente para cliente novo vs antigo
    const heading = isNewUser ? templateContent.heading : templateContent.heading_returning
    const intro = isNewUser ? templateContent.intro : templateContent.intro_returning

    const subject = template?.subject || '🤖 ¡Bienvenido! Tu Herramienta de IA está lista para usar!'
    const senderName = template?.sender_name || 'Herramientas IA Arcanas'
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'

    const trackingId = crypto.randomUUID()
    console.log(`   ├─ Tracking ID: ${trackingId}`)

    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const openTrackingPixel = `${trackingBaseUrl}?id=${trackingId}&action=open`
    const platformUrl = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo'
    const clickTrackingUrl = `${trackingBaseUrl}?id=${trackingId}&action=click&redirect=${encodeURIComponent(platformUrl)}`

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
      console.log(`   ❌ Falha ao obter token SendPulse`)
      // Log failure
      await supabase.from('welcome_email_logs').insert({
        email,
        name,
        platform: 'ferramentas_ia',
        status: 'failed',
        error_message: 'Falha ao obter token SendPulse',
        product_info: transaction ? `Hotmart:${transaction}` : packInfo,
        locale: 'es'
      })
      return
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Gerar HTML baseado em se é cliente novo ou antigo
    const credentialsSection = isNewUser ? `
    <div class="credentials">
      <h3>${emailTexts.accessData}</h3>
      <p><strong>${emailTexts.email}:</strong> ${email}</p>
      <p><strong>${emailTexts.password}:</strong> <span class="highlight">${email}</span></p>
      <div class="warning">
        <p>⚠️ <strong>${emailTexts.important}:</strong> ${emailTexts.securityWarning}</p>
      </div>
    </div>
    ` : `
    <div class="info-box">
      <p>${templateContent.access_note}</p>
    </div>
    `

    const forgotPasswordSection = !isNewUser ? `
    <p style="text-align:center;color:#666;font-size:13px;">
      ${templateContent.forgot_password} 
      <a href="https://arcanoapp.voxvisual.com.br/forgot-password" style="color:#d4af37;">Recuperar aquí</a>
    </p>
    ` : ''

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
    .info-box { background: #e0f2fe; border: 1px solid #38bdf8; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .info-box p { color: #0369a1; margin: 0; }
    .pack-badge { background: #d4af37; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
    .footer { color: #666; font-size: 13px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>${isNewUser ? '🤖' : '🎉'} ${heading}</h1>
    </div>
    
    <p>${emailTexts.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p>
    
    <p>${intro}</p>
    
    <div style="text-align: center;">
      <span class="pack-badge">✨ ${packInfo}</span>
    </div>
    
    ${credentialsSection}
    
    <a href="${clickTrackingUrl}" class="cta-button">
      🚀 ${templateContent.button_text}
    </a>
    
    <p style="text-align: center; color: #666;">
      ${emailTexts.clickButtonIA}
    </p>
    
    ${forgotPasswordSection}
    
    <div class="footer">
      <p>${templateContent.footer}</p>
      <p style="margin-top: 8px;">${emailTexts.copyrightIA}</p>
    </div>
  </div>
  <img src="${openTrackingPixel}" width="1" height="1" style="display:none" alt="" />
</body>
</html>
`

    const htmlBase64 = btoa(unescape(encodeURIComponent(welcomeHtml)))

    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        email: {
          html: htmlBase64,
          text: `${heading} Tu acceso está listo. Email: ${email}${isNewUser ? `, Contraseña: ${email}` : ''}. Accede: ${platformUrl}`,
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
    
    // Log com product_info incluindo transaction para deduplicação
    await supabase.from('welcome_email_logs').insert({
      email,
      name,
      platform: 'ferramentas_ia',
      tracking_id: trackingId,
      template_used: template?.id || 'default',
      product_info: transaction ? `Hotmart:${transaction}` : packInfo,
      status: result.result === true ? 'sent' : 'failed',
      error_message: result.result !== true ? JSON.stringify(result) : null,
      locale: 'es',
      email_content: welcomeHtml // Salvar HTML para prévia
    })
    
    if (result.result === true) {
      console.log(`   ✅ Email enviado com sucesso`)
    } else {
      console.log(`   ❌ Falha no envio: ${JSON.stringify(result)}`)
    }
  } catch (error) {
    console.log(`   ❌ Erro ao enviar email: ${error}`)
    // Log failure
    try {
      await supabase.from('welcome_email_logs').insert({
        email,
        name,
        platform: 'ferramentas_ia',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
        product_info: transaction ? `Hotmart:${transaction}` : packInfo,
        locale: 'es'
      })
    } catch {
      // ignore log error
    }
  }
}

// ============================================================================
// PROCESSAMENTO PRINCIPAL
// ============================================================================

async function processHotmartWebhook(
  supabase: any,
  payload: HotmartWebhookPayload,
  logId: string,
  requestId: string
): Promise<void> {
  const event = payload.event
  const buyer = payload.data?.buyer
  const product = payload.data?.product
  const purchase = payload.data?.purchase
  
  const email = buyer?.email?.toLowerCase()?.trim()
  const name = buyer?.name || ''
  const productId = product?.id?.toString()
  const productName = product?.name || 'Produto Hotmart'
  const transaction = purchase?.transaction

  try {
    // Handle cancel events - OTIMIZADO: primeiro por transaction, depois por email
    if (event && CANCEL_EVENTS.includes(event)) {
      console.log(`\n🚫 [${requestId}] PROCESSANDO CANCELAMENTO/REEMBOLSO`)
      
      // PRIMEIRO: Tentar desativar por hotmart_transaction (rápido, indexado)
      if (transaction) {
        const { data: purchaseByTx, error: txError } = await supabase
          .from('user_pack_purchases')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('hotmart_transaction', transaction)
          .eq('platform', 'hotmart-es')
          .select('id')
        
        if (!txError && purchaseByTx?.length > 0) {
          console.log(`   ├─ ✅ Acesso desativado via transaction: ${transaction}`)
          await supabase.from('webhook_logs').update({ 
            result: 'success', 
            error_message: null 
          }).eq('id', logId)
          return
        }
      }
      
      // FALLBACK: buscar por email (mais lento)
      if (email) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()
        
        if (profile?.id) {
          await supabase
            .from('user_pack_purchases')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', profile.id)
            .eq('platform', 'hotmart-es')
          
          console.log(`   └─ ✅ Acesso desativado via email: ${email}`)
        }
      }
      
      await supabase.from('webhook_logs').update({ 
        result: 'success', 
        error_message: null 
      }).eq('id', logId)
      return
    }

    // Validar dados obrigatórios
    if (!email) {
      console.log(`\n❌ [${requestId}] Email não fornecido`)
      await supabase.from('webhook_logs').update({ 
        result: 'failed', 
        error_message: 'Email não fornecido' 
      }).eq('id', logId)
      return
    }

    // Check blacklist
    if (await isEmailBlacklisted(supabase, email)) {
      console.log(`\n🚫 [${requestId}] Email na blacklist: ${email}`)
      await supabase.from('webhook_logs').update({ 
        result: 'blocked', 
        error_message: 'Email na blacklist' 
      }).eq('id', logId)
      return
    }

    // Buscar mapeamento
    let mapping: ProductMapping | null = null
    
    if (productId) {
      mapping = await findHotmartProductMapping(supabase, productId, requestId)
    }
    
    if (!mapping) {
      console.log(`   ├─ [${requestId}] ⚠️ Usando mapeamento padrão: Upscaler Arcano (vitalício)`)
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

    // Criar/buscar usuário
    let authUser: any = null
    let isNewUser = false

    console.log(`\n👤 [${requestId}] Processando usuário: ${email}`)

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: email,
      email_confirm: true,
      user_metadata: { name }
    })

    if (createError) {
      const isEmailExists = createError.code === 'email_exists' || 
                            createError.message?.includes('already been registered') ||
                            createError.message?.includes('already exists')
      
      if (isEmailExists) {
        console.log(`   ├─ ⚠️ Email já existe, buscando usuário...`)
        
        // Buscar via profiles (indexado agora!)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()
        
        if (profile?.id) {
          console.log(`   ├─ ✅ Encontrado via profiles: ${profile.id}`)
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
          authUser = user
        }
        
        // Fallback para listUsers paginado
        if (!authUser) {
          console.log(`   ├─ 🔍 Buscando em auth.users (paginado)...`)
          let page = 1
          const perPage = 1000
          
          while (!authUser && page <= 10) {
            const { data: usersPage } = await supabase.auth.admin.listUsers({
              page,
              perPage
            })
            
            if (!usersPage?.users?.length) break
            
            authUser = usersPage.users.find((u: any) => u.email?.toLowerCase() === email)
            if (authUser) {
              console.log(`   ├─ ✅ Encontrado na página ${page}: ${authUser.id}`)
            }
            page++
          }
        }
        
        if (!authUser) {
          console.error(`   └─ ❌ Usuário não encontrado após busca exaustiva`)
          await supabase.from('webhook_logs').update({ 
            result: 'failed', 
            error_message: 'Usuário existe mas não foi encontrado' 
          }).eq('id', logId)
          return
        }
      } else {
        console.error(`   └─ ❌ Erro ao criar usuário:`, createError)
        await supabase.from('webhook_logs').update({ 
          result: 'failed', 
          error_message: `Erro criar usuário: ${createError.message}` 
        }).eq('id', logId)
        return
      }
    } else {
      authUser = newUser.user
      isNewUser = true
      console.log(`   └─ ✅ Novo usuário criado: ${authUser?.id}`)
    }

    const userId = authUser!.id

    // Create/update profile
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

    // Marcar como success ANTES do email (email é "nice to have") + limpar payload (economizar espaço)
    await supabase.from('webhook_logs').update({ 
      result: 'success', 
      error_message: null,
      payload: {} // Limpar payload para sucesso (economiza espaço)
    }).eq('id', logId)

    // Enviar email de boas-vindas (em try/catch separado)
    // SKIP email for Upscaler Arcano (vitalício) - requested by admin
    const isUpscalerArcano = mapping.packSlug === 'upscaller-arcano'
    if (isUpscalerArcano) {
      console.log(`   ├─ ⏭️ Email de boas-vindas PULADO (Upscaler Arcano vitalício)`)
    } else {
      // Agora enviamos para TODOS: novos, recompras e reativações
      // A diferença é que clientes antigos NÃO recebem a senha no email
      const wasInactive = existingPack && !existingPack.is_active
      const isReturningCustomer = !isNewUser && (existingPack || wasInactive)
      const shouldSendEmail = isNewUser || !existingPack || wasInactive

      if (shouldSendEmail) {
        console.log(`   ├─ 📧 Enviando email de boas-vindas...`)
        console.log(`   ├─ Tipo: ${isNewUser ? 'NOVO (com senha)' : 'ANTIGO (sem senha)'}`)
        try {
          // Passar transaction para deduplicação e isNewUser para decidir se mostra senha
          await sendWelcomeEmail(supabase, email, name, productName, requestId, transaction, !isReturningCustomer)
        } catch (emailError) {
          console.log(`   ├─ ⚠️ Falha no email (acesso já liberado): ${emailError}`)
        }
      }
    }

    console.log(`\n✅ [${requestId}] PROCESSAMENTO BACKGROUND CONCLUÍDO`)

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO NO PROCESSAMENTO:`, error)
    // Manter payload completo para falhas (debug)
    await supabase.from('webhook_logs').update({ 
      result: 'failed', 
      error_message: error instanceof Error ? error.message : 'Erro desconhecido' 
    }).eq('id', logId)
  }
}

// ============================================================================
// HANDLER PRINCIPAL - ACK RÁPIDO + BACKGROUND PROCESSING
// ============================================================================
serve(async (req) => {
  const requestId = generateRequestId()
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🔔 [${requestId}] WEBHOOK HOTMART ARTES (ES) - ${new Date().toISOString()}`)
  console.log(`${'='.repeat(60)}`)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // PASSO 1: Parse do payload (rápido)
    const payload: HotmartWebhookPayload = await req.json()
    
    const event = payload.event
    const buyer = payload.data?.buyer
    const product = payload.data?.product
    const purchase = payload.data?.purchase
    
    const email = buyer?.email?.toLowerCase()?.trim()
    const productId = product?.id?.toString()
    const transaction = purchase?.transaction
    const status = purchase?.status || event

    console.log(`📦 [${requestId}] DADOS RÁPIDOS:`)
    console.log(`   ├─ Evento: ${event}`)
    console.log(`   ├─ Email: ${email || 'N/A'}`)
    console.log(`   ├─ Product ID: ${productId}`)
    console.log(`   └─ Transaction: ${transaction}`)

    // Ignorar eventos não relevantes ANTES de gravar log
    if (event && !APPROVED_EVENTS.includes(event) && !CANCEL_EVENTS.includes(event)) {
      console.log(`\n⏭️ [${requestId}] Evento ignorado: ${event}`)
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // PASSO 2: Limpeza automática de logs > 30 dias (async, não bloqueia)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    Promise.resolve(
      supabase.from('webhook_logs')
        .delete()
        .lt('received_at', thirtyDaysAgo)
        .limit(100)
    ).then(() => console.log(`   🧹 Limpeza automática executada`))
     .catch(() => {}) // Silenciar erros de limpeza

    // PASSO 3: Gravar em webhook_logs (durável - prova de recebimento)
    const hotmartAmount = payload.data?.purchase?.price?.value || payload.data?.purchase?.full_price?.value || null
    const { data: logEntry, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        payload,
        platform: 'hotmart-es',
        email: email || null,
        product_id: productId ? parseInt(productId) : null,
        status: event,
        result: 'received',
        amount: hotmartAmount,
        product_name: payload.data?.product?.name || null,
        payment_method: payload.data?.purchase?.payment?.type || null
      })
      .select('id')
      .single()

    if (logError || !logEntry) {
      // Se falhar gravação, retornar 500 para Hotmart tentar novamente
      console.error(`❌ [${requestId}] Falha ao gravar webhook_logs:`, logError)
      return new Response(JSON.stringify({ error: 'Failed to log webhook' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const logId = logEntry.id
    console.log(`   ✅ Log criado: ${logId}`)

    // PASSO 3: Processar webhook
    await processHotmartWebhook(supabase, payload, logId, requestId)

    // PASSO 4: Responder 200
    console.log(`\n🚀 [${requestId}] ACK RÁPIDO - Processamento agendado em background`)
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook received, processing in background',
      logId,
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO NO PARSE:`, error)
    
    return new Response(JSON.stringify({ 
      error: 'Invalid payload',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

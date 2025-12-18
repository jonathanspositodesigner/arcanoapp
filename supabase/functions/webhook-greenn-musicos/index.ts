import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeamento de Product ID para tipo de plano
const PRODUCT_ID_TO_PLAN: Record<number, 'basico' | 'pro' | 'unlimited'> = {
  150707: 'basico',
  150732: 'pro',
  150739: 'unlimited'
}

interface GreennMusicosWebhookPayload {
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
  lead?: {
    email?: string
    name?: string
    cellphone?: string
    cpf?: string
    step?: number
  }
  link_checkout?: string
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
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from('webhook_logs').insert({
      payload,
      status,
      product_id: productId,
      email,
      result,
      mapping_type: mappingType,
      error_message: errorMessage,
      platform: 'musicos'
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

// Função para enviar email de boas-vindas
async function sendWelcomeEmail(supabase: any, email: string, name: string, planInfo: string, requestId: string): Promise<void> {
  console.log(`\n📧 [${requestId}] EMAIL DE BOAS-VINDAS:`)
  console.log(`   ├─ Destinatário: ${email}`)
  console.log(`   ├─ Nome: ${name || 'N/A'}`)
  console.log(`   ├─ Plano: ${planInfo}`)
  
  try {
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
      .eq('platform', 'musicos')
      .eq('is_active', true)
      .maybeSingle()

    console.log(`   ├─ Template: ${template?.id || 'default'}`)

    // Parse template content
    let templateContent = {
      heading: 'Bem-vindo à Biblioteca de Artes para Músicos!',
      intro: 'Sua compra foi confirmada com sucesso! Agora você tem acesso à nossa biblioteca completa de artes para músicos.',
      button_text: 'Acessar Plataforma',
      footer: 'Se tiver qualquer dúvida, responda este email que iremos te ajudar!'
    }
    
    if (template?.content) {
      try {
        templateContent = JSON.parse(template.content)
      } catch (e) {
        console.log(`   ├─ ⚠️ Erro parsing template, usando default`)
      }
    }

    const subject = template?.subject || '🎵 Bem-vindo à Biblioteca de Artes para Músicos - Seu acesso está pronto!'
    const senderName = template?.sender_name || 'Biblioteca de Artes Músicos'
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'

    // Generate unique tracking ID
    const trackingId = crypto.randomUUID()
    console.log(`   ├─ Tracking ID: ${trackingId}`)

    // Build tracking URLs
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const openTrackingPixel = `${trackingBaseUrl}?id=${trackingId}&action=open`
    const platformUrl = 'https://arcanolab.voxvisual.com.br/login-artes-musicos'
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
    h1 { color: #06b6d4; text-align: center; margin: 0 0 20px 0; font-size: 28px; }
    p { color: #333; line-height: 1.6; margin: 0 0 16px 0; }
    .cta-button { display: block; background: linear-gradient(135deg, #06b6d4, #ec4899); color: white; text-align: center; padding: 18px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 30px 0; }
    .credentials { background: linear-gradient(135deg, #ecfeff, #fce7f3); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #a5f3fc; }
    .credentials h3 { margin: 0 0 16px 0; color: #0891b2; font-size: 18px; }
    .credentials p { margin: 8px 0; color: #333; }
    .highlight { background: #fff; padding: 10px 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 15px; border: 1px solid #e5e7eb; display: inline-block; }
    .warning { background: #fce7f3; border: 1px solid #ec4899; border-radius: 8px; padding: 12px 16px; margin-top: 16px; }
    .warning p { color: #9d174d; font-size: 13px; margin: 0; }
    .plan-badge { background: linear-gradient(135deg, #06b6d4, #ec4899); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
    .footer { color: #666; font-size: 13px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🎵 ${templateContent.heading}</h1>
    </div>
    
    <p>Olá${name ? ` <strong>${name}</strong>` : ''}!</p>
    
    <p>${templateContent.intro}</p>
    
    <div style="text-align: center;">
      <span class="plan-badge">✨ ${planInfo}</span>
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
      Clique no botão acima para fazer seu primeiro login e começar a explorar artes incríveis para músicos!
    </p>
    
    <div class="footer">
      <p>${templateContent.footer}</p>
      <p style="margin-top: 8px;">© Biblioteca de Artes para Músicos</p>
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
      platform: 'musicos',
      tracking_id: trackingId,
      template_used: template?.id || 'default',
      product_info: planInfo,
      status: result.result === true ? 'sent' : 'failed',
      error_message: result.result !== true ? JSON.stringify(result) : null
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

// Função para detectar plano pelo Product ID da Greenn
function detectPlanFromProductId(productId: number | undefined, requestId: string): 'basico' | 'pro' | 'unlimited' {
  if (!productId) {
    console.log(`   ├─ [${requestId}] ⚠️ Product ID não fornecido, usando 'basico'`)
    return 'basico'
  }
  
  const planType = PRODUCT_ID_TO_PLAN[productId]
  
  if (!planType) {
    console.log(`   ├─ [${requestId}] ⚠️ Product ID ${productId} não mapeado, usando 'basico'`)
    return 'basico'
  }
  
  console.log(`   ├─ [${requestId}] ✅ Product ID ${productId} → ${planType}`)
  return planType
}

// Função para determinar o billing period baseado nos dias
function getBillingPeriodFromDays(days: number): 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'vitalicio' {
  if (days <= 35) return 'mensal'
  if (days <= 100) return 'trimestral'
  if (days <= 200) return 'semestral'
  if (days <= 400) return 'anual'
  return 'vitalicio'
}

// Função para calcular data de expiração
function calculateExpirationDate(expirationDays: number): Date {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expirationDays)
  return expiresAt
}

Deno.serve(async (req) => {
  const startTime = Date.now()
  const requestId = crypto.randomUUID().slice(0, 8)
  const timestamp = new Date().toISOString()
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`\n${'='.repeat(70)}`)
  console.log(`🚀 [${requestId}] WEBHOOK MÚSICOS RECEBIDO - ${timestamp}`)
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
  let mappingType: 'product_period' | 'name_detection' | 'none' = 'none'
  let currentStep = 'parsing_payload'

  try {
    payload = await req.json()

    // Detectar evento de checkout abandonado
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

      console.log(`\n📋 [${requestId}] CHECKOUT ABANDONADO:`)
      console.log(`   ├─ Email: ${leadEmail || 'N/A'}`)
      console.log(`   ├─ Nome: ${leadName || 'N/A'}`)
      console.log(`   ├─ Telefone: ${leadPhone || 'N/A'}`)
      console.log(`   ├─ Step: ${checkoutStep}`)
      console.log(`   ├─ Product ID: ${productId}`)
      console.log(`   ├─ Product: ${productName}`)
      console.log(`   └─ Amount: R$ ${amount}`)
      
      if (leadEmail) {
        // Verificar se o lead já existe nas últimas 24h
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
            platform: 'musicos'
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

      await logWebhook(supabase, payload, 'abandoned', productId, leadEmail, 'success', 'lead')
      
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
    console.log(`   └─ Contract ID: ${contractId || 'N/A'}`)
    
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

    currentStep = 'detecting_plan'
    console.log(`\n🔍 [${requestId}] DETECÇÃO DE PLANO:`)
    
    // Usar product.period da Greenn para determinar duração dinamicamente
    const productPeriod = payload.product?.period
    
    // Detectar tipo de plano pelo Product ID
    const planType = detectPlanFromProductId(productId, requestId)
    
    // Usar period da Greenn diretamente (padrão: 30 dias se não vier)
    const expirationDays = productPeriod && productPeriod > 0 ? productPeriod : 30
    const billingPeriod = getBillingPeriodFromDays(expirationDays)
    
    mappingType = productPeriod ? 'product_period' : 'name_detection'
    
    console.log(`   ├─ Product Period (Greenn): ${productPeriod || 'N/A'} dias`)
    console.log(`   ├─ Plano: ${planType}`)
    console.log(`   ├─ Billing Period: ${billingPeriod}`)
    console.log(`   └─ Dias até expiração: ${expirationDays}`)

    // Handle paid status - activate subscription
    if (status === 'paid' || status === 'approved') {
      currentStep = 'processing_activation'
      console.log(`\n💳 [${requestId}] PROCESSANDO PAGAMENTO:`)
      console.log(`   ├─ Ação: Ativar Assinatura`)
      
      // Verificar abandoned_checkout
      if (productId) {
        const { data: abandonedCheckout } = await supabase
          .from('abandoned_checkouts')
          .select('id, abandoned_at')
          .eq('email', email)
          .eq('product_id', productId)
          .neq('remarketing_status', 'converted')
          .maybeSingle()

        if (abandonedCheckout) {
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
      
      // Upsert profile
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
        console.log(`   ├─ ⚠️ Erro no profile: ${profileError.message}`)
      } else {
        console.log(`   ├─ ✅ Profile atualizado`)
      }

      currentStep = 'updating_subscription'
      
      // Calcular expiração
      const expiresAt = calculateExpirationDate(expirationDays)

      // Verificar assinatura existente
      const { data: existingSubscription } = await supabase
        .from('premium_musicos_users')
        .select('id, expires_at, plan_type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (existingSubscription) {
        console.log(`   ├─ Assinatura existente, atualizando...`)
        
        // Se ainda tiver tempo, adicionar ao tempo existente
        let newExpiresAt = expiresAt
        if (existingSubscription.expires_at) {
          const currentExpires = new Date(existingSubscription.expires_at)
          const now = new Date()
          
          if (currentExpires > now) {
            newExpiresAt = new Date(currentExpires)
            newExpiresAt.setDate(newExpiresAt.getDate() + expirationDays)
            console.log(`   ├─ Estendendo: ${currentExpires.toISOString()} → ${newExpiresAt.toISOString()}`)
          }
        }

        const { error: updateError } = await supabase
          .from('premium_musicos_users')
          .update({
            plan_type: planType,
            billing_period: billingPeriod,
            expires_at: newExpiresAt.toISOString(),
            greenn_contract_id: contractId,
            greenn_product_id: productId,
            subscribed_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id)

        if (updateError) {
          console.log(`   ├─ ❌ Erro atualizando: ${updateError.message}`)
          throw updateError
        }
        
        console.log(`   ├─ ✅ Assinatura ATUALIZADA`)
      } else {
        console.log(`   ├─ Criando nova assinatura...`)
        
        const { error: insertError } = await supabase
          .from('premium_musicos_users')
          .insert({
            user_id: userId,
            plan_type: planType,
            billing_period: billingPeriod,
            is_active: true,
            expires_at: expiresAt.toISOString(),
            greenn_contract_id: contractId,
            greenn_product_id: productId,
            subscribed_at: new Date().toISOString(),
          })

        if (insertError) {
          console.log(`   ├─ ❌ Erro inserindo: ${insertError.message}`)
          throw insertError
        }
        
        console.log(`   ├─ ✅ Assinatura CRIADA`)
      }

      console.log(`   └─ Premium: plan=${planType}, period=${billingPeriod}, expires=${expiresAt.toISOString()}`)

      // Enviar email de boas-vindas
      currentStep = 'sending_email'
      await sendWelcomeEmail(supabase, email, clientName, `Plano ${planType.toUpperCase()} (${billingPeriod})`, requestId)

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)

      const duration = Date.now() - startTime
      console.log(`\n✅ [${requestId}] WEBHOOK PROCESSADO COM SUCESSO`)
      console.log(`   ├─ Email: ${email}`)
      console.log(`   ├─ Ação: Assinatura Ativada`)
      console.log(`   ├─ Plano: ${planType} (${billingPeriod})`)
      console.log(`   ├─ Expira: ${expiresAt.toISOString()}`)
      console.log(`   └─ Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Subscription activated for ${email}`,
          plan_type: planType,
          billing_period: billingPeriod,
          expires_at: expiresAt.toISOString(),
          mapped_by: mappingType
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle refunded/chargeback - deactivate subscription
    if (status === 'refunded' || status === 'chargeback') {
      currentStep = 'processing_deactivation'
      console.log(`\n🚫 [${requestId}] PROCESSANDO ${status.toUpperCase()}:`)
      console.log(`   ├─ Ação: Desativar Assinatura`)
      
      if (status === 'chargeback') {
        await addToBlacklist(supabase, email, 'chargeback', requestId)
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      
      if (profile) {
        const { error: updateError } = await supabase
          .from('premium_musicos_users')
          .update({ is_active: false })
          .eq('user_id', profile.id)

        if (updateError) {
          console.log(`   ├─ ❌ Erro desativando: ${updateError.message}`)
        } else {
          console.log(`   ├─ ✅ Assinatura DESATIVADA`)
        }
      } else {
        console.log(`   ├─ ⚠️ Usuário não encontrado`)
      }

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)

      const duration = Date.now() - startTime
      console.log(`\n✅ [${requestId}] WEBHOOK PROCESSADO COM SUCESSO`)
      console.log(`   ├─ Email: ${email}`)
      console.log(`   ├─ Ação: Assinatura Desativada`)
      console.log(`   ├─ Motivo: ${status}`)
      console.log(`   └─ Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)

      return new Response(
        JSON.stringify({ success: true, message: `Subscription deactivated for ${email}` }),
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
          platform: 'musicos'
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

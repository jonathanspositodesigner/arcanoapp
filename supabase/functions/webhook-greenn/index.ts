import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeamento de Product ID para tipo de plano (PromptClub)
const PRODUCT_ID_TO_PLAN: Record<number, 'arcano_basico' | 'arcano_pro' | 'arcano_unlimited'> = {
  148926: 'arcano_basico',
  148936: 'arcano_pro',
  148937: 'arcano_unlimited'
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
async function findUserByEmail(supabase: any, email: string, requestId: string): Promise<string | null> {
  console.log(`   ├─ [${requestId}] Buscando usuário por email: ${email}`)
  
  // First try to find in profiles table (faster)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile?.id) {
    console.log(`   ├─ [${requestId}] ✅ Encontrado via profiles: ${existingProfile.id}`)
    return existingProfile.id;
  }

  // If not found in profiles, search in auth.users with pagination
  console.log(`   ├─ [${requestId}] Não encontrado em profiles, buscando em auth.users...`)
  let page = 1;
  while (page <= 10) { // Max 10000 users
    const { data: usersPage, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });

    if (error) {
      console.error(`   ├─ [${requestId}] ❌ Erro listando usuários página ${page}:`, error)
      break;
    }

    const matchingUser = usersPage?.users.find((u: any) => u.email?.toLowerCase() === email);
    if (matchingUser) {
      console.log(`   ├─ [${requestId}] ✅ Encontrado via auth.users (página ${page}): ${matchingUser.id}`)
      return matchingUser.id;
    }

    if (!usersPage?.users.length || usersPage.users.length < 1000) {
      break; // Last page
    }
    page++;
  }

  console.log(`   └─ [${requestId}] ⚠️ Usuário não encontrado`)
  return null;
}

// Textos de email por idioma
const emailTexts = {
  pt: {
    greeting: 'Olá',
    accessData: '📋 Dados do seu primeiro acesso:',
    email: 'Email',
    password: 'Senha',
    securityWarning: 'Por segurança, você deverá trocar sua senha no primeiro acesso.',
    clickButton: 'Clique no botão acima para fazer seu primeiro login e começar a explorar milhares de prompts!',
    copyright: '© ArcanoApp - Biblioteca de Prompts de IA',
    important: 'Importante'
  },
  es: {
    greeting: 'Hola',
    accessData: '📋 Datos de tu primer acceso:',
    email: 'Email',
    password: 'Contraseña',
    securityWarning: 'Por seguridad, deberás cambiar tu contraseña en el primer acceso.',
    clickButton: '¡Haz clic en el botón de arriba para iniciar sesión y explorar miles de prompts!',
    copyright: '© ArcanoApp - Biblioteca de Prompts de IA',
    important: 'Importante'
  }
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

// Send welcome email to new premium users via SendPulse with tracking
async function sendWelcomeEmail(supabase: any, email: string, name: string, planType: string, requestId: string, locale: 'pt' | 'es' = 'pt'): Promise<void> {
  console.log(`\n📧 [${requestId}] EMAIL DE BOAS-VINDAS:`)
  console.log(`   ├─ Destinatário: ${email}`)
  console.log(`   ├─ Nome: ${name || 'N/A'}`)
  console.log(`   ├─ Locale: ${locale}`)
  
  const t = emailTexts[locale]
  
  try {
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    
    if (!clientId || !clientSecret) {
      console.log(`   └─ ⚠️ SendPulse não configurado, email não enviado`)
      return
    }

    // Fetch template from database based on locale
    const { data: template } = await supabase
      .from('welcome_email_templates')
      .select('*')
      .eq('platform', 'promptverso')
      .eq('locale', locale)
      .eq('is_active', true)
      .maybeSingle()

    console.log(`   ├─ Template: ${template?.id || 'default'} (locale: ${locale})`)

    // Parse template content with locale-aware defaults
    const defaultContent = locale === 'es' 
      ? {
          heading: '¡Bienvenido a ArcanoApp!',
          intro: '¡Tu compra fue confirmada con éxito! Ahora tienes acceso a nuestra biblioteca completa de prompts de IA.',
          button_text: 'Acceder a la Plataforma',
          footer: '¡Si tienes alguna duda, responde este email y te ayudaremos!'
        }
      : {
          heading: 'Bem-vindo ao ArcanoApp!',
          intro: 'Sua compra foi confirmada com sucesso! Agora você tem acesso à nossa biblioteca completa de prompts de IA.',
          button_text: 'Acessar Plataforma',
          footer: 'Se tiver qualquer dúvida, responda este email que iremos te ajudar!'
        }
    
    let templateContent = { ...defaultContent }
    
    if (template?.content) {
      try {
        templateContent = JSON.parse(template.content)
      } catch (e) {
        console.log(`   ├─ ⚠️ Erro parsing template, usando default`)
      }
    }

    const subject = template?.subject || '🎉 Bem-vindo ao ArcanoApp - Seu acesso está pronto!'
    const senderName = template?.sender_name || 'ArcanoApp'
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'

    // Generate unique tracking ID
    const trackingId = crypto.randomUUID()
    
    // Get plan display name
    const planNames: Record<string, string> = {
      'arcano_basico': 'Arcano Básico',
      'arcano_pro': 'Arcano Pro',
      'arcano_unlimited': 'Arcano IA Unlimited'
    }
    const planDisplayName = planNames[planType] || planType

    console.log(`   ├─ Plano: ${planDisplayName}`)
    console.log(`   ├─ Tracking ID: ${trackingId}`)

    // Build tracking URLs
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const openTrackingPixel = `${trackingBaseUrl}?id=${trackingId}&action=open`
    const platformUrl = 'https://arcanolab.voxvisual.com.br/login'
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
    h1 { color: #552b99; text-align: center; margin: 0 0 20px 0; font-size: 28px; }
    p { color: #333; line-height: 1.6; margin: 0 0 16px 0; }
    .cta-button { display: block; background: linear-gradient(135deg, #552b99, #7c3aed); color: white; text-align: center; padding: 18px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 30px 0; }
    .credentials { background: linear-gradient(135deg, #f8f4ff, #ede9fe); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #ddd6fe; }
    .credentials h3 { margin: 0 0 16px 0; color: #552b99; font-size: 18px; }
    .credentials p { margin: 8px 0; color: #333; }
    .highlight { background: #fff; padding: 10px 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 15px; border: 1px solid #e5e7eb; display: inline-block; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-top: 16px; }
    .warning p { color: #92400e; font-size: 13px; margin: 0; }
    .plan-badge { background: #552b99; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
    .footer { color: #666; font-size: 13px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🎉 ${templateContent.heading}</h1>
    </div>
    
    <p>${t.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p>
    
    <p>${templateContent.intro}</p>
    
    <div style="text-align: center;">
      <span class="plan-badge">✨ ${planDisplayName}</span>
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
      ${t.clickButton}
    </p>
    
    <div class="footer">
      <p>${templateContent.footer}</p>
      <p style="margin-top: 8px;">${t.copyright}</p>
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
      platform: 'promptverso',
      tracking_id: trackingId,
      template_used: template?.id || 'default',
      product_info: planDisplayName,
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

// Função para detectar plano pelo Product ID da Greenn
function detectPlanFromProductId(productId: number | undefined, requestId: string): 'arcano_basico' | 'arcano_pro' | 'arcano_unlimited' {
  if (!productId) {
    console.log(`   ├─ [${requestId}] ⚠️ Product ID não fornecido, usando 'arcano_basico'`)
    return 'arcano_basico'
  }
  
  const planType = PRODUCT_ID_TO_PLAN[productId]
  
  if (!planType) {
    console.log(`   ├─ [${requestId}] ⚠️ Product ID ${productId} não mapeado, usando 'arcano_basico'`)
    return 'arcano_basico'
  }
  
  console.log(`   ├─ [${requestId}] ✅ Product ID ${productId} → ${planType}`)
  return planType
}

Deno.serve(async (req) => {
  const startTime = Date.now()
  const requestId = crypto.randomUUID().slice(0, 8)
  const timestamp = new Date().toISOString()
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`\n${'='.repeat(70)}`)
  console.log(`🚀 [${requestId}] WEBHOOK PROMPTCLUB RECEBIDO - ${timestamp}`)
  console.log(`${'='.repeat(70)}`)

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
  let currentStep = 'parsing_payload'

  try {
    payload = await req.json()
    
    const email = payload.client?.email?.toLowerCase().trim()
    const clientName = payload.client?.name || ''
    const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
    const productName = payload.product?.name || ''
    const productId = payload.product?.id
    const productPeriod = payload.product?.period || 30
    const status = payload.currentStatus
    const contractId = payload.contract?.id || payload.sale?.id
    const offerName = payload.offer?.name || ''
    const trialDays = payload.trial?.days || 7
    const trialEndDate = payload.trial?.end_date

    console.log(`\n📋 [${requestId}] DADOS DO PAYLOAD:`)
    console.log(`   ├─ Email: ${email || 'NÃO FORNECIDO'}`)
    console.log(`   ├─ Nome: ${clientName || 'N/A'}`)
    console.log(`   ├─ Telefone: ${clientPhone || 'N/A'}`)
    console.log(`   ├─ Status: ${status}`)
    console.log(`   ├─ Product ID: ${productId}`)
    console.log(`   ├─ Product Name: ${productName}`)
    console.log(`   ├─ Offer Name: ${offerName}`)
    console.log(`   ├─ Period (dias): ${productPeriod}`)
    console.log(`   └─ Contract ID: ${contractId || 'N/A'}`)

    currentStep = 'logging_webhook'
    
    // Log webhook receipt immediately
    const { data: logData } = await supabase
      .from('webhook_logs')
      .insert({
        payload: payload,
        status: status || 'unknown',
        product_id: productId,
        email: email || 'no-email',
        result: 'processing',
        from_app: false,
        platform: 'prompts'
      })
      .select('id')
      .single()
    
    logId = logData?.id
    console.log(`\n📝 [${requestId}] Webhook logado com ID: ${logId}`)
    
    if (!email) {
      console.log(`\n❌ [${requestId}] ERRO: Email não fornecido no payload`)
      
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'error',
          error_message: 'No email provided'
        }).eq('id', logId)
      }
      
      const duration = Date.now() - startTime
      console.log(`\n⏱️ [${requestId}] Tempo de execução: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)
      
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    currentStep = 'checking_blacklist'
    console.log(`\n🔒 [${requestId}] VERIFICANDO BLACKLIST...`)
    
    // Check blacklist
    const { data: blacklisted } = await supabase
      .from('blacklisted_emails')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (blacklisted) {
      console.log(`   └─ 🚫 Email BLOQUEADO na blacklist`)
      
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'blocked',
          error_message: 'Email blacklisted'
        }).eq('id', logId)
      }
      
      const duration = Date.now() - startTime
      console.log(`\n⏱️ [${requestId}] Tempo de execução: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)
      
      return new Response(
        JSON.stringify({ success: true, message: 'Email blacklisted, webhook ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`   └─ ✅ Email liberado`)

    currentStep = 'detecting_plan'
    console.log(`\n🔍 [${requestId}] DETECÇÃO DE PLANO:`)
    
    // Determine plan type pelo Product ID
    const planType = detectPlanFromProductId(productId, requestId)

    // Determine billing period baseado no period do produto
    let billingPeriod = 'monthly'
    if (offerName.toLowerCase().includes('anual') || productPeriod >= 365) {
      billingPeriod = 'yearly'
    }
    
    // Extract locale from UTM
    const locale = extractLocale(payload)
    
    console.log(`   ├─ Plano Detectado: ${planType}`)
    console.log(`   ├─ Período: ${billingPeriod}`)
    console.log(`   ├─ Locale: ${locale}`)
    console.log(`   └─ Dias: ${productPeriod}`)

    // IMPORTANTE: waiting_payment NÃO deve ativar premium - apenas status de pagamento confirmado
    const isTrialStatus = status === 'trial' || status === 'trial_started' || status === 'trialing'
    
    // Ignorar status que NÃO concedem acesso (apenas loggar e retornar)
    const isPendingStatus = status === 'waiting_payment' || status === 'pending_payment' || status === 'pending'
    
    if (isPendingStatus) {
      console.log(`\n⏳ [${requestId}] STATUS PENDENTE - IGNORANDO (não ativa premium)`)
      console.log(`   └─ Status: ${status}`)
      
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'ignored',
          error_message: `Status pendente ignorado: ${status}`
        }).eq('id', logId)
      }
      
      const duration = Date.now() - startTime
      console.log(`\n⏱️ [${requestId}] Tempo de execução: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)
      
      return new Response(
        JSON.stringify({ success: true, message: `Pending status ignored: ${status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Handle paid status OR trial status - activate or renew premium
    if (status === 'paid' || status === 'approved' || isTrialStatus) {
      const statusType = isTrialStatus ? 'TRIAL' : 'PAID'
      currentStep = 'processing_activation'
      
      console.log(`\n💳 [${requestId}] PROCESSANDO ${statusType}:`)
      console.log(`   ├─ Ação: Ativar/Renovar Premium`)
      
      // Find or create user
      console.log(`\n👤 [${requestId}] PROCESSAMENTO DE USUÁRIO:`)
      let userId: string | null = null
      
      // First try to find existing user
      userId = await findUserByEmail(supabase, email, requestId)
      
      if (!userId) {
        // User not found, try to create
        console.log(`   ├─ [${requestId}] Criando novo usuário...`)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: email,
          email_confirm: true
        })

        if (createError) {
          // If email_exists error, search again with pagination
          if (createError.message.includes('already been registered') || createError.message.includes('email_exists')) {
            console.log(`   ├─ [${requestId}] Usuário já existe, buscando com paginação...`)
            
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
                console.log(`   ├─ [${requestId}] ✅ Encontrado via paginação (página ${page}): ${userId}`)
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
          console.log(`   ├─ [${requestId}] ✅ Novo usuário criado: ${userId}`)
        }
      }

      if (!userId) {
        throw new Error('Could not find or create user')
      }

      currentStep = 'upserting_profile'
      console.log(`\n💾 [${requestId}] OPERAÇÕES NO BANCO:`)
      console.log(`   ├─ Atualizando profile...`)
      
      // Upsert profile with name and phone and locale
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          name: clientName,
          phone: clientPhone,
          email: email,
          locale: locale,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileError) {
        console.log(`   ├─ ⚠️ Erro no profile: ${profileError.message}`)
      } else {
        console.log(`   ├─ ✅ Profile atualizado`)
      }

      currentStep = 'calculating_expiration'
      
      // Calculate expiration date
      let expiresAt: Date
      const now = new Date()
      
      if (isTrialStatus) {
        if (trialEndDate) {
          expiresAt = new Date(trialEndDate)
          console.log(`   ├─ Data trial (payload): ${expiresAt.toISOString()}`)
        } else {
          expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + trialDays)
          console.log(`   ├─ Data trial (calculada +${trialDays}d): ${expiresAt.toISOString()}`)
        }
      } else {
        const payloadDate = payload.contract?.current_period_end 
          ? new Date(payload.contract.current_period_end) 
          : null

        if (payloadDate && payloadDate > now) {
          expiresAt = payloadDate
          console.log(`   ├─ Data expiração (payload): ${expiresAt.toISOString()}`)
        } else {
          expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + productPeriod)
          console.log(`   ├─ Data expiração (calculada +${productPeriod}d): ${expiresAt.toISOString()}`)
        }
      }

      currentStep = 'updating_premium'
      
      // Check if premium record exists
      const { data: existingPremium, error: premiumCheckError } = await supabase
        .from('premium_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (premiumCheckError) {
        console.log(`   ├─ ❌ Erro verificando premium: ${premiumCheckError.message}`)
        throw premiumCheckError
      }

      if (existingPremium) {
        console.log(`   ├─ Atualizando premium existente...`)
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
          console.log(`   ├─ ❌ Erro atualizando: ${updateError.message}`)
          throw updateError
        }
        console.log(`   ├─ ✅ Premium ATUALIZADO`)
      } else {
        console.log(`   ├─ Criando novo registro premium...`)
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
          console.log(`   ├─ ❌ Erro inserindo: ${insertError.message}`)
          throw insertError
        }
        console.log(`   ├─ ✅ Premium CRIADO`)
      }

      console.log(`   └─ Premium: plan=${planType}, expires=${expiresAt.toISOString()}`)
      
      // Send welcome email to new user with tracking
      currentStep = 'sending_email'
      await sendWelcomeEmail(supabase, email, clientName, planType, requestId, locale)
      
      // Update log with success
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'success',
          mapping_type: planType
        }).eq('id', logId)
      }
      
      const duration = Date.now() - startTime
      console.log(`\n✅ [${requestId}] WEBHOOK PROCESSADO COM SUCESSO`)
      console.log(`   ├─ Email: ${email}`)
      console.log(`   ├─ Ação: Premium Ativado`)
      console.log(`   ├─ Plano: ${planType}`)
      console.log(`   ├─ Expira: ${expiresAt.toISOString()}`)
      console.log(`   └─ Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)
      
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
      currentStep = 'processing_deactivation'
      
      console.log(`\n🚫 [${requestId}] PROCESSANDO ${status.toUpperCase()}:`)
      console.log(`   ├─ Ação: Desativar Premium`)
      
      // Find user using profiles + pagination
      const userId = await findUserByEmail(supabase, email, requestId)

      if (userId) {
        const { error: updateError } = await supabase
          .from('premium_users')
          .update({ is_active: false })
          .eq('user_id', userId)

        if (updateError) {
          console.log(`   ├─ ❌ Erro desativando: ${updateError.message}`)
          throw updateError
        }

        console.log(`   ├─ ✅ Premium DESATIVADO`)
        
        // Auto-blacklist on chargeback
        if (status === 'chargeback') {
          await supabase.from('blacklisted_emails').upsert({
            email: email,
            reason: 'chargeback',
            auto_blocked: true,
            blocked_at: new Date().toISOString()
          }, { onConflict: 'email' })
          console.log(`   ├─ 🚫 Email adicionado à blacklist (chargeback)`)
        }
      } else {
        console.log(`   ├─ ⚠️ Usuário não encontrado`)
      }

      // Update log with success
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'success',
          mapping_type: `deactivated_${status}`
        }).eq('id', logId)
      }

      const duration = Date.now() - startTime
      console.log(`\n✅ [${requestId}] WEBHOOK PROCESSADO COM SUCESSO`)
      console.log(`   ├─ Email: ${email}`)
      console.log(`   ├─ Ação: Premium Desativado`)
      console.log(`   ├─ Motivo: ${status}`)
      console.log(`   └─ Tempo: ${duration}ms`)
      console.log(`${'='.repeat(70)}\n`)

      return new Response(
        JSON.stringify({ success: true, message: `Premium deactivated for ${email}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For other statuses, just log and acknowledge
    console.log(`\n📋 [${requestId}] STATUS NÃO TRATADO: ${status}`)
    
    if (logId) {
      await supabase.from('webhook_logs').update({
        result: 'ignored',
        error_message: `Status ${status} not handled`
      }).eq('id', logId)
    }
    
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
    console.log(`   ├─ Email: ${payload.client?.email || 'N/A'}`)
    console.log(`   ├─ Product ID: ${payload.product?.id || 'N/A'}`)
    console.log(`   ├─ Status: ${payload.currentStatus || 'N/A'}`)
    console.log(`   ├─ Erro: ${errorMessage}`)
    console.log(`   └─ Stack: ${errorStack?.split('\n')[0] || 'N/A'}`)
    
    // Update log with error
    if (logId) {
      await supabase.from('webhook_logs').update({
        result: 'error',
        error_message: `[${currentStep}] ${errorMessage}`
      }).eq('id', logId)
    }
    
    const duration = Date.now() - startTime
    console.log(`\n⏱️ [${requestId}] Tempo de execução: ${duration}ms`)
    console.log(`${'='.repeat(70)}\n`)
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para mapeamento de produtos por ID
interface ProductMapping {
  planType: 'basico' | 'pro' | 'unlimited'
  billingPeriod: 'mensal' | 'anual'
  expirationDays: number
}

// Mapeamento de Product ID para plano
// Configure aqui os IDs dos produtos da Greenn
const PRODUCT_ID_MAPPING: Record<number, ProductMapping> = {
  // Plano Básico Mensal (Acesso Básico - BAA - Músicos & Artistas)
  150707: { planType: 'basico', billingPeriod: 'mensal', expirationDays: 30 },
  
  // Plano Pro - adicionar IDs quando disponíveis
  // XXXXX: { planType: 'pro', billingPeriod: 'mensal', expirationDays: 30 },
  // YYYYY: { planType: 'pro', billingPeriod: 'anual', expirationDays: 365 },
  
  // Plano Unlimited - adicionar IDs quando disponíveis
  // XXXXX: { planType: 'unlimited', billingPeriod: 'mensal', expirationDays: 30 },
  // YYYYY: { planType: 'unlimited', billingPeriod: 'anual', expirationDays: 365 },
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

// Função para enviar email de boas-vindas
async function sendWelcomeEmail(supabase: any, email: string, name: string, planInfo: string): Promise<void> {
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
      .eq('platform', 'musicos')
      .eq('is_active', true)
      .maybeSingle()

    if (!template) {
      console.log('No active template found for musicos, using default')
    }

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
        console.log('Error parsing template content, using default')
      }
    }

    const subject = template?.subject || '🎵 Bem-vindo à Biblioteca de Artes para Músicos - Seu acesso está pronto!'
    const senderName = template?.sender_name || 'Biblioteca de Artes Músicos'
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'

    // Generate unique tracking ID
    const trackingId = crypto.randomUUID()

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
      console.log(`✅ Welcome email sent successfully to ${email} (tracking: ${trackingId})`)
    } else {
      console.error(`❌ Failed to send welcome email: ${JSON.stringify(result)}`)
    }
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
}

// Função para detectar plano pelo nome do produto
function detectPlanFromName(productName: string, offerName: string): ProductMapping | null {
  const nameLower = (productName + ' ' + offerName).toLowerCase()
  
  let planType: 'basico' | 'pro' | 'unlimited' = 'basico'
  let billingPeriod: 'mensal' | 'anual' = 'mensal'
  let expirationDays = 30
  
  // Detectar tipo de plano
  if (nameLower.includes('unlimited') || nameLower.includes('ilimitado')) {
    planType = 'unlimited'
  } else if (nameLower.includes('pro') || nameLower.includes('profissional')) {
    planType = 'pro'
  } else if (nameLower.includes('basic') || nameLower.includes('básico') || nameLower.includes('basico')) {
    planType = 'basico'
  }
  
  // Detectar período de cobrança
  if (nameLower.includes('anual') || nameLower.includes('1 ano') || nameLower.includes('12 meses')) {
    billingPeriod = 'anual'
    expirationDays = 365
  } else if (nameLower.includes('mensal') || nameLower.includes('1 mês') || nameLower.includes('1 mes') || nameLower.includes('30 dias')) {
    billingPeriod = 'mensal'
    expirationDays = 30
  }
  
  console.log(`📋 Name detection: planType=${planType}, billingPeriod=${billingPeriod}`)
  return { planType, billingPeriod, expirationDays }
}

// Função para calcular data de expiração
function calculateExpirationDate(expirationDays: number): Date {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expirationDays)
  return expiresAt
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
  let mappingType: 'product_id' | 'name_detection' | 'none' = 'none'

  try {
    payload = await req.json()
    
    console.log('=== GREENN MÚSICOS WEBHOOK RECEIVED ===')
    console.log('Payload:', JSON.stringify(payload, null, 2))

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

      console.log(`📋 Checkout abandoned by: ${leadEmail} at step ${checkoutStep}`)
      console.log(`Product: ${productName} (ID: ${productId}), Amount: ${amount}`)
      
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
            console.error('Error saving abandoned checkout:', insertError)
          } else {
            console.log(`✅ Lead saved for remarketing: ${leadEmail}`)
          }
        } else {
          console.log(`⏭️ Lead already registered recently: ${leadEmail}`)
        }
      }

      await logWebhook(supabase, payload, 'abandoned', productId, leadEmail, 'success', 'lead')
      
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

    // Buscar mapeamento do produto
    let planMapping: ProductMapping | null = null

    if (productId && PRODUCT_ID_MAPPING[productId]) {
      planMapping = PRODUCT_ID_MAPPING[productId]
      mappingType = 'product_id'
      console.log(`✅ Found product mapping: ${planMapping.planType} (${planMapping.billingPeriod})`)
    } else {
      // Fallback: detectar pelo nome
      planMapping = detectPlanFromName(productName, offerName)
      mappingType = 'name_detection'
      console.log(`⚠️ Product ID ${productId} not in mapping, using name detection`)
    }

    if (!planMapping) {
      console.error(`❌ Could not determine plan from productId=${productId}, product=${productName}`)
      await logWebhook(supabase, payload, status, productId, email, 'error', mappingType, 'Could not determine plan')
      return new Response(
        JSON.stringify({ 
          error: 'Could not determine plan from product',
          productId,
          productName,
          offerName,
          hint: 'Configure o Product ID no mapeamento do webhook'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Final detection type: ${mappingType}`)
    console.log(`Plan: ${planMapping.planType}, Period: ${planMapping.billingPeriod}, Days: ${planMapping.expirationDays}`)

    // Handle paid status - activate subscription
    if (status === 'paid' || status === 'approved') {
      console.log('Processing PAID status - activating subscription')
      
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
            console.log(`🗑️ Deleted quick checkout - not a real abandonment: ${email}`)
          } else {
            await supabase.from('abandoned_checkouts').update({ 
              remarketing_status: 'converted',
              updated_at: new Date().toISOString()
            }).eq('id', abandonedCheckout.id)
            console.log(`✅ Abandoned checkout marked as CONVERTED for ${email}`)
          }
        }
      }
      
      let userId: string | null = null

      // Criar ou buscar usuário
      console.log(`Attempting to create user with email: ${email}`)
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: email,
        email_confirm: true
      })

      if (createError) {
        if (createError.message?.includes('email') || createError.code === 'email_exists') {
          console.log(`User already exists, fetching from profiles table...`)
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()
          
          if (profile) {
            userId = profile.id
            console.log(`Found user via profiles table with ID: ${userId}`)
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
                console.log(`Found existing user via listUsers with ID: ${userId}`)
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
        console.log(`New user created with ID: ${userId}`)
      }

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
        console.error('Error upserting profile:', profileError)
      }

      // Calcular expiração
      const expiresAt = calculateExpirationDate(planMapping.expirationDays)

      // Verificar assinatura existente
      const { data: existingSubscription } = await supabase
        .from('premium_musicos_users')
        .select('id, expires_at, plan_type')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (existingSubscription) {
        console.log(`User already has subscription, updating...`)
        
        // Se ainda tiver tempo, adicionar ao tempo existente
        let newExpiresAt = expiresAt
        if (existingSubscription.expires_at) {
          const currentExpires = new Date(existingSubscription.expires_at)
          const now = new Date()
          
          if (currentExpires > now) {
            newExpiresAt = new Date(currentExpires)
            newExpiresAt.setDate(newExpiresAt.getDate() + planMapping.expirationDays)
            console.log(`Extending expiration from ${currentExpires.toISOString()} to ${newExpiresAt.toISOString()}`)
          }
        }

        const { error: updateError } = await supabase
          .from('premium_musicos_users')
          .update({
            plan_type: planMapping.planType,
            billing_period: planMapping.billingPeriod,
            expires_at: newExpiresAt.toISOString(),
            greenn_contract_id: contractId,
            greenn_product_id: productId,
            subscribed_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          throw updateError
        }
        
        console.log(`✅ Updated subscription: ${planMapping.planType} (${planMapping.billingPeriod})`)
      } else {
        // Criar nova assinatura
        const { error: insertError } = await supabase
          .from('premium_musicos_users')
          .insert({
            user_id: userId,
            plan_type: planMapping.planType,
            billing_period: planMapping.billingPeriod,
            is_active: true,
            expires_at: expiresAt.toISOString(),
            greenn_contract_id: contractId,
            greenn_product_id: productId,
            subscribed_at: new Date().toISOString(),
          })

        if (insertError) {
          console.error('Error inserting subscription:', insertError)
          throw insertError
        }
        
        console.log(`✅ Created new subscription: ${planMapping.planType} (${planMapping.billingPeriod})`)
      }

      // Enviar email de boas-vindas
      await sendWelcomeEmail(supabase, email, clientName, `Plano ${planMapping.planType.toUpperCase()} (${planMapping.billingPeriod})`)

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Subscription activated for ${email}`,
          plan_type: planMapping.planType,
          billing_period: planMapping.billingPeriod,
          expires_at: expiresAt.toISOString(),
          mapped_by: mappingType
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle refunded/chargeback - deactivate subscription
    if (status === 'refunded' || status === 'chargeback') {
      console.log(`Processing ${status} status - deactivating subscription`)
      
      if (status === 'chargeback') {
        await addToBlacklist(supabase, email, 'chargeback')
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
          console.error('Error deactivating subscription:', updateError)
        } else {
          console.log(`🚫 Subscription deactivated for ${email}`)
        }
      } else {
        console.log(`User not found for email: ${email}`)
      }

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)

      return new Response(
        JSON.stringify({ success: true, message: `Subscription deactivated for ${email}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle waiting_payment
    if (status === 'waiting_payment') {
      console.log(`💳 Received waiting_payment - saving as abandoned checkout`)
      
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
        console.log(`✅ Abandoned checkout saved from waiting_payment: ${email}`)
      }

      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)
      
      return new Response(
        JSON.stringify({ success: true, message: 'Waiting payment captured as abandoned checkout' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle other statuses
    if (status === 'canceled' || status === 'unpaid' || status === 'expired') {
      console.log(`📋 Received ${status} status - logged but no immediate action`)
      await logWebhook(supabase, payload, status, productId, email, 'success', mappingType)
      
      return new Response(
        JSON.stringify({ success: true, message: `Webhook received with status: ${status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For other statuses
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

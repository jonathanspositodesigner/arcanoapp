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
async function findUserByEmail(supabase: any, email: string): Promise<string | null> {
  // First try to find in profiles table (faster)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile?.id) {
    console.log('Found user via profiles table:', existingProfile.id);
    return existingProfile.id;
  }

  // If not found in profiles, search in auth.users with pagination
  let page = 1;
  while (page <= 10) { // Max 10000 users
    const { data: usersPage, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: 1000
    });

    if (error) {
      console.error('Error listing users page', page, error);
      break;
    }

    const matchingUser = usersPage?.users.find((u: any) => u.email?.toLowerCase() === email);
    if (matchingUser) {
      console.log('Found user via auth.users pagination:', matchingUser.id);
      return matchingUser.id;
    }

    if (!usersPage?.users.length || usersPage.users.length < 1000) {
      break; // Last page
    }
    page++;
  }

  return null;
}

// Send welcome email to new premium users via SendPulse with tracking
async function sendWelcomeEmail(supabase: any, email: string, name: string, planType: string): Promise<void> {
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
      .eq('platform', 'promptverso')
      .eq('is_active', true)
      .maybeSingle()

    if (!template) {
      console.log('No active template found for promptverso, using default')
    }

    // Parse template content
    let templateContent = {
      heading: 'Bem-vindo ao ArcanoApp!',
      intro: 'Sua compra foi confirmada com sucesso! Agora você tem acesso à nossa biblioteca completa de prompts de IA.',
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
    
    <p>Olá${name ? ` <strong>${name}</strong>` : ''}!</p>
    
    <p>${templateContent.intro}</p>
    
    <div style="text-align: center;">
      <span class="plan-badge">✨ ${planDisplayName}</span>
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
      Clique no botão acima para fazer seu primeiro login e começar a explorar milhares de prompts!
    </p>
    
    <div class="footer">
      <p>${templateContent.footer}</p>
      <p style="margin-top: 8px;">© ArcanoApp - Biblioteca de Prompts de IA</p>
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

// Função para detectar plano pelo Product ID da Greenn
function detectPlanFromProductId(productId: number | undefined): 'arcano_basico' | 'arcano_pro' | 'arcano_unlimited' {
  if (!productId) {
    console.warn(`⚠️ Product ID não fornecido, usando 'arcano_basico' como padrão`)
    return 'arcano_basico'
  }
  
  const planType = PRODUCT_ID_TO_PLAN[productId]
  
  if (!planType) {
    console.warn(`⚠️ Product ID ${productId} não mapeado, usando 'arcano_basico' como padrão`)
    return 'arcano_basico'
  }
  
  console.log(`📋 Product ID detection: productId=${productId} -> planType=${planType}`)
  return planType
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

  let payload: GreennWebhookPayload = {}
  let logId: string | null = null

  try {
    payload = await req.json()
    
    console.log('=== GREENN WEBHOOK RECEIVED (PROMPTVERSO) ===')
    console.log('Payload:', JSON.stringify(payload, null, 2))

    const email = payload.client?.email?.toLowerCase().trim()
    const clientName = payload.client?.name || ''
    const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
    const productName = payload.product?.name || ''
    const productId = payload.product?.id
    const productPeriod = payload.product?.period || 30
    const status = payload.currentStatus
    const contractId = payload.contract?.id || payload.sale?.id

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
    console.log('Webhook logged with ID:', logId)
    
    if (!email) {
      console.error('No email provided in webhook payload')
      
      // Update log with error
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'error',
          error_message: 'No email provided'
        }).eq('id', logId)
      }
      
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check blacklist
    const { data: blacklisted } = await supabase
      .from('blacklisted_emails')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (blacklisted) {
      console.log('Email is blacklisted, ignoring webhook:', email)
      
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'blocked',
          error_message: 'Email blacklisted'
        }).eq('id', logId)
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Email blacklisted, webhook ignored' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const offerName = payload.offer?.name || ''
    const trialDays = payload.trial?.days || 7
    const trialEndDate = payload.trial?.end_date
    
    console.log(`Processing webhook for email: ${email}, name: ${clientName}, phone: ${clientPhone}, status: ${status}`)
    console.log(`Product: ${productName}, Offer: ${offerName}, Period: ${productPeriod} days`)

    // Determine plan type pelo Product ID
    const planType = detectPlanFromProductId(productId)

    // Determine billing period baseado no period do produto
    let billingPeriod = 'monthly'
    if (offerName.toLowerCase().includes('anual') || productPeriod >= 365) {
      billingPeriod = 'yearly'
    }
    
    console.log(`Detected billing period: ${billingPeriod}`)

    const isTrialStatus = status === 'trial' || status === 'trial_started' || status === 'trialing' || status === 'waiting_payment'
    
    // Handle paid status OR trial status - activate or renew premium
    if (status === 'paid' || status === 'approved' || isTrialStatus) {
      const statusType = isTrialStatus ? 'TRIAL' : 'PAID'
      console.log(`Processing ${statusType} status - activating/renewing premium`)
      
      // Find or create user - FIXED: using profiles + pagination instead of single listUsers
      let userId: string | null = null
      
      // First try to find existing user
      userId = await findUserByEmail(supabase, email)
      
      if (!userId) {
        // User not found, try to create
        console.log(`Creating new user with email: ${email}`)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: email,
          password: email,
          email_confirm: true
        })

        if (createError) {
          // If email_exists error, search again with pagination
          if (createError.message.includes('already been registered') || createError.message.includes('email_exists')) {
            console.log('User exists in auth but not found initially, searching with pagination...')
            
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
                console.log('Found existing user via listUsers pagination:', userId)
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
          console.log(`New user created with ID: ${userId}`)
        }
      }

      if (!userId) {
        throw new Error('Could not find or create user')
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
      } else {
        console.log(`Profile upserted for user: ${userId}, name: ${clientName}, phone: ${clientPhone}`)
      }

      // Calculate expiration date
      let expiresAt: Date
      const now = new Date()
      
      if (isTrialStatus) {
        if (trialEndDate) {
          expiresAt = new Date(trialEndDate)
          console.log(`Using trial end date: ${expiresAt.toISOString()}`)
        } else {
          expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + trialDays)
          console.log(`Calculated trial expiration (${trialDays} days): ${expiresAt.toISOString()}`)
        }
      } else {
        const payloadDate = payload.contract?.current_period_end 
          ? new Date(payload.contract.current_period_end) 
          : null

        if (payloadDate && payloadDate > now) {
          expiresAt = payloadDate
          console.log(`Using payload date: ${expiresAt.toISOString()}`)
        } else {
          expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + productPeriod)
          console.log(`Calculated date (payload invalid/past): ${expiresAt.toISOString()}`)
        }
      }

      console.log(`Setting expires_at to: ${expiresAt.toISOString()}`)

      // Check if premium record exists
      const { data: existingPremium, error: premiumCheckError } = await supabase
        .from('premium_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (premiumCheckError) {
        console.error('Error checking premium status:', premiumCheckError)
        throw premiumCheckError
      }

      if (existingPremium) {
        console.log('Updating existing premium record')
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
          console.error('Error updating premium status:', updateError)
          throw updateError
        }
      } else {
        console.log('Creating new premium record')
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
          console.error('Error inserting premium status:', insertError)
          throw insertError
        }
      }

      console.log(`Premium activated for ${email} until ${expiresAt.toISOString()}`)
      
      // Send welcome email to new user with tracking
      await sendWelcomeEmail(supabase, email, clientName, planType)
      
      // Update log with success
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'success',
          mapping_type: planType
        }).eq('id', logId)
      }
      
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
      console.log(`Processing ${status} status - deactivating premium`)
      
      // Find user using profiles + pagination - FIXED
      const userId = await findUserByEmail(supabase, email)

      if (userId) {
        const { error: updateError } = await supabase
          .from('premium_users')
          .update({ is_active: false })
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error deactivating premium:', updateError)
          throw updateError
        }

        console.log(`Premium deactivated for ${email}`)
        
        // Auto-blacklist on chargeback
        if (status === 'chargeback') {
          await supabase.from('blacklisted_emails').upsert({
            email: email,
            reason: 'chargeback',
            auto_blocked: true,
            blocked_at: new Date().toISOString()
          }, { onConflict: 'email' })
          console.log(`Email blacklisted due to chargeback: ${email}`)
        }
      } else {
        console.log(`User not found for email: ${email}`)
      }

      // Update log with success
      if (logId) {
        await supabase.from('webhook_logs').update({
          result: 'success',
          mapping_type: `deactivated_${status}`
        }).eq('id', logId)
      }

      return new Response(
        JSON.stringify({ success: true, message: `Premium deactivated for ${email}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For other statuses, just log and acknowledge
    console.log(`Received status ${status} - no action taken`)
    
    if (logId) {
      await supabase.from('webhook_logs').update({
        result: 'ignored',
        error_message: `Status ${status} not handled`
      }).eq('id', logId)
    }
    
    return new Response(
      JSON.stringify({ success: true, message: `Webhook received with status: ${status}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('Webhook processing error:', error)
    
    // Update log with error
    if (logId) {
      await supabase.from('webhook_logs').update({
        result: 'error',
        error_message: errorMessage
      }).eq('id', logId)
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

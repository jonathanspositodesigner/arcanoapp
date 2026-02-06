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

// Mapeamento de Product ID para tipo de plano
const PRODUCT_ID_TO_PLAN: Record<number, 'basico' | 'pro' | 'unlimited'> = {
  150707: 'basico',
  150732: 'pro',
  150739: 'unlimited'
}

const emailTexts = {
  pt: { greeting: 'Olá', accessData: '📋 Dados do seu primeiro acesso:', email: 'Email', password: 'Senha', securityWarning: 'Por segurança, você deverá trocar sua senha no primeiro acesso.', clickButton: 'Clique no botão acima para fazer seu primeiro login!', copyright: '© Biblioteca de Artes para Músicos', important: 'Importante' },
  es: { greeting: 'Hola', accessData: '📋 Datos de tu primer acceso:', email: 'Email', password: 'Contraseña', securityWarning: 'Por seguridad, deberás cambiar tu contraseña en el primer acceso.', clickButton: '¡Haz clic en el botón de arriba!', copyright: '© Biblioteca de Artes para Músicos', important: 'Importante' }
}

function extractLocale(payload: any): 'pt' | 'es' {
  const saleMetas = payload.saleMetas || []
  for (const meta of saleMetas) {
    if (meta.meta_key === 'utm_locale' && meta.meta_value === 'es') return 'es'
  }
  return 'pt'
}

async function isEmailBlacklisted(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase.from('blacklisted_emails').select('id').eq('email', email.toLowerCase()).maybeSingle()
  return !!data
}

async function addToBlacklist(supabase: any, email: string, reason: string): Promise<void> {
  await supabase.from('blacklisted_emails').upsert({
    email: email.toLowerCase(), reason, auto_blocked: true, blocked_at: new Date().toISOString()
  }, { onConflict: 'email' })
}

function detectPlanFromProductId(productId: number | undefined): 'basico' | 'pro' | 'unlimited' {
  if (!productId) return 'basico'
  return PRODUCT_ID_TO_PLAN[productId] || 'basico'
}

function getBillingPeriodFromDays(days: number): string {
  if (days <= 35) return 'mensal'
  if (days <= 100) return 'trimestral'
  if (days <= 200) return 'semestral'
  if (days <= 400) return 'anual'
  return 'vitalicio'
}

async function sendWelcomeEmail(supabase: any, email: string, name: string, planInfo: string, requestId: string, locale: 'pt' | 'es' = 'pt'): Promise<void> {
  const t = emailTexts[locale]
  
  // Gerar dedup_key: email|product|YYYYMMDDHHMM
  const now = new Date()
  const dedupMinute = now.toISOString().slice(0, 16).replace(/[-T:]/g, '') // YYYYMMDDHHMM
  const dedupKey = `${email}|${planInfo}|${dedupMinute}`
  const trackingId = crypto.randomUUID()
  
  try {
    // PASSO 1: Tentar INSERT primeiro (atômico) - quem conseguir primeiro ganha
    const { data: inserted, error: insertError } = await supabase
      .from('welcome_email_logs')
      .insert({
        email,
        name,
        platform: 'musicos',
        product_info: planInfo,
        status: 'pending',
        tracking_id: trackingId,
        template_used: 'default',
        locale,
        dedup_key: dedupKey
      })
      .select('id, tracking_id')
      .single()
    
    // Se falhou por duplicata (unique constraint), ignorar silenciosamente
    if (insertError?.code === '23505') {
      console.log(`   ├─ [${requestId}] ⏭️ Email duplicado bloqueado por constraint`)
      return
    }
    
    if (insertError) {
      console.log(`   ├─ [${requestId}] ❌ Erro ao inserir log: ${insertError.message}`)
      return
    }
    
    const logId = inserted.id
    console.log(`   ├─ [${requestId}] 🔒 Lock obtido (dedup_key: ${dedupKey.slice(-20)})`)
    
    // PASSO 2: Enviar email (apenas quem conseguiu o INSERT)
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    
    if (!clientId || !clientSecret) {
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: 'SendPulse não configurado' }).eq('id', logId)
      return
    }

    const { data: template } = await supabase
      .from('welcome_email_templates')
      .select('*')
      .eq('platform', 'musicos')
      .eq('locale', locale)
      .eq('is_active', true)
      .maybeSingle()

    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const platformUrl = 'https://arcanolab.voxvisual.com.br/login-artes-musicos'
    const clickTrackingUrl = `${trackingBaseUrl}?id=${trackingId}&action=click&redirect=${encodeURIComponent(platformUrl)}`

    const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    })
    
    if (!tokenResponse.ok) {
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: 'Falha ao obter token SendPulse' }).eq('id', logId)
      return
    }

    const { access_token } = await tokenResponse.json()

    const subject = template?.subject || '🎵 Bem-vindo à Biblioteca de Artes para Músicos!'
    const senderName = template?.sender_name || 'Biblioteca de Artes Músicos'
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'

    const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;background:#f4f4f4;padding:20px}.container{max-width:600px;margin:0 auto;background:white;padding:40px;border-radius:12px}h1{color:#06b6d4;text-align:center}.cta-button{display:block;background:linear-gradient(135deg,#06b6d4,#ec4899);color:white;text-align:center;padding:16px;border-radius:8px;text-decoration:none;margin:20px 0}.credentials{background:#ecfeff;padding:20px;border-radius:8px;margin:20px 0}.plan-badge{background:linear-gradient(135deg,#06b6d4,#ec4899);color:white;padding:6px 12px;border-radius:20px;font-size:12px;display:inline-block}</style></head><body><div class="container"><h1>🎵 Bem-vindo à Biblioteca de Artes para Músicos!</h1><p>${t.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p><p>Sua compra foi confirmada!</p><div style="text-align:center"><span class="plan-badge">✨ ${planInfo}</span></div><div class="credentials"><h3>${t.accessData}</h3><p><strong>${t.email}:</strong> ${email}</p><p><strong>${t.password}:</strong> ${email}</p><p>⚠️ ${t.securityWarning}</p></div><a href="${clickTrackingUrl}" class="cta-button">🚀 Acessar Plataforma</a><p style="text-align:center;color:#666">${t.clickButton}</p></div><img src="${trackingBaseUrl}?id=${trackingId}&action=open" width="1" height="1" style="display:none"/></body></html>`

    const result = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${access_token}` },
      body: JSON.stringify({
        email: {
          html: btoa(unescape(encodeURIComponent(welcomeHtml))),
          text: `Bem-vindo! Email: ${email}, Senha: ${email}`,
          subject,
          from: { name: senderName, email: senderEmail },
          to: [{ email, name: name || "" }],
        },
      }),
    }).then(r => r.json())

    // PASSO 3: Atualizar status para sent ou failed
    await supabase.from('welcome_email_logs').update({
      status: result.result === true ? 'sent' : 'failed',
      error_message: result.result !== true ? JSON.stringify(result) : null,
      template_used: template?.id || 'default',
      email_content: welcomeHtml // Salvar HTML para prévia
    }).eq('id', logId)
    
    console.log(`   ├─ [${requestId}] ${result.result === true ? '✅ Email enviado' : '❌ Falha email'}`)
  } catch (error) {
    console.log(`   ├─ [${requestId}] ❌ Erro email: ${error}`)
    try {
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: String(error) }).eq('tracking_id', trackingId)
    } catch (e) {}
  }
}

// ============================================================================
// PROCESSAMENTO EM BACKGROUND
// ============================================================================
async function processGreennMusicosWebhook(supabase: any, payload: any, logId: string, requestId: string): Promise<void> {
  const email = payload.client?.email?.toLowerCase().trim()
  const clientName = payload.client?.name || ''
  const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
  const productName = payload.product?.name || ''
  const productId = payload.product?.id
  const productPeriod = payload.product?.period || 30
  const offerName = payload.offer?.name || ''
  const offerHash = payload.offer?.hash || ''
  const status = payload.currentStatus
  const contractId = payload.contract?.id || payload.sale?.id
  const saleAmount = payload.sale?.amount
  const locale = extractLocale(payload)

  try {
    // Handle refunded/chargeback
    if (status === 'refunded' || status === 'chargeback') {
      console.log(`\n🚫 [${requestId}] PROCESSANDO ${status.toUpperCase()}`)
      
      if (status === 'chargeback') {
        await addToBlacklist(supabase, email, 'chargeback')
      }

      // Tentar desativar por greenn_contract_id primeiro
      if (contractId) {
        const { data: subscription } = await supabase
          .from('premium_musicos_users')
          .update({ is_active: false })
          .eq('greenn_contract_id', contractId)
          .select('id')
        
        if (subscription?.length) {
          console.log(`   ├─ ✅ Assinatura desativada via contract_id`)
          await supabase.from('webhook_logs').update({ result: 'success' }).eq('id', logId)
          return
        }
      }

      // Fallback por email
      const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
      if (profile) {
        await supabase.from('premium_musicos_users').update({ is_active: false }).eq('user_id', profile.id)
        console.log(`   └─ ✅ Assinatura desativada via email`)
      }

      await supabase.from('webhook_logs').update({ result: 'success' }).eq('id', logId)
      return
    }

    // Handle paid/approved
    if (status === 'paid' || status === 'approved') {
      // Check blacklist
      if (await isEmailBlacklisted(supabase, email)) {
        console.log(`   ├─ 🚫 Email bloqueado`)
        await supabase.from('webhook_logs').update({ result: 'blocked', error_message: 'Email na blacklist' }).eq('id', logId)
        return
      }

      const planType = detectPlanFromProductId(productId)
      const expirationDays = productPeriod > 0 ? productPeriod : 30
      const billingPeriod = getBillingPeriodFromDays(expirationDays)

      // Handle abandoned checkout
      if (productId) {
        const { data: abandoned } = await supabase
          .from('abandoned_checkouts')
          .select('id, abandoned_at')
          .eq('email', email)
          .eq('product_id', productId)
          .neq('remarketing_status', 'converted')
          .maybeSingle()

        if (abandoned) {
          const minutesSince = (Date.now() - new Date(abandoned.abandoned_at).getTime()) / 60000
          if (minutesSince < 15) {
            await supabase.from('abandoned_checkouts').delete().eq('id', abandoned.id)
          } else {
            await supabase.from('abandoned_checkouts').update({ remarketing_status: 'converted' }).eq('id', abandoned.id)
          }
        }
      }

      // Create/find user
      let userId: string | null = null

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, password: email, email_confirm: true
      })

      if (createError) {
        if (createError.message?.includes('email') || createError.code === 'email_exists') {
          const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
          
          if (profile) {
            userId = profile.id
          } else {
            let page = 1
            while (!userId && page <= 10) {
              const { data: usersPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
              const found = usersPage?.users?.find((u: any) => u.email?.toLowerCase() === email)
              if (found) userId = found.id
              if (!usersPage?.users?.length || usersPage.users.length < 1000) break
              page++
            }
          }
          
          if (!userId) {
            await supabase.from('webhook_logs').update({ result: 'failed', error_message: 'Usuário existe mas não encontrado' }).eq('id', logId)
            return
          }
        } else {
          throw createError
        }
      } else {
        userId = newUser.user.id
        console.log(`   ├─ ✅ Novo usuário: ${userId}`)
      }

      // Upsert profile
      await supabase.from('profiles').upsert({
        id: userId, name: clientName, phone: clientPhone, email, password_changed: false, updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

      // Calculate expiration
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expirationDays)

      // Check existing subscription
      const { data: existing } = await supabase
        .from('premium_musicos_users')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      let finalExpiresAt = expiresAt
      if (existing?.expires_at) {
        const currentExpires = new Date(existing.expires_at)
        if (currentExpires > new Date()) {
          finalExpiresAt = new Date(currentExpires)
          finalExpiresAt.setDate(finalExpiresAt.getDate() + expirationDays)
        }
      }

      if (existing) {
        await supabase.from('premium_musicos_users').update({
          plan_type: planType, billing_period: billingPeriod,
          expires_at: finalExpiresAt.toISOString(), greenn_contract_id: contractId,
          greenn_product_id: productId, subscribed_at: new Date().toISOString()
        }).eq('id', existing.id)
        console.log(`   ├─ ✅ Assinatura ATUALIZADA`)
      } else {
        await supabase.from('premium_musicos_users').insert({
          user_id: userId, plan_type: planType, billing_period: billingPeriod,
          is_active: true, expires_at: finalExpiresAt.toISOString(),
          greenn_contract_id: contractId, greenn_product_id: productId,
          subscribed_at: new Date().toISOString()
        })
        console.log(`   ├─ ✅ Assinatura CRIADA`)
      }

      // Mark success BEFORE email + limpar payload
      await supabase.from('webhook_logs').update({ 
        result: 'success',
        payload: {} // Limpar payload para sucesso
      }).eq('id', logId)

      // Send email
      const planInfo = `Plano ${planType.toUpperCase()} (${billingPeriod})`
      try {
        await sendWelcomeEmail(supabase, email, clientName, planInfo, requestId, locale)
      } catch (e) {
        console.log(`   ├─ ⚠️ Falha email (assinatura já ativada)`)
      }

      console.log(`\n✅ [${requestId}] Assinatura ativada: ${planType}, expira: ${finalExpiresAt.toISOString()}`)
      return
    }

    // Handle waiting_payment
    if (status === 'waiting_payment') {
      const { data: existing } = await supabase
        .from('abandoned_checkouts')
        .select('id')
        .eq('email', email)
        .eq('product_id', productId)
        .gte('abandoned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (!existing) {
        await supabase.from('abandoned_checkouts').insert({
          email, name: clientName, phone: clientPhone, product_id: productId,
          product_name: productName, offer_name: offerName, offer_hash: offerHash,
          amount: saleAmount, remarketing_status: 'pending', platform: 'musicos'
        })
      }

      await supabase.from('webhook_logs').update({ 
        result: 'ignored', 
        error_message: 'waiting_payment',
        payload: {} // Limpar payload
      }).eq('id', logId)
      return
    }

    // Other statuses
    await supabase.from('webhook_logs').update({ result: 'ignored', error_message: `Status: ${status}` }).eq('id', logId)

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO:`, error)
    await supabase.from('webhook_logs').update({ 
      result: 'failed', 
      error_message: error instanceof Error ? error.message : 'Erro desconhecido' 
    }).eq('id', logId)
  }
}

// ============================================================================
// HANDLER PRINCIPAL - ACK RÁPIDO
// ============================================================================
serve(async (req) => {
  const startTime = Date.now()
  const requestId = crypto.randomUUID().slice(0, 8)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`\n${'='.repeat(70)}`)
  console.log(`🚀 [${requestId}] WEBHOOK MÚSICOS - ${new Date().toISOString()}`)
  console.log(`${'='.repeat(70)}`)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    const payload = await req.json()
    
    const eventType = payload.event
    const email = payload.client?.email?.toLowerCase().trim()
    const productId = payload.product?.id
    const status = payload.currentStatus

    console.log(`📦 [${requestId}] Dados: email=${email}, productId=${productId}, status=${status}, event=${eventType}`)

    // Handle checkoutAbandoned separately (quick)
    if (eventType === 'checkoutAbandoned') {
      const leadEmail = payload.lead?.email?.toLowerCase().trim()
      if (leadEmail) {
        const { data: existing } = await supabase
          .from('abandoned_checkouts')
          .select('id')
          .eq('email', leadEmail)
          .eq('product_id', productId)
          .gte('abandoned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle()

        if (!existing) {
          await supabase.from('abandoned_checkouts').insert({
            email: leadEmail,
            name: payload.lead?.name || '',
            phone: payload.lead?.cellphone?.replace(/\D/g, '') || '',
            product_id: productId,
            product_name: payload.product?.name || '',
            offer_name: payload.offer?.name || '',
            checkout_step: payload.lead?.step || 0,
            remarketing_status: 'pending',
            platform: 'musicos'
          })
        }
      }
      return new Response(JSON.stringify({ success: true, message: 'Lead captured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Limpeza automática de logs > 30 dias (async, não bloqueia)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    Promise.resolve(
      supabase.from('webhook_logs')
        .delete()
        .lt('received_at', thirtyDaysAgo)
        .limit(100)
    ).then(() => console.log(`   🧹 Limpeza automática executada`))
     .catch(() => {})

    // Log to webhook_logs (durable)
    const { data: logEntry, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        payload,
        platform: 'artes-musicos',
        email,
        product_id: productId || null,
        status,
        result: 'received'
      })
      .select('id')
      .single()

    if (logError || !logEntry) {
      console.error(`❌ [${requestId}] Falha ao gravar log:`, logError)
      return new Response(JSON.stringify({ error: 'Failed to log webhook' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const logId = logEntry.id
    console.log(`   ✅ Log criado: ${logId}`)
    // Processamento síncrono (Deno)
    await processGreennMusicosWebhook(supabase, payload, logId, requestId)

    // Return 200 immediately
    const duration = Date.now() - startTime
    console.log(`\n🚀 [${requestId}] ACK RÁPIDO em ${duration}ms`)
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook received, processing in background',
      logId,
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO:`, error)
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

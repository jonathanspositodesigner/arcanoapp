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

// Mapeamento de Product ID para tipo de plano (PromptClub)
const PRODUCT_ID_TO_PLAN: Record<number, 'arcano_basico' | 'arcano_pro' | 'arcano_unlimited'> = {
  148926: 'arcano_basico',
  148936: 'arcano_pro',
  148937: 'arcano_unlimited'
}

// Mapeamento de produtos Planos v2 → configuração do plano
const PLANOS2_PRODUCTS: Record<number, {
  slug: string;
  credits_per_month: number;
  daily_prompt_limit: number | null;
  has_image_generation: boolean;
  has_video_generation: boolean;
  cost_multiplier: number;
}> = {
  160732: {
    slug: 'starter',
    credits_per_month: 1800,
    daily_prompt_limit: 5,
    has_image_generation: false,
    has_video_generation: false,
    cost_multiplier: 1.0,
  },
  160735: {
    slug: 'pro',
    credits_per_month: 4200,
    daily_prompt_limit: 10,
    has_image_generation: true,
    has_video_generation: true,
    cost_multiplier: 1.0,
  },
  160738: {
    slug: 'ultimate',
    credits_per_month: 10800,
    daily_prompt_limit: 24,
    has_image_generation: true,
    has_video_generation: true,
    cost_multiplier: 1.0,
  },
  160742: {
    slug: 'unlimited',
    credits_per_month: 99999,
    daily_prompt_limit: null,
    has_image_generation: true,
    has_video_generation: true,
    cost_multiplier: 0.5,
  },
}

const emailTexts = {
  pt: { greeting: 'Olá', accessData: '📋 Dados do seu primeiro acesso:', email: 'Email', password: 'Senha', securityWarning: 'Por segurança, você deverá trocar sua senha no primeiro acesso.', clickButton: 'Clique no botão acima para fazer seu primeiro login!', copyright: '© ArcanoApp', important: 'Importante' },
  es: { greeting: 'Hola', accessData: '📋 Datos de tu primer acceso:', email: 'Email', password: 'Contraseña', securityWarning: 'Por seguridad, deberás cambiar tu contraseña en el primer acceso.', clickButton: '¡Haz clic en el botón de arriba!', copyright: '© ArcanoApp', important: 'Importante' }
}

function extractLocale(payload: any): 'pt' | 'es' {
  const saleMetas = payload.saleMetas || []
  for (const meta of saleMetas) {
    if (meta.meta_key === 'utm_locale' && meta.meta_value === 'es') return 'es'
  }
  return 'pt'
}

function detectPlanFromProductId(productId: number | undefined, requestId: string): 'arcano_basico' | 'arcano_pro' | 'arcano_unlimited' {
  if (!productId) return 'arcano_basico'
  return PRODUCT_ID_TO_PLAN[productId] || 'arcano_basico'
}

async function findUserByEmail(supabase: any, email: string, requestId: string): Promise<string | null> {
  const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
  if (profile?.id) return profile.id

  let page = 1
  while (page <= 10) {
    const { data: usersPage, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !usersPage?.users?.length) break
    const found = usersPage.users.find((u: any) => u.email?.toLowerCase() === email)
    if (found) return found.id
    if (usersPage.users.length < 1000) break
    page++
  }
  return null
}

async function sendWelcomeEmail(supabase: any, email: string, name: string, planType: string, requestId: string, locale: 'pt' | 'es' = 'pt'): Promise<void> {
  const t = emailTexts[locale]
  const planNames: Record<string, string> = { 'arcano_basico': 'Arcano Básico', 'arcano_pro': 'Arcano Pro', 'arcano_unlimited': 'Arcano Unlimited' }
  const planDisplayName = planNames[planType] || planType
  
  // Gerar dedup_key: email|product|YYYYMMDDHHMM
  const now = new Date()
  const dedupMinute = now.toISOString().slice(0, 16).replace(/[-T:]/g, '') // YYYYMMDDHHMM
  const dedupKey = `${email}|${planDisplayName}|${dedupMinute}`
  const trackingId = crypto.randomUUID()
  
  try {
    // PASSO 1: Tentar INSERT primeiro (atômico) - quem conseguir primeiro ganha
    const { data: inserted, error: insertError } = await supabase
      .from('welcome_email_logs')
      .insert({
        email,
        name,
        platform: 'promptverso',
        product_info: planDisplayName,
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
      .eq('platform', 'promptverso')
      .eq('locale', locale)
      .eq('is_active', true)
      .maybeSingle()

    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const platformUrl = 'https://arcanolab.voxvisual.com.br/login'
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

    const subject = template?.subject || '🎉 Bem-vindo ao ArcanoApp!'
    const senderName = template?.sender_name || 'ArcanoApp'
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'

    const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;background:#f4f4f4;padding:20px}.container{max-width:600px;margin:0 auto;background:white;padding:40px;border-radius:12px}h1{color:#552b99;text-align:center}.cta-button{display:block;background:#552b99;color:white;text-align:center;padding:16px;border-radius:8px;text-decoration:none;margin:20px 0}.credentials{background:#f8f4ff;padding:20px;border-radius:8px;margin:20px 0}.plan-badge{background:#552b99;color:white;padding:6px 12px;border-radius:20px;font-size:12px;display:inline-block}</style></head><body><div class="container"><h1>🎉 Bem-vindo ao ArcanoApp!</h1><p>${t.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p><p>Sua compra foi confirmada!</p><div style="text-align:center"><span class="plan-badge">✨ ${planDisplayName}</span></div><div class="credentials"><h3>${t.accessData}</h3><p><strong>${t.email}:</strong> ${email}</p><p><strong>${t.password}:</strong> ${email}</p><p>⚠️ ${t.securityWarning}</p></div><a href="${clickTrackingUrl}" class="cta-button">🚀 Acessar Plataforma</a><p style="text-align:center;color:#666">${t.clickButton}</p></div><img src="${trackingBaseUrl}?id=${trackingId}&action=open" width="1" height="1" style="display:none"/></body></html>`

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
      template_used: template?.id || 'default'
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
// EMAIL BOAS-VINDAS PLANOS V2
// ============================================================================
async function sendPlanos2WelcomeEmail(
  supabase: any, email: string, name: string, planSlug: string,
  creditsPerMonth: number, dailyPromptLimit: number | null,
  hasImageGen: boolean, hasVideoGen: boolean, costMultiplier: number,
  requestId: string
): Promise<void> {
  const planNames: Record<string, string> = {
    'starter': 'Plano Starter',
    'pro': 'Plano Pro',
    'ultimate': 'Plano Ultimate',
    'unlimited': 'Plano IA Unlimited',
  }
  const planDisplayName = planNames[planSlug] || planSlug

  const benefits: Record<string, string[]> = {
    'starter': [
      '✅ 1.800 créditos mensais (~30 imagens/mês)',
      '✅ 5 prompts premium por dia',
      '✅ Acesso à Biblioteca de Prompts',
      '✅ Atualizações diárias',
    ],
    'pro': [
      '✅ 4.200 créditos mensais (~70 imagens/mês)',
      '✅ 10 prompts premium por dia',
      '✅ Geração de Imagens com IA',
      '✅ Geração de Vídeos com IA',
      '✅ Acesso à Biblioteca de Prompts',
      '✅ Atualizações diárias',
    ],
    'ultimate': [
      '✅ 10.800 créditos mensais (~180 imagens/mês)',
      '✅ 24 prompts premium por dia',
      '✅ Geração de Imagens com IA',
      '✅ Geração de Vídeos com IA',
      '✅ Acesso à Biblioteca de Prompts',
      '✅ Atualizações diárias',
    ],
    'unlimited': [
      '✅ Créditos ilimitados',
      '✅ Sem limite de prompts',
      '✅ 50% OFF em todas as Ferramentas de IA',
      '✅ Geração de Imagens com IA',
      '✅ Geração de Vídeos com IA',
      '✅ Acesso à Biblioteca de Prompts',
      '✅ Atualizações diárias',
    ],
  }

  const planBenefits = benefits[planSlug] || benefits['starter']
  const benefitsHtml = planBenefits.map(b => `<p style="margin:4px 0;font-size:14px;">${b}</p>`).join('')

  const trackingId = crypto.randomUUID()
  const dedupMinute = new Date().toISOString().slice(0, 16).replace(/[-T:]/g, '')
  const dedupKey = `${email}|planos2_${planSlug}|${dedupMinute}`

  try {
    const { data: inserted, error: insertError } = await supabase
      .from('welcome_email_logs')
      .insert({
        email, name,
        platform: 'promptverso',
        product_info: `Planos2: ${planDisplayName}`,
        status: 'pending',
        tracking_id: trackingId,
        template_used: `planos2_${planSlug}`,
        locale: 'pt',
        dedup_key: dedupKey
      })
      .select('id')
      .single()

    if (insertError?.code === '23505') {
      console.log(`   ├─ [${requestId}] ⏭️ Email planos2 duplicado bloqueado`)
      return
    }
    if (insertError) {
      console.log(`   ├─ [${requestId}] ❌ Erro log email planos2: ${insertError.message}`)
      return
    }

    const logId = inserted.id
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")

    if (!clientId || !clientSecret) {
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: 'SendPulse não configurado' }).eq('id', logId)
      return
    }

    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const platformUrl = 'https://arcanoapp.voxvisual.com.br/'
    const clickTrackingUrl = `${trackingBaseUrl}?id=${trackingId}&action=click&redirect=${encodeURIComponent(platformUrl)}`

    const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    })

    if (!tokenResponse.ok) {
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: 'Falha token SendPulse' }).eq('id', logId)
      return
    }

    const { access_token } = await tokenResponse.json()

    const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;background:#f4f4f4;padding:20px}.container{max-width:600px;margin:0 auto;background:white;padding:40px;border-radius:12px}h1{color:#552b99;text-align:center}.cta-button{display:block;background:#552b99;color:white;text-align:center;padding:16px;border-radius:8px;text-decoration:none;margin:20px 0;font-size:16px;font-weight:bold}.credentials{background:#f8f4ff;padding:20px;border-radius:8px;margin:20px 0}.plan-badge{background:linear-gradient(135deg,#552b99,#8b5cf6);color:white;padding:8px 16px;border-radius:20px;font-size:14px;display:inline-block;font-weight:bold}.benefits{background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #22c55e}</style></head><body><div class="container"><h1>🎉 ${planDisplayName} Ativado!</h1><p>Olá${name ? ` <strong>${name}</strong>` : ''}!</p><p>Sua assinatura do <strong>${planDisplayName}</strong> foi ativada com sucesso!</p><div style="text-align:center"><span class="plan-badge">✨ ${planDisplayName}</span></div><div class="benefits"><h3 style="margin-top:0;">Seus benefícios:</h3>${benefitsHtml}</div><div class="credentials"><h3>📋 Dados do seu acesso:</h3><p><strong>Email:</strong> ${email}</p><p><strong>Senha:</strong> ${email}</p><p>⚠️ <strong>Importante:</strong> Por segurança, troque sua senha no primeiro acesso.</p></div><a href="${clickTrackingUrl}" class="cta-button">🚀 Acessar Plataforma</a><p style="text-align:center;color:#666">Clique no botão acima para fazer seu login!</p><hr style="border:none;border-top:1px solid #eee;margin:30px 0"/><p style="text-align:center;color:#999;font-size:12px">© ArcanoApp - Todos os direitos reservados</p></div><img src="${trackingBaseUrl}?id=${trackingId}&action=open" width="1" height="1" style="display:none"/></body></html>`

    const result = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${access_token}` },
      body: JSON.stringify({
        email: {
          html: btoa(unescape(encodeURIComponent(welcomeHtml))),
          text: `${planDisplayName} ativado! Email: ${email}, Senha: ${email}. Acesse: https://arcanoapp.voxvisual.com.br/`,
          subject: `🎉 ${planDisplayName} ativado! Acesse sua conta`,
          from: { name: 'ArcanoApp', email: 'contato@voxvisual.com.br' },
          to: [{ email, name: name || "" }],
        },
      }),
    }).then(r => r.json())

    await supabase.from('welcome_email_logs').update({
      status: result.result === true ? 'sent' : 'failed',
      error_message: result.result !== true ? JSON.stringify(result) : null,
    }).eq('id', logId)

    console.log(`   ├─ [${requestId}] ${result.result === true ? '✅ Email planos2 enviado' : '❌ Falha email planos2'}`)
  } catch (error) {
    console.log(`   ├─ [${requestId}] ❌ Erro email planos2: ${error}`)
  }
}

// ============================================================================
// PROCESSAMENTO PLANOS V2
// ============================================================================
async function processPlanos2Webhook(
  supabase: any, payload: any, logId: string, requestId: string,
  email: string, clientName: string,
  planConfig: typeof PLANOS2_PRODUCTS[number],
  productId: number, contractId: string | null
): Promise<void> {
  try {
    const offerName = payload.offer?.name || ''
    const productPeriod = payload.product?.period || 30

    // Calcular expiração: anual (365d) ou mensal (30d)
    const isAnual = offerName.toLowerCase().includes('anual') || productPeriod >= 365
    const daysToAdd = isAnual ? 365 : 30
    const expiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString()

    console.log(`   ├─ [${requestId}] 📋 Planos2: ${planConfig.slug}, ${isAnual ? 'ANUAL' : 'MENSAL'}, expira em ${daysToAdd}d`)

    // Idempotency check
    if (contractId) {
      const { data: existingLog } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('greenn_contract_id', String(contractId))
        .eq('result', 'success')
        .neq('id', logId)
        .maybeSingle()

      if (existingLog) {
        console.log(`   └─ [${requestId}] ⏭️ Contrato já processado: ${contractId}`)
        await supabase.from('webhook_logs').update({ result: 'ignored', error_message: 'Contrato já processado', payload: {} }).eq('id', logId)
        return
      }
    }

    // Find or create user
    let userId = await findUserByEmail(supabase, email, requestId)
    
    if (!userId) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, password: email, email_confirm: true
      })

      if (createError) {
        if (createError.message.includes('already been registered') || createError.message.includes('email_exists')) {
          let page = 1
          while (!userId && page <= 10) {
            const { data: usersPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
            const found = usersPage?.users?.find((u: any) => u.email?.toLowerCase() === email)
            if (found) userId = found.id
            if (!usersPage?.users?.length || usersPage.users.length < 1000) break
            page++
          }
          if (!userId) {
            await supabase.from('webhook_logs').update({ result: 'failed', error_message: 'User exists but not found' }).eq('id', logId)
            return
          }
        } else {
          throw createError
        }
      } else {
        userId = newUser.user.id
        console.log(`   ├─ ✅ Novo usuário: ${userId}`)
      }
    }

    // Upsert profile
    await supabase.from('profiles').upsert({
      id: userId, name: clientName, email, email_verified: true, password_changed: false, updated_at: new Date().toISOString()
    }, { onConflict: 'id' })

    // Upsert planos2 subscription
    const { error: subError } = await supabase
      .from('planos2_subscriptions')
      .upsert({
        user_id: userId,
        plan_slug: planConfig.slug,
        is_active: true,
        credits_per_month: planConfig.credits_per_month,
        daily_prompt_limit: planConfig.daily_prompt_limit,
        has_image_generation: planConfig.has_image_generation,
        has_video_generation: planConfig.has_video_generation,
        cost_multiplier: planConfig.cost_multiplier,
        greenn_product_id: productId,
        greenn_contract_id: contractId ? String(contractId) : null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (subError) {
      console.error(`   ├─ [${requestId}] ❌ Erro subscription:`, subError)
    } else {
      console.log(`   ├─ [${requestId}] ✅ Subscription: ${planConfig.slug}`)
    }

    // Reset credits (non-cumulative)
    const { error: resetError } = await supabase.rpc('reset_upscaler_credits', {
      _user_id: userId,
      _amount: planConfig.credits_per_month,
      _description: `Créditos ${isAnual ? 'anuais' : 'mensais'} - Plano ${planConfig.slug.charAt(0).toUpperCase() + planConfig.slug.slice(1)} (${planConfig.credits_per_month}/mês)`,
    })

    if (resetError) {
      console.error(`   ├─ [${requestId}] ❌ Erro créditos:`, resetError)
    } else {
      console.log(`   ├─ [${requestId}] ✅ ${planConfig.credits_per_month} créditos concedidos`)
    }

    // Mark success + clear payload
    await supabase.from('webhook_logs').update({ 
      result: 'success',
      greenn_contract_id: contractId ? String(contractId) : null,
      payload: {}
    }).eq('id', logId)

    // Send welcome email
    try {
      await sendPlanos2WelcomeEmail(
        supabase, email, clientName, planConfig.slug,
        planConfig.credits_per_month, planConfig.daily_prompt_limit,
        planConfig.has_image_generation, planConfig.has_video_generation,
        planConfig.cost_multiplier, requestId
      )
    } catch (e) {
      console.log(`   ├─ [${requestId}] ⚠️ Falha email planos2 (acesso já liberado)`)
    }

    console.log(`\n✅ [${requestId}] Plano ${planConfig.slug} ativado: ${email}, expira: ${expiresAt}`)
  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO Planos2:`, error)
    await supabase.from('webhook_logs').update({ 
      result: 'failed', 
      error_message: error instanceof Error ? error.message : 'Erro desconhecido' 
    }).eq('id', logId)
  }
}

// ============================================================================
// PROCESSAMENTO EM BACKGROUND
// ============================================================================
async function processGreennWebhook(supabase: any, payload: any, logId: string, requestId: string): Promise<void> {
  const email = payload.client?.email?.toLowerCase().trim()
  const clientName = payload.client?.name || ''
  const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
  const productId = payload.product?.id
  const productPeriod = payload.product?.period || 30
  const offerName = payload.offer?.name || ''
  const status = payload.currentStatus
  const contractId = payload.contract?.id || payload.sale?.id
  const locale = extractLocale(payload)
  const trialDays = payload.trial?.days || 7
  const trialEndDate = payload.trial?.end_date

  try {
    const isTrialStatus = status === 'trial' || status === 'trial_started' || status === 'trialing'
    const isPendingStatus = status === 'waiting_payment' || status === 'pending_payment' || status === 'pending'
    
    if (isPendingStatus) {
      await supabase.from('webhook_logs').update({ result: 'ignored', error_message: 'pending status' }).eq('id', logId)
      return
    }

    // Handle paid/approved/trial
    if (status === 'paid' || status === 'approved' || isTrialStatus) {
      // Check blacklist
      const { data: blacklisted } = await supabase.from('blacklisted_emails').select('id').eq('email', email).maybeSingle()
      if (blacklisted) {
        await supabase.from('webhook_logs').update({ result: 'blocked', error_message: 'Email blacklisted' }).eq('id', logId)
        return
      }

      // === PLANOS V2: Redirecionar para fluxo separado ===
      const planos2Config = PLANOS2_PRODUCTS[productId]
      if (planos2Config) {
        await processPlanos2Webhook(supabase, payload, logId, requestId, email, clientName, planos2Config, productId, contractId)
        return
      }

      const planType = detectPlanFromProductId(productId, requestId)
      let billingPeriod = 'monthly'
      if (offerName.toLowerCase().includes('anual') || productPeriod >= 365) billingPeriod = 'yearly'

      // Find or create user
      let userId = await findUserByEmail(supabase, email, requestId)
      
      if (!userId) {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email, password: email, email_confirm: true
        })

        if (createError) {
          if (createError.message.includes('already been registered') || createError.message.includes('email_exists')) {
            let page = 1
            while (!userId && page <= 10) {
              const { data: usersPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
              const found = usersPage?.users?.find((u: any) => u.email?.toLowerCase() === email)
              if (found) userId = found.id
              if (!usersPage?.users?.length || usersPage.users.length < 1000) break
              page++
            }
            if (!userId) {
              await supabase.from('webhook_logs').update({ result: 'failed', error_message: 'User exists but not found' }).eq('id', logId)
              return
            }
          } else {
            throw createError
          }
        } else {
          userId = newUser.user.id
          console.log(`   ├─ ✅ Novo usuário: ${userId}`)
        }
      }

      // Upsert profile
      await supabase.from('profiles').upsert({
        id: userId, name: clientName, phone: clientPhone, email, locale, updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

      // Calculate expiration
      let expiresAt: Date
      if (isTrialStatus) {
        expiresAt = trialEndDate ? new Date(trialEndDate) : new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      } else {
        const payloadDate = payload.contract?.current_period_end ? new Date(payload.contract.current_period_end) : null
        expiresAt = (payloadDate && payloadDate > new Date()) ? payloadDate : new Date(Date.now() + productPeriod * 24 * 60 * 60 * 1000)
      }

      // Upsert premium_users
      const { data: existingPremium } = await supabase.from('premium_users').select('id').eq('user_id', userId).maybeSingle()

      if (existingPremium) {
        await supabase.from('premium_users').update({
          is_active: true, plan_type: planType, billing_period: billingPeriod,
          expires_at: expiresAt.toISOString(), greenn_contract_id: contractId, greenn_product_id: productId
        }).eq('user_id', userId)
      } else {
        await supabase.from('premium_users').insert({
          user_id: userId, is_active: true, plan_type: planType, billing_period: billingPeriod,
          expires_at: expiresAt.toISOString(), subscribed_at: new Date().toISOString(),
          greenn_contract_id: contractId, greenn_product_id: productId
        })
      }

      // Reset subscription credits based on plan
      const planCredits: Record<string, number> = {
        'arcano_pro': 900,
        'arcano_unlimited': 1800
      }

      const creditsToReset = planCredits[planType]
      if (creditsToReset && creditsToReset > 0) {
        try {
          const creditDescription = `Créditos do plano ${planType === 'arcano_pro' ? 'Pro' : 'IA Unlimited'} - ${billingPeriod === 'yearly' ? 'Renovação Anual' : 'Renovação Mensal'}`
          
          const { error: creditError } = await supabase.rpc('reset_upscaler_credits', {
            _user_id: userId,
            _amount: creditsToReset,
            _description: creditDescription
          })
          
          if (creditError) {
            console.log(`   ├─ ⚠️ Erro ao resetar créditos: ${creditError.message}`)
          } else {
            console.log(`   ├─ ✅ Créditos resetados para ${creditsToReset}`)
          }
        } catch (creditError) {
          console.log(`   ├─ ⚠️ Falha ao resetar créditos: ${creditError}`)
        }
      }

      // Mark success BEFORE email + limpar payload
      await supabase.from('webhook_logs').update({ 
        result: 'success',
        payload: {} // Limpar payload para sucesso
      }).eq('id', logId)

      // Send email
      try {
        await sendWelcomeEmail(supabase, email, clientName, planType, requestId, locale)
      } catch (e) {
        console.log(`   ├─ ⚠️ Falha email (acesso já liberado)`)
      }

      console.log(`\n✅ [${requestId}] Premium ativado: ${planType}, expira: ${expiresAt.toISOString()}`)
      return
    }

    // Handle deactivation
    if (status === 'canceled' || status === 'unpaid' || status === 'refunded' || status === 'chargeback') {
      const userId = await findUserByEmail(supabase, email, requestId)

      if (userId) {
        // Desativar premium legado
        await supabase.from('premium_users').update({ is_active: false }).eq('user_id', userId)
        
        // Verificar e resetar planos2 se necessário
        const { data: planos2Sub } = await supabase
          .from('planos2_subscriptions')
          .select('plan_slug')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (planos2Sub && planos2Sub.plan_slug !== 'free') {
          await supabase.from('planos2_subscriptions').update({
            plan_slug: 'free',
            credits_per_month: 300,
            daily_prompt_limit: null,
            has_image_generation: false,
            has_video_generation: false,
            cost_multiplier: 1.0,
            expires_at: null,
            greenn_product_id: null,
            greenn_contract_id: null,
            updated_at: new Date().toISOString(),
          }).eq('user_id', userId)
          console.log(`   ├─ ✅ Planos2 resetado para Free`)
        }
        
        // Zero out credits when subscription ends
        try {
          await supabase.rpc('reset_upscaler_credits', {
            _user_id: userId,
            _amount: 0,
            _description: `Créditos zerados - ${status}`
          })
          console.log(`   ├─ ✅ Premium desativado + créditos zerados`)
        } catch (creditError) {
          console.log(`   ├─ ✅ Premium desativado (falha ao zerar créditos)`)
        }
        
        if (status === 'chargeback') {
          await supabase.from('blacklisted_emails').upsert({
            email, reason: 'chargeback', auto_blocked: true, blocked_at: new Date().toISOString()
          }, { onConflict: 'email' })
        }
      }

      await supabase.from('webhook_logs').update({ 
        result: 'success',
        payload: {} // Limpar payload
      }).eq('id', logId)
      return
    }

    // Other statuses
    await supabase.from('webhook_logs').update({ 
      result: 'ignored', 
      error_message: `Status: ${status}`,
      payload: {} // Limpar payload
    }).eq('id', logId)

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
  console.log(`🚀 [${requestId}] WEBHOOK PROMPTCLUB - ${new Date().toISOString()}`)
  console.log(`${'='.repeat(70)}`)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    const payload = await req.json()
    
    const rawEmail = payload.client?.email
    const productId = payload.product?.id
    const status = payload.currentStatus

    // ========== INPUT VALIDATION ==========
    // Validate email format
    if (!rawEmail || typeof rawEmail !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const email = rawEmail.toLowerCase().trim()
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email) || email.length > 320) {
      console.log(`📦 [${requestId}] Invalid email format: ${email.slice(0, 50)}...`)
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Validate productId is a number if present
    if (productId !== undefined && (typeof productId !== 'number' || productId <= 0 || productId > 999999999)) {
      console.log(`📦 [${requestId}] Invalid productId: ${productId}`)
      return new Response(JSON.stringify({ error: 'Invalid product ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    // Validate status is a non-empty string
    if (status && (typeof status !== 'string' || status.length > 100)) {
      console.log(`📦 [${requestId}] Invalid status format`)
      return new Response(JSON.stringify({ error: 'Invalid status format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📦 [${requestId}] Dados: email=${email}, productId=${productId}, status=${status}`)

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
        platform: 'prompts',
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
    await processGreennWebhook(supabase, payload, logId, requestId)

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

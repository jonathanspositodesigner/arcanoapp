import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

// Declaração do EdgeRuntime para TypeScript
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeamento de produtos → créditos lifetime
const PRODUCT_CREDITS: Record<number, number> = {
  156946: 1500,   // Pacote +1.500 (R$ 29,90)
  156948: 4200,   // Pacote +4.200 (R$ 39,90)
  156952: 10800   // Pacote +10.800 (R$ 99,90)
}

// Textos de email por idioma
const emailTexts = {
  pt: {
    greeting: 'Olá',
    accessData: '📋 Dados do seu primeiro acesso:',
    email: 'Email',
    password: 'Senha',
    securityWarning: 'Por segurança, você deverá trocar sua senha no primeiro acesso.',
    creditsAdded: 'créditos adicionados à sua conta',
    clickButton: 'Clique no botão acima para acessar sua conta e começar a usar seus créditos!',
    copyright: '© Ferramentas IA Arcanas',
    important: 'Importante'
  },
  es: {
    greeting: 'Hola',
    accessData: '📋 Datos de tu primer acceso:',
    email: 'Email',
    password: 'Contraseña',
    securityWarning: 'Por seguridad, deberás cambiar tu contraseña en el primer acceso.',
    creditsAdded: 'créditos añadidos a tu cuenta',
    clickButton: '¡Haz clic en el botón de arriba para acceder a tu cuenta y usar tus créditos!',
    copyright: '© Herramientas IA Arcanas',
    important: 'Importante'
  }
}

function extractUtmSource(payload: any): string | null {
  const saleMetas = payload.saleMetas || []
  for (const meta of saleMetas) {
    if (meta.meta_key === 'utm_source') {
      return meta.meta_value || null
    }
  }
  return null
}

function extractLocale(payload: any): 'pt' | 'es' {
  const saleMetas = payload.saleMetas || []
  for (const meta of saleMetas) {
    if (meta.meta_key === 'utm_locale' && meta.meta_value === 'es') {
      return 'es'
    }
  }
  return 'pt'
}

async function isEmailBlacklisted(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('blacklisted_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  return !!data
}

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

async function findOrCreateUser(
  supabase: any, 
  email: string, 
  clientName: string, 
  clientPhone: string, 
  requestId: string
): Promise<{ userId: string | null, isNewUser: boolean }> {
  // 1. Tentar criar usuário primeiro (mais eficiente para novos usuários)
  console.log(`   ├─ [${requestId}] 🔍 Tentando criar/buscar usuário: ${email}`)
  
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: email,
    email_confirm: true
  })

  if (newUser?.user) {
    console.log(`   ├─ [${requestId}] ✅ Novo usuário criado: ${newUser.user.id}`)
    return { userId: newUser.user.id, isNewUser: true }
  }

  // 2. Se erro for "email já existe", buscar o usuário existente
  if (createError?.message?.includes('already been registered') || 
      createError?.message?.includes('email_exists') ||
      createError?.message?.includes('already exists')) {
    console.log(`   ├─ [${requestId}] 📋 Email já existe, buscando...`)
    
    // Buscar em profiles primeiro (indexado)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    
    if (profile?.id) {
      console.log(`   ├─ [${requestId}] ✅ Usuário encontrado via profiles: ${profile.id}`)
      return { userId: profile.id, isNewUser: false }
    }
    
    // Fallback: buscar em auth.users paginado
    for (let page = 1; page <= 10; page++) {
      const { data: usersPage } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000
      })
      
      if (!usersPage?.users?.length) break
      
      const foundUser = usersPage.users.find((u: any) => 
        u.email?.toLowerCase() === email.toLowerCase()
      )
      
      if (foundUser) {
        console.log(`   ├─ [${requestId}] ✅ Usuário encontrado via auth.users: ${foundUser.id}`)
        return { userId: foundUser.id, isNewUser: false }
      }
    }
  }

  console.log(`   ├─ [${requestId}] ❌ Erro ao criar/buscar usuário: ${createError?.message}`)
  return { userId: null, isNewUser: false }
}

async function sendWelcomeEmail(
  supabase: any, 
  email: string, 
  name: string, 
  creditAmount: number, 
  isNewUser: boolean,
  requestId: string, 
  locale: 'pt' | 'es' = 'pt'
): Promise<void> {
  const t = emailTexts[locale]
  const trackingId = crypto.randomUUID()
  
  // Se não é novo usuário, apenas logar que os créditos foram adicionados
  if (!isNewUser) {
    console.log(`   ├─ [${requestId}] 📧 Usuário existente - pulando email de boas-vindas`)
    return
  }
  
  try {
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    
    if (!clientId || !clientSecret) {
      console.log(`   ├─ [${requestId}] ⚠️ SendPulse não configurado`)
      return
    }

    const platformUrl = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia'
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const clickTrackingUrl = `${trackingBaseUrl}?id=${trackingId}&action=click&redirect=${encodeURIComponent(platformUrl)}`

    const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        grant_type: "client_credentials", 
        client_id: clientId, 
        client_secret: clientSecret 
      }),
    })

    if (!tokenResponse.ok) {
      console.log(`   ├─ [${requestId}] ❌ Falha ao obter token SendPulse`)
      return
    }

    const { access_token } = await tokenResponse.json()

    const formattedCredits = creditAmount.toLocaleString('pt-BR')
    const subject = `🎉 +${formattedCredits} Créditos Adicionados à Sua Conta!`
    
    const welcomeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body{font-family:sans-serif;background:#f4f4f4;padding:20px}
    .container{max-width:600px;margin:0 auto;background:white;padding:40px;border-radius:12px}
    h1{color:#d4af37;text-align:center}
    .cta-button{display:block;background:#d4af37;color:white;text-align:center;padding:16px;border-radius:8px;text-decoration:none;margin:20px 0;font-weight:bold}
    .credentials{background:#fefce8;padding:20px;border-radius:8px;margin:20px 0}
    .credits-box{background:linear-gradient(135deg,#d4af37 0%,#f5d77a 100%);color:#1a1a1a;padding:30px;border-radius:12px;text-align:center;margin:20px 0}
    .credits-amount{font-size:48px;font-weight:bold}
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 Seus Créditos Estão Prontos!</h1>
    
    <p>${t.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p>
    
    <div class="credits-box">
      <div class="credits-amount">+${formattedCredits}</div>
      <div>${t.creditsAdded}</div>
    </div>
    
    <div class="credentials">
      <h3>${t.accessData}</h3>
      <p><strong>${t.email}:</strong> ${email}</p>
      <p><strong>${t.password}:</strong> ${email}</p>
      <p>⚠️ <strong>${t.important}:</strong> ${t.securityWarning}</p>
    </div>
    
    <a href="${clickTrackingUrl}" class="cta-button">🚀 Acessar Minha Conta</a>
    
    <p style="text-align:center;color:#666">${t.clickButton}</p>
    
    <p style="text-align:center;color:#666;font-size:12px">${t.copyright}</p>
  </div>
  <img src="${trackingBaseUrl}?id=${trackingId}&action=open" width="1" height="1" style="display:none"/>
</body>
</html>`

    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${access_token}` 
      },
      body: JSON.stringify({
        email: {
          html: btoa(unescape(encodeURIComponent(welcomeHtml))),
          text: `+${formattedCredits} créditos adicionados! Email: ${email}, Senha: ${email}`,
          subject,
          from: { name: 'Ferramentas IA Arcanas', email: 'contato@voxvisual.com.br' },
          to: [{ email, name: name || "" }],
        },
      }),
    })

    const result = await emailResponse.json()
    console.log(`   ├─ [${requestId}] ${result.result === true ? '✅ Email enviado' : '❌ Falha no email'}`)
    
  } catch (error) {
    console.log(`   ├─ [${requestId}] ❌ Erro email: ${error}`)
  }
}

// ============================================================================
// PROCESSAMENTO EM BACKGROUND
// ============================================================================
async function processGreennCreditosWebhook(
  supabase: any, 
  payload: any, 
  logId: string, 
  requestId: string
): Promise<void> {
  const email = payload.client?.email?.toLowerCase().trim()
  const clientName = payload.client?.name || ''
  const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
  const productId = payload.product?.id
  const productName = payload.product?.name || ''
  const status = payload.currentStatus
  const contractId = payload.contract?.id || payload.sale?.id
  const userLocale = extractLocale(payload)

  try {
    // =========================================================================
    // REFUNDED / CHARGEBACK
    // =========================================================================
    if (status === 'refunded' || status === 'chargeback') {
      console.log(`\n🚫 [${requestId}] PROCESSANDO ${status.toUpperCase()}`)
      console.log(`   ├─ Email: ${email}`)
      console.log(`   ├─ Produto: ${productName} (ID: ${productId})`)
      
      // Em chargebacks, adicionar à blacklist
      if (status === 'chargeback') {
        await addToBlacklist(supabase, email, 'chargeback_creditos', requestId)
      }
      
      // Créditos lifetime não são removidos (impossível rastrear)
      console.log(`   ├─ [${requestId}] ⚠️ Créditos lifetime não podem ser revertidos`)
      
      await supabase.from('webhook_logs').update({ 
        result: 'logged',
        notes: `${status} - créditos não revertidos`
      }).eq('id', logId)
      
      return
    }

    // =========================================================================
    // STATUS NÃO PROCESSÁVEL
    // =========================================================================
    if (status !== 'paid' && status !== 'approved') {
      console.log(`\n⏭️ [${requestId}] Status ignorado: ${status}`)
      await supabase.from('webhook_logs').update({ result: 'ignored' }).eq('id', logId)
      return
    }

    // =========================================================================
    // PAID / APPROVED - Processar créditos
    // =========================================================================
    console.log(`\n💳 [${requestId}] PROCESSANDO COMPRA DE CRÉDITOS`)
    console.log(`   ├─ Email: ${email}`)
    console.log(`   ├─ Nome: ${clientName}`)
    console.log(`   ├─ Produto: ${productName} (ID: ${productId})`)
    console.log(`   ├─ Contract: ${contractId}`)

    // Validar email
    if (!email) {
      console.log(`   ├─ [${requestId}] ❌ Email não fornecido`)
      await supabase.from('webhook_logs').update({ 
        result: 'failed', 
        error_message: 'Email não fornecido' 
      }).eq('id', logId)
      return
    }

    // Verificar blacklist
    if (await isEmailBlacklisted(supabase, email)) {
      console.log(`   ├─ [${requestId}] 🚫 Email na blacklist`)
      await supabase.from('webhook_logs').update({ 
        result: 'blocked', 
        error_message: 'Email na blacklist' 
      }).eq('id', logId)
      return
    }

    // Mapear produto → créditos
    const creditAmount = PRODUCT_CREDITS[productId]
    if (!creditAmount) {
      console.log(`   ├─ [${requestId}] ❌ Produto não mapeado: ${productId}`)
      await supabase.from('webhook_logs').update({ 
        result: 'failed', 
        error_message: `Produto não mapeado: ${productId}` 
      }).eq('id', logId)
      return
    }
    
    console.log(`   ├─ [${requestId}] 💰 Créditos a adicionar: ${creditAmount.toLocaleString('pt-BR')}`)

    // Verificar duplicidade por contract_id
    if (contractId) {
      const { data: existingLog } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('contract_id', contractId)
        .eq('result', 'success')
        .neq('id', logId)
        .maybeSingle()
      
      if (existingLog) {
        console.log(`   ├─ [${requestId}] ⏭️ Já processado anteriormente (contract: ${contractId})`)
        await supabase.from('webhook_logs').update({ 
          result: 'duplicate',
          notes: 'Contract já processado'
        }).eq('id', logId)
        return
      }
    }

    // Buscar ou criar usuário
    const { userId, isNewUser } = await findOrCreateUser(
      supabase, email, clientName, clientPhone, requestId
    )

    if (!userId) {
      console.log(`   ├─ [${requestId}] ❌ Falha ao criar/buscar usuário`)
      await supabase.from('webhook_logs').update({ 
        result: 'failed', 
        error_message: 'Falha ao criar/buscar usuário' 
      }).eq('id', logId)
      return
    }

    // Upsert profile
    await supabase.from('profiles').upsert({
      id: userId,
      name: clientName || undefined,
      phone: clientPhone || undefined,
      email,
      password_changed: isNewUser ? false : undefined,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id', ignoreDuplicates: false })

    // Adicionar créditos lifetime via RPC
    const { data: creditResult, error: creditError } = await supabase.rpc('add_lifetime_credits', {
      _user_id: userId,
      _amount: creditAmount,
      _description: `Compra pacote +${creditAmount.toLocaleString('pt-BR')} créditos (${productName})`
    })

    if (creditError) {
      console.log(`   ├─ [${requestId}] ❌ Erro ao adicionar créditos: ${creditError.message}`)
      await supabase.from('webhook_logs').update({ 
        result: 'failed', 
        error_message: `Erro RPC: ${creditError.message}` 
      }).eq('id', logId)
      return
    }

    console.log(`   ├─ [${requestId}] ✅ Créditos adicionados! Novo saldo: ${creditResult?.[0]?.new_balance || 'N/A'}`)

    // Enviar email de boas-vindas (apenas para novos usuários)
    await sendWelcomeEmail(supabase, email, clientName, creditAmount, isNewUser, requestId, userLocale)

    // Atualizar log com sucesso
    await supabase.from('webhook_logs').update({ 
      result: 'success',
      user_id: userId,
      notes: `+${creditAmount} créditos${isNewUser ? ' (novo usuário)' : ''}`
    }).eq('id', logId)

    console.log(`   └─ [${requestId}] ✅ Processamento concluído com sucesso!`)

  } catch (error) {
    console.error(`   └─ [${requestId}] ❌ Erro no processamento:`, error)
    await supabase.from('webhook_logs').update({ 
      result: 'failed', 
      error_message: String(error) 
    }).eq('id', logId)
  }
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================
serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = Date.now()

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🎯 [${requestId}] WEBHOOK GREENN CRÉDITOS - ${new Date().toISOString()}`)
  console.log(`${'='.repeat(60)}`)

  try {
    const payload = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const email = payload.client?.email?.toLowerCase().trim() || ''
    const productId = payload.product?.id
    const productName = payload.product?.name || ''
    const status = payload.currentStatus
    const contractId = payload.contract?.id || payload.sale?.id

    console.log(`📦 Status: ${status}`)
    console.log(`📧 Email: ${email}`)
    console.log(`🏷️ Produto: ${productName} (ID: ${productId})`)
    console.log(`📝 Contract: ${contractId}`)

    // Log inicial (Fast Acknowledgment)
    const { data: logData } = await supabase.from('webhook_logs').insert({
      platform: 'creditos',
      email,
      status,
      product_id: productId,
      product_name: productName,
      contract_id: contractId,
      payload,
      result: 'received'
    }).select('id').single()

    const logId = logData?.id

    // Retorna 200 OK imediatamente (< 100ms)
    const ackTime = Date.now() - startTime
    console.log(`⚡ [${requestId}] ACK em ${ackTime}ms`)

    // Background processing
    EdgeRuntime.waitUntil(
      processGreennCreditosWebhook(supabase, payload, logId, requestId)
    )

    return new Response(
      JSON.stringify({ success: true, requestId, ackTime }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error(`❌ [${requestId}] Erro fatal:`, error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

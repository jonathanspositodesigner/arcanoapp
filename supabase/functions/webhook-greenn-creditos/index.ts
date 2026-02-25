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

// Mapeamento de produtos → créditos lifetime
const PRODUCT_CREDITS: Record<number, number> = {
  156946: 1500,   // Pacote +1.500 (R$ 29,90)
  156948: 4200,   // Pacote +4.200 (R$ 39,90)
  156952: 14000,  // Pacote +14.000 (R$ 79,90)
  // Upscaler Arcano - Planos
  156954: 1800,   // Upscaler Arcano - Plano Starter (R$ 29,90)
  156957: 4200,   // Upscaler Arcano - Plano Pro (R$ 39,90)
  156960: 12000,  // Upscaler Arcano - Plano Studio (R$ 99,90)
  // Arcano Cloner
  159713: 4200    // Arcano Cloner (4.200 créditos vitalícios)
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

    const platformUrl = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo'
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

async function sendArcanoClonnerEmail(
  supabase: any,
  email: string,
  name: string,
  creditAmount: number,
  isNewUser: boolean,
  requestId: string
): Promise<void> {
  if (!isNewUser) {
    console.log(`   ├─ [${requestId}] 📧 Usuário existente - pulando email Arcano Cloner`)
    return
  }

  try {
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")

    if (!clientId || !clientSecret) {
      console.log(`   ├─ [${requestId}] ⚠️ SendPulse não configurado`)
      return
    }

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

    const subject = `🎉 Seu Arcano Cloner está ativado! Comece a criar agora`
    const appUrl = 'https://arcanoapp.voxvisual.com.br'

    const arcanoHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arcano Cloner Ativado</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d0d1a; color: #e2e8f0; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .header { background: linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center; border-bottom: 2px solid #8b5cf6; }
    .header-badge { display: inline-block; background: rgba(139,92,246,0.2); border: 1px solid #8b5cf6; color: #c4b5fd; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; padding: 6px 16px; border-radius: 50px; margin-bottom: 20px; }
    .header h1 { font-size: 28px; font-weight: 800; color: #ffffff; line-height: 1.2; margin-bottom: 8px; }
    .header h1 span { color: #d4af37; }
    .header p { color: #94a3b8; font-size: 15px; }
    .body { background: #111827; padding: 32px; }
    .greeting { font-size: 16px; color: #cbd5e1; margin-bottom: 24px; line-height: 1.6; }
    .greeting strong { color: #ffffff; }
    .product-box { background: linear-gradient(135deg, #1e1b4b 0%, #1a1a3e 100%); border: 1px solid #4c1d95; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .product-box-title { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .product-box-title .icon { font-size: 24px; }
    .product-box-title h2 { font-size: 18px; font-weight: 700; color: #8b5cf6; }
    .product-box p { color: #94a3b8; font-size: 14px; line-height: 1.7; }
    .product-box p strong { color: #c4b5fd; }
    .credits-box { background: linear-gradient(135deg, #1c1008 0%, #261a0a 100%); border: 2px solid #d4af37; border-radius: 12px; padding: 24px; margin-bottom: 20px; text-align: center; }
    .credits-box .credits-label { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #92400e; margin-bottom: 8px; }
    .credits-box .credits-amount { font-size: 52px; font-weight: 900; color: #d4af37; line-height: 1; margin-bottom: 4px; }
    .credits-box .credits-sub { font-size: 14px; color: #b45309; font-weight: 600; margin-bottom: 12px; }
    .credits-box .credits-detail { font-size: 13px; color: #78716c; }
    .credentials-box { background: #1e2939; border: 1px solid #374151; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .credentials-box h3 { font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; margin-bottom: 16px; }
    .credential-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #374151; }
    .credential-row:last-of-type { border-bottom: none; }
    .credential-label { font-size: 13px; color: #6b7280; font-weight: 600; }
    .credential-value { font-size: 13px; color: #e2e8f0; font-family: monospace; background: #111827; padding: 4px 10px; border-radius: 6px; }
    .warning-row { margin-top: 12px; display: flex; align-items: flex-start; gap: 10px; background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.2); border-radius: 8px; padding: 12px; }
    .warning-row .warning-icon { font-size: 18px; flex-shrink: 0; }
    .warning-row p { font-size: 13px; color: #fbbf24; line-height: 1.5; }
    .cta-button { display: block; background: linear-gradient(135deg, #7c3aed, #5b21b6); color: #ffffff !important; text-align: center; padding: 18px 32px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; margin: 24px 0; letter-spacing: 0.5px; }
    .footer { background: #0d1117; border-radius: 0 0 16px 16px; padding: 24px 32px; text-align: center; border-top: 1px solid #1f2937; }
    .footer p { font-size: 12px; color: #4b5563; margin-bottom: 6px; }
    .footer a { color: #8b5cf6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-badge">✨ Compra Confirmada</div>
      <h1>Arcano <span>Cloner</span><br>ativado com sucesso!</h1>
      <p>Sua ferramenta de IA está pronta para usar</p>
    </div>

    <div class="body">
      <p class="greeting">
        Olá${name ? `, <strong>${name}</strong>` : ''}! 🎉<br><br>
        Parabéns pela sua compra! Você agora tem acesso ao <strong>Arcano Cloner</strong> — a ferramenta de IA para criar fotos com <strong>alta fidelidade ao seu rosto e aparência</strong>.
      </p>

      <div class="product-box">
        <div class="product-box-title">
          <span class="icon">🧬</span>
          <h2>O que é o Arcano Cloner?</h2>
        </div>
        <p>
          Envie <strong>uma foto sua</strong> + <strong>uma imagem de referência</strong> e a IA recria você na cena com precisão e criatividade ajustável. Ideal para criar conteúdo personalizado, avatares realistas e fotos artísticas com o seu rosto.
        </p>
      </div>

      <div class="credits-box">
        <div class="credits-label">💎 Créditos Vitalícios Incluídos</div>
        <div class="credits-amount">+4.200</div>
        <div class="credits-sub">créditos vitalícios na sua conta</div>
        <div class="credits-detail">= 42 gerações disponíveis · 100 créditos por geração</div>
      </div>

      <div class="credentials-box">
        <h3>📋 Dados de Acesso</h3>
        <div class="credential-row">
          <span class="credential-label">Email</span>
          <span class="credential-value">${email}</span>
        </div>
        <div class="credential-row">
          <span class="credential-label">Senha temporária</span>
          <span class="credential-value">${email}</span>
        </div>
        <div class="warning-row">
          <span class="warning-icon">⚠️</span>
          <p>Por segurança, <strong>troque sua senha</strong> no primeiro acesso.</p>
        </div>
      </div>

      <a href="${appUrl}" class="cta-button">🚀 Acessar o Arcano Cloner agora</a>
    </div>

    <div class="footer">
      <p>Link direto: <a href="${appUrl}">${appUrl}</a></p>
      <p style="margin-top:8px">© Ferramentas IA Arcanas · Arcano Cloner</p>
    </div>
  </div>
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
          html: btoa(unescape(encodeURIComponent(arcanoHtml))),
          text: `Arcano Cloner ativado! Acesse em: ${appUrl}\nEmail: ${email}\nSenha temporária: ${email}\n+4.200 créditos vitalícios incluídos.`,
          subject,
          from: { name: 'Arcano App', email: 'contato@voxvisual.com.br' },
          to: [{ email, name: name || "" }],
        },
      }),
    })

    const result = await emailResponse.json()
    console.log(`   ├─ [${requestId}] ${result.result === true ? '✅ Email Arcano Cloner enviado' : '❌ Falha no email Arcano Cloner'}`)

  } catch (error) {
    console.log(`   ├─ [${requestId}] ❌ Erro email Arcano Cloner: ${error}`)
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
      
      // Revogar créditos lifetime do usuário
      const creditAmount = PRODUCT_CREDITS[productId]
      if (creditAmount && email) {
        // Buscar usuário pelo email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()
        
        if (profile?.id) {
          const { data: revokeResult, error: revokeError } = await supabase.rpc('revoke_credits_on_refund', {
            _user_id: profile.id,
            _amount: creditAmount,
            _description: `Reembolso (${status}): ${productName}`
          })
          
          if (revokeError) {
            console.log(`   ├─ [${requestId}] ❌ Erro ao revogar créditos: ${revokeError.message}`)
          } else {
            const revoked = revokeResult?.[0]?.amount_revoked || 0
            const newBal = revokeResult?.[0]?.new_balance || 0
            console.log(`   ├─ [${requestId}] ✅ ${revoked} créditos revogados (novo saldo lifetime: ${newBal})`)
          }
          
          await supabase.from('webhook_logs').update({ 
            result: 'success',
            notes: `${status} - ${revokeResult?.[0]?.amount_revoked || 0} créditos revogados`
          }).eq('id', logId)
        } else {
          console.log(`   ├─ [${requestId}] ⚠️ Usuário não encontrado para revogar créditos`)
          await supabase.from('webhook_logs').update({ 
            result: 'logged',
            notes: `${status} - usuário não encontrado para revogar`
          }).eq('id', logId)
        }
      } else {
        console.log(`   ├─ [${requestId}] ⚠️ Produto não mapeado ou email ausente`)
        await supabase.from('webhook_logs').update({ 
          result: 'logged',
          notes: `${status} - produto sem mapeamento de créditos`
        }).eq('id', logId)
      }
      
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

    // Verificar duplicidade por greenn_contract_id (coluna indexada)
    if (contractId) {
      const { data: existingLog } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('product_id', productId)
        .eq('result', 'success')
        .eq('greenn_contract_id', String(contractId))
        .neq('id', logId)
        .maybeSingle()
      
      if (existingLog) {
        console.log(`   ├─ [${requestId}] ⏭️ DUPLICATA: contract ${contractId} já processado. Ignorando.`)
        await supabase.from('webhook_logs').update({ 
          result: 'duplicate',
          error_message: `Webhook duplicado - contract ${contractId} já processado`
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
      email_verified: true,
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

    // Criar/atualizar registro em user_pack_purchases para exibição correta na home
    const PRODUCT_PACK_SLUGS: Record<number, string> = {
      159713: 'arcano-cloner',
      156954: 'upscaller-arcano',
      156957: 'upscaller-arcano',
      156960: 'upscaller-arcano',
      156946: 'upscaller-arcano',
      156948: 'upscaller-arcano',
      156952: 'upscaller-arcano',
    }
    const packSlugForProduct = productId ? PRODUCT_PACK_SLUGS[productId] : null
    if (packSlugForProduct && userId) {
      const { data: existingPackPurchase } = await supabase
        .from('user_pack_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('pack_slug', packSlugForProduct)
        .eq('is_active', true)
        .maybeSingle()

      if (!existingPackPurchase) {
        await supabase.from('user_pack_purchases').insert({
          user_id: userId,
          pack_slug: packSlugForProduct,
          access_type: 'vitalicio',
          has_bonus_access: false,
          expires_at: null,
          greenn_contract_id: contractId,
          product_name: productName,
          platform: 'creditos'
        })
        console.log(`   ├─ [${requestId}] ✅ user_pack_purchases criado: ${packSlugForProduct}`)
      } else {
        console.log(`   ├─ [${requestId}] ℹ️ user_pack_purchases já existe: ${packSlugForProduct}`)
      }
    }

    // Enviar email de boas-vindas (apenas para novos usuários)
    if (productId === 159713) {
      await sendArcanoClonnerEmail(supabase, email, clientName, creditAmount, isNewUser, requestId)
    } else {
      await sendWelcomeEmail(supabase, email, clientName, creditAmount, isNewUser, requestId, userLocale)
    }

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
      payload,
      result: 'received',
      greenn_contract_id: contractId ? String(contractId) : null
    }).select('id').single()

    const logId = logData?.id

    // Retorna 200 OK imediatamente (< 100ms)
    const ackTime = Date.now() - startTime
    console.log(`⚡ [${requestId}] ACK em ${ackTime}ms`)

    // Processar webhook antes de retornar
    await processGreennCreditosWebhook(supabase, payload, logId, requestId)

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

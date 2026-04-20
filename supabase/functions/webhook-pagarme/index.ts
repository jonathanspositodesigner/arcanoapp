/**
 * Edge Function: webhook-pagarme
 * Recebe notificações do Pagar.me (order.paid, charge.paid, charge.refunded, order.canceled).
 * Idempotência via webhook_logs. Mesma lógica dos outros webhooks.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ===== SendPulse OAuth2 =====
let cachedToken: { token: string; expiresAt: number } | null = null

async function getSendPulseToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token
  }
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: Deno.env.get("SENDPULSE_CLIENT_ID"),
      client_secret: Deno.env.get("SENDPULSE_CLIENT_SECRET"),
    }),
  })
  if (!response.ok) throw new Error(`SendPulse token error: ${response.status}`)
  const data = await response.json()
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 3300000 }
  return data.access_token
}

// ===== Admin Sale Notification =====
const ADMIN_EMAIL = 'jonathandesigner1993@gmail.com'

interface AdminSaleData {
  productName: string
  amount: number
  paymentMethod: string
  customerEmail: string
  customerName: string
  platform: string
  requestId: string
}

function buildAdminSaleEmailHtml(data: AdminSaleData): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  const amountStr = data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const methodLabels: Record<string, string> = {
    pix: 'PIX', credit_card: 'Cartão de Crédito', boleto: 'Boleto',
    account_money: 'Saldo MP', debit_card: 'Cartão de Débito',
  }
  const methodLabel = methodLabels[data.paymentMethod] || data.paymentMethod

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0015;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:48px 16px;">
  <div style="background:linear-gradient(160deg,#1e0a3c 0%,#2a1252 40%,#1e0a3c 100%);border-radius:20px;padding:50px 40px;text-align:center;border:1px solid rgba(212,175,55,0.15);">
    <div style="width:80px;height:80px;margin:0 auto 20px;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 50%,#d4af37 100%);border-radius:50%;line-height:80px;font-size:36px;box-shadow:0 8px 32px rgba(212,175,55,0.35);">🎉</div>
    <h1 style="color:#d4af37;font-size:26px;margin:0 0 8px;font-weight:800;letter-spacing:1px;">NOVA VENDA APROVADA!</h1>
    <p style="color:#e8d5f5;font-size:16px;margin:0 0 32px;">🏆 Parabéns! Mais uma venda no Arcano!</p>
    <div style="background:rgba(0,0,0,0.3);border-radius:14px;padding:28px 24px;text-align:left;border:1px solid rgba(212,175,55,0.1);">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;">📦 Produto</td><td style="padding:10px 0;color:#fff;font-size:14px;font-weight:600;text-align:right;">${data.productName}</td></tr>
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">💰 Valor</td><td style="padding:10px 0;color:#4ade80;font-size:18px;font-weight:700;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${amountStr}</td></tr>
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">💳 Método</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${methodLabel}</td></tr>
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">📧 Cliente</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${data.customerEmail}</td></tr>
        ${data.customerName ? `<tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">👤 Nome</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${data.customerName}</td></tr>` : ''}
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">📅 Data</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${dateStr} às ${timeStr}</td></tr>
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">🏷️ Plataforma</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${data.platform}</td></tr>
      </table>
    </div>
    <p style="color:#c4b5fd;font-size:15px;margin:32px 0 0;font-style:italic;line-height:1.6;">"Continue assim! Cada venda é uma confirmação do seu trabalho incrível." 🚀</p>
    <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:32px 0 0;">Vox Visual © ${now.getFullYear()}</p>
  </div>
</div>
</body>
</html>`
}

async function sendAdminSaleNotification(data: AdminSaleData): Promise<void> {
  console.log(`   ├─ 📧 Enviando notificação admin...`)
  const token = await getSendPulseToken()
  const html = buildAdminSaleEmailHtml(data)
  const htmlBase64 = btoa(unescape(encodeURIComponent(html)))

  const emailPayload = {
    email: {
      html: htmlBase64,
      text: "",
      subject: `🎉 Nova venda: ${data.productName} — ${data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      from: { name: "Arcano Notificações", email: "contato@voxvisual.com.br" },
      to: [{ name: "Jonathan", email: ADMIN_EMAIL }]
    }
  }

  const response = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(emailPayload)
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`   ├─ ❌ Admin email error: ${errText}`)
    throw new Error(`Admin email failed: ${response.status}`)
  }
  console.log(`   ├─ ✅ Admin notificado: ${ADMIN_EMAIL}`)
}

function getUnsubscribeLink(email: string): string {
  const baseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  return `${baseUrl}/functions/v1/email-unsubscribe?email=${encodeURIComponent(email)}`
}

function buildPurchaseEmailHtml(email: string, productName: string, ctaLink: string, options?: { packSlug?: string; productType?: string; accessType?: string; billingPeriod?: string }): string {
  const unsubscribeLink = getUnsubscribeLink(email)
  const isUpscalerOrCredits = options?.packSlug === 'upscaler-arcano' || options?.productType === 'credits'
  const isLandingBundle = options?.productType === 'landing_bundle'
  const isSubscription = options?.productType === 'subscription'
  
  // Determine access label
  let accessLabel = 'Vitalício'
  if (isSubscription) {
    // Subscriptions show billing period, NOT access_type
    accessLabel = options?.billingPeriod === 'anual' ? 'Anual' : 'Mensal'
  } else if (options?.accessType === '6_meses') accessLabel = '6 Meses'
  else if (options?.accessType === '1_ano') accessLabel = '1 Ano'
  else if (options?.accessType === 'vitalicio') accessLabel = 'Vitalício'

  let benefitBlock = ''
  if (isLandingBundle) {
    benefitBlock = `<div style="background:linear-gradient(135deg,rgba(168,85,247,0.12) 0%,rgba(236,72,153,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(168,85,247,0.3);text-align:center;">
        <p style="color:#c084fc;font-size:15px;font-weight:700;margin:0 0 8px;">🚀 Seus créditos já estão disponíveis!</p>
        <p style="color:#e9d5ff;font-size:13px;margin:0;line-height:1.6;">Acesse o <strong>Arcano Cloner</strong> e comece a criar suas fotos profissionais agora mesmo. Sem prompts, tudo com um clique!</p>
      </div>`
  } else if (isUpscalerOrCredits) {
    benefitBlock = `<div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
        <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 Acesso Vitalício Ativado!</p>
        <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Você <strong>NÃO precisa comprar créditos</strong> para usar o Upscaler Arcano. Seu acesso vitalício já inclui uso ilimitado da ferramenta!</p>
      </div>`
  } else if (isSubscription) {
    const renewalText = options?.billingPeriod === 'anual'
      ? 'Sua assinatura será renovada automaticamente a cada 12 meses.'
      : 'Sua assinatura será renovada automaticamente a cada mês.'
    benefitBlock = `<div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
        <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 ${productName} Ativado!</p>
        <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Seus créditos e ferramentas de IA já estão disponíveis! ${renewalText}</p>
      </div>`
  } else {
    benefitBlock = `<div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
        <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 Acesso ${accessLabel} Ativado!</p>
        <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Seu <strong>${productName}</strong> já está liberado! Acesse a plataforma para explorar todos os conteúdos do seu pack.</p>
      </div>`
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0015;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:48px 16px;">
  <div style="background:linear-gradient(160deg,#1e0a3c 0%,#2a1252 40%,#1e0a3c 100%);border-radius:20px 20px 0 0;padding:50px 40px 36px;text-align:center;border:1px solid rgba(212,175,55,0.15);border-bottom:none;">
    <div style="width:88px;height:88px;margin:0 auto 24px;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 50%,#d4af37 100%);border-radius:50%;line-height:88px;text-align:center;box-shadow:0 8px 32px rgba(212,175,55,0.35);">
      <span style="font-size:42px;line-height:88px;">✅</span>
    </div>
    <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 12px;letter-spacing:-0.5px;">Compra Confirmada!</h1>
    <p style="color:#c4b5fd;font-size:17px;margin:0;line-height:1.5;">Seu acesso ao <strong style="color:#f5e27a;">${productName}</strong> já está liberado.</p>
  </div>
  <div style="background:linear-gradient(180deg,#2a1252 0%,#1e0a3c 100%);padding:0 40px 40px;border:1px solid rgba(212,175,55,0.15);border-top:none;border-bottom:none;">
    <div style="background:rgba(255,255,255,0.06);border-radius:14px;padding:28px;margin-bottom:32px;border:1px solid rgba(212,175,55,0.25);">
      <p style="color:#d4af37;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 20px;text-align:center;">Suas credenciais de acesso</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#a78bfa;padding:12px 16px;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.06);">📧 Email</td>
          <td style="color:#ffffff;padding:12px 16px;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);word-break:break-all;">${email}</td>
        </tr>
        <tr>
          <td style="color:#a78bfa;padding:12px 16px;font-size:14px;">🔑 Senha</td>
          <td style="color:#ffffff;padding:12px 16px;font-size:14px;text-align:right;font-weight:600;word-break:break-all;">${email}</td>
        </tr>
      </table>
      <div style="margin-top:16px;padding:10px 16px;background:rgba(248,113,113,0.1);border-radius:8px;border:1px solid rgba(248,113,113,0.2);text-align:center;">
        <p style="color:#fca5a5;font-size:12px;margin:0;">⚠️ Recomendamos alterar sua senha no primeiro acesso</p>
      </div>
    </div>
    ${benefitBlock}
    <div style="text-align:center;padding-bottom:8px;">
      <a href="${ctaLink}" style="display:inline-block;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 100%);color:#1a0533;text-decoration:none;padding:18px 52px;border-radius:12px;font-weight:700;font-size:17px;letter-spacing:0.3px;box-shadow:0 6px 24px rgba(212,175,55,0.4);">
        Acessar Agora →
      </a>
    </div>
  </div>
  <div style="background:#150828;border-radius:0 0 20px 20px;padding:28px 40px;border:1px solid rgba(212,175,55,0.15);border-top:1px solid rgba(212,175,55,0.1);text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0 0 10px;">
      <a href="https://wa.me/5533988819891" style="color:#a78bfa;text-decoration:underline;font-size:12px;">Problemas com seu produto? Fale conosco</a>
    </p>
    <p style="color:#4b5563;font-size:11px;margin:0 0 8px;">Vox Visual © ${new Date().getFullYear()}</p>
    <p style="margin:0;"><a href="${unsubscribeLink}" style="color:#4b5563;font-size:11px;text-decoration:underline;">Cancelar inscrição</a></p>
  </div>
</div>
</body>
</html>`
}

type PurchaseEmailDispatchResult = {
  status: 'sent' | 'already_sent' | 'blacklisted' | 'failed'
  attempts: number
  error?: string
}

function buildPurchaseTemplateUsed(productName: string): string {
  return `pagarme_purchase_${productName}`
}

function buildPurchaseDedupKey(orderId: string): string {
  return `pagarme_order_${orderId}`
}

async function logPurchaseEmail(
  supabase: any,
  payload: {
    email: string
    productName: string
    dedupKey: string
    status: 'sent' | 'failed'
    trackingId: string
    errorMessage?: string | null
    sentAt?: string
  }
) {
  await supabase.from('welcome_email_logs').insert({
    email: payload.email,
    template_used: buildPurchaseTemplateUsed(payload.productName),
    dedup_key: payload.dedupKey,
    tracking_id: payload.trackingId,
    status: payload.status,
    sent_at: payload.sentAt ?? new Date().toISOString(),
    error_message: payload.errorMessage ?? null,
    product_info: payload.productName,
    platform: 'pagarme',
  })
}

async function sendPurchaseEmailAttempt(
  supabase: any,
  params: {
    orderId: string
    email: string
    productName: string
    ctaLink: string
    requestId: string
    paidAtIso: string
    options?: { packSlug?: string; productType?: string; accessType?: string; billingPeriod?: string }
  }
): Promise<PurchaseEmailDispatchResult> {
  const normalizedEmail = params.email.toLowerCase().trim()
  const dedupKey = buildPurchaseDedupKey(params.orderId)
  const templateUsed = buildPurchaseTemplateUsed(params.productName)

  const { data: existingByOrder } = await supabase
    .from('welcome_email_logs')
    .select('id')
    .eq('dedup_key', dedupKey)
    .eq('status', 'sent')
    .maybeSingle()

  if (existingByOrder) {
    console.log(`   ├─ ℹ️ Email já enviado (dedup order): ${normalizedEmail} | ${params.orderId}`)
    return { status: 'already_sent', attempts: 0 }
  }

  const { data: existingLegacy } = await supabase
    .from('welcome_email_logs')
    .select('id')
    .eq('email', normalizedEmail)
    .eq('template_used', templateUsed)
    .eq('status', 'sent')
    .gte('sent_at', params.paidAtIso)
    .maybeSingle()

  if (existingLegacy) {
    console.log(`   ├─ ℹ️ Email já enviado (legacy dedup): ${normalizedEmail}`)
    return { status: 'already_sent', attempts: 0 }
  }

  const { data: blacklisted } = await supabase
    .from('blacklisted_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (blacklisted) {
    console.log(`   ├─ ⛔ Email blacklisted: ${normalizedEmail}`)
    const trackingId = crypto.randomUUID()
    await logPurchaseEmail(supabase, {
      email: normalizedEmail,
      productName: params.productName,
      dedupKey,
      trackingId,
      status: 'failed',
      errorMessage: 'email_blacklisted',
    })
    return { status: 'blacklisted', attempts: 1, error: 'email_blacklisted' }
  }

  const trackingId = crypto.randomUUID()
  const html = buildPurchaseEmailHtml(normalizedEmail, params.productName, params.ctaLink, params.options)
  const htmlBase64 = btoa(unescape(encodeURIComponent(html)))

  const token = await getSendPulseToken()

  const emailPayload = {
    email: {
      html: htmlBase64,
      text: "",
      subject: `✅ Compra confirmada - ${params.productName}`,
      from: { name: "Vox Visual", email: "contato@voxvisual.com.br" },
      to: [{ name: normalizedEmail, email: normalizedEmail }]
    }
  }

  const response = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(emailPayload)
  })

  const responseText = await response.text()
  console.log(`   ├─ 📧 SendPulse response: ${response.status}`)

  await logPurchaseEmail(supabase, {
    email: normalizedEmail,
    productName: params.productName,
    dedupKey,
    trackingId,
    status: response.ok ? 'sent' : 'failed',
    errorMessage: response.ok ? null : responseText,
  })

  if (response.ok) return { status: 'sent', attempts: 1 }
  return { status: 'failed', attempts: 1, error: responseText || `http_${response.status}` }
}

async function sendPurchaseEmail(
  supabase: any,
  params: {
    orderId: string
    email: string
    productName: string
    ctaLink: string
    requestId: string
    paidAtIso: string
    options?: { packSlug?: string; productType?: string; accessType?: string; billingPeriod?: string }
  }
): Promise<PurchaseEmailDispatchResult> {
  const maxAttempts = 3
  const retryDelaysMs = [2000, 5000]

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await sendPurchaseEmailAttempt(supabase, params)

      if (result.status === 'sent' || result.status === 'already_sent' || result.status === 'blacklisted') {
        return { ...result, attempts: attempt }
      }

      if (attempt < maxAttempts) {
        const delayMs = retryDelaysMs[attempt - 1] ?? 8000
        console.log(`   ├─ ⏳ Tentativa ${attempt}/${maxAttempts} falhou. Retry em ${Math.round(delayMs / 1000)}s...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } else {
        return { ...result, attempts: attempt }
      }
    } catch (err: any) {
      const dedupKey = buildPurchaseDedupKey(params.orderId)
      const errorMessage = err?.message || 'unknown_error'
      console.error(`   ├─ ❌ Erro tentativa ${attempt}/${maxAttempts}: ${errorMessage}`)

      try {
        await logPurchaseEmail(supabase, {
          email: params.email.toLowerCase().trim(),
          productName: params.productName,
          dedupKey,
          trackingId: crypto.randomUUID(),
          status: 'failed',
          errorMessage,
        })
      } catch (_) {}

      if (attempt < maxAttempts) {
        const delayMs = retryDelaysMs[attempt - 1] ?? 8000
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } else {
        return { status: 'failed', attempts: attempt, error: errorMessage }
      }
    }
  }

  return { status: 'failed', attempts: maxAttempts, error: 'exhausted_retries' }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const rawBody = await req.text()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = JSON.parse(rawBody)

    // Pagar.me webhook format: { id, type, data }
    const eventId = body.id
    const eventType = body.type
    const eventData = body.data

    console.log(`\n🔔 [${requestId}] WEBHOOK PAGAR.ME`)
    console.log(`   ├─ event_id: ${eventId}`)
    console.log(`   ├─ type: ${eventType}`)
    console.log(`   ├─ data.id: ${eventData?.id}`)
    console.log(`   ├─ data.status: ${eventData?.status}`)

    // ===== IDEMPOTÊNCIA via webhook_logs =====
    const idempotencyKey = eventId || `${eventType}_${eventData?.id}`
    
    const { data: existingLog } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('platform', 'pagarme')
      .eq('transaction_id', idempotencyKey)
      .maybeSingle()

    if (existingLog) {
      console.log(`   ├─ ⏭️ Evento já processado (idempotência): ${idempotencyKey}`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Extrair order_id do metadata — buscar em múltiplos caminhos
    let orderId: string | null = 
      eventData?.metadata?.order_id ||
      eventData?.order?.metadata?.order_id ||
      eventData?.charges?.[0]?.metadata?.order_id ||
      null

    // Check if this is a subscription-related event
    const subscriptionId: string | null = 
      eventData?.subscription?.id ||
      eventData?.id ||
      null
    const isSubscriptionEvent = eventType.startsWith('subscription.') || 
      (eventType === 'charge.paid' && eventData?.subscription) ||
      (eventType === 'charge.refunded' && eventData?.subscription)

    let order: any = null
    let product: any = null

    // Tentativa 1: buscar por order_id do metadata
    if (orderId) {
      const { data, error } = await supabase
        .from('asaas_orders')
        .select('*, mp_products(*)')
        .eq('id', orderId)
        .single()
      if (!error && data) {
        order = data
        product = data.mp_products
      }
    }

    // Tentativa 2 (fallback): buscar por asaas_payment_id (charge ID salvo no pagamento)
    if (!order && eventData?.id) {
      console.log(`   ├─ 🔍 Fallback: buscando ordem por asaas_payment_id = ${eventData.id}`)
      const { data, error } = await supabase
        .from('asaas_orders')
        .select('*, mp_products(*)')
        .eq('asaas_payment_id', eventData.id)
        .maybeSingle()
      if (!error && data) {
        order = data
        product = data.mp_products
        orderId = data.id
        console.log(`   ├─ ✅ Ordem encontrada via fallback: ${orderId}`)
      }
    }

    // Tentativa 3 (fallback): buscar por charge ID dentro de charges do order event
    if (!order && eventData?.charges?.[0]?.id) {
      const chargeId = eventData.charges[0].id
      console.log(`   ├─ 🔍 Fallback 2: buscando por charge_id = ${chargeId}`)
      const { data, error } = await supabase
        .from('asaas_orders')
        .select('*, mp_products(*)')
        .eq('asaas_payment_id', chargeId)
        .maybeSingle()
      if (!error && data) {
        order = data
        product = data.mp_products
        orderId = data.id
        console.log(`   ├─ ✅ Ordem encontrada via fallback 2: ${orderId}`)
      }
    }

    // Tentativa 4 (subscription): buscar por pagarme_subscription_id
    if (!order && subscriptionId && isSubscriptionEvent) {
      console.log(`   ├─ 🔍 Fallback 3: buscando por pagarme_subscription_id = ${subscriptionId}`)
      const subIdToSearch = eventData?.subscription?.id || subscriptionId
      const { data, error } = await supabase
        .from('asaas_orders')
        .select('*, mp_products(*)')
        .eq('pagarme_subscription_id', subIdToSearch)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!error && data) {
        order = data
        product = data.mp_products
        orderId = data.id
        console.log(`   ├─ ✅ Ordem encontrada via subscription_id: ${orderId}`)
      }
    }

    if (!order) {
      // For subscription.canceled events without a matching order, handle gracefully
      if (eventType === 'subscription.canceled' && subscriptionId) {
        console.log(`   ├─ 📋 subscription.canceled sem ordem — buscando planos2_subscriptions por subscription_id`)
        const subIdToSearch = eventData?.subscription?.id || subscriptionId
        const { data: subData } = await supabase
          .from('planos2_subscriptions')
          .select('user_id, pagarme_subscription_id')
          .eq('pagarme_subscription_id', subIdToSearch)
          .maybeSingle()

        // CRITICAL: Only revoke if the subscription_id in DB matches the event's subscription_id.
        // This prevents an old canceled subscription from revoking a newer active plan.
        if (subData?.user_id && subData?.pagarme_subscription_id === subIdToSearch) {
          console.log(`   ├─ 🔄 Revogando plano do user ${subData.user_id} (subscription canceled, sub_id match confirmed)`)
          await supabase.from('planos2_subscriptions').upsert({
            user_id: subData.user_id,
            plan_slug: 'free',
            is_active: true,
            credits_per_month: 100,
            daily_prompt_limit: 5,
            has_image_generation: false,
            has_video_generation: false,
            cost_multiplier: 1.0,
            expires_at: null,
            pagarme_subscription_id: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

          await supabase.rpc('reset_upscaler_credits', {
            _user_id: subData.user_id,
            _amount: 0,
            _description: 'Subscription cancelada no Pagar.me'
          })

          await supabase.from('webhook_logs').insert({
            platform: 'pagarme',
            event_type: eventType,
            transaction_id: idempotencyKey,
            status: 'subscription_canceled',
            email: null,
            payload: body,
          })

          console.log(`   ├─ ✅ Plano revogado → free (subscription canceled)`)
          return new Response('OK', { status: 200, headers: corsHeaders })
        } else if (subData?.user_id) {
          console.log(`   ├─ ⚠️ subscription.canceled ignorado: sub_id ${subIdToSearch} não corresponde ao plano ativo (${subData?.pagarme_subscription_id})`)
          await supabase.from('webhook_logs').insert({
            platform: 'pagarme',
            event_type: eventType,
            transaction_id: idempotencyKey,
            status: 'ignored_old_subscription',
            email: null,
            payload: body,
          })
          return new Response('OK', { status: 200, headers: corsHeaders })
        }
      }

      console.log(`   ├─ ⏭️ Ordem não encontrada por nenhum método`)
      await supabase.from('webhook_logs').insert({
        platform: 'pagarme',
        event_type: eventType,
        transaction_id: idempotencyKey,
        status: 'order_not_found',
        email: null,
        payload: body,
      })
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    console.log(`   ├─ produto: ${product?.title}`)
    console.log(`   ├─ ordem status atual: ${order.status}`)
    console.log(`   ├─ ordem id: ${orderId}`)

    // =============================================
    // PAGAMENTO CONFIRMADO
    // =============================================
    // Atomic lock: update pending→processing to prevent race condition
    // (Pagar.me sends order.paid + charge.paid simultaneously)
    // For subscription renewals (charge.paid from subscription where order is already paid),
    // we skip the lock and process the renewal directly.
    let lockedOrder = null
    let isSubscriptionRenewal = false

    if ((eventType === 'order.paid' || eventType === 'charge.paid') && order.status === 'pending') {
      const { data: locked, error: lockError } = await supabase
        .from('asaas_orders')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()

      if (lockError) {
        console.error(`   ├─ ❌ Erro ao travar ordem:`, lockError)
      }
      lockedOrder = locked
      if (!lockedOrder) {
        console.log(`   ├─ ⏭️ Ordem já sendo processada por outro webhook (race condition evitada)`)
        await supabase.from('webhook_logs').insert({
          platform: 'pagarme',
          event_type: eventType,
          transaction_id: idempotencyKey,
          status: 'skipped_race',
          email: order.user_email,
          product_name: product?.title,
          payload: body,
        })
        return new Response('OK', { status: 200, headers: corsHeaders })
      }
    } else if (eventType === 'charge.paid' && order.status === 'paid' && isSubscriptionEvent && product?.type === 'subscription') {
      // This is a subscription RENEWAL — order was already paid on the first cycle
      console.log(`   ├─ 🔄 Subscription renewal detected (order already paid, new charge.paid)`)
      lockedOrder = { id: order.id }
      isSubscriptionRenewal = true
    }

    if (lockedOrder) {
      console.log(`\n✅ [${requestId}] PAGAMENTO PAGAR.ME CONFIRMADO - Processando...`)

      // === EXTRAIR EMAIL REAL: prioridade gateway > ordem (ignorar @temp.arcano) ===
      const isTempEmail = (e: string | null) => !e || e.includes('@temp.arcano')
      
      const gatewayCustomer = eventData?.customer || eventData?.charges?.[0]?.customer || {}
      const gatewayEmail = gatewayCustomer?.email?.toLowerCase()?.trim() || null
      const orderEmail = order.user_email?.toLowerCase()?.trim() || null
      
      let email: string | null = null
      if (gatewayEmail && !isTempEmail(gatewayEmail) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gatewayEmail)) {
        email = gatewayEmail
      } else if (orderEmail && !isTempEmail(orderEmail)) {
        email = orderEmail
      }

      if (!email) {
        console.error(`   ├─ ❌ Nenhum email válido encontrado (gateway: ${gatewayEmail}, ordem: ${orderEmail})`)
        await supabase.from('webhook_logs').insert({
          platform: 'pagarme',
          event_type: eventType,
          transaction_id: idempotencyKey,
          status: 'no_valid_email',
          email: null,
          product_name: product?.title,
          payload: body,
        })
        // Não marca como erro — pode vir outro evento com email
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      console.log(`   ├─ 📧 Email efetivo: ${email} (gateway: ${gatewayEmail}, ordem: ${orderEmail})`)

      // Atualizar ordem com email real se estava null ou temp
      if (isTempEmail(orderEmail) || !orderEmail) {
        await supabase.from('asaas_orders').update({ 
          user_email: email, 
          updated_at: new Date().toISOString() 
        }).eq('id', order.id)
        console.log(`   ├─ 📝 Ordem atualizada com email real: ${email}`)
      }

      // 1. Criar ou buscar usuário
      let userId: string | null = null

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, password: email, email_confirm: true
      })

      if (createError) {
        if (createError.message?.includes('email') || createError.code === 'email_exists') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .maybeSingle()

          if (profile) {
            userId = profile.id
            console.log(`   ├─ 👤 Usuário existente (profile): ${userId}`)
          } else {
            let page = 1
            while (!userId && page <= 10) {
              const { data: usersPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
              const found = usersPage?.users?.find((u: any) => u.email?.toLowerCase() === email)
              if (found) userId = found.id
              if (!usersPage?.users?.length || usersPage.users.length < 1000) break
              page++
            }
            if (userId) {
              console.log(`   ├─ 👤 Usuário existente (auth): ${userId}`)
            }
          }

          if (!userId) {
            console.error(`   ├─ ❌ Usuário existe mas não encontrado`)
            await supabase.from('asaas_orders').update({
              status: 'error',
              updated_at: new Date().toISOString()
            }).eq('id', order.id)
            return new Response('OK', { status: 200, headers: corsHeaders })
          }
        } else {
          throw createError
        }
      } else {
        userId = newUser.user.id
        console.log(`   ├─ ✅ Novo usuário criado: ${userId}`)
      }

      // 2. Upsert profile com dados completos (nome, telefone, CPF, endereço)
      // Buscar perfil existente para não sobrescrever dados já preenchidos
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('name, phone, cpf, address_line, address_zip, address_city, address_state, address_country')
        .eq('id', userId)
        .maybeSingle()

      // Fontes de dados: ordem local > payload Pagar.me > existente
      const customer = eventData?.customer || eventData?.charges?.[0]?.customer || {}
      const billingAddress = eventData?.charges?.[0]?.last_transaction?.billing_address || customer?.address || {}
      const mobilePhone = customer?.phones?.mobile_phone

      const profileName = existingProfile?.name || order.user_name || customer?.name || null
      const profilePhone = existingProfile?.phone || order.user_phone || (mobilePhone ? `${mobilePhone.area_code}${mobilePhone.number}` : null)
      const profileCpf = existingProfile?.cpf || order.user_cpf || customer?.document || null
      const profileAddressLine = existingProfile?.address_line || order.user_address_line || billingAddress?.line_1 || null
      const profileAddressZip = existingProfile?.address_zip || order.user_address_zip || billingAddress?.zip_code || null
      const profileAddressCity = existingProfile?.address_city || order.user_address_city || billingAddress?.city || null
      const profileAddressState = existingProfile?.address_state || order.user_address_state || billingAddress?.state || null
      const profileAddressCountry = existingProfile?.address_country || order.user_address_country || billingAddress?.country || 'BR'

      const profileData: Record<string, unknown> = {
        id: userId,
        email,
        name: profileName,
        phone: profilePhone,
        cpf: profileCpf,
        address_line: profileAddressLine,
        address_zip: profileAddressZip,
        address_city: profileAddressCity,
        address_state: profileAddressState,
        address_country: profileAddressCountry,
        email_verified: true,
        updated_at: new Date().toISOString()
      }
      // Only set password_changed=false for NEW profiles to avoid resetting existing users
      if (!existingProfile) {
        profileData.password_changed = false
      }
      await supabase.from('profiles').upsert(profileData, { onConflict: 'id' })
      console.log(`   ├─ ✅ Profile atualizado (nome: ${profileName}, cpf: ${profileCpf ? '***' : 'N/A'}, endereço: ${profileAddressCity || 'N/A'})`)

      // 3. Processar produto
      if (product.type === 'pack' && product.pack_slug) {
        const accessType = product.access_type || 'vitalicio'
        let expiresAt: string | null = null
        if (accessType === '6_meses') {
          expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
        } else if (accessType === '1_ano') {
          expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
        const hasBonusAccess = accessType !== '6_meses'

        const { data: existingPurchase } = await supabase
          .from('user_pack_purchases')
          .select('id, access_type, expires_at')
          .eq('user_id', userId)
          .eq('pack_slug', product.pack_slug)
          .eq('is_active', true)
          .maybeSingle()

        if (!existingPurchase) {
          await supabase.from('user_pack_purchases').insert({
            user_id: userId,
            pack_slug: product.pack_slug,
            access_type: accessType,
            has_bonus_access: hasBonusAccess,
            expires_at: expiresAt,
            product_name: product.title,
            platform: 'pagarme'
          })
          console.log(`   ├─ ✅ Acesso concedido: ${product.pack_slug} (${accessType})`)
        } else {
          // UPGRADE: always update if renewal/upgrade (e.g. 1_ano → vitalicio, or extend expiry)
          const ACCESS_RANK: Record<string, number> = { '6_meses': 1, '1_ano': 2, 'vitalicio': 3 }
          const existingRank = ACCESS_RANK[existingPurchase.access_type] || 0
          const newRank = ACCESS_RANK[accessType] || 0
          const isExpired = !!existingPurchase.expires_at && new Date(existingPurchase.expires_at) < new Date()

          if (isExpired) {
            // Pack expirado: tratar QUALQUER compra como renovação completa, ignorando rank.
            await supabase.from('user_pack_purchases').update({
              access_type: accessType,
              has_bonus_access: hasBonusAccess,
              expires_at: expiresAt,
              product_name: product.title,
              platform: 'pagarme',
              purchased_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', existingPurchase.id)
            console.log(`   ├─ ✅ Acesso RENOVADO (estava expirado): ${product.pack_slug} (${existingPurchase.access_type} → ${accessType})`)
          } else if (newRank > existingRank) {
            // Upgrade access type
            await supabase.from('user_pack_purchases').update({
              access_type: accessType,
              has_bonus_access: hasBonusAccess,
              expires_at: expiresAt,
              product_name: product.title,
              platform: 'pagarme',
              purchased_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', existingPurchase.id)
            console.log(`   ├─ ✅ Acesso ATUALIZADO: ${product.pack_slug} (${existingPurchase.access_type} → ${accessType})`)
          } else if (newRank === existingRank && existingPurchase.expires_at) {
            // Same tier but has expiry — extend or renew
            const currentExpiry = new Date(existingPurchase.expires_at)
            const newExpiry = expiresAt ? new Date(Math.max(currentExpiry.getTime(), new Date(expiresAt).getTime())) : null
            await supabase.from('user_pack_purchases').update({
              expires_at: newExpiry?.toISOString() || null,
              product_name: product.title,
              platform: 'pagarme',
              purchased_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', existingPurchase.id)
            console.log(`   ├─ ✅ Acesso RENOVADO: ${product.pack_slug} (${accessType}, expira: ${newExpiry?.toISOString() || 'nunca'})`)
          } else {
            console.log(`   ├─ ℹ️ Acesso já existente e superior/igual: ${product.pack_slug} (${existingPurchase.access_type})`)
          }
        }

        // Bundle: conceder packs extras para produtos do tipo bundle
        const BUNDLE_EXTRA_PACKS: Record<string, Array<{pack_slug: string, access_type: string}>> = {
          'pack4lancamento': [
            { pack_slug: 'pack-de-sao-joao', access_type: 'vitalicio' }
          ],
          'combo-1e2-1ano': [
            { pack_slug: 'pack-arcano-vol-2', access_type: '1_ano' }
          ],
          'combo-1ao3-vitalicio': [
            { pack_slug: 'pack-arcano-vol-2', access_type: 'vitalicio' },
            { pack_slug: 'pack-arcano-vol-3', access_type: 'vitalicio' }
          ]
        }

        const extraPacks = BUNDLE_EXTRA_PACKS[product.slug] || []
        for (const extra of extraPacks) {
          const { data: existingExtra } = await supabase
            .from('user_pack_purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('pack_slug', extra.pack_slug)
            .eq('is_active', true)
            .maybeSingle()

          if (!existingExtra) {
            await supabase.from('user_pack_purchases').insert({
              user_id: userId,
              pack_slug: extra.pack_slug,
              access_type: extra.access_type,
              has_bonus_access: true,
              expires_at: null,
              product_name: `Bundle: ${product.title} → ${extra.pack_slug}`,
              platform: 'pagarme'
            })
            console.log(`   ├─ ✅ Bundle: acesso extra concedido: ${extra.pack_slug}`)
          } else {
            console.log(`   ├─ ℹ️ Bundle: acesso extra já existente: ${extra.pack_slug}`)
          }
        }

        // === BÔNUS V3: conceder acesso ao pack V2 (SEM 10k créditos, SEM image/video) ===
        if (product.slug === 'upscaler-arcano-v3') {
          const { data: existingV2Pack } = await supabase
            .from('user_pack_purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('pack_slug', 'upscaller-arcano')
            .eq('is_active', true)
            .maybeSingle()

          if (!existingV2Pack) {
            await supabase.from('user_pack_purchases').insert({
              user_id: userId,
              pack_slug: 'upscaller-arcano',
              access_type: 'vitalicio',
              is_active: true,
              has_bonus_access: false,
              product_name: 'Bônus V3: acesso V2',
              platform: 'pagarme'
            })
            console.log(`   ├─ ✅ Bônus V3: acesso ao pack V2 (upscaller-arcano) concedido`)
          } else {
            console.log(`   ├─ ℹ️ Bônus V3: pack V2 já existente`)
          }
          console.log(`   ├─ ℹ️ V3: apenas pack V2 bônus, SEM créditos extras, SEM image/video flags`)
        }

      }

      if (product.type === 'credits' && product.credits_amount > 0) {
        const { error: creditsError } = await supabase.rpc('add_lifetime_credits', {
          _user_id: userId,
          _amount: product.credits_amount,
          _description: `Compra Pagar.me: ${product.title}`
        })
        if (creditsError) {
          console.error(`   ├─ ❌ Erro ao adicionar créditos:`, creditsError)
        } else {
          console.log(`   ├─ ✅ +${product.credits_amount} créditos adicionados`)
        }
      }

      // === LANDING BUNDLE ACTIVATION (one-time purchase with lifetime credits + permanent premium) ===
      if (product.type === 'landing_bundle' && product.plan_slug) {
        console.log(`   ├─ 🎁 Landing bundle: ${product.plan_slug} (${product.credits_amount} créditos vitalícios)`)

        const PLAN_CONFIG_BUNDLE: Record<string, {
          has_image_generation: boolean;
          has_video_generation: boolean;
          cost_multiplier: number;
        }> = {
          'starter': { has_image_generation: false, has_video_generation: false, cost_multiplier: 1.0 },
          'pro': { has_image_generation: true, has_video_generation: true, cost_multiplier: 1.0 },
          'ultimate': { has_image_generation: true, has_video_generation: true, cost_multiplier: 1.0 },
        }

        // 1. Add lifetime credits
        if (product.credits_amount > 0) {
          const { error: creditsError } = await supabase.rpc('add_lifetime_credits', {
            _user_id: userId,
            _amount: product.credits_amount,
            _description: `Landing bundle: ${product.title}`
          })
          if (creditsError) {
            console.error(`   ├─ ❌ Erro ao adicionar créditos landing_bundle:`, creditsError)
          } else {
            console.log(`   ├─ ✅ +${product.credits_amount} créditos vitalícios adicionados`)
          }
        }

        // 2. Activate permanent premium benefits (only upgrade, never downgrade)
        const bundleConfig = PLAN_CONFIG_BUNDLE[product.plan_slug]
        if (bundleConfig) {
          const PLAN_RANK: Record<string, number> = { 'free': 0, 'starter': 1, 'pro': 2, 'ultimate': 3, 'unlimited': 4 }

          // Check existing subscription to avoid downgrade
          const { data: existingSub } = await supabase
            .from('planos2_subscriptions')
            .select('plan_slug')
            .eq('user_id', userId)
            .maybeSingle()

          const existingRank = PLAN_RANK[existingSub?.plan_slug || 'free'] || 0
          const newRank = PLAN_RANK[product.plan_slug] || 0

          if (newRank >= existingRank) {
            await supabase.from('planos2_subscriptions').upsert({
              user_id: userId,
              plan_slug: product.plan_slug,
              is_active: true,
              credits_per_month: 0, // No monthly credits — only lifetime
              daily_prompt_limit: null,
              has_image_generation: bundleConfig.has_image_generation,
              has_video_generation: bundleConfig.has_video_generation,
              cost_multiplier: bundleConfig.cost_multiplier,
              expires_at: null, // Never expires
              pagarme_subscription_id: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            console.log(`   ├─ ✅ Benefícios premium permanentes ativados: ${product.plan_slug}`)
          } else {
            console.log(`   ├─ ℹ️ Plano superior já ativo (${existingSub?.plan_slug}), mantendo`)
          }
        }
      }

      // === SUBSCRIPTION PLAN ACTIVATION ===
      if (product.type === 'subscription' && product.plan_slug) {
        console.log(`   ├─ 📋 Ativando plano: ${product.plan_slug} (${product.billing_period})`)

        const PLAN_CONFIG: Record<string, {
          credits_per_month: number;
          daily_prompt_limit: number | null;
          has_image_generation: boolean;
          has_video_generation: boolean;
          cost_multiplier: number;
        }> = {
          'starter': { credits_per_month: 1500, daily_prompt_limit: null, has_image_generation: false, has_video_generation: false, cost_multiplier: 1.0 },
          'pro': { credits_per_month: 5000, daily_prompt_limit: null, has_image_generation: true, has_video_generation: true, cost_multiplier: 1.0 },
          'ultimate': { credits_per_month: 14000, daily_prompt_limit: null, has_image_generation: true, has_video_generation: true, cost_multiplier: 1.0 },
          'unlimited': { credits_per_month: 14000, daily_prompt_limit: null, has_image_generation: true, has_video_generation: true, cost_multiplier: 1.0 },
        }

        const config = PLAN_CONFIG[product.plan_slug]
        if (config) {
          const periodDays = product.billing_period === 'anual' ? 365 : 30
          const expiresAt = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString()

          // Get pagarme_subscription_id from order or event
          const subId = order.pagarme_subscription_id || 
            eventData?.subscription?.id || 
            null

          // Check existing subscription to preserve landing_bundle benefits (image/video gen)
          const { data: existingSubForPlan } = await supabase
            .from('planos2_subscriptions')
            .select('has_image_generation, has_video_generation')
            .eq('user_id', userId)
            .maybeSingle()

          const preserveImageGen = config.has_image_generation || (existingSubForPlan?.has_image_generation === true)
          const preserveVideoGen = config.has_video_generation || (existingSubForPlan?.has_video_generation === true)

          // Upsert subscription
          const upsertData: Record<string, any> = {
            user_id: userId,
            plan_slug: product.plan_slug,
            is_active: true,
            credits_per_month: config.credits_per_month,
            daily_prompt_limit: config.daily_prompt_limit,
            has_image_generation: preserveImageGen,
            has_video_generation: preserveVideoGen,
            cost_multiplier: config.cost_multiplier,
            expires_at: expiresAt,
            pagarme_subscription_id: subId,
            last_credit_reset_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }


          await supabase.from('planos2_subscriptions').upsert(upsertData, { onConflict: 'user_id' })

          // Reset monthly credits to the plan amount
          const { error: resetError } = await supabase.rpc('reset_upscaler_credits', {
            _user_id: userId,
            _amount: config.credits_per_month,
            _description: `Ativação plano ${product.plan_slug} (${product.billing_period}) via Pagar.me`
          })
          if (resetError) {
            console.error(`   ├─ ❌ Erro ao resetar créditos:`, resetError)
          }

          console.log(`   ├─ ✅ Plano ${product.plan_slug} ativado (${config.credits_per_month} créditos, expira: ${expiresAt}, sub_id: ${subId})`)
        } else {
          console.error(`   ├─ ❌ Config não encontrada para plan_slug: ${product.plan_slug}`)
        }
      }

      // 4. Determinar método de pagamento
      const charge = eventData?.charges?.[0] || eventData
      const lastTransaction = charge?.last_transaction
      let paymentMethod = lastTransaction?.transaction_type || 'unknown'
      if (paymentMethod === 'pix') paymentMethod = 'pix'
      else if (paymentMethod === 'credit_card') paymentMethod = 'credit_card'
      else if (paymentMethod === 'boleto') paymentMethod = 'boleto'

      // 5. Calcular net_amount real com taxas reais do Pagar.me
      const grossAmount = Number(order.amount)
      let netAmount: number
      if (paymentMethod === 'pix') {
        netAmount = grossAmount - (grossAmount * 0.0119 + 0.55)
      } else if (paymentMethod === 'credit_card') {
        netAmount = grossAmount - (grossAmount * 0.0439 + 0.99)
      } else if (paymentMethod === 'boleto') {
        netAmount = grossAmount - 4.04
      } else {
        netAmount = grossAmount - (grossAmount * 0.0439 + 0.99) // fallback: taxa de cartão
      }
      netAmount = Math.round(netAmount * 100) / 100
      const paidAtIso = charge?.paid_at || new Date().toISOString()

      await supabase.from('asaas_orders').update({
        status: 'paid',
        user_id: userId,
        asaas_payment_id: eventData?.id || charge?.id,
        payment_method: paymentMethod,
        net_amount: netAmount,
        paid_at: paidAtIso,
        user_phone: profilePhone || null,
        user_name: profileName || null,
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      // 5.1 Sanitização automática: invalida pendings duplicados do mesmo email/janela de compra
      try {
        const paidTime = new Date(paidAtIso)
        const cleanupStart = new Date((order?.created_at ? new Date(order.created_at).getTime() : paidTime.getTime()) - 2 * 60 * 60 * 1000)
        const cleanupEnd = new Date(paidTime.getTime() + 15 * 60 * 1000)

        const { data: invalidatedPendings, error: cleanupError } = await supabase
          .from('asaas_orders')
          .update({
            status: 'failed',
            payment_method: 'duplicate_pending_cleanup',
            gateway_error_message: `Auto-cleanup: replaced by paid order ${order.id}`,
            updated_at: new Date().toISOString(),
          })
          .eq('user_email', email)
          .eq('status', 'pending')
          .neq('id', order.id)
          .gte('created_at', cleanupStart.toISOString())
          .lte('created_at', cleanupEnd.toISOString())
          .select('id')

        if (cleanupError) {
          console.warn(`   ├─ ⚠️ Falha no cleanup de pendings duplicados: ${cleanupError.message}`)
        } else if (invalidatedPendings?.length) {
          console.log(`   ├─ 🧹 Pendings duplicados invalidados: ${invalidatedPendings.length}`)
        }
      } catch (cleanupErr: any) {
        console.warn(`   ├─ ⚠️ Exceção no cleanup de pendings: ${cleanupErr?.message || cleanupErr}`)
      }

      // 6. Logar na webhook_logs (non-blocking to not prevent email sending)
      try {
        await supabase.from('webhook_logs').insert({
          platform: 'pagarme',
          event_type: eventType,
          transaction_id: idempotencyKey,
          status: 'paid',
          email: email,
          product_name: product.title,
          amount: Number(order.amount),
          payment_method: paymentMethod,
          payload: body,
        })
      } catch (logErr: any) {
        console.error(`   ├─ ⚠️ Erro ao logar webhook (não-crítico): ${logErr.message}`)
      }

      // 7. Enviar email com dedup + retry
      const ctaLink = product.pack_slug === 'upscaler-arcano' || product.type === 'credits'
        ? 'https://arcanoapp.voxvisual.com.br/upscaler-arcano'
        : 'https://arcanoapp.voxvisual.com.br/'

      const emailResult = await sendPurchaseEmail(supabase, {
        orderId: order.id,
        email,
        productName: product.title,
        ctaLink,
        requestId,
        paidAtIso,
        options: {
          packSlug: product.pack_slug,
          productType: product.type,
          accessType: product.access_type,
          billingPeriod: product.billing_period,
        }
      })

      const emailStatusMessage = emailResult.status === 'sent'
        ? `sent_attempt_${emailResult.attempts}`
        : emailResult.status === 'already_sent'
          ? 'already_sent'
          : emailResult.status === 'blacklisted'
            ? 'blacklisted'
            : `failed_attempts_${emailResult.attempts}: ${emailResult.error || 'unknown_error'}`

      await supabase.from('asaas_orders').update({
        last_attempt_at: new Date().toISOString(),
        gateway_error_message: emailResult.status === 'sent' || emailResult.status === 'already_sent'
          ? null
          : `purchase_email_${emailStatusMessage}`,
      }).eq('id', order.id)

      console.log(`   ├─ 📬 Email status: ${emailResult.status} (attempts: ${emailResult.attempts})`)

      // 7.1 Notificar admin
      try {
        await sendAdminSaleNotification({
          productName: product.title,
          amount: Number(order.amount),
          paymentMethod,
          customerEmail: email,
          customerName: profileName || '',
          platform: 'Pagar.me',
          requestId,
        })
      } catch (adminErr) {
        console.error(`   ├─ ⚠️ Erro ao enviar email admin (não-crítico):`, adminErr)
      }

      // 7.2 Enviar WhatsApp de boas-vindas (non-blocking)
      try {
        if (profilePhone) {
          const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-welcome`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              phone: profilePhone,
              name: profileName || '',
              email,
              order_id: order.id,
            }),
          })
          const whatsappResult = await whatsappResponse.text()
          console.log(`   ├─ 📱 WhatsApp welcome: ${whatsappResponse.status} | ${whatsappResult}`)
        } else {
          console.log(`   ├─ ⚠️ WhatsApp: sem telefone disponível para ${email}`)
        }
      } catch (whatsappErr: any) {
        console.warn(`   ├─ ⚠️ WhatsApp falhou (não-crítico): ${whatsappErr.message}`)
      }

      // 7.3 Enviar Purchase para Meta CAPI (server-side tracking)
      try {
        const utmData = order.utm_data as Record<string, string> | null
        // Fallback: generate fbc from fbclid in utm_data if not stored
        let effectiveFbc = order.meta_fbc || null
        let effectiveFbp = order.meta_fbp || null
        const fbclid = utmData?.fbclid || null
        if (!effectiveFbc && fbclid) {
          effectiveFbc = `fb.1.${Date.now()}.${fbclid}`
          console.log(`   ├─ 🔗 fbc gerado a partir do fbclid para Purchase`)
        }
        if (!effectiveFbp && fbclid) {
          effectiveFbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`
          console.log(`   ├─ 🔗 fbp fallback gerado para Purchase`)
        }
        // Extract real payment timestamp from Pagar.me payload
        const paidAtRaw = eventData?.paid_at || eventData?.charges?.[0]?.paid_at || order.paid_at || null
        const realEventTime = paidAtRaw ? Math.floor(new Date(paidAtRaw).getTime() / 1000) : undefined
        if (realEventTime) {
          console.log(`   ├─ ⏱️ event_time real do pagamento: ${paidAtRaw} → ${realEventTime}`)
        }
        const capiResponse = await fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            event_name: 'Purchase',
            email,
            value: Number(order.amount),
            currency: 'BRL',
            utm_data: utmData,
            fbp: effectiveFbp,
            fbc: effectiveFbc,
            client_user_agent: order.meta_user_agent || null,
            event_id: `purchase_${order.id}`,
            event_source_url: 'https://arcanoapp.voxvisual.com.br',
            event_time: realEventTime,
          }),
        })
        const capiText = await capiResponse.text()
        console.log(`   ├─ 📊 Meta CAPI Purchase: ${capiResponse.status} | fbp: ${effectiveFbp ? '✅' : '❌'} | fbc: ${effectiveFbc ? '✅' : '❌'}`)
      } catch (capiErr: any) {
        console.warn(`   ├─ ⚠️ Meta CAPI Purchase falhou (não-crítico): ${capiErr.message}`)
      }

      // 8. UTMify
      try {
        const utmData = order.utm_data as Record<string, string> | null
        const saleMetas: { meta_key: string; meta_value: string }[] = []
        if (utmData) {
          for (const [key, value] of Object.entries(utmData)) {
            if (value) saleMetas.push({ meta_key: key, meta_value: String(value) })
          }
        }

        const hashCode = (s: string) => {
          let h = 0
          for (let i = 0; i < s.length; i++) {
            h = ((h << 5) - h + s.charCodeAt(i)) | 0
          }
          return Math.abs(h)
        }
        const numericOrderId = hashCode(order.id)
        const numericProductId = hashCode(product.id) + 900000

        const utmifyPayload = {
          event: 'sale_status_updated',
          currentStatus: 'paid',
          contract: { id: numericOrderId },
          client: { name: '', email },
          product: { name: product.title, id: numericProductId },
          offer: { name: product.title, id: numericProductId },
          sale: {
            id: numericOrderId,
            amount: Math.round(Number(order.amount) * 100),
            currency: 'BRL',
            created_at: order.created_at
          },
          saleMetas
        }

        console.log(`   ├─ 📊 UTMify payload: sale.id=${numericOrderId}, product.id=${numericProductId}`)

        const utmifyResponse = await fetch(
          'https://api.utmify.com.br/webhooks/greenn?id=677eeb043df9ee8a68e6995b',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(utmifyPayload)
          }
        )
        const utmifyBody = await utmifyResponse.text()
        console.log(`   ├─ 📊 UTMify response: ${utmifyResponse.status} - ${utmifyBody}`)
      } catch (utmErr: any) {
        console.error(`   ├─ ⚠️ UTMify webhook falhou: ${utmErr.message}`)
      }

      // 9. Salvar cartão para one-click buy (se pagamento com cartão de crédito)
      try {
        const chargeData = eventData?.charges?.[0] || eventData
        const transaction = chargeData?.last_transaction
        if (userId && transaction?.transaction_type === 'credit_card' && transaction?.card) {
          const card = transaction.card
          const customerId = chargeData?.customer?.id || eventData?.customer?.id
          const cardId = card.id
          const lastFour = card.last_four_digits || card.last_four || '????'
          const brand = card.brand || 'unknown'

          if (customerId && cardId) {
            await supabase.from('pagarme_saved_cards').upsert({
              user_id: userId,
              pagarme_customer_id: customerId,
              pagarme_card_id: cardId,
              card_last_four: lastFour,
              card_brand: brand,
              is_active: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,pagarme_card_id' })
            console.log(`   ├─ 💳 Cartão salvo para one-click: ****${lastFour} (${brand})`)
          }
        }
      } catch (cardSaveErr: any) {
        console.error(`   ├─ ⚠️ Erro ao salvar cartão: ${cardSaveErr.message}`)
      }

      // 10. Auto-create Pagar.me subscription for subscription products paid via hosted checkout
      // (No subscription_id means it came from hosted checkout, not from create-pagarme-subscription)
      if (product.type === 'subscription' && !order.pagarme_subscription_id && paymentMethod === 'credit_card') {
        try {
          const chargeData = eventData?.charges?.[0] || eventData
          const transaction = chargeData?.last_transaction
          const cardData = transaction?.card
          const cardId = cardData?.id

          if (cardId) {
            console.log(`   ├─ 🔄 Criando assinatura recorrente a partir do checkout hospedado...`)
            
            const interval = product.billing_period === 'anual' ? 'year' : 'month'
            const amountInCents = Math.round(Number(product.price) * 100)
            const customerName = profileName || email.split('@')[0]

            // Calculate start_at for next billing cycle
            const periodDays = product.billing_period === 'anual' ? 365 : 30
            const startAt = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000)
            const startAtStr = startAt.toISOString()

            // Build billing address from order or profile
            const billingAddr = {
              line_1: profileAddressLine || 'Não informado, 0',
              zip_code: (profileAddressZip || '00000000').replace(/\D/g, ''),
              city: profileAddressCity || 'Não informada',
              state: profileAddressState || 'SP',
              country: profileAddressCountry || 'BR'
            }

            const phoneForSub = profilePhone || order.user_phone || ''
            const areaCodeSub = phoneForSub.slice(0, 2) || '11'
            const phoneNumberSub = phoneForSub.slice(2) || '999999999'

            const subscriptionPayload = {
              payment_method: 'credit_card',
              interval: interval,
              interval_count: 1,
              billing_type: 'prepaid',
              minimum_price: amountInCents,
              start_at: startAtStr,
              currency: 'BRL',
              card: {
                card_id: cardId,
                billing_address: billingAddr
              },
              customer: {
                name: customerName,
                email: email,
                type: 'individual',
                document: profileCpf || undefined,
                document_type: profileCpf ? 'CPF' : undefined,
                phones: {
                  mobile_phone: {
                    country_code: '55',
                    area_code: areaCodeSub,
                    number: phoneNumberSub
                  }
                },
                address: billingAddr
              },
              items: [{
                description: product.title,
                quantity: 1,
                pricing_scheme: { price: amountInCents }
              }],
              metadata: {
                order_id: order.id,
                product_slug: product.slug
              }
            }

            const pagarmeSecretKeyForSub = Deno.env.get('PAGARME_SECRET_KEY')
            if (pagarmeSecretKeyForSub) {
              const authHeader = 'Basic ' + btoa(pagarmeSecretKeyForSub + ':')
              const subResponse = await fetch('https://api.pagar.me/core/v5/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
                body: JSON.stringify(subscriptionPayload)
              })

              const subText = await subResponse.text()
              if (subResponse.ok) {
                const subData = JSON.parse(subText)
                const newSubId = subData.id
                console.log(`   ├─ ✅ Assinatura recorrente criada: ${newSubId} (start_at: ${startAtStr})`)

                // Save subscription_id to order and planos2_subscriptions
                await supabase.from('asaas_orders').update({
                  pagarme_subscription_id: newSubId,
                  updated_at: new Date().toISOString()
                }).eq('id', order.id)

                if (userId) {
                  await supabase.from('planos2_subscriptions').update({
                    pagarme_subscription_id: newSubId,
                    updated_at: new Date().toISOString()
                  }).eq('user_id', userId)
                }
              } else {
                console.error(`   ├─ ❌ Erro ao criar assinatura recorrente: ${subResponse.status} ${subText.slice(0, 500)}`)
              }
            }
          } else {
            console.log(`   ├─ ⚠️ Sem card_id disponível — assinatura recorrente não criada`)
          }
        } catch (subErr: any) {
          console.error(`   ├─ ❌ Erro ao criar assinatura recorrente (não-crítico): ${subErr.message}`)
        }
      }

      console.log(`\n✅ [${requestId}] PROCESSAMENTO PAGAR.ME CONCLUÍDO COM SUCESSO`)
    }

    // =============================================
    // REEMBOLSO (with atomic lock to prevent double processing)
    // =============================================
    else if (eventType === 'charge.refunded' || eventType === 'order.canceled' || eventType === 'charge.chargedback' || eventType === 'charge.underpaid') {
      console.log(`\n🚫 [${requestId}] REEMBOLSO PAGAR.ME - Revogando acesso...`)

      // Atomic lock: only process if order is currently 'paid' → 'refund_processing'
      const { data: refundLock, error: refundLockError } = await supabase
        .from('asaas_orders')
        .update({ status: 'refund_processing', updated_at: new Date().toISOString() })
        .eq('id', order.id)
        .in('status', ['paid', 'processing'])
        .select('id')
        .maybeSingle()

      if (refundLockError) {
        console.error(`   ├─ ❌ Erro ao travar ordem para reembolso:`, refundLockError)
      }

      if (!refundLock) {
        console.log(`   ├─ ⏭️ Ordem já sendo reembolsada ou já reembolsada (race condition evitada, status: ${order.status})`)
        await supabase.from('webhook_logs').insert({
          platform: 'pagarme',
          event_type: eventType,
          transaction_id: idempotencyKey,
          status: 'skipped_refund_race',
          email: order.user_email,
          product_name: product?.title,
          payload: body,
        })
      } else {
        // Proceed with revocation
        if (order.user_id && product.pack_slug) {
          await supabase
            .from('user_pack_purchases')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', order.user_id)
            .eq('pack_slug', product.pack_slug)

          console.log(`   ├─ ✅ Acesso revogado: ${product.pack_slug}`)

          // Bundle: revogar packs extras
          const REFUND_BUNDLE_EXTRA_PACKS: Record<string, string[]> = {
            'pack4lancamento': ['pack-de-sao-joao'],
            'combo-1e2-1ano': ['pack-arcano-vol-2'],
            'combo-1ao3-vitalicio': ['pack-arcano-vol-2', 'pack-arcano-vol-3']
          }
          const extraSlugs = REFUND_BUNDLE_EXTRA_PACKS[product.slug] || []
          for (const extraSlug of extraSlugs) {
            await supabase
              .from('user_pack_purchases')
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq('user_id', order.user_id)
              .eq('pack_slug', extraSlug)
            console.log(`   ├─ ✅ Bundle: acesso extra revogado: ${extraSlug}`)
          }
        }


        // === REFUND V3: Revogar pack V3 + bônus V2 (SEM créditos, SEM image/video) ===
        if (order.user_id && product.slug === 'upscaler-arcano-v3') {
          console.log(`   ├─ 📋 Revogando acesso V3...`)
          
          await supabase
            .from('user_pack_purchases')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', order.user_id)
            .eq('pack_slug', 'upscaller-arcano')
            .eq('product_name', 'Bônus V3: acesso V2')
          console.log(`   ├─ ✅ Pack V2 bônus revogado`)

          await supabase
            .from('user_pack_purchases')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('user_id', order.user_id)
            .eq('pack_slug', 'upscaller-arcano-v3')
          console.log(`   ├─ ✅ Pack V3 revogado`)
        }

        if (order.user_id && product.type === 'credits' && product.credits_amount > 0) {
          const { data: revokeData, error: revokeError } = await supabase.rpc('revoke_lifetime_credits_on_refund', {
            _user_id: order.user_id,
            _amount: product.credits_amount,
            _description: `Reembolso Pagar.me: ${product.title}`
          })
          if (revokeError) {
            console.error(`   ├─ ❌ Erro de transporte ao revogar créditos:`, revokeError)
          } else {
            const revokeResult = revokeData?.[0] || revokeData
            if (!revokeResult?.success) {
              console.error(`   ├─ ❌ FALHA REAL na revogação de créditos:`, JSON.stringify(revokeResult))
            } else {
              console.log(`   ├─ ✅ Créditos revogados: ${revokeResult.amount_revoked} (novo saldo: ${revokeResult.new_balance})`)
            }
          }
        }

        // === LANDING BUNDLE REFUND ===
        if (order.user_id && product.type === 'landing_bundle') {
          console.log(`   ├─ 📋 Revogando landing_bundle...`)

          // Revoke lifetime credits
          if (product.credits_amount > 0) {
            const { data: revokeData, error: revokeError } = await supabase.rpc('revoke_lifetime_credits_on_refund', {
              _user_id: order.user_id,
              _amount: product.credits_amount,
              _description: `Reembolso landing_bundle: ${product.title}`
            })
            if (revokeError) {
              console.error(`   ├─ ❌ Erro ao revogar créditos landing_bundle:`, revokeError)
            } else {
              const revokeResult = revokeData?.[0] || revokeData
              if (revokeResult?.success) {
                console.log(`   ├─ ✅ Créditos revogados: ${revokeResult.amount_revoked}`)
              }
            }
          }

          // Reset to free plan
          await supabase.from('planos2_subscriptions').upsert({
            user_id: order.user_id,
            plan_slug: 'free',
            is_active: true,
            credits_per_month: 100,
            daily_prompt_limit: 5,
            has_image_generation: false,
            has_video_generation: false,
            cost_multiplier: 1.0,
            expires_at: null,
            pagarme_subscription_id: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

          console.log(`   ├─ ✅ Landing bundle revogado → free`)
        }

        // === SUBSCRIPTION PLAN REVOCATION ===
        if (order.user_id && product.type === 'subscription') {
          console.log(`   ├─ 📋 Revogando plano de assinatura...`)

          // Reset to free plan
          await supabase.from('planos2_subscriptions').upsert({
            user_id: order.user_id,
            plan_slug: 'free',
            is_active: true,
            credits_per_month: 100,
            daily_prompt_limit: 5,
            has_image_generation: false,
            has_video_generation: false,
            cost_multiplier: 1.0,
            expires_at: null,
            pagarme_subscription_id: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

          // Zero out monthly credits
          const { error: zeroError } = await supabase.rpc('reset_upscaler_credits', {
            _user_id: order.user_id,
            _amount: 0,
            _description: `Reembolso Pagar.me: plano revogado → free`
          })
          if (zeroError) {
            console.error(`   ├─ ❌ Erro ao zerar créditos:`, zeroError)
          }

          console.log(`   ├─ ✅ Plano revogado → free, créditos mensais zerados`)
        }

        await supabase.from('asaas_orders').update({
          status: 'refunded',
          updated_at: new Date().toISOString()
        }).eq('id', order.id)

        // Logar reembolso
        await supabase.from('webhook_logs').insert({
          platform: 'pagarme',
          event_type: eventType,
          transaction_id: idempotencyKey,
          status: 'refunded',
          email: order.user_email,
          product_name: product.title,
          amount: Number(order.amount),
          payload: body,
        })

        console.log(`   ├─ ✅ Ordem marcada como refunded`)
      }
    }

    // =============================================
    // ANTIFRAUDE REPROVADO — retry automático sem antifraude (1x)
    // =============================================
    else if (eventType === 'charge.antifraud_reproved') {
      const chargeId = eventData?.id
      console.log(`\n🛡️ [${requestId}] ANTIFRAUDE REPROVADO — charge: ${chargeId}`)

      if (order.antifraud_retry_done) {
        console.log(`   ├─ ⏭️ Retry já realizado anteriormente, ignorando`)
        await supabase.from('webhook_logs').insert({
          platform: 'pagarme',
          event_type: eventType,
          transaction_id: idempotencyKey,
          status: 'antifraud_retry_already_done',
          email: order.user_email,
          payload: body,
        })
      } else {
        // Marcar ANTES de chamar a API (evita race condition)
        await supabase.from('asaas_orders').update({
          antifraud_retry_done: true,
          updated_at: new Date().toISOString()
        }).eq('id', order.id)

        console.log(`   ├─ 🔄 Retentando cobrança sem antifraude...`)

        try {
          const retryResponse = await fetch(
            `https://api.pagar.me/core/v5/charges/${chargeId}/retry`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa(pagarmeSecretKey + ':'),
              },
            }
          )

          const retryBody = await retryResponse.text()
          console.log(`   ├─ 📡 Pagar.me retry response: ${retryResponse.status}`)
          console.log(`   ├─ 📡 Pagar.me retry body: ${retryBody.slice(0, 500)}`)

          await supabase.from('webhook_logs').insert({
            platform: 'pagarme',
            event_type: eventType,
            transaction_id: idempotencyKey,
            status: retryResponse.ok ? 'antifraud_retry_sent' : 'antifraud_retry_failed',
            email: order.user_email,
            product_name: product?.title,
            amount: Number(order.amount),
            payload: { 
              original_event: body, 
              retry_status: retryResponse.status, 
              retry_response: retryBody.slice(0, 1000) 
            },
          })

          if (retryResponse.ok) {
            console.log(`   ├─ ✅ Retry enviado com sucesso — aguardando novo webhook do Pagar.me`)
          } else {
            console.error(`   ├─ ❌ Retry falhou: ${retryResponse.status} — ${retryBody.slice(0, 200)}`)
          }
        } catch (retryErr: any) {
          console.error(`   ├─ ❌ Erro de rede no retry: ${retryErr.message}`)
          await supabase.from('webhook_logs').insert({
            platform: 'pagarme',
            event_type: eventType,
            transaction_id: idempotencyKey,
            status: 'antifraud_retry_error',
            email: order.user_email,
            payload: { original_event: body, error: retryErr.message },
          })
        }
      }
    }

    else {
      console.log(`   ├─ ⏭️ Evento ignorado: ${eventType} (status atual: ${order.status})`)
      // Logar eventos ignorados também
      await supabase.from('webhook_logs').insert({
        platform: 'pagarme',
        event_type: eventType,
        transaction_id: idempotencyKey,
        status: eventData?.status || 'ignored',
        email: order.user_email,
        payload: body,
      })
    }

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error: any) {
    console.error(`❌ [${requestId}] Erro geral:`, error.message)
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})

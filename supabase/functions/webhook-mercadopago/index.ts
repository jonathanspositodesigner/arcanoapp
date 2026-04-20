/**
 * Edge Function: webhook-mercadopago
 * Recebe notificações do Mercado Pago, valida o pagamento e libera acesso.
 * Inclui: Meta CAPI Purchase, webhook_logs, idempotência, email por tipo de produto.
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

// ===== SHA-256 hash helper =====
async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value.toLowerCase().trim()))
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('')
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

function buildPurchaseEmailHtml(email: string, productName: string, ctaLink: string, productType: string, creditsAmount?: number, productSlug?: string): string {
  const unsubscribeLink = getUnsubscribeLink(email)

  // Bloco dinâmico baseado no tipo de produto
  let accessBlock = ''
  if (productSlug === 'upscaler-arcano-v3') {
    accessBlock = `
    <div style="background:linear-gradient(135deg,rgba(217,70,239,0.12) 0%,rgba(168,85,247,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(217,70,239,0.3);text-align:center;">
      <p style="color:#e879f9;font-size:15px;font-weight:700;margin:0 0 8px;">🚀 Upscaler Arcano V3 Ativado!</p>
      <p style="color:#f0abfc;font-size:13px;margin:0;line-height:1.6;">Agora você tem acesso ao <strong>Modo Turbo</strong> e <strong>Upscale em Lote</strong>. Seu acesso à V2 também está incluso!</p>
    </div>`
  } else if (productType === 'credits') {
    accessBlock = `
    <div style="background:linear-gradient(135deg,rgba(96,165,250,0.12) 0%,rgba(59,130,246,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(96,165,250,0.3);text-align:center;">
      <p style="color:#60a5fa;font-size:15px;font-weight:700;margin:0 0 8px;">🎯 ${creditsAmount || ''} Créditos Adicionados!</p>
      <p style="color:#bfdbfe;font-size:13px;margin:0;line-height:1.6;">Seus créditos já estão disponíveis. Use-os no Upscaler Arcano e outras ferramentas IA!</p>
    </div>`
  } else if (productType === 'subscription') {
    accessBlock = `
    <div style="background:linear-gradient(135deg,rgba(168,85,247,0.12) 0%,rgba(139,92,246,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(168,85,247,0.3);text-align:center;">
      <p style="color:#c084fc;font-size:15px;font-weight:700;margin:0 0 8px;">🚀 Plano Ativado com Sucesso!</p>
      <p style="color:#e9d5ff;font-size:13px;margin:0;line-height:1.6;">Seus créditos já estão disponíveis. Aproveite todas as ferramentas de IA inclusas no seu plano!</p>
    </div>`
  } else {
    accessBlock = `
    <div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
      <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 Acesso Vitalício Ativado!</p>
      <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Você <strong>NÃO precisa comprar créditos</strong> para usar o Upscaler Arcano. Seu acesso vitalício já inclui uso ilimitado da ferramenta!</p>
    </div>`
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0015;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:48px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(160deg,#1e0a3c 0%,#2a1252 40%,#1e0a3c 100%);border-radius:20px 20px 0 0;padding:50px 40px 36px;text-align:center;border:1px solid rgba(212,175,55,0.15);border-bottom:none;">
    <div style="width:88px;height:88px;margin:0 auto 24px;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 50%,#d4af37 100%);border-radius:50%;line-height:88px;text-align:center;box-shadow:0 8px 32px rgba(212,175,55,0.35);">
      <span style="font-size:42px;line-height:88px;">✅</span>
    </div>
    <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 12px;letter-spacing:-0.5px;">Compra Confirmada!</h1>
    <p style="color:#c4b5fd;font-size:17px;margin:0;line-height:1.5;">Seu acesso ao <strong style="color:#f5e27a;">${productName}</strong> já está liberado.</p>
  </div>

  <!-- Body -->
  <div style="background:linear-gradient(180deg,#2a1252 0%,#1e0a3c 100%);padding:0 40px 40px;border:1px solid rgba(212,175,55,0.15);border-top:none;border-bottom:none;">

    <!-- Credentials Card -->
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

    <!-- Access Block (dynamic) -->
    ${accessBlock}

    <!-- CTA Button -->
    <div style="text-align:center;padding-bottom:8px;">
      <a href="${ctaLink}" style="display:inline-block;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 100%);color:#1a0533;text-decoration:none;padding:18px 52px;border-radius:12px;font-weight:700;font-size:17px;letter-spacing:0.3px;box-shadow:0 6px 24px rgba(212,175,55,0.4);">
        Acessar Agora →
      </a>
    </div>
  </div>

  <!-- Footer -->
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

async function sendPurchaseEmailAttempt(supabase: any, email: string, productName: string, ctaLink: string, requestId: string, productType: string, creditsAmount?: number, productSlug?: string): Promise<boolean> {
  const dedupKey = `mp_purchase_${requestId}`
  const { data: existing } = await supabase
    .from('welcome_email_logs')
    .select('id')
    .eq('email', email)
    .eq('template_used', dedupKey)
    .maybeSingle()

  if (existing) {
    console.log(`   ├─ ℹ️ Email já enviado para ${email} (${productName})`)
    return true
  }

  const { data: blacklisted } = await supabase
    .from('blacklisted_emails')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (blacklisted) {
    console.log(`   ├─ ⛔ Email blacklisted: ${email}`)
    return true
  }

  const trackingId = crypto.randomUUID()
  const html = buildPurchaseEmailHtml(email, productName, ctaLink, productType, creditsAmount, productSlug)
  const htmlBase64 = btoa(unescape(encodeURIComponent(html)))

  const token = await getSendPulseToken()

  const emailPayload = {
    email: {
      html: htmlBase64,
      text: "",
      subject: `✅ Compra confirmada - ${productName}`,
      from: { name: "Vox Visual", email: "contato@voxvisual.com.br" },
      to: [{ name: email, email }]
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

  await supabase.from('welcome_email_logs').insert({
    email,
    platform: 'mercadopago',
    template_used: dedupKey,
    dedup_key: dedupKey,
    tracking_id: trackingId,
    status: response.ok ? 'sent' : 'failed',
    sent_at: response.ok ? new Date().toISOString() : new Date().toISOString(),
    error_message: response.ok ? null : responseText,
    product_info: productName,
  })

  return response.ok
}

async function sendPurchaseEmail(supabase: any, email: string, productName: string, ctaLink: string, requestId: string, productType: string, creditsAmount?: number, productSlug?: string) {
  const backoffDelays = [2000, 5000, 10000]
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const success = await sendPurchaseEmailAttempt(supabase, email, productName, ctaLink, requestId, productType, creditsAmount, productSlug)
      if (success) {
        console.log(`   ├─ ✅ Email de compra enviado para ${email} (tentativa ${attempt + 1})`)
        return
      }
      
      console.log(`   ├─ ⚠️ Tentativa ${attempt + 1}/3 falhou para ${email}`)
      
      if (attempt < 2) {
        const delay = backoffDelays[attempt]
        console.log(`   ├─ ⏳ Retry em ${delay / 1000}s...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    } catch (err: any) {
      console.error(`   ├─ ❌ Erro tentativa ${attempt + 1}/3: ${err.message}`)
      
      try {
        await supabase.from('welcome_email_logs').insert({
          email,
          platform: 'mercadopago',
          template_used: `mp_purchase_${requestId}`,
          dedup_key: `mp_purchase_${requestId}`,
          tracking_id: crypto.randomUUID(),
          status: 'failed',
          sent_at: new Date().toISOString(),
          error_message: `Tentativa ${attempt + 1}: ${err.message}`,
        })
      } catch (_) {}
      
      if (attempt < 2) {
        const delay = backoffDelays[attempt]
        console.log(`   ├─ ⏳ Retry em ${delay / 1000}s...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  console.error(`   ├─ ❌ Email falhou após 3 tentativas para ${email}`)
}

// ===== Meta CAPI Purchase =====
async function sendMetaCAPIPurchase(order: any, product: any, payment: any): Promise<void> {
  const metaPixelId = '1162356848586894'
  const metaAccessToken = Deno.env.get('META_ACCESS_TOKEN')
  if (!metaAccessToken) {
    console.log(`   ├─ ⚠️ META_ACCESS_TOKEN não configurado, pulando CAPI Purchase`)
    return
  }

  const email = order.user_email
  const paidAt = payment.date_approved || new Date().toISOString()
  const eventId = `purchase_mp_${order.id}`

  const userData: any = {
    em: [await sha256(email)],
  }
  if (order.meta_fbp) userData.fbp = order.meta_fbp
  if (order.meta_fbc) userData.fbc = order.meta_fbc
  if (order.meta_user_agent) userData.client_user_agent = order.meta_user_agent

  const capiPayload = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(new Date(paidAt).getTime() / 1000),
      event_id: eventId,
      event_source_url: 'https://arcanoapp.lovable.app/planos-upscaler-arcano-69',
      action_source: 'website',
      user_data: userData,
      custom_data: {
        content_name: product.title,
        content_ids: [product.slug],
        content_type: 'product',
        value: Number(payment.transaction_amount),
        currency: 'BRL',
      }
    }]
  }

  try {
    const resp = await fetch(`https://graph.facebook.com/v21.0/${metaPixelId}/events?access_token=${metaAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(capiPayload)
    })
    const body = await resp.text()
    console.log(`   ├─ 📊 Meta CAPI Purchase: ${resp.status} - ${body}`)
  } catch (err: any) {
    console.error(`   ├─ ⚠️ Meta CAPI Purchase falhou (não-bloqueante): ${err.message}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')

    if (!mpAccessToken) {
      console.error(`[${requestId}] MERCADOPAGO_ACCESS_TOKEN não configurado`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse do body
    let body: any = {}
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const text = await req.text()
      try { body = JSON.parse(text) } catch { body = {} }
    }

    // Também checar query params
    const url = new URL(req.url)
    const queryType = url.searchParams.get('type') || url.searchParams.get('topic')
    const queryDataId = url.searchParams.get('data.id') || url.searchParams.get('id')

    const notificationType = body.type || body.topic || queryType
    const paymentId = body.data?.id || queryDataId

    console.log(`\n🔔 [${requestId}] WEBHOOK MERCADO PAGO`)
    console.log(`   ├─ type: ${notificationType}`)
    console.log(`   ├─ payment_id: ${paymentId}`)

    // Só processar notificações de pagamento (ignorar merchant_order — usa endpoint diferente)
    if (notificationType !== 'payment') {
      console.log(`   ├─ ⏭️ Tipo ignorado: ${notificationType}`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    if (!paymentId) {
      console.log(`   ├─ ⏭️ Sem payment_id`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // ===== IDEMPOTÊNCIA ATÔMICA: "claim" do processamento via INSERT com unique index =====
    // O índice único idx_webhook_logs_mp_dedup (platform, transaction_id, event_type)
    // garante que apenas UMA execução consegue inserir o log de processamento.
    // Se duas execuções chegarem ao mesmo tempo, a segunda falha no INSERT e é ignorada.

    // Buscar detalhes do pagamento na API do Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` }
    })

    if (!paymentResponse.ok) {
      console.error(`   ├─ ❌ Erro ao buscar pagamento: ${paymentResponse.status}`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const payment = await paymentResponse.json()

    const paymentStatus = payment.status
    const externalReference = payment.external_reference
    const payerEmail = payment.payer?.email?.toLowerCase().trim()
    const paymentAmount = payment.transaction_amount

    console.log(`   ├─ status: ${paymentStatus}`)
    console.log(`   ├─ external_reference: ${externalReference}`)
    console.log(`   ├─ payer_email: ${payerEmail}`)
    console.log(`   ├─ amount: ${paymentAmount}`)

    if (!externalReference) {
      console.log(`   ├─ ⏭️ Sem external_reference`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Buscar ordem interna
    const { data: order, error: orderError } = await supabase
      .from('mp_orders')
      .select('*, mp_products(*)')
      .eq('id', externalReference)
      .single()

    if (orderError || !order) {
      console.error(`   ├─ ❌ Ordem não encontrada: ${externalReference}`, orderError)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const product = order.mp_products
    console.log(`   ├─ produto: ${product?.title}`)
    console.log(`   ├─ ordem status atual: ${order.status}`)

    // =============================================
    // PAGAMENTO APROVADO
    // =============================================
    if (paymentStatus === 'approved' && order.status === 'pending') {
      // ===== CLAIM ATÔMICO: tentar inserir webhook_log ANTES de processar =====
      const { error: claimError } = await supabase.from('webhook_logs').insert({
        platform: 'mercadopago',
        status: 'processing',
        email: order.user_email,
        amount: paymentAmount,
        amount_brl: paymentAmount,
        currency: 'BRL',
        net_amount: payment.transaction_details?.net_received_amount ?? paymentAmount,
        product_name: product.title,
        transaction_id: String(paymentId),
        event_type: 'purchase',
        payment_method: payment.payment_method_id || null,
        utm_data: order.utm_data || null,
        result: 'processing',
        payload: { order_id: order.id, mp_payment_id: paymentId, customer_name: order.user_name || '' },
      })

      if (claimError) {
        // Unique index violation = outra execução já está processando
        console.log(`   ├─ ⏭️ Já processado (claim atômico): paymentId=${paymentId}`, claimError.message)
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      console.log(`\n✅ [${requestId}] PAGAMENTO APROVADO - Claim obtido, processando...`)

      const email = order.user_email
      const customerName = order.user_name || ''

      // Auto-cleanup: marcar outras ordens pending do mesmo email como failed
      await supabase
        .from('mp_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('user_email', email)
        .eq('status', 'pending')
        .neq('id', order.id)
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())

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
            await supabase.from('mp_orders').update({
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

      // 2. Upsert profile
      const { data: existingProfileMp } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
      const profileDataMp: Record<string, unknown> = {
        id: userId, email, email_verified: true, updated_at: new Date().toISOString()
      }
      if (!existingProfileMp) { profileDataMp.password_changed = false }
      await supabase.from('profiles').upsert(profileDataMp, { onConflict: 'id' })
      console.log(`   ├─ ✅ Profile atualizado`)

      // 3. Processar de acordo com o tipo do produto
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
            platform: 'mercadopago'
          })
          console.log(`   ├─ ✅ Acesso concedido: ${product.pack_slug} (${accessType})`)
        } else {
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
              platform: 'mercadopago',
              purchased_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', existingPurchase.id)
            console.log(`   ├─ ✅ Acesso RENOVADO (estava expirado): ${product.pack_slug} (${existingPurchase.access_type} → ${accessType})`)
          } else if (newRank > existingRank) {
            await supabase.from('user_pack_purchases').update({
              access_type: accessType,
              has_bonus_access: hasBonusAccess,
              expires_at: expiresAt,
              product_name: product.title,
              platform: 'mercadopago',
              purchased_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', existingPurchase.id)
            console.log(`   ├─ ✅ Acesso ATUALIZADO: ${product.pack_slug} (${existingPurchase.access_type} → ${accessType})`)
          } else if (newRank === existingRank && existingPurchase.expires_at) {
            const currentExpiry = new Date(existingPurchase.expires_at)
            const newExpiry = expiresAt ? new Date(Math.max(currentExpiry.getTime(), new Date(expiresAt).getTime())) : null
            await supabase.from('user_pack_purchases').update({
              expires_at: newExpiry?.toISOString() || null,
              product_name: product.title,
              platform: 'mercadopago',
              purchased_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', existingPurchase.id)
            console.log(`   ├─ ✅ Acesso RENOVADO: ${product.pack_slug} (${accessType}, expira: ${newExpiry?.toISOString() || 'nunca'})`)
          } else {
            console.log(`   ├─ ℹ️ Acesso já existente e superior/igual: ${product.pack_slug} (${existingPurchase.access_type})`)
          }
        }

        // Bundle: conceder packs extras para produtos combo
        const BUNDLE_EXTRA_PACKS: Record<string, Array<{pack_slug: string, access_type: string}>> = {
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
              platform: 'mercadopago'
            })
            console.log(`   ├─ ✅ Bundle: acesso extra concedido: ${extra.pack_slug} (${extra.access_type})`)
          } else {
            console.log(`   ├─ ℹ️ Bundle: acesso extra já existente: ${extra.pack_slug}`)
          }
        }
      }

      if (product.type === 'credits' && product.credits_amount > 0) {
        // Idempotência de negócio: verificar se créditos desta ordem já foram aplicados
        const creditDesc = `Compra MP [${order.id}]: ${product.title}`
        const { data: existingCredit } = await supabase
          .from('upscaler_credit_transactions')
          .select('id')
          .eq('user_id', userId)
          .eq('description', creditDesc)
          .maybeSingle()

        if (existingCredit) {
          console.log(`   ├─ ℹ️ Créditos já aplicados para ordem ${order.id}`)
        } else {
        const { error: creditsError } = await supabase.rpc('add_lifetime_credits', {
          _user_id: userId,
          _amount: product.credits_amount,
          _description: creditDesc
        })
        if (creditsError) {
          console.error(`   ├─ ❌ Erro ao adicionar créditos:`, creditsError)
        } else {
          console.log(`   ├─ ✅ +${product.credits_amount} créditos adicionados`)
        }

        // Créditos avulsos NÃO concedem acesso a packs — são apenas créditos
        } // close else (créditos não duplicados)
      }

      // === BÔNUS V3: conceder acesso ao pack V2 (sem 10k créditos, sem image/video) ===
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
            platform: 'mercadopago'
          })
          console.log(`   ├─ ✅ Bônus V3: acesso ao pack V2 (upscaller-arcano) concedido`)
        } else {
          console.log(`   ├─ ℹ️ Bônus V3: pack V2 já existente`)
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

          // Check existing subscription to preserve landing_bundle benefits (image/video gen)
          const { data: existingSubForPlan } = await supabase
            .from('planos2_subscriptions')
            .select('has_image_generation, has_video_generation')
            .eq('user_id', userId)
            .maybeSingle()

          const preserveImageGen = config.has_image_generation || (existingSubForPlan?.has_image_generation === true)
          const preserveVideoGen = config.has_video_generation || (existingSubForPlan?.has_video_generation === true)

          // Upsert subscription (no recurring subscription ID for MP V1 — manual renewal via email)
          await supabase.from('planos2_subscriptions').upsert({
            user_id: userId,
            plan_slug: product.plan_slug,
            is_active: true,
            credits_per_month: config.credits_per_month,
            daily_prompt_limit: config.daily_prompt_limit,
            has_image_generation: preserveImageGen,
            has_video_generation: preserveVideoGen,
            cost_multiplier: config.cost_multiplier,
            expires_at: expiresAt,
            pagarme_subscription_id: null,
            last_credit_reset_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

          // Reset monthly credits to the plan amount
          const { error: resetError } = await supabase.rpc('reset_upscaler_credits', {
            _user_id: userId,
            _amount: config.credits_per_month,
            _description: `Ativação plano ${product.plan_slug} (${product.billing_period}) via Mercado Pago`
          })
          if (resetError) {
            console.error(`   ├─ ❌ Erro ao resetar créditos:`, resetError)
          }

          console.log(`   ├─ ✅ Plano ${product.plan_slug} ativado (${config.credits_per_month} créditos, expira: ${expiresAt})`)
        } else {
          console.error(`   ├─ ❌ Config não encontrada para plan_slug: ${product.plan_slug}`)
        }
      }

      // === LANDING BUNDLE ACTIVATION (one-time purchase with lifetime credits + permanent premium) ===
      if (product.type === 'landing_bundle' && product.plan_slug) {
        console.log(`   ├─ 🎁 Landing bundle: ${product.plan_slug} (${product.credits_amount} créditos vitalícios)`)

        const PLAN_CONFIG_BUNDLE_PURCHASE: Record<string, {
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
          const landingCreditDesc = `Landing bundle MP [${order.id}]: ${product.title}`
          const { data: existingLandingCredit } = await supabase
            .from('upscaler_credit_transactions')
            .select('id')
            .eq('user_id', userId)
            .eq('description', landingCreditDesc)
            .maybeSingle()

          if (!existingLandingCredit) {
            const { error: creditsError } = await supabase.rpc('add_lifetime_credits', {
              _user_id: userId,
              _amount: product.credits_amount,
              _description: landingCreditDesc
            })
            if (creditsError) {
              console.error(`   ├─ ❌ Erro ao adicionar créditos landing_bundle:`, creditsError)
            } else {
              console.log(`   ├─ ✅ +${product.credits_amount} créditos vitalícios adicionados`)
            }
          } else {
            console.log(`   ├─ ℹ️ Créditos landing_bundle já aplicados`)
          }
        }

        // 2. Activate permanent premium benefits (only upgrade, never downgrade)
        const bundleConfigPurchase = PLAN_CONFIG_BUNDLE_PURCHASE[product.plan_slug]
        if (bundleConfigPurchase) {
          const PLAN_RANK: Record<string, number> = { 'free': 0, 'starter': 1, 'pro': 2, 'ultimate': 3, 'unlimited': 4 }

          const { data: existingBundleSub } = await supabase
            .from('planos2_subscriptions')
            .select('plan_slug')
            .eq('user_id', userId)
            .maybeSingle()

          const existingRank = PLAN_RANK[existingBundleSub?.plan_slug || 'free'] || 0
          const newRank = PLAN_RANK[product.plan_slug] || 0

          if (newRank >= existingRank) {
            await supabase.from('planos2_subscriptions').upsert({
              user_id: userId,
              plan_slug: product.plan_slug,
              is_active: true,
              credits_per_month: 0,
              daily_prompt_limit: null,
              has_image_generation: bundleConfigPurchase.has_image_generation,
              has_video_generation: bundleConfigPurchase.has_video_generation,
              cost_multiplier: bundleConfigPurchase.cost_multiplier,
              expires_at: null,
              pagarme_subscription_id: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            console.log(`   ├─ ✅ Benefícios premium permanentes ativados: ${product.plan_slug}`)
          } else {
            console.log(`   ├─ ℹ️ Plano superior já ativo (${existingBundleSub?.plan_slug}), mantendo`)
          }
        }
      }

      await supabase.from('mp_orders').update({
        status: 'paid',
        user_id: userId,
        mp_payment_id: String(paymentId),
        payment_method: payment.payment_method_id || null,
        net_amount: payment.transaction_details?.net_received_amount ?? payment.transaction_amount,
        paid_at: payment.date_approved || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      // 5. Atualizar webhook_log (já inserido no claim atômico) com dados finais
      const hashCode = (s: string) => {
        let h = 0
        for (let i = 0; i < s.length; i++) {
          h = ((h << 5) - h + s.charCodeAt(i)) | 0
        }
        return Math.abs(h)
      }

      await supabase.from('webhook_logs').update({
        status: 'paid',
        email,
        net_amount: payment.transaction_details?.net_received_amount ?? paymentAmount,
        product_name: product.title,
        product_id: hashCode(product.id) + 900000,
        result: 'success',
        payload: { order_id: order.id, mp_payment_id: paymentId, customer_name: customerName },
      })
      .eq('platform', 'mercadopago')
      .eq('transaction_id', String(paymentId))
      .eq('event_type', 'purchase')
      console.log(`   ├─ ✅ webhook_logs atualizado`)

      // 6. Enviar email de compra — CTA sempre para a Home
      const ctaLink = 'https://arcanoapp.voxvisual.com.br/'
      
      await sendPurchaseEmail(supabase, email, product.title, ctaLink, order.id, product.type, product.credits_amount, product.slug)

      // 7. Notificar admin
      try {
        await sendAdminSaleNotification({
          productName: product.title,
          amount: payment.transaction_amount,
          paymentMethod: payment.payment_method_id || 'unknown',
          customerEmail: email,
          customerName,
          platform: 'Mercado Pago',
          requestId,
        })
      } catch (adminErr) {
        console.error(`   ├─ ⚠️ Erro ao enviar email admin (não-crítico):`, adminErr)
      }

      // 8. Meta CAPI Purchase
      try {
        await sendMetaCAPIPurchase(order, product, payment)
      } catch (capiErr: any) {
        console.error(`   ├─ ⚠️ Meta CAPI Purchase falhou (não-bloqueante): ${capiErr.message}`)
      }

      // 9. Enviar webhook para UTMify
      try {
        const utmData = order.utm_data as Record<string, string> | null
        const saleMetas: { meta_key: string; meta_value: string }[] = []
        if (utmData) {
          for (const [key, value] of Object.entries(utmData)) {
            if (value) saleMetas.push({ meta_key: key, meta_value: String(value) })
          }
        }

        const numericOrderId = hashCode(order.id)
        const numericProductId = hashCode(product.id) + 900000

        const utmifyPayload = {
          event: 'sale_status_updated',
          currentStatus: 'paid',
          contract: { id: numericOrderId },
          client: {
            name: customerName,
            email: email
          },
          product: {
            name: product.title,
            id: numericProductId
          },
          offer: {
            name: product.title,
            id: numericProductId
          },
          sale: {
            id: numericOrderId,
            amount: Math.round(Number(order.amount) * 100),
            currency: 'BRL',
            created_at: order.created_at
          },
          saleMetas
        }

        console.log(`   ├─ 📊 UTMify payload: sale.id=${numericOrderId}, product.id=${numericProductId}, amount=${Math.round(Number(order.amount) * 100)}`)

        const utmifyResponse = await fetch(
          'https://api.utmify.com.br/webhooks/greenn?id=677eeb043df9ee8a68e6995b',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(utmifyPayload)
          }
        )
        const utmifyBody = await utmifyResponse.text()
        console.log(`   ├─ 📊 UTMify response: ${utmifyResponse.status} - ${utmifyBody} (${saleMetas.length} metas)`)
      } catch (utmErr: any) {
        console.error(`   ├─ ⚠️ UTMify webhook falhou (não-bloqueante): ${utmErr.message}`)
      }

      console.log(`\n✅ [${requestId}] PROCESSAMENTO CONCLUÍDO COM SUCESSO`)
    }

    // =============================================
    // REEMBOLSO
    // =============================================
    else if ((paymentStatus === 'refunded' || paymentStatus === 'cancelled' || paymentStatus === 'charged_back') && order.status === 'paid') {
      // Claim atômico para refund
      const { error: refundClaimError } = await supabase.from('webhook_logs').insert({
        platform: 'mercadopago',
        status: 'refunded',
        email: order.user_email,
        amount: paymentAmount,
        amount_brl: paymentAmount,
        currency: 'BRL',
        product_name: product.title,
        transaction_id: String(paymentId),
        event_type: 'refund',
        payment_method: payment.payment_method_id || null,
        result: 'processing',
        payload: { order_id: order.id, mp_payment_id: paymentId, reason: paymentStatus },
      })

      if (refundClaimError) {
        console.log(`   ├─ ⏭️ Refund já processado (claim atômico): paymentId=${paymentId}`)
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      console.log(`\n🚫 [${requestId}] REEMBOLSO/CHARGEBACK - Claim obtido, revogando acesso...`)

      if (order.user_id && product.pack_slug) {
        await supabase
          .from('user_pack_purchases')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', order.user_id)
          .eq('pack_slug', product.pack_slug)
        
        console.log(`   ├─ ✅ Acesso revogado: ${product.pack_slug}`)

        // Bundle: revogar packs extras
        const REFUND_BUNDLE_EXTRA_PACKS: Record<string, string[]> = {
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

      if (order.user_id && product.type === 'credits' && product.credits_amount > 0) {
        const { data: revokeData, error: revokeError } = await supabase.rpc('revoke_lifetime_credits_on_refund', {
          _user_id: order.user_id,
          _amount: product.credits_amount,
          _description: `Reembolso MP: ${product.title}`
        })
        if (revokeError) {
          console.error(`   ├─ ❌ Erro de transporte ao revogar créditos:`, revokeError)
        } else {
          const revokeResult = revokeData?.[0] || revokeData
          if (!revokeResult?.success) {
            console.error(`   ├─ ❌ FALHA REAL na revogação de créditos:`, JSON.stringify(revokeResult))
          } else {
            console.log(`   ├─ ✅ ${revokeResult.amount_revoked} créditos revogados (novo saldo: ${revokeResult.new_balance})`)
          }
        }

        // Estorno de créditos avulsos NÃO revoga packs — são independentes
      }


      // === REFUND V3: Revogar pack V3 + bônus V2 (sem créditos, sem image/video) ===
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
          _description: `Reembolso MP: plano revogado → free`
        })
        if (zeroError) {
          console.error(`   ├─ ❌ Erro ao zerar créditos:`, zeroError)
        }

        console.log(`   ├─ ✅ Plano revogado → free, créditos mensais zerados`)
      }

      // === LANDING BUNDLE REFUND (revoke lifetime credits + downgrade to free) ===
      if (order.user_id && product.type === 'landing_bundle') {
        console.log(`   ├─ 📋 Revogando landing_bundle...`)

        // 1. Revoke lifetime credits
        if (product.credits_amount > 0) {
          const { data: revokeData, error: revokeError } = await supabase.rpc('revoke_lifetime_credits_on_refund', {
            _user_id: order.user_id,
            _amount: product.credits_amount,
            _description: `Reembolso landing_bundle MP: ${product.title}`
          })
          if (revokeError) {
            console.error(`   ├─ ❌ Erro ao revogar créditos landing_bundle:`, revokeError)
          } else {
            console.log(`   ├─ ✅ Créditos landing_bundle revogados: -${product.credits_amount}`)
          }
        }

        // 2. Downgrade to free plan
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

      await supabase.from('mp_orders').update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      // Atualizar webhook_log do claim com status final
      await supabase.from('webhook_logs').update({
        status: 'refunded',
        result: 'success',
      })
      .eq('platform', 'mercadopago')
      .eq('transaction_id', String(paymentId))
      .eq('event_type', 'refund')
      console.log(`   ├─ ✅ webhook_logs refund atualizado`)
    }

    // Outros status
    else {
      console.log(`   ├─ ℹ️ Status ${paymentStatus} / ordem ${order.status} - sem ação`)
    }

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO:`, error)
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})

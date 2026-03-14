/**
 * Edge Function: webhook-mercadopago
 * Recebe notificações do Mercado Pago, valida o pagamento e libera acesso.
 * Reutiliza a mesma lógica do webhook-greenn-artes para criação de usuário e acesso.
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

function buildPurchaseEmailHtml(email: string, productName: string, ctaLink: string): string {
  const unsubscribeLink = getUnsubscribeLink(email)
  const trackingBaseUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/welcome-email-tracking`

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

    <!-- Aviso Vitalício -->
    <div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
      <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 Acesso Vitalício Ativado!</p>
      <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Você <strong>NÃO precisa comprar créditos</strong> para usar o Upscaler Arcano. Seu acesso vitalício já inclui uso ilimitado da ferramenta!</p>
    </div>

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

async function sendPurchaseEmailAttempt(supabase: any, email: string, productName: string, ctaLink: string, requestId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('welcome_email_logs')
    .select('id')
    .eq('email', email)
    .eq('template_used', `mp_purchase_${productName}`)
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
  const html = buildPurchaseEmailHtml(email, productName, ctaLink)
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
    template_used: `mp_purchase_${productName}`,
    tracking_id: trackingId,
    status: response.ok ? 'sent' : 'failed',
    sent_at: response.ok ? new Date().toISOString() : null,
    error_message: response.ok ? null : responseText,
  })

  return response.ok
}

async function sendPurchaseEmail(supabase: any, email: string, productName: string, ctaLink: string, requestId: string) {
  try {
    const success = await sendPurchaseEmailAttempt(supabase, email, productName, ctaLink, requestId)
    if (success) {
      console.log(`   ├─ ✅ Email de compra enviado para ${email}`)
    } else {
      console.log(`   ├─ ⏳ Primeira tentativa falhou, retry em 3s...`)
      await new Promise(resolve => setTimeout(resolve, 3000))
      await supabase.from('welcome_email_logs').delete()
        .eq('email', email)
        .eq('template_name', `mp_purchase_${productName}`)
        .eq('status', 'failed')
      const retrySuccess = await sendPurchaseEmailAttempt(supabase, email, productName, ctaLink, requestId)
      if (retrySuccess) {
        console.log(`   ├─ ✅ Email enviado no retry para ${email}`)
      } else {
        console.error(`   ├─ ❌ Email falhou após retry para ${email}`)
      }
    }
  } catch (err: any) {
    console.error(`   ├─ ❌ Erro ao enviar email: ${err.message}`)
    try {
      await supabase.from('welcome_email_logs').insert({
        email,
        template_name: `mp_purchase_${productName}`,
        tracking_id: crypto.randomUUID(),
        status: 'failed',
        error_message: err.message,
      })
    } catch (_) {}
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

    // Parse do body - MP pode enviar como query params ou JSON
    let body: any = {}
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const text = await req.text()
      try { body = JSON.parse(text) } catch { body = {} }
    }

    // Também checar query params (MP às vezes envia assim)
    const url = new URL(req.url)
    const queryType = url.searchParams.get('type') || url.searchParams.get('topic')
    const queryDataId = url.searchParams.get('data.id') || url.searchParams.get('id')

    const notificationType = body.type || body.topic || queryType
    const paymentId = body.data?.id || queryDataId

    console.log(`\n🔔 [${requestId}] WEBHOOK MERCADO PAGO`)
    console.log(`   ├─ type: ${notificationType}`)
    console.log(`   ├─ payment_id: ${paymentId}`)

    // Só processar notificações de pagamento
    if (notificationType !== 'payment' && notificationType !== 'merchant_order') {
      console.log(`   ├─ ⏭️ Tipo ignorado: ${notificationType}`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    if (!paymentId) {
      console.log(`   ├─ ⏭️ Sem payment_id`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Buscar detalhes do pagamento na API do Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` }
    })

    if (!paymentResponse.ok) {
      console.error(`   ├─ ❌ Erro ao buscar pagamento: ${paymentResponse.status}`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const payment = await paymentResponse.json()

    const paymentStatus = payment.status // approved, pending, rejected, refunded, etc
    const externalReference = payment.external_reference // = mp_orders.id
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
      console.log(`\n✅ [${requestId}] PAGAMENTO APROVADO - Processando...`)

      const email = order.user_email

      // 1. Criar ou buscar usuário (mesma lógica do webhook-greenn-artes)
      let userId: string | null = null

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, password: email, email_confirm: true
      })

      if (createError) {
        if (createError.message?.includes('email') || createError.code === 'email_exists') {
          // Buscar existente via profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .maybeSingle()

          if (profile) {
            userId = profile.id
            console.log(`   ├─ 👤 Usuário existente (profile): ${userId}`)
          } else {
            // Busca paginada em auth.users
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

      // 2. Upsert profile — check if profile exists to avoid resetting password_changed
      const { data: existingProfileMp } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
      const profileDataMp: Record<string, unknown> = {
        id: userId, email, email_verified: true, updated_at: new Date().toISOString()
      }
      if (!existingProfileMp) { profileDataMp.password_changed = false }
      await supabase.from('profiles').upsert(profileDataMp, { onConflict: 'id' })
      console.log(`   ├─ ✅ Profile atualizado`)

      // 3. Processar de acordo com o tipo do produto
      if (product.type === 'pack' && product.pack_slug) {
        // Verificar se já tem acesso
        const { data: existingPurchase } = await supabase
          .from('user_pack_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('pack_slug', product.pack_slug)
          .eq('is_active', true)
          .maybeSingle()

        if (!existingPurchase) {
          await supabase.from('user_pack_purchases').insert({
            user_id: userId,
            pack_slug: product.pack_slug,
            access_type: product.access_type || 'vitalicio',
            has_bonus_access: true,
            expires_at: null,
            product_name: product.title,
            platform: 'mercadopago'
          })
          console.log(`   ├─ ✅ Acesso concedido: ${product.pack_slug} (${product.access_type})`)
        } else {
          console.log(`   ├─ ℹ️ Acesso já existente: ${product.pack_slug}`)
        }
      }

      if (product.type === 'credits' && product.credits_amount > 0) {
        const { error: creditsError } = await supabase.rpc('add_lifetime_credits', {
          _user_id: userId,
          _amount: product.credits_amount,
          _description: `Compra MP: ${product.title}`
        })
        if (creditsError) {
          console.error(`   ├─ ❌ Erro ao adicionar créditos:`, creditsError)
        } else {
          console.log(`   ├─ ✅ +${product.credits_amount} créditos adicionados`)
        }
      }

      // 4. Atualizar ordem (incluindo novos campos de analytics)
      await supabase.from('mp_orders').update({
        status: 'paid',
        user_id: userId,
        mp_payment_id: String(paymentId),
        payment_method: payment.payment_method_id || null,
        net_amount: payment.transaction_details?.net_received_amount ?? payment.transaction_amount,
        paid_at: payment.date_approved || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      // 5. Enviar email de compra via SendPulse
      const ctaLink = product.pack_slug === 'upscaler-arcano' || product.type === 'credits'
        ? 'https://arcanoapp.voxvisual.com.br/upscaler-arcano'
        : 'https://arcanoapp.voxvisual.com.br/'
      
      await sendPurchaseEmail(supabase, email, product.title, ctaLink, requestId)

      // 5.1 Notificar admin
      try {
        await sendAdminSaleNotification({
          productName: product.title,
          amount: payment.transaction_amount,
          paymentMethod: payment.payment_method_id || 'unknown',
          customerEmail: email,
          customerName: '',
          platform: 'Mercado Pago',
          requestId,
        })
      } catch (adminErr) {
        console.error(`   ├─ ⚠️ Erro ao enviar email admin (não-crítico):`, adminErr)
      }

      // 6. Enviar webhook para UTMify (formato EXATO da Greenn)
      try {
        const utmData = order.utm_data as Record<string, string> | null
        const saleMetas: { meta_key: string; meta_value: string }[] = []
        if (utmData) {
          for (const [key, value] of Object.entries(utmData)) {
            if (value) saleMetas.push({ meta_key: key, meta_value: String(value) })
          }
        }

        // Gerar IDs numéricos consistentes a partir do UUID da ordem
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
          client: {
            name: '',
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
      console.log(`\n🚫 [${requestId}] REEMBOLSO/CHARGEBACK - Revogando acesso...`)

      if (order.user_id && product.pack_slug) {
        await supabase
          .from('user_pack_purchases')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', order.user_id)
          .eq('pack_slug', product.pack_slug)
        
        console.log(`   ├─ ✅ Acesso revogado: ${product.pack_slug}`)
      }

      // Revogar créditos se produto for do tipo credits
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
      }

      await supabase.from('mp_orders').update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      }).eq('id', order.id)
    }

    // Outros status (pending, in_process, rejected)
    else {
      console.log(`   ├─ ℹ️ Status ${paymentStatus} / ordem ${order.status} - sem ação`)
    }

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO:`, error)
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})

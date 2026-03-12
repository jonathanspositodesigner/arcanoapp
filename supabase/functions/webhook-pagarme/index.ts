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

function buildPurchaseEmailHtml(email: string, productName: string, ctaLink: string): string {
  const unsubscribeLink = getUnsubscribeLink(email)

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
    <div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
      <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 Acesso Vitalício Ativado!</p>
      <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Você <strong>NÃO precisa comprar créditos</strong> para usar o Upscaler Arcano. Seu acesso vitalício já inclui uso ilimitado da ferramenta!</p>
    </div>
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

async function sendPurchaseEmail(supabase: any, email: string, productName: string, ctaLink: string, requestId: string) {
  try {
    const { data: existing } = await supabase
      .from('welcome_email_logs')
      .select('id')
      .eq('email', email)
      .eq('template_name', `pagarme_purchase_${productName}`)
      .maybeSingle()

    if (existing) {
      console.log(`   ├─ ℹ️ Email já enviado para ${email} (${productName})`)
      return
    }

    const { data: blacklisted } = await supabase
      .from('blacklisted_emails')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (blacklisted) {
      console.log(`   ├─ ⛔ Email blacklisted: ${email}`)
      return
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
      template_name: `pagarme_purchase_${productName}`,
      tracking_id: trackingId,
      status: response.ok ? 'sent' : 'failed',
      sent_at: response.ok ? new Date().toISOString() : null,
      error_message: response.ok ? null : responseText,
    })

    if (response.ok) {
      console.log(`   ├─ ✅ Email de compra enviado para ${email}`)
    } else {
      console.error(`   ├─ ❌ Falha no envio: ${responseText}`)
    }
  } catch (err: any) {
    console.error(`   ├─ ❌ Erro ao enviar email: ${err.message}`)
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()

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

    if (!order) {
      console.log(`   ├─ ⏭️ Ordem não encontrada por nenhum método`)
      await supabase.from('webhook_logs').insert({
        platform: 'pagarme',
        event_type: eventType,
        transaction_id: idempotencyKey,
        status: 'order_not_found',
        email: null,
        raw_payload: body,
      })
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    console.log(`   ├─ produto: ${product?.title}`)
    console.log(`   ├─ ordem status atual: ${order.status}`)
    console.log(`   ├─ ordem id: ${orderId}`)

    // =============================================
    // PAGAMENTO CONFIRMADO
    // =============================================
    if ((eventType === 'order.paid' || eventType === 'charge.paid') && order.status === 'pending') {
      console.log(`\n✅ [${requestId}] PAGAMENTO PAGAR.ME CONFIRMADO - Processando...`)

      const email = order.user_email

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
        const { data: existingPurchase } = await supabase
          .from('user_pack_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('pack_slug', product.pack_slug)
          .eq('is_active', true)
          .maybeSingle()

        if (!existingPurchase) {
          // Calcular expires_at e has_bonus_access baseado no access_type
          const accessType = product.access_type || 'vitalicio'
          let expiresAt: string | null = null
          if (accessType === '6_meses') {
            expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
          } else if (accessType === '1_ano') {
            expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
          const hasBonusAccess = accessType !== '6_meses' // 1 ano e vitalício têm bônus

          await supabase.from('user_pack_purchases').insert({
            user_id: userId,
            pack_slug: product.pack_slug,
            access_type: accessType,
            has_bonus_access: hasBonusAccess,
            expires_at: expiresAt,
            product_name: product.title,
            platform: 'pagarme'
          })
          console.log(`   ├─ ✅ Acesso concedido: ${product.pack_slug} (${product.access_type})`)
        } else {
          console.log(`   ├─ ℹ️ Acesso já existente: ${product.pack_slug}`)
        }

        // Bundle: conceder packs extras para produtos do tipo bundle
        const BUNDLE_EXTRA_PACKS: Record<string, Array<{pack_slug: string, access_type: string}>> = {
          'pack4lancamento': [
            { pack_slug: 'pack-de-sao-joao', access_type: 'vitalicio' }
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

      // 4. Determinar método de pagamento
      const charge = eventData?.charges?.[0] || eventData
      const lastTransaction = charge?.last_transaction
      let paymentMethod = lastTransaction?.transaction_type || 'unknown'
      if (paymentMethod === 'pix') paymentMethod = 'pix'
      else if (paymentMethod === 'credit_card') paymentMethod = 'credit_card'
      else if (paymentMethod === 'boleto') paymentMethod = 'boleto'

      // 5. Atualizar ordem
      const netAmount = charge?.amount ? charge.amount / 100 : Number(order.amount)
      await supabase.from('asaas_orders').update({
        status: 'paid',
        user_id: userId,
        asaas_payment_id: eventData?.id || charge?.id,
        payment_method: paymentMethod,
        net_amount: netAmount,
        paid_at: charge?.paid_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      // 6. Logar na webhook_logs
      await supabase.from('webhook_logs').insert({
        platform: 'pagarme',
        event_type: eventType,
        transaction_id: idempotencyKey,
        status: 'paid',
        email: email,
        product_name: product.title,
        amount: Number(order.amount),
        payment_method: paymentMethod,
        raw_payload: body,
      })

      // 7. Enviar email
      const ctaLink = product.pack_slug === 'upscaler-arcano' || product.type === 'credits'
        ? 'https://arcanoapp.voxvisual.com.br/upscaler-arcano'
        : 'https://arcanoapp.voxvisual.com.br/'

      await sendPurchaseEmail(supabase, email, product.title, ctaLink, requestId)

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

      console.log(`\n✅ [${requestId}] PROCESSAMENTO PAGAR.ME CONCLUÍDO COM SUCESSO`)
    }

    // =============================================
    // REEMBOLSO
    // =============================================
    else if (eventType === 'charge.refunded' || eventType === 'order.canceled' || eventType === 'charge.chargedback' || eventType === 'charge.underpaid') {
      console.log(`\n🚫 [${requestId}] REEMBOLSO PAGAR.ME - Revogando acesso...`)

      if (order.user_id && product.pack_slug) {
        await supabase
          .from('user_pack_purchases')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', order.user_id)
          .eq('pack_slug', product.pack_slug)

        console.log(`   ├─ ✅ Acesso revogado: ${product.pack_slug}`)

        // Bundle: revogar packs extras
        const REFUND_BUNDLE_EXTRA_PACKS: Record<string, string[]> = {
          'pack4lancamento': ['pack-de-sao-joao']
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
        const { error: revokeError } = await supabase.rpc('remove_lifetime_credits', {
          _user_id: order.user_id,
          _amount: product.credits_amount,
          _description: `Reembolso Pagar.me: ${product.title}`
        })
        if (revokeError) {
          console.error(`   ├─ ❌ Erro ao revogar créditos:`, revokeError)
        } else {
          console.log(`   ├─ ✅ Créditos revogados: ${product.credits_amount}`)
        }
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
        raw_payload: body,
      })

      console.log(`   ├─ ✅ Ordem marcada como refunded`)
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
        raw_payload: body,
      })
    }

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error: any) {
    console.error(`❌ [${requestId}] Erro geral:`, error.message)
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})

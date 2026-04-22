/**
 * Edge Function: webhook-stripe
 * Receives Stripe webhook events:
 *   - checkout.session.completed (purchase provisioning)
 *   - charge.refunded (refund revocation)
 *   - customer.subscription.deleted (cancellation)
 *   - customer.subscription.updated (upgrade/downgrade)
 *   - invoice.payment_failed (renewal failure)
 * Validates signature via STRIPE_WEBHOOK_SECRET.
 * Provisions access (credits/packs/subscriptions) and records in stripe_orders.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@18.5.0"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
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

function buildAdminSaleEmailHtml(productName: string, amount: number, currency: string, customerEmail: string, customerName: string): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  const amountStr = currency === 'usd'
    ? `$${amount.toFixed(2)} USD`
    : amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0015;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:48px 16px;">
  <div style="background:linear-gradient(160deg,#1e0a3c 0%,#2a1252 40%,#1e0a3c 100%);border-radius:20px;padding:50px 40px;text-align:center;border:1px solid rgba(212,175,55,0.15);">
    <div style="width:80px;height:80px;margin:0 auto 20px;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 50%,#d4af37 100%);border-radius:50%;line-height:80px;font-size:36px;box-shadow:0 8px 32px rgba(212,175,55,0.35);">🎉</div>
    <h1 style="color:#d4af37;font-size:26px;margin:0 0 8px;font-weight:800;">NOVA VENDA STRIPE!</h1>
    <p style="color:#e8d5f5;font-size:16px;margin:0 0 32px;">🏆 Venda LATAM via Stripe!</p>
    <div style="background:rgba(0,0,0,0.3);border-radius:14px;padding:28px 24px;text-align:left;border:1px solid rgba(212,175,55,0.1);">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;">📦 Produto</td><td style="padding:10px 0;color:#fff;font-size:14px;font-weight:600;text-align:right;">${productName}</td></tr>
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">💰 Valor</td><td style="padding:10px 0;color:#4ade80;font-size:18px;font-weight:700;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${amountStr}</td></tr>
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">💳 Método</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">Stripe</td></tr>
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">📧 Cliente</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${customerEmail}</td></tr>
        ${customerName ? `<tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">👤 Nome</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${customerName}</td></tr>` : ''}
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">📅 Data</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">${dateStr} às ${timeStr}</td></tr>
        <tr><td style="padding:10px 0;color:#a78bfa;font-size:14px;border-top:1px solid rgba(255,255,255,0.05);">🏷️ Plataforma</td><td style="padding:10px 0;color:#fff;font-size:14px;text-align:right;border-top:1px solid rgba(255,255,255,0.05);">Stripe (LATAM)</td></tr>
      </table>
    </div>
    <p style="color:#4b5563;font-size:11px;margin:32px 0 0;">Vox Visual © ${now.getFullYear()}</p>
  </div>
</div>
</body></html>`
}

async function sendAdminNotification(productName: string, amount: number, currency: string, customerEmail: string, customerName: string): Promise<void> {
  try {
    const token = await getSendPulseToken()
    const html = buildAdminSaleEmailHtml(productName, amount, currency, customerEmail, customerName)
    const htmlBase64 = btoa(unescape(encodeURIComponent(html)))
    const amountStr = currency === 'usd' ? `$${amount.toFixed(2)} USD` : `R$${amount.toFixed(2)}`

    await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        email: {
          html: htmlBase64,
          text: "",
          subject: `🎉 Nova venda Stripe: ${productName} — ${amountStr}`,
          from: { name: "Arcano Notificações", email: "contato@voxvisual.com.br" },
          to: [{ name: "Jonathan", email: ADMIN_EMAIL }]
        }
      })
    })
    console.log(`   ├─ ✅ Admin notificado`)
  } catch (err: any) {
    console.error(`   ├─ ⚠️ Admin email error (non-critical): ${err.message}`)
  }
}

function getUnsubscribeLink(email: string): string {
  const baseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  return `${baseUrl}/functions/v1/email-unsubscribe?email=${encodeURIComponent(email)}`
}

function buildStripePurchaseEmailHtml(email: string, productName: string, ctaLink: string, options?: { packSlug?: string; productType?: string; accessType?: string; billingPeriod?: string }): string {
  const unsubscribeLink = getUnsubscribeLink(email)
  const isUpscalerOrCredits = options?.packSlug === 'upscaller-arcano' || options?.productType === 'credits'
  const isLandingBundle = options?.productType === 'landing_bundle'
  const isSubscription = options?.productType === 'subscription'

  let benefitBlock = ''
  if (isLandingBundle) {
    benefitBlock = `<div style="background:linear-gradient(135deg,rgba(168,85,247,0.12) 0%,rgba(236,72,153,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(168,85,247,0.3);text-align:center;">
        <p style="color:#c084fc;font-size:15px;font-weight:700;margin:0 0 8px;">🚀 ¡Tus créditos ya están disponibles!</p>
        <p style="color:#e9d5ff;font-size:13px;margin:0;line-height:1.6;">Accedé al <strong>Upscaler Arcano</strong> y empezá a mejorar tus imágenes ahora mismo.</p>
      </div>`
  } else if (isUpscalerOrCredits) {
    benefitBlock = `<div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
        <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 ¡Acceso Vitalicio Activado!</p>
        <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;"><strong>NO necesitás comprar créditos</strong> para usar el Upscaler Arcano. Tu acceso vitalicio ya incluye uso ilimitado.</p>
      </div>`
  } else if (isSubscription) {
    const renewalText = options?.billingPeriod === 'anual'
      ? 'Tu suscripción se renovará automáticamente cada 12 meses.'
      : 'Tu suscripción se renovará automáticamente cada mes.'
    benefitBlock = `<div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
        <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 ¡${productName} Activado!</p>
        <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Tus créditos y herramientas de IA ya están disponibles. ${renewalText}</p>
      </div>`
  } else {
    benefitBlock = `<div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
        <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 ¡Acceso Activado!</p>
        <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Tu <strong>${productName}</strong> ya está liberado. Accedé a la plataforma para explorar todo el contenido.</p>
      </div>`
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0015;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:48px 16px;">
  <div style="background:linear-gradient(160deg,#1e0a3c 0%,#2a1252 40%,#1e0a3c 100%);border-radius:20px 20px 0 0;padding:50px 40px 36px;text-align:center;border:1px solid rgba(212,175,55,0.15);border-bottom:none;">
    <div style="width:88px;height:88px;margin:0 auto 24px;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 50%,#d4af37 100%);border-radius:50%;line-height:88px;text-align:center;box-shadow:0 8px 32px rgba(212,175,55,0.35);">
      <span style="font-size:42px;line-height:88px;">✅</span>
    </div>
    <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 12px;">¡Compra Confirmada!</h1>
    <p style="color:#c4b5fd;font-size:17px;margin:0;line-height:1.5;">Tu acceso a <strong style="color:#f5e27a;">${productName}</strong> ya está liberado.</p>
  </div>
  <div style="background:linear-gradient(180deg,#2a1252 0%,#1e0a3c 100%);padding:0 40px 40px;border:1px solid rgba(212,175,55,0.15);border-top:none;border-bottom:none;">
    <div style="background:rgba(255,255,255,0.06);border-radius:14px;padding:28px;margin-bottom:32px;border:1px solid rgba(212,175,55,0.25);">
      <p style="color:#d4af37;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 20px;text-align:center;">Tus credenciales de acceso</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#a78bfa;padding:12px 16px;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.06);">📧 Email</td>
          <td style="color:#ffffff;padding:12px 16px;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);word-break:break-all;">${email}</td>
        </tr>
        <tr>
          <td style="color:#a78bfa;padding:12px 16px;font-size:14px;">🔑 Contraseña</td>
          <td style="color:#ffffff;padding:12px 16px;font-size:14px;text-align:right;font-weight:600;word-break:break-all;">${email}</td>
        </tr>
      </table>
      <div style="margin-top:16px;padding:10px 16px;background:rgba(248,113,113,0.1);border-radius:8px;border:1px solid rgba(248,113,113,0.2);text-align:center;">
        <p style="color:#fca5a5;font-size:12px;margin:0;">⚠️ Recomendamos cambiar tu contraseña en el primer acceso</p>
      </div>
    </div>
    ${benefitBlock}
    <div style="text-align:center;padding-bottom:8px;">
      <a href="${ctaLink}" style="display:inline-block;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 100%);color:#1a0533;text-decoration:none;padding:18px 52px;border-radius:12px;font-weight:700;font-size:17px;letter-spacing:0.3px;box-shadow:0 6px 24px rgba(212,175,55,0.4);">
        Acceder Ahora →
      </a>
    </div>
  </div>
  <div style="background:#150828;border-radius:0 0 20px 20px;padding:28px 40px;border:1px solid rgba(212,175,55,0.15);border-top:1px solid rgba(212,175,55,0.1);text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0 0 10px;">
      <a href="https://wa.me/5533988819891" style="color:#a78bfa;text-decoration:underline;font-size:12px;">¿Problemas con tu producto? Contáctanos</a>
    </p>
    <p style="color:#4b5563;font-size:11px;margin:0 0 8px;">Vox Visual © ${new Date().getFullYear()}</p>
    <p style="margin:0;"><a href="${unsubscribeLink}" style="color:#4b5563;font-size:11px;text-decoration:underline;">Cancelar suscripción</a></p>
  </div>
</div>
</body></html>`
}

// ===== Email Dedup + Retry + Blacklist (mirrors Pagar.me logic) =====
type EmailDispatchResult = {
  status: 'sent' | 'already_sent' | 'blacklisted' | 'failed'
  attempts: number
  error?: string
}

async function sendStripePurchaseEmailAttempt(
  supabase: any,
  params: {
    sessionId: string
    email: string
    productName: string
    ctaLink: string
    requestId: string
    options?: { packSlug?: string; productType?: string; accessType?: string; billingPeriod?: string }
  }
): Promise<EmailDispatchResult> {
  const normalizedEmail = params.email.toLowerCase().trim()
  const dedupKey = `stripe_session_${params.sessionId}`
  const templateUsed = `stripe_purchase_${params.productName}`

  // Dedup check 1: same session
  const { data: existingBySession } = await supabase
    .from('welcome_email_logs')
    .select('id')
    .eq('dedup_key', dedupKey)
    .eq('status', 'sent')
    .maybeSingle()

  if (existingBySession) {
    console.log(`   ├─ ℹ️ Email já enviado (dedup session): ${normalizedEmail}`)
    return { status: 'already_sent', attempts: 0 }
  }

  // Blacklist check
  const { data: blacklisted } = await supabase
    .from('blacklisted_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (blacklisted) {
    console.log(`   ├─ ⛔ Email blacklisted: ${normalizedEmail}`)
    const trackingId = crypto.randomUUID()
    await supabase.from('welcome_email_logs').insert({
      email: normalizedEmail,
      template_used: templateUsed,
      dedup_key: dedupKey,
      tracking_id: trackingId,
      status: 'failed',
      sent_at: new Date().toISOString(),
      error_message: 'email_blacklisted',
      product_info: params.productName,
      platform: 'stripe',
    })
    return { status: 'blacklisted', attempts: 1, error: 'email_blacklisted' }
  }

  const trackingId = crypto.randomUUID()
  const html = buildStripePurchaseEmailHtml(normalizedEmail, params.productName, params.ctaLink, params.options)
  const htmlBase64 = btoa(unescape(encodeURIComponent(html)))
  const token = await getSendPulseToken()

  const response = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      email: {
        html: htmlBase64,
        text: "",
        subject: `✅ ¡Compra confirmada! - ${params.productName}`,
        from: { name: "Vox Visual", email: "contato@voxvisual.com.br" },
        to: [{ name: normalizedEmail, email: normalizedEmail }]
      }
    })
  })

  const responseText = await response.text()
  console.log(`   ├─ 📧 SendPulse response: ${response.status}`)

  await supabase.from('welcome_email_logs').insert({
    email: normalizedEmail,
    template_used: templateUsed,
    dedup_key: dedupKey,
    tracking_id: trackingId,
    status: response.ok ? 'sent' : 'failed',
    sent_at: new Date().toISOString(),
    error_message: response.ok ? null : responseText,
    product_info: params.productName,
    platform: 'stripe',
  })

  if (response.ok) return { status: 'sent', attempts: 1 }
  return { status: 'failed', attempts: 1, error: responseText || `http_${response.status}` }
}

async function sendStripePurchaseEmail(
  supabase: any,
  params: {
    sessionId: string
    email: string
    productName: string
    ctaLink: string
    requestId: string
    options?: { packSlug?: string; productType?: string; accessType?: string; billingPeriod?: string }
  }
): Promise<EmailDispatchResult> {
  const maxAttempts = 3
  const retryDelaysMs = [2000, 5000]

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await sendStripePurchaseEmailAttempt(supabase, params)
      if (result.status === 'sent' || result.status === 'already_sent' || result.status === 'blacklisted') {
        return { ...result, attempts: attempt }
      }
      if (attempt < maxAttempts) {
        const delayMs = retryDelaysMs[attempt - 1] ?? 8000
        console.log(`   ├─ ⏳ Email attempt ${attempt}/${maxAttempts} failed. Retry in ${Math.round(delayMs / 1000)}s...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      } else {
        return { ...result, attempts: attempt }
      }
    } catch (err: any) {
      console.error(`   ├─ ❌ Email attempt ${attempt}/${maxAttempts} error: ${err?.message || 'unknown'}`)
      if (attempt >= maxAttempts) {
        try {
          await supabase.from('welcome_email_logs').insert({
            email: params.email.toLowerCase().trim(),
            template_used: `stripe_purchase_${params.productName}`,
            dedup_key: `stripe_session_${params.sessionId}`,
            tracking_id: crypto.randomUUID(),
            status: 'failed',
            sent_at: new Date().toISOString(),
            error_message: err?.message || 'unknown_error',
            product_info: params.productName,
            platform: 'stripe',
          })
        } catch (_) {}
        return { status: 'failed', attempts: attempt, error: err?.message }
      }
      const delayMs = retryDelaysMs[attempt - 1] ?? 8000
      await new Promise(resolve => setTimeout(resolve, delayMs))
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
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!stripeSecretKey || !webhookSecret) {
      console.error(`🚫 [${requestId}] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET`)
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-08-27.basil" })
    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      console.error(`🚫 [${requestId}] Missing stripe-signature header`)
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
    } catch (err: any) {
      console.error(`🚫 [${requestId}] Invalid signature: ${err.message}`)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`\n🔔 [${requestId}] WEBHOOK STRIPE`)
    console.log(`   ├─ event_id: ${event.id}`)
    console.log(`   ├─ type: ${event.type}`)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // =============================================
    // CHECKOUT SESSION COMPLETED
    // =============================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const paymentIntentId = session.payment_intent as string || null

      const duplicateFilters = [`stripe_session_id.eq.${session.id}`]
      if (paymentIntentId) {
        duplicateFilters.push(`stripe_payment_intent_id.eq.${paymentIntentId}`)
      }

      const { data: existingOrders, error: existingOrderError } = await supabase
        .from('stripe_orders')
        .select('id, stripe_session_id, stripe_payment_intent_id, created_at')
        .or(duplicateFilters.join(','))
        .order('created_at', { ascending: false })
        .limit(1)

      if (existingOrderError) {
        console.error(`   ├─ ❌ Error checking existing stripe order: ${existingOrderError.message}`)
      }

      const existingOrder = existingOrders?.[0]

      if (existingOrder) {
        const duplicateReason = existingOrder.stripe_session_id === session.id
          ? 'session_id'
          : 'payment_intent_id'
        console.log(`   ├─ ⏭️ Order already processed via ${duplicateReason}: ${existingOrder.id}`)
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      const productSlug = session.metadata?.product_slug || ''
      const email = (session.customer_details?.email || session.customer_email || '').toLowerCase().trim()
      const customerName = session.customer_details?.name || ''
      
      // Extract Meta tracking data from session metadata
      const metaFbp = session.metadata?.meta_fbp || null
      const metaFbc = session.metadata?.meta_fbc || null
      const metaUserAgent = session.metadata?.meta_user_agent || null
      const metaEventSourceUrl = session.metadata?.meta_event_source_url || null
      const metaClientIp = session.metadata?.meta_client_ip || null
      const metaFbclid = session.metadata?.meta_fbclid || null

      // Reconstruct fbc from fbclid if fbc is missing (fallback)
      let finalFbc = metaFbc
      if (!finalFbc && metaFbclid) {
        finalFbc = `fb.1.${Date.now()}.${metaFbclid}`
        console.log(`   ├─ 🔄 fbc reconstructed from fbclid`)
      }

      // Generate pseudo fbp if missing but fbclid exists
      let finalFbp = metaFbp
      if (!finalFbp && metaFbclid) {
        finalFbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`
        console.log(`   ├─ 🔄 fbp generated from fbclid presence`)
      }

      console.log(`   ├─ product_slug: ${productSlug}`)
      console.log(`   ├─ email: ${email}`)
      console.log(`   ├─ amount: ${session.amount_total}`)
      console.log(`   ├─ currency: ${session.currency}`)

      if (!email) {
        console.error(`   ├─ ❌ No email in session`)
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      // Look up product in mp_products
      const { data: product } = await supabase
        .from('mp_products')
        .select('*')
        .eq('slug', productSlug)
        .maybeSingle()

      if (!product) {
        console.error(`   ├─ ❌ Product not found: ${productSlug}`)
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      console.log(`   ├─ produto: ${product.title} (type: ${product.type})`)

      // Convert amount from cents
      const amountUsd = (session.amount_total || 0) / 100
      const currency = session.currency || 'usd'

      // Get exchange rate for BRL conversion
      let rateToBrl = 5.15 // fallback
      const { data: rateData } = await supabase
        .from('exchange_rates')
        .select('rate_to_brl')
        .eq('currency', 'USD')
        .maybeSingle()
      if (rateData?.rate_to_brl) rateToBrl = rateData.rate_to_brl

      const amountBrl = Math.round(amountUsd * rateToBrl * 100) / 100

      // Stripe fee: 3.9% + $0.30 USD for international cards
      const feeUsd = amountUsd * 0.039 + 0.30
      const netAmountBrl = Math.round((amountUsd - feeUsd) * rateToBrl * 100) / 100

      console.log(`   ├─ amount_usd: $${amountUsd} | rate: ${rateToBrl} | amount_brl: R$${amountBrl} | net: R$${netAmountBrl}`)

      // ES products: record-only, NO user creation/provisioning/email
      const ES_RECORD_ONLY_SLUGS = [
        'upscaler-arcano-starter-es',
        'upscaler-arcano-pro-es',
        'upscaler-arcano-ultimate-es',
        'upscaler-arcano-v3-es',
      ]
      const isRecordOnly = ES_RECORD_ONLY_SLUGS.includes(productSlug)

      let userId: string | null = null

      if (!isRecordOnly) {
        // 1. Create or find user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email, password: email, email_confirm: true
        })

        if (createError) {
          if (createError.message?.includes('email') || (createError as any).code === 'email_exists') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .ilike('email', email)
              .maybeSingle()

            if (profile) {
              userId = profile.id
              console.log(`   ├─ 👤 Existing user (profile): ${userId}`)
            } else {
              let page = 1
              while (!userId && page <= 10) {
                const { data: usersPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
                const found = usersPage?.users?.find((u: any) => u.email?.toLowerCase() === email)
                if (found) userId = found.id
                if (!usersPage?.users?.length || usersPage.users.length < 1000) break
                page++
              }
              if (userId) console.log(`   ├─ 👤 Existing user (auth): ${userId}`)
            }

            if (!userId) {
              console.error(`   ├─ ❌ User exists but not found`)
              return new Response('OK', { status: 200, headers: corsHeaders })
            }
          } else {
            throw createError
          }
        } else {
          userId = newUser.user.id
          console.log(`   ├─ ✅ New user created: ${userId}`)
        }

        // 2. Upsert profile
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .maybeSingle()

        const profileData: Record<string, unknown> = {
          id: userId,
          email,
          name: existingProfile?.name || customerName || null,
          email_verified: true,
          updated_at: new Date().toISOString()
        }
        if (!existingProfile) {
          profileData.password_changed = false
        }
        await supabase.from('profiles').upsert(profileData, { onConflict: 'id' })
        console.log(`   ├─ ✅ Profile upserted`)

        // 3. Provision product access
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
              platform: 'stripe'
            })
            console.log(`   ├─ ✅ Pack access granted: ${product.pack_slug} (${accessType})`)
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
                platform: 'stripe',
                purchased_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('id', existingPurchase.id)
              console.log(`   ├─ ✅ Pack RENEWED (was expired): ${product.pack_slug} (${existingPurchase.access_type} → ${accessType})`)
            } else if (newRank > existingRank) {
              await supabase.from('user_pack_purchases').update({
                access_type: accessType,
                has_bonus_access: hasBonusAccess,
                expires_at: expiresAt,
                product_name: product.title,
                platform: 'stripe',
                purchased_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('id', existingPurchase.id)
              console.log(`   ├─ ✅ Pack UPGRADED: ${product.pack_slug} (${existingPurchase.access_type} → ${accessType})`)
            } else if (newRank === existingRank && existingPurchase.expires_at) {
              const currentExpiry = new Date(existingPurchase.expires_at)
              const newExpiry = expiresAt ? new Date(Math.max(currentExpiry.getTime(), new Date(expiresAt).getTime())) : null
              await supabase.from('user_pack_purchases').update({
                expires_at: newExpiry?.toISOString() || null,
                product_name: product.title,
                platform: 'stripe',
                purchased_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('id', existingPurchase.id)
              console.log(`   ├─ ✅ Pack RENEWED: ${product.pack_slug} (${accessType}, expires: ${newExpiry?.toISOString() || 'never'})`)
            } else {
              console.log(`   ├─ ℹ️ Pack access already superior: ${product.pack_slug} (${existingPurchase.access_type})`)
            }
          }

          if (productSlug === 'upscaler-arcano-v3-es') {
            const { data: existingV2 } = await supabase
              .from('user_pack_purchases')
              .select('id')
              .eq('user_id', userId)
              .eq('pack_slug', 'upscaller-arcano')
              .eq('is_active', true)
              .maybeSingle()

            if (!existingV2) {
              await supabase.from('user_pack_purchases').insert({
                user_id: userId,
                pack_slug: 'upscaller-arcano',
                access_type: 'vitalicio',
                is_active: true,
                has_bonus_access: false,
                product_name: 'Bônus V3: acesso V2 (Stripe)',
                platform: 'stripe'
              })
              console.log(`   ├─ ✅ V3 bonus: V2 pack granted`)
            }
          }
        }

        if (product.type === 'credits' && product.credits_amount > 0) {
          const { error: creditsError } = await supabase.rpc('add_lifetime_credits', {
            _user_id: userId,
            _amount: product.credits_amount,
            _description: `Compra Stripe: ${product.title}`
          })
          if (creditsError) {
            console.error(`   ├─ ❌ Credits error:`, creditsError)
          } else {
            console.log(`   ├─ ✅ +${product.credits_amount} credits added`)
          }
        }

        if (product.type === 'landing_bundle' && product.plan_slug) {
          console.log(`   ├─ 🎁 Landing bundle: ${product.plan_slug} (${product.credits_amount} lifetime credits)`)

          const PLAN_CONFIG_BUNDLE: Record<string, {
            has_image_generation: boolean;
            has_video_generation: boolean;
            cost_multiplier: number;
          }> = {
            'starter': { has_image_generation: false, has_video_generation: false, cost_multiplier: 1.0 },
            'pro': { has_image_generation: true, has_video_generation: true, cost_multiplier: 1.0 },
            'ultimate': { has_image_generation: true, has_video_generation: true, cost_multiplier: 1.0 },
          }

          if (product.credits_amount > 0) {
            const { error: creditsError } = await supabase.rpc('add_lifetime_credits', {
              _user_id: userId,
              _amount: product.credits_amount,
              _description: `Landing bundle Stripe: ${product.title}`
            })
            if (creditsError) {
              console.error(`   ├─ ❌ Credits error:`, creditsError)
            } else {
              console.log(`   ├─ ✅ +${product.credits_amount} lifetime credits added`)
            }
          }

          const bundleConfig = PLAN_CONFIG_BUNDLE[product.plan_slug]
          if (bundleConfig) {
            const PLAN_RANK: Record<string, number> = { 'free': 0, 'starter': 1, 'pro': 2, 'ultimate': 3, 'unlimited': 4 }

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
                credits_per_month: 0,
                daily_prompt_limit: null,
                has_image_generation: bundleConfig.has_image_generation,
                has_video_generation: bundleConfig.has_video_generation,
                cost_multiplier: bundleConfig.cost_multiplier,
                expires_at: null,
                pagarme_subscription_id: null,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id' })
              console.log(`   ├─ ✅ Permanent premium activated: ${product.plan_slug}`)
            } else {
              console.log(`   ├─ ℹ️ Higher plan already active (${existingSub?.plan_slug}), keeping`)
            }
          }
        }

        // === SUBSCRIPTION PLAN ACTIVATION ===
        if (product.type === 'subscription' && product.plan_slug) {
          const billingPeriod = product.billing_period || (productSlug.includes('anual') ? 'anual' : 'mensal')
          console.log(`   ├─ 📋 Activating subscription: ${product.plan_slug} (${billingPeriod})`)

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
            const periodDays = billingPeriod === 'anual' ? 365 : 30
            const expiresAt = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString()

            // Get Stripe subscription ID from session
            const stripeSubscriptionId = session.subscription as string || null

            // Check existing subscription to preserve landing_bundle benefits
            const { data: existingSubForPlan } = await supabase
              .from('planos2_subscriptions')
              .select('has_image_generation, has_video_generation')
              .eq('user_id', userId)
              .maybeSingle()

            const preserveImageGen = config.has_image_generation || (existingSubForPlan?.has_image_generation === true)
            const preserveVideoGen = config.has_video_generation || (existingSubForPlan?.has_video_generation === true)

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
              stripe_subscription_id: stripeSubscriptionId,
              last_credit_reset_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            await supabase.from('planos2_subscriptions').upsert(upsertData, { onConflict: 'user_id' })

            // GPT Image 2 free trial: 7 days for non-unlimited plans (one-time only)
            if (product.plan_slug !== 'unlimited') {
              const { data: currentSub } = await supabase
                .from('planos2_subscriptions')
                .select('gpt_image_free_until')
                .eq('user_id', userId)
                .maybeSingle()

              if (!currentSub?.gpt_image_free_until) {
                const freeUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                await supabase.from('planos2_subscriptions')
                  .update({ gpt_image_free_until: freeUntil })
                  .eq('user_id', userId)
                console.log(`   ├─ 🎁 GPT Image 2 free trial activated until: ${freeUntil}`)
              } else {
                console.log(`   ├─ ℹ️ GPT Image 2 free trial already used, skipping`)
              }
            }

            // Reset monthly credits to the plan amount
            const { error: resetError } = await supabase.rpc('reset_upscaler_credits', {
              _user_id: userId,
              _amount: config.credits_per_month,
              _description: `Ativação plano ${product.plan_slug} (${billingPeriod}) via Stripe`
            })
            if (resetError) {
              console.error(`   ├─ ❌ Credits reset error:`, resetError)
            }

            console.log(`   ├─ ✅ Plan ${product.plan_slug} activated (${config.credits_per_month} credits, expires: ${expiresAt}, stripe_sub: ${stripeSubscriptionId})`)
          } else {
            console.error(`   ├─ ❌ Config not found for plan_slug: ${product.plan_slug}`)
          }
        }

        // Send purchase email (ES locale) with dedup + retry + blacklist
        try {
          const ctaLink = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-es'
          const billingPeriod = product.billing_period || (productSlug.includes('anual') ? 'anual' : 'mensal')
          const emailResult = await sendStripePurchaseEmail(supabase, {
            sessionId: session.id,
            email,
            productName: product.title,
            ctaLink,
            requestId,
            options: {
              packSlug: product.pack_slug,
              productType: product.type,
              accessType: product.access_type,
              billingPeriod,
            }
          })
          console.log(`   ├─ 📧 Purchase email: ${emailResult.status} (attempts: ${emailResult.attempts})`)
        } catch (emailErr: any) {
          console.error(`   ├─ ⚠️ Email error (non-critical): ${emailErr.message}`)
        }
      } else {
        console.log(`   ├─ 📊 Record-only mode (ES product) — no user/provisioning/email`)
      }

      // 6. Insert into stripe_orders
      const { error: insertError } = await supabase.from('stripe_orders').insert({
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        status: 'paid',
        amount: amountBrl,
        amount_usd: amountUsd,
        net_amount: netAmountBrl,
        currency: currency,
        payment_method: session.payment_method_types?.[0] || 'card',
        user_email: email,
        user_name: customerName || null,
        product_slug: productSlug,
        product_id: product.id,
        user_id: userId,
        utm_data: session.metadata || null,
        meta_fbp: finalFbp,
        meta_fbc: finalFbc,
        meta_user_agent: metaUserAgent,
        paid_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error(`   ├─ ❌ stripe_orders insert error: ${insertError.message}`)
      } else {
        console.log(`   ├─ ✅ stripe_orders record inserted`)
      }

      // 6c. Fire Meta CAPI Purchase event (BRL value for consistency with other platforms)
      try {
        const capiEventId = `purchase_stripe_${session.id}`
        // Determine correct Pixel ID based on product (ES products use separate pixel)
        const ES_SLUGS = ['upscaler-arcano-starter-es', 'upscaler-arcano-pro-es', 'upscaler-arcano-ultimate-es', 'upscaler-arcano-v3-es']
        const capiPixelId = ES_SLUGS.includes(productSlug) ? '1383797283173351' : undefined
        const capiPayload = {
          event_name: 'Purchase',
          email,
          value: amountBrl,
          currency: 'BRL',
          event_id: capiEventId,
          event_source_url: metaEventSourceUrl || `https://arcanoapp.lovable.app/checkout-sucesso?product=${productSlug}`,
          fbp: finalFbp || undefined,
          fbc: finalFbc || undefined,
          client_user_agent: metaUserAgent || undefined,
          client_ip_address: metaClientIp || undefined,
          event_time: Math.floor(Date.now() / 1000),
          utm_data: session.metadata || null,
          pixel_id: capiPixelId,
        }

        const capiRes = await fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(capiPayload),
        })
        console.log(`   ├─ 📊 Meta CAPI Purchase: ${capiRes.ok ? '✅ sent' : `❌ ${capiRes.status}`} | event_id: ${capiEventId} | value: R$${amountBrl} | fbp: ${finalFbp ? '✅' : '❌'} | fbc: ${finalFbc ? '✅' : '❌'} | ip: ${metaClientIp ? '✅' : '❌'}`)
      } catch (capiErr: any) {
        console.error(`   ├─ ⚠️ Meta CAPI error (non-critical): ${capiErr.message}`)
      }

      // 6b. Log to webhook_logs
      await supabase.from('webhook_logs').insert({
        platform: 'stripe',
        event_type: event.type,
        transaction_id: session.id,
        status: 'paid',
        email,
        product_name: product.title,
        amount: amountBrl,
        payload: JSON.parse(rawBody),
      }).then(({ error: logErr }) => {
        if (logErr) console.warn(`   ├─ ⚠️ webhook_logs insert error: ${logErr.message}`)
      })

      // 6d. UTMify attribution
      try {
        const utmData = session.metadata || {}
        const saleMetas: { meta_key: string; meta_value: string }[] = []
        const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid']
        for (const key of utmKeys) {
          if (utmData[key]) saleMetas.push({ meta_key: key, meta_value: String(utmData[key]) })
        }

        const hashCode = (s: string) => {
          let h = 0
          for (let i = 0; i < s.length; i++) {
            h = ((h << 5) - h + s.charCodeAt(i)) | 0
          }
          return Math.abs(h)
        }
        const numericOrderId = hashCode(session.id)
        const numericProductId = hashCode(product.id) + 900000

        const utmifyPayload = {
          event: 'sale_status_updated',
          currentStatus: 'paid',
          contract: { id: numericOrderId },
          client: { name: customerName || '', email },
          product: { name: product.title, id: numericProductId },
          offer: { name: product.title, id: numericProductId },
          sale: {
            id: numericOrderId,
            amount: Math.round(amountBrl * 100),
            currency: 'BRL',
            created_at: new Date().toISOString()
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

      // 7. Admin notification
      await sendAdminNotification(product.title, amountUsd, currency, email, customerName)

      // 7.1 Enviar WhatsApp de boas-vindas (non-blocking)
      try {
        // Buscar telefone do profile ou da session do Stripe
        let customerPhone = session.customer_details?.phone || null
        if (!customerPhone && userId) {
          const { data: profileForPhone } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', userId)
            .maybeSingle()
          customerPhone = profileForPhone?.phone || null
        }
        if (customerPhone) {
          const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-welcome`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              phone: customerPhone,
              name: customerName || '',
              email,
              order_id: null,
              locale: 'es',
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

      console.log(`\n✅ [${requestId}] Stripe checkout processed successfully`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // =============================================
    // REFUND
    // =============================================
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = charge.payment_intent as string

      console.log(`   ├─ 🔄 Refund for payment_intent: ${paymentIntentId}`)

      // Find the stripe_order by payment_intent
      const { data: stripeOrders, error: stripeOrderError } = await supabase
        .from('stripe_orders')
        .select('*, mp_products(*)')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (stripeOrderError) {
        console.error(`   ├─ ❌ Error loading stripe_order for refund: ${stripeOrderError.message}`)
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      const stripeOrder = stripeOrders?.[0]

      if (!stripeOrder) {
        console.log(`   ├─ ⏭️ No matching stripe_order for refund`)
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      // Update order status
      await supabase.from('stripe_orders').update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      }).eq('id', stripeOrder.id)

      // Revoke access if pack
      if (stripeOrder.user_id && stripeOrder.product_slug) {
        const product = stripeOrder.mp_products

        if (product?.type === 'pack' && product?.pack_slug) {
          await supabase.from('user_pack_purchases')
            .update({ is_active: false })
            .eq('user_id', stripeOrder.user_id)
            .eq('pack_slug', product.pack_slug)
            .eq('platform', 'stripe')
          console.log(`   ├─ ✅ Pack access revoked: ${product.pack_slug}`)

          // Revoke V2 bonus if V3
          if (stripeOrder.product_slug === 'upscaler-arcano-v3-es') {
            await supabase.from('user_pack_purchases')
              .update({ is_active: false })
              .eq('user_id', stripeOrder.user_id)
              .eq('pack_slug', 'upscaller-arcano')
              .eq('platform', 'stripe')
            console.log(`   ├─ ✅ V2 bonus revoked`)
          }
        }

        // Revoke credits on refund
        if (product?.type === 'credits' && product?.credits_amount > 0) {
          const { data: revokeData, error: revokeError } = await supabase.rpc('revoke_lifetime_credits_on_refund', {
            _user_id: stripeOrder.user_id,
            _amount: product.credits_amount,
            _description: `Refund Stripe: ${product.title}`
          })
          if (revokeError) {
            console.error(`   ├─ ❌ Credits revoke transport error:`, revokeError)
          } else {
            const revokeResult = revokeData?.[0] || revokeData
            if (!revokeResult?.success) {
              console.error(`   ├─ ❌ Credits revoke FAILED:`, JSON.stringify(revokeResult))
            } else {
              console.log(`   ├─ ✅ Credits revoked: ${revokeResult.amount_revoked} (new balance: ${revokeResult.new_balance})`)
            }
          }
        }

        // Revoke landing_bundle
        if (product?.type === 'landing_bundle') {
          console.log(`   ├─ 📋 Revoking landing_bundle...`)

          if (product.credits_amount > 0) {
            const { data: revokeData, error: revokeError } = await supabase.rpc('revoke_lifetime_credits_on_refund', {
              _user_id: stripeOrder.user_id,
              _amount: product.credits_amount,
              _description: `Refund Stripe landing_bundle: ${product.title}`
            })
            if (revokeError) {
              console.error(`   ├─ ❌ Landing bundle credits revoke error:`, revokeError)
            } else {
              const revokeResult = revokeData?.[0] || revokeData
              if (revokeResult?.success) {
                console.log(`   ├─ ✅ Credits revoked: ${revokeResult.amount_revoked}`)
              }
            }
          }

          await supabase.from('planos2_subscriptions').upsert({
            user_id: stripeOrder.user_id,
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
          console.log(`   ├─ ✅ Landing bundle revoked → free`)
        }

        // Revoke subscription plan
        if (product?.type === 'subscription') {
          console.log(`   ├─ 📋 Revoking subscription plan...`)

          await supabase.from('planos2_subscriptions').upsert({
            user_id: stripeOrder.user_id,
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

          const { error: zeroError } = await supabase.rpc('reset_upscaler_credits', {
            _user_id: stripeOrder.user_id,
            _amount: 0,
            _description: `Refund Stripe: subscription revoked → free`
          })
          if (zeroError) {
            console.error(`   ├─ ❌ Credits zero error:`, zeroError)
          }
          console.log(`   ├─ ✅ Subscription revoked → free + credits zeroed`)
        }
      }

      // Log
      await supabase.from('webhook_logs').insert({
        platform: 'stripe',
        event_type: event.type,
        transaction_id: event.id,
        status: 'refunded',
        email: stripeOrder.user_email,
        product_name: stripeOrder.product_slug,
        amount: stripeOrder.amount,
        payload: JSON.parse(rawBody),
      })

      console.log(`\n✅ [${requestId}] Stripe refund processed`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // =============================================
    // SUBSCRIPTION CANCELED
    // =============================================
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const stripeSubId = subscription.id
      console.log(`   ├─ 🔄 Subscription canceled: ${stripeSubId}`)

      // Find user by stripe_subscription_id in planos2_subscriptions
      const { data: subData } = await supabase
        .from('planos2_subscriptions')
        .select('user_id, plan_slug')
        .eq('stripe_subscription_id', stripeSubId)
        .maybeSingle()

      if (subData?.user_id) {
        console.log(`   ├─ 🔄 Revoking plan for user ${subData.user_id} (was: ${subData.plan_slug})`)
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
          stripe_subscription_id: null,
          pagarme_subscription_id: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        await supabase.rpc('reset_upscaler_credits', {
          _user_id: subData.user_id,
          _amount: 0,
          _description: `Stripe subscription canceled → free`
        })

        console.log(`   ├─ ✅ Plan revoked → free`)
      } else {
        console.log(`   ├─ ⚠️ No matching subscription found for stripe_sub: ${stripeSubId}`)
      }

      await supabase.from('webhook_logs').insert({
        platform: 'stripe',
        event_type: event.type,
        transaction_id: stripeSubId,
        status: 'canceled',
        email: null,
        product_name: null,
        amount: 0,
        payload: JSON.parse(rawBody),
      })

      console.log(`\n✅ [${requestId}] Stripe subscription.deleted processed`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // =============================================
    // INVOICE PAYMENT FAILED (renewal failure)
    // =============================================
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice
      const stripeSubId = invoice.subscription as string || null
      const customerEmail = invoice.customer_email || ''
      const attemptCount = invoice.attempt_count || 0

      console.log(`   ├─ ⚠️ Invoice payment failed for sub: ${stripeSubId}, attempt: ${attemptCount}, email: ${customerEmail}`)

      // Log the failure
      await supabase.from('webhook_logs').insert({
        platform: 'stripe',
        event_type: event.type,
        transaction_id: invoice.id,
        status: 'payment_failed',
        email: customerEmail,
        product_name: null,
        amount: (invoice.amount_due || 0) / 100,
        payload: JSON.parse(rawBody),
      })

      // VUL-006: After 3+ failed attempts, disable generation flags to prevent free usage
      if (attemptCount >= 3 && stripeSubId) {
        console.log(`   ├─ 🚫 Attempt ${attemptCount} >= 3, disabling generation flags for sub: ${stripeSubId}`)

        // Find user by stripe_subscription_id
        const { data: subData } = await supabase
          .from('planos2_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', stripeSubId)
          .maybeSingle()

        if (subData?.user_id) {
          // Disable generation flags and deactivate subscription
          const { error: updateError } = await supabase
            .from('planos2_subscriptions')
            .update({
              has_image_generation: false,
              has_video_generation: false,
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', stripeSubId)

          if (updateError) {
            console.error(`   ├─ ❌ Failed to disable flags: ${updateError.message}`)
          } else {
            console.log(`   ├─ ✅ Generation flags disabled for user: ${subData.user_id}`)
          }

          // Zero out monthly credits
          const { error: creditError } = await supabase
            .from('upscaler_credits')
            .update({
              monthly_balance: 0,
              balance: 0, // will be recalculated, but safe to zero
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', subData.user_id)

          if (!creditError) {
            // Recalc balance = lifetime only
            const { data: creditData } = await supabase
              .from('upscaler_credits')
              .select('lifetime_balance')
              .eq('user_id', subData.user_id)
              .maybeSingle()

            if (creditData) {
              await supabase
                .from('upscaler_credits')
                .update({ balance: creditData.lifetime_balance || 0 })
                .eq('user_id', subData.user_id)
            }

            console.log(`   ├─ ✅ Monthly credits zeroed for user: ${subData.user_id}`)
          }
        }
      }

      console.log(`\n✅ [${requestId}] Stripe invoice.payment_failed processed`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // =============================================
    // SUBSCRIPTION UPDATED (upgrade/downgrade/renewal)
    // =============================================
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription
      const stripeSubId = subscription.id
      const status = subscription.status

      console.log(`   ├─ 🔄 Subscription updated: ${stripeSubId}, status: ${status}`)

      // If subscription becomes active again (e.g. after payment retry success or renewal)
      if (status === 'active') {
        const { data: subData } = await supabase
          .from('planos2_subscriptions')
          .select('user_id, plan_slug, credits_per_month, last_credit_reset_at')
          .eq('stripe_subscription_id', stripeSubId)
          .maybeSingle()

        if (subData?.user_id) {
          const currentPeriodEnd = subscription.current_period_end
          const newExpiresAt = new Date(currentPeriodEnd * 1000).toISOString()
          
          // Check if this is a renewal (period changed) by comparing with last reset
          const lastReset = subData.last_credit_reset_at ? new Date(subData.last_credit_reset_at).getTime() : 0
          const currentPeriodStart = subscription.current_period_start
          const periodStartMs = currentPeriodStart * 1000
          const isRenewal = periodStartMs > lastReset + 86400000 // >1 day after last reset

          await supabase.from('planos2_subscriptions').update({
            expires_at: newExpiresAt,
            is_active: true,
            last_credit_reset_at: isRenewal ? new Date().toISOString() : subData.last_credit_reset_at,
            updated_at: new Date().toISOString(),
          }).eq('user_id', subData.user_id)

          // Reset monthly credits on renewal
          if (isRenewal && subData.credits_per_month > 0) {
            const { error: resetError } = await supabase.rpc('reset_upscaler_credits', {
              _user_id: subData.user_id,
              _amount: subData.credits_per_month,
              _description: `Renovação mensal Stripe: plano ${subData.plan_slug}`
            })
            if (resetError) {
              console.error(`   ├─ ❌ Credits renewal reset error:`, resetError)
            } else {
              console.log(`   ├─ ✅ Monthly credits renewed: +${subData.credits_per_month}`)
            }
          }

          console.log(`   ├─ ✅ Subscription renewed, new expiry: ${newExpiresAt}, isRenewal: ${isRenewal}`)
        }
      }

      // If subscription goes past_due or unpaid, log but don't revoke yet
      if (status === 'past_due' || status === 'unpaid') {
        console.log(`   ├─ ⚠️ Subscription ${status} — will wait for deletion or recovery`)
      }

      await supabase.from('webhook_logs').insert({
        platform: 'stripe',
        event_type: event.type,
        transaction_id: stripeSubId,
        status: status,
        email: null,
        product_name: null,
        amount: 0,
        payload: JSON.parse(rawBody),
      })

      console.log(`\n✅ [${requestId}] Stripe subscription.updated processed`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // =============================================
    // CHARGE DISPUTE (chargeback)
    // =============================================
    if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object as Stripe.Dispute
      const paymentIntentId = dispute.payment_intent as string
      console.log(`   ├─ ⚠️ Dispute created for pi: ${paymentIntentId}, reason: ${dispute.reason}`)

      const { data: stripeOrders } = await supabase
        .from('stripe_orders')
        .select('*, mp_products(*)')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .order('created_at', { ascending: false })
        .limit(1)

      const stripeOrder = stripeOrders?.[0]

      if (stripeOrder?.user_id) {
        const product = stripeOrder.mp_products

        // Revoke pack access
        if (product?.type === 'pack' && product?.pack_slug) {
          await supabase.from('user_pack_purchases')
            .update({ is_active: false })
            .eq('user_id', stripeOrder.user_id)
            .eq('pack_slug', product.pack_slug)
            .eq('platform', 'stripe')
          console.log(`   ├─ ✅ Pack revoked (dispute): ${product.pack_slug}`)
        }

        // Revoke credits
        if ((product?.type === 'credits' || product?.type === 'landing_bundle') && product?.credits_amount > 0) {
          await supabase.rpc('revoke_lifetime_credits_on_refund', {
            _user_id: stripeOrder.user_id,
            _amount: product.credits_amount,
            _description: `Dispute Stripe: ${product.title}`
          })
          console.log(`   ├─ ✅ Credits revoked (dispute): ${product.credits_amount}`)
        }

        // Revoke subscription/landing_bundle plan
        if (product?.type === 'subscription' || product?.type === 'landing_bundle') {
          await supabase.from('planos2_subscriptions').upsert({
            user_id: stripeOrder.user_id,
            plan_slug: 'free',
            is_active: true,
            credits_per_month: 100,
            daily_prompt_limit: 5,
            has_image_generation: false,
            has_video_generation: false,
            cost_multiplier: 1.0,
            expires_at: null,
            stripe_subscription_id: null,
            pagarme_subscription_id: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })

          await supabase.rpc('reset_upscaler_credits', {
            _user_id: stripeOrder.user_id,
            _amount: 0,
            _description: `Dispute Stripe: plan revoked → free`
          })
          console.log(`   ├─ ✅ Plan revoked (dispute) → free`)
        }

        // Update order status
        await supabase.from('stripe_orders').update({
          status: 'disputed',
          updated_at: new Date().toISOString()
        }).eq('id', stripeOrder.id)
      }

      await supabase.from('webhook_logs').insert({
        platform: 'stripe',
        event_type: event.type,
        transaction_id: dispute.id,
        status: 'disputed',
        email: stripeOrder?.user_email || null,
        product_name: stripeOrder?.product_slug || null,
        amount: (dispute.amount || 0) / 100,
        payload: JSON.parse(rawBody),
      })

      console.log(`\n✅ [${requestId}] Stripe dispute processed`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Unhandled event type
    console.log(`   ├─ ℹ️ Unhandled event type: ${event.type}`)
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (err: any) {
    console.error(`\n❌ [${requestId}] STRIPE WEBHOOK ERROR: ${err.message}`)
    console.error(err.stack)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

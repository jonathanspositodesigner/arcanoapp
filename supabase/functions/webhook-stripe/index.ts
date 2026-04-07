/**
 * Edge Function: webhook-stripe
 * Receives Stripe webhook events (checkout.session.completed, charge.refunded).
 * Validates signature via STRIPE_WEBHOOK_SECRET.
 * Provisions access (credits/packs) and records in stripe_orders.
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

function buildPurchaseEmailHtml(email: string, productName: string, ctaLink: string, isUpscalerOrCredits: boolean, isLandingBundle: boolean): string {
  const unsubscribeLink = getUnsubscribeLink(email)

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

    // ===== IDEMPOTENCY =====
    const { data: existingOrder } = await supabase
      .from('stripe_orders')
      .select('id')
      .eq('stripe_session_id', (event.data.object as any).id || event.id)
      .maybeSingle()

    // =============================================
    // CHECKOUT SESSION COMPLETED
    // =============================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      if (existingOrder) {
        console.log(`   ├─ ⏭️ Session already processed: ${session.id}`)
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      const productSlug = session.metadata?.product_slug || ''
      const email = (session.customer_details?.email || session.customer_email || '').toLowerCase().trim()
      const customerName = session.customer_details?.name || ''

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
              platform: 'stripe'
            })
            console.log(`   ├─ ✅ Pack access granted: ${product.pack_slug}`)
          } else {
            console.log(`   ├─ ℹ️ Pack access already exists: ${product.pack_slug}`)
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

        // Send purchase email (ES locale)
        try {
          const ctaLink = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-es'
          const isUpscalerOrCredits = product.pack_slug === 'upscaller-arcano' || product.type === 'credits'
          const isLandingBundle = product.type === 'landing_bundle'

          const html = buildPurchaseEmailHtml(email, product.title, ctaLink, isUpscalerOrCredits, isLandingBundle)
          const htmlBase64 = btoa(unescape(encodeURIComponent(html)))
          const token = await getSendPulseToken()

          const emailRes = await fetch("https://api.sendpulse.com/smtp/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({
              email: {
                html: htmlBase64,
                text: "",
                subject: `✅ ¡Compra confirmada! - ${product.title}`,
                from: { name: "Vox Visual", email: "contato@voxvisual.com.br" },
                to: [{ name: email, email }]
              }
            })
          })
          console.log(`   ├─ 📧 Purchase email: ${emailRes.ok ? 'sent' : 'failed'}`)

          await supabase.from('welcome_email_logs').insert({
            email,
            template_used: `stripe_purchase_${product.title}`,
            dedup_key: `stripe_session_${session.id}`,
            tracking_id: crypto.randomUUID(),
            status: emailRes.ok ? 'sent' : 'failed',
            sent_at: new Date().toISOString(),
            product_info: product.title,
            platform: 'stripe',
          })
        } catch (emailErr: any) {
          console.error(`   ├─ ⚠️ Email error (non-critical): ${emailErr.message}`)
        }
      } else {
        console.log(`   ├─ 📊 Record-only mode (ES product) — no user/provisioning/email`)
      }

      // 6. Insert into stripe_orders
      const paymentIntentId = session.payment_intent as string || null
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
        paid_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error(`   ├─ ❌ stripe_orders insert error: ${insertError.message}`)
      } else {
        console.log(`   ├─ ✅ stripe_orders record inserted`)
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

      // 7. Admin notification
      await sendAdminNotification(product.title, amountUsd, currency, email, customerName)

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
      const { data: stripeOrder } = await supabase
        .from('stripe_orders')
        .select('*, mp_products(*)')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .maybeSingle()

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

        // Revoke credits/plan for landing_bundle
        if (product?.type === 'landing_bundle' && product?.plan_slug) {
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

          if (product.credits_amount > 0) {
            await supabase.rpc('reset_upscaler_credits', {
              _user_id: stripeOrder.user_id,
              _amount: 0,
              _description: `Refund Stripe: ${product.title}`
            })
          }
          console.log(`   ├─ ✅ Plan revoked to free + credits reset`)
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type PurchaseOrder = {
  order_id: string
  email: string
  product_name: string
  product_type: string | null
  pack_slug: string | null
  access_type: string | null
  paid_time: string
}

type DispatchStatus = 'sent' | 'failed' | 'skipped_duplicate' | 'skipped_blacklisted'

type DispatchResult = {
  order_id: string
  email: string
  product_name: string
  status: DispatchStatus
  attempts: number
  error?: string | null
}

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

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

function buildPurchaseTemplateUsed(productName: string): string {
  return `pagarme_purchase_${productName}`
}

function buildPurchaseDedupKey(orderId: string): string {
  return `pagarme_order_${orderId}`
}

function getUnsubscribeLink(email: string): string {
  const baseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  return `${baseUrl}/functions/v1/email-unsubscribe?email=${encodeURIComponent(email)}`
}

function getCtaLink(order: PurchaseOrder): string {
  if (order.pack_slug === 'upscaler-arcano' || order.pack_slug === 'upscaller-arcano' || order.product_type === 'credits') {
    return 'https://arcanoapp.voxvisual.com.br/upscaler-arcano'
  }
  return 'https://arcanoapp.voxvisual.com.br/'
}

function buildPurchaseEmailHtml(email: string, productName: string, ctaLink: string, options?: { packSlug?: string | null; productType?: string | null; accessType?: string | null }): string {
  const unsubscribeLink = getUnsubscribeLink(email)
  const isUpscalerOrCredits = options?.packSlug === 'upscaler-arcano' || options?.packSlug === 'upscaller-arcano' || options?.productType === 'credits'

  let accessLabel = 'Vitalício'
  if (options?.accessType === '6_meses') accessLabel = '6 Meses'
  else if (options?.accessType === '1_ano') accessLabel = '1 Ano'
  else if (options?.accessType === 'vitalicio') accessLabel = 'Vitalício'

  const benefitBlock = isUpscalerOrCredits
    ? `<div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
        <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 Acesso Vitalício Ativado!</p>
        <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Você <strong>NÃO precisa comprar créditos</strong> para usar o Upscaler Arcano. Seu acesso vitalício já inclui uso ilimitado da ferramenta!</p>
      </div>`
    : `<div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
        <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 Acesso ${accessLabel} Ativado!</p>
        <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Seu <strong>${productName}</strong> já está liberado! Acesse a plataforma para explorar todos os conteúdos do seu pack.</p>
      </div>`

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

async function isBlacklisted(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('blacklisted_emails')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  return !!data
}

async function wasAlreadySent(supabase: any, order: PurchaseOrder): Promise<boolean> {
  const dedupKey = buildPurchaseDedupKey(order.order_id)

  const { data: existingByOrder } = await supabase
    .from('welcome_email_logs')
    .select('id')
    .eq('dedup_key', dedupKey)
    .eq('status', 'sent')
    .maybeSingle()

  if (existingByOrder) return true

  const templateUsed = buildPurchaseTemplateUsed(order.product_name)
  const { data: existingLegacy } = await supabase
    .from('welcome_email_logs')
    .select('id')
    .eq('email', order.email)
    .eq('template_used', templateUsed)
    .eq('status', 'sent')
    .gte('sent_at', order.paid_time)
    .maybeSingle()

  return !!existingLegacy
}

async function logResult(
  supabase: any,
  order: PurchaseOrder,
  status: 'sent' | 'failed',
  trackingId: string,
  errorMessage?: string | null,
) {
  await supabase.from('welcome_email_logs').insert({
    email: order.email,
    template_used: buildPurchaseTemplateUsed(order.product_name),
    dedup_key: buildPurchaseDedupKey(order.order_id),
    tracking_id: trackingId,
    status,
    sent_at: new Date().toISOString(),
    error_message: errorMessage ?? null,
    product_info: order.product_name,
    platform: 'pagarme',
  })
}

async function sendOnePurchaseEmail(
  supabase: any,
  order: PurchaseOrder,
  maxAttempts: number,
): Promise<DispatchResult> {
  if (await wasAlreadySent(supabase, order)) {
    return {
      order_id: order.order_id,
      email: order.email,
      product_name: order.product_name,
      status: 'skipped_duplicate',
      attempts: 0,
      error: 'already_sent',
    }
  }

  if (await isBlacklisted(supabase, order.email)) {
    const trackingId = crypto.randomUUID()
    await logResult(supabase, order, 'failed', trackingId, 'email_blacklisted')
    return {
      order_id: order.order_id,
      email: order.email,
      product_name: order.product_name,
      status: 'skipped_blacklisted',
      attempts: 1,
      error: 'email_blacklisted',
    }
  }

  const ctaLink = getCtaLink(order)
  const retryDelaysMs = [2000, 5000, 10000]

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const trackingId = crypto.randomUUID()

    try {
      const token = await getSendPulseToken()
      const html = buildPurchaseEmailHtml(order.email, order.product_name, ctaLink, {
        packSlug: order.pack_slug,
        productType: order.product_type,
        accessType: order.access_type,
      })
      const htmlBase64 = btoa(unescape(encodeURIComponent(html)))

      const response = await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          email: {
            html: htmlBase64,
            text: "",
            subject: `✅ Compra confirmada - ${order.product_name}`,
            from: { name: "Vox Visual", email: "contato@voxvisual.com.br" },
            to: [{ name: order.email, email: order.email }]
          }
        })
      })

      const responseText = await response.text()

      if (response.ok) {
        await logResult(supabase, order, 'sent', trackingId, null)
        return {
          order_id: order.order_id,
          email: order.email,
          product_name: order.product_name,
          status: 'sent',
          attempts: attempt,
        }
      }

      await logResult(supabase, order, 'failed', trackingId, responseText || `http_${response.status}`)

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelaysMs[attempt - 1] ?? 12000))
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'unknown_error'
      await logResult(supabase, order, 'failed', trackingId, errorMessage)

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelaysMs[attempt - 1] ?? 12000))
      } else {
        return {
          order_id: order.order_id,
          email: order.email,
          product_name: order.product_name,
          status: 'failed',
          attempts: attempt,
          error: errorMessage,
        }
      }
    }
  }

  return {
    order_id: order.order_id,
    email: order.email,
    product_name: order.product_name,
    status: 'failed',
    attempts: maxAttempts,
    error: 'exhausted_retries',
  }
}

async function getOrderById(supabase: any, orderId: string): Promise<PurchaseOrder | null> {
  const { data, error } = await supabase
    .from('asaas_orders')
    .select('id, user_email, paid_at, created_at, mp_products(title, type, pack_slug, access_type)')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data) return null

  return {
    order_id: data.id,
    email: normalizeEmail(data.user_email),
    product_name: data.mp_products?.title || 'Produto',
    product_type: data.mp_products?.type || null,
    pack_slug: data.mp_products?.pack_slug || null,
    access_type: data.mp_products?.access_type || null,
    paid_time: data.paid_at || data.created_at || new Date().toISOString(),
  }
}

async function getMissingOrdersInRange(
  supabase: any,
  startDate: string,
  endDate: string,
  limit: number,
): Promise<PurchaseOrder[]> {
  const safeLimit = Math.max(1, Math.min(limit, 1000))

  const { data: orderRows, error: ordersError } = await supabase
    .from('asaas_orders')
    .select('id, user_email, paid_at, created_at, mp_products(title, type, pack_slug, access_type)')
    .eq('status', 'paid')
    .or(`and(paid_at.gte.${startDate},paid_at.lt.${endDate}),and(paid_at.is.null,created_at.gte.${startDate},created_at.lt.${endDate})`)
    .limit(safeLimit)

  if (ordersError) throw new Error(`Erro ao buscar pedidos pagos: ${ordersError.message}`)

  const orders: PurchaseOrder[] = (orderRows || []).map((row: any) => ({
    order_id: row.id,
    email: normalizeEmail(row.user_email),
    product_name: row.mp_products?.title || 'Produto',
    product_type: row.mp_products?.type || null,
    pack_slug: row.mp_products?.pack_slug || null,
    access_type: row.mp_products?.access_type || null,
    paid_time: row.paid_at || row.created_at || new Date().toISOString(),
  }))

  if (orders.length === 0) return []

  const uniqueEmails = Array.from(new Set(orders.map(o => o.email)))

  const { data: sentLogs, error: logsError } = await supabase
    .from('welcome_email_logs')
    .select('email, status, sent_at, dedup_key, template_used')
    .in('email', uniqueEmails)
    .eq('status', 'sent')
    .gte('sent_at', startDate)

  if (logsError) throw new Error(`Erro ao buscar logs de envio: ${logsError.message}`)

  const { data: blacklistedRows, error: blacklistError } = await supabase
    .from('blacklisted_emails')
    .select('email')
    .in('email', uniqueEmails)

  if (blacklistError) throw new Error(`Erro ao buscar blacklist: ${blacklistError.message}`)

  const logs = sentLogs || []
  const blacklistedSet = new Set((blacklistedRows || []).map((row: any) => normalizeEmail(row.email || '')))

  const missing = orders.filter(order => {
    if (blacklistedSet.has(order.email)) return false

    const byDedup = logs.some((log: any) => log.dedup_key === buildPurchaseDedupKey(order.order_id))
    if (byDedup) return false

    const byLegacy = logs.some((log: any) => {
      if (normalizeEmail(log.email || '') !== order.email) return false
      if (log.template_used !== buildPurchaseTemplateUsed(order.product_name)) return false
      if (!log.sent_at) return false
      return new Date(log.sent_at).getTime() >= new Date(order.paid_time).getTime()
    })

    return !byLegacy
  })

  return missing.sort((a, b) => new Date(a.paid_time).getTime() - new Date(b.paid_time).getTime())
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const maxAttempts = Math.max(1, Math.min(Number(body.max_attempts || 3), 5))

    if (body.resend_missing === true) {
      const startDate = body.start_date || new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
      const endDate = body.end_date || new Date().toISOString()
      const limit = Number(body.limit || 500)

      const orders = await getMissingOrdersInRange(supabase, startDate, endDate, limit)

      if (body.dry_run === true) {
        return new Response(JSON.stringify({
          success: true,
          mode: 'dry_run',
          window: { startDate, endDate },
          pending_count: orders.length,
          sample: orders.slice(0, 20),
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const results: DispatchResult[] = []
      for (const order of orders) {
        const normalizedOrder: PurchaseOrder = {
          ...order,
          email: normalizeEmail(order.email),
        }

        const result = await sendOnePurchaseEmail(supabase, normalizedOrder, maxAttempts)
        results.push(result)
      }

      return new Response(JSON.stringify({
        success: true,
        mode: 'batch_missing',
        window: { startDate, endDate },
        summary: {
          total: results.length,
          sent: results.filter(r => r.status === 'sent').length,
          failed: results.filter(r => r.status === 'failed').length,
          skipped_duplicate: results.filter(r => r.status === 'skipped_duplicate').length,
          skipped_blacklisted: results.filter(r => r.status === 'skipped_blacklisted').length,
        },
        results,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let order: PurchaseOrder | null = null

    if (body.order_id) {
      order = await getOrderById(supabase, String(body.order_id))
      if (!order) {
        return new Response(JSON.stringify({ success: false, error: 'order_id não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      const email = body.email ? normalizeEmail(String(body.email)) : ''
      const productName = body.product_name ? String(body.product_name) : ''

      if (!email || !productName) {
        return new Response(JSON.stringify({ success: false, error: 'Informe order_id ou email + product_name' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      order = {
        order_id: String(body.order_id || crypto.randomUUID()),
        email,
        product_name: productName,
        product_type: body.product_type || null,
        pack_slug: body.pack_slug || null,
        access_type: body.access_type || null,
        paid_time: body.paid_time || new Date().toISOString(),
      }
    }

    const result = await sendOnePurchaseEmail(supabase, order, maxAttempts)

    return new Response(JSON.stringify({
      success: result.status === 'sent' || result.status === 'skipped_duplicate',
      result,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Resend purchase email error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
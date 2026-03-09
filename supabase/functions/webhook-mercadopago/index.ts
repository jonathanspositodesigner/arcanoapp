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
<body style="margin:0;padding:0;background-color:#f3f0ff;font-family:'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:linear-gradient(135deg,#1a0533 0%,#2d1b4e 50%,#1a0533 100%);border-radius:16px;overflow:hidden;border:1px solid rgba(212,175,55,0.3);">
    <div style="text-align:center;padding:40px 30px 20px;">
      <div style="width:70px;height:70px;margin:0 auto 16px;background:linear-gradient(135deg,#d4af37,#f4d03f);border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:32px;">✨</span>
      </div>
      <h1 style="color:#d4af37;font-size:24px;margin:0 0 8px;">Compra Confirmada!</h1>
      <p style="color:#c4b5fd;font-size:16px;margin:0;">Seu acesso ao <strong style="color:#f4d03f;">${productName}</strong> já está liberado</p>
    </div>
    <div style="padding:20px 30px;">
      <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid rgba(212,175,55,0.2);">
        <p style="color:#e9d5ff;font-size:14px;margin:0 0 12px;">Suas credenciais de acesso:</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#a78bfa;padding:6px 0;font-size:13px;">Email:</td><td style="color:#f4d03f;padding:6px 0;font-size:13px;text-align:right;">${email}</td></tr>
          <tr><td style="color:#a78bfa;padding:6px 0;font-size:13px;">Senha:</td><td style="color:#f4d03f;padding:6px 0;font-size:13px;text-align:right;">${email}</td></tr>
        </table>
        <p style="color:#f87171;font-size:11px;margin:12px 0 0;text-align:center;">⚠️ Recomendamos alterar sua senha no primeiro acesso</p>
      </div>
      <div style="text-align:center;padding:10px 0 30px;">
        <a href="${ctaLink}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#f4d03f);color:#1a0533;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:bold;font-size:16px;">
          Acessar Agora →
        </a>
      </div>
    </div>
    <div style="padding:20px 30px;border-top:1px solid rgba(212,175,55,0.2);text-align:center;">
      <p style="color:#6b7280;font-size:11px;margin:0;">Vox Visual © ${new Date().getFullYear()}</p>
      <p style="margin:6px 0 0;"><a href="${unsubscribeLink}" style="color:#6b7280;font-size:11px;text-decoration:underline;">Cancelar inscrição</a></p>
    </div>
  </div>
</div>
</body>
</html>`
}

async function sendPurchaseEmail(supabase: any, email: string, productName: string, ctaLink: string, requestId: string) {
  try {
    // Dedup check
    const { data: existing } = await supabase
      .from('welcome_email_logs')
      .select('id')
      .eq('email', email)
      .eq('template_name', `mp_purchase_${productName}`)
      .maybeSingle()

    if (existing) {
      console.log(`   ├─ ℹ️ Email já enviado para ${email} (${productName})`)
      return
    }

    // Check blacklist
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

    // Log
    await supabase.from('welcome_email_logs').insert({
      email,
      template_name: `mp_purchase_${productName}`,
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

      // 2. Upsert profile
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        password_changed: false,
        email_verified: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
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

      // 4. Atualizar ordem
      await supabase.from('mp_orders').update({
        status: 'paid',
        user_id: userId,
        mp_payment_id: String(paymentId),
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      // 5. Enviar email de compra via SendPulse
      const ctaLink = product.pack_slug === 'upscaler-arcano' || product.type === 'credits'
        ? 'https://arcanoapp.voxvisual.com.br/upscaler-arcano'
        : 'https://arcanoapp.voxvisual.com.br/'
      
      await sendPurchaseEmail(supabase, email, product.title, ctaLink, requestId)

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

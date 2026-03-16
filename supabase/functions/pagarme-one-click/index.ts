/**
 * Edge Function: pagarme-one-click
 * Cobra um cartão salvo diretamente via Pagar.me API (sem checkout hosted).
 * Recebe: { product_slug, saved_card_id }
 * O usuário deve estar autenticado.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAGARME_API_URL = 'https://api.pagar.me/core/v5'

const INVALID_UTM_VALUES = ['aplicativo', '', 'app'];
function sanitizeUtmData(utmData: any): any {
  if (!utmData || typeof utmData !== 'object') return null;
  const filtered: Record<string, any> = {};
  for (const [key, value] of Object.entries(utmData)) {
    if (typeof value === 'string') {
      const v = value.trim();
      if (INVALID_UTM_VALUES.includes(v.toLowerCase())) continue;
      if (v.startsWith('{{') && v.endsWith('}}')) continue;
      if (v.length > 0) filtered[key] = v;
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY')

    if (!pagarmeSecretKey) {
      return new Response(JSON.stringify({ error: 'Configuração de pagamento indisponível' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Autenticação obrigatória
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { product_slug, saved_card_id, utm_data, fbp, fbc } = await req.json()
    const clientUserAgent = req.headers.get('user-agent') || null
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null

    if (!product_slug || !saved_card_id) {
      return new Response(JSON.stringify({ error: 'product_slug e saved_card_id são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Buscar cartão salvo — validar ownership
    const { data: savedCard, error: cardError } = await supabase
      .from('pagarme_saved_cards')
      .select('*')
      .eq('id', saved_card_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (cardError || !savedCard) {
      console.error('Cartão não encontrado:', saved_card_id, cardError)
      return new Response(JSON.stringify({ error: 'Cartão salvo não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Buscar produto
    const { data: product, error: productError } = await supabase
      .from('mp_products')
      .select('*')
      .eq('slug', product_slug)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      return new Response(JSON.stringify({ error: 'Produto não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Criar ordem interna
    const { data: order, error: orderError } = await supabase
      .from('asaas_orders')
      .insert({
        user_email: user.email!,
        user_id: user.id,
        product_id: product.id,
        amount: product.price,
        status: 'pending',
        asaas_customer_id: savedCard.pagarme_customer_id,
        utm_data: sanitizeUtmData(utm_data),
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Erro ao criar ordem:', orderError)
      return new Response(JSON.stringify({ error: 'Erro ao criar ordem' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📦 One-Click: Ordem ${order.id} | Produto: ${product.title} | Card: ****${savedCard.card_last_four}`)

    // 4. Buscar dados do perfil para billing address
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, phone, cpf, address_line, address_zip, address_city, address_state, address_country')
      .eq('id', user.id)
      .single()

    // 5. Criar pedido direto no Pagar.me com card_id
    const amountInCents = Math.round(Number(product.price) * 100)

    // Billing address é obrigatório para transações com card_id
    const billingAddress: Record<string, any> = {
      country: profile?.address_country || 'BR',
      state: profile?.address_state || 'SP',
      city: profile?.address_city || 'Sao Paulo',
      zip_code: profile?.address_zip?.replace(/\D/g, '') || '01001000',
      line_1: profile?.address_line || 'Não informado',
    }

    const orderPayload: Record<string, any> = {
      code: order.id,
      items: [
        {
          amount: amountInCents,
          description: product.title,
          quantity: 1,
          code: product.slug || product.id,
        }
      ],
      customer_id: savedCard.pagarme_customer_id,
      payments: [
        {
          payment_method: 'credit_card',
          credit_card: {
            card_id: savedCard.pagarme_card_id,
            operation_type: 'auth_and_capture',
            installments: 1,
            recurrence_cycle: 'subsequent',
            statement_descriptor: 'ARCANO',
          },
          amount: amountInCents,
        }
      ],
      metadata: {
        order_id: order.id
      }
    }

    // Adicionar billing_address ao payment de credit_card
    orderPayload.payments[0].credit_card.card = {
      billing_address: billingAddress,
    }

    const pagarmeAuth = 'Basic ' + btoa(pagarmeSecretKey + ':')

    const pagarmeResponse = await fetch(`${PAGARME_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': pagarmeAuth
      },
      body: JSON.stringify(orderPayload)
    })

    const pagarmeText = await pagarmeResponse.text()

    if (!pagarmeResponse.ok) {
      console.error('Erro Pagar.me one-click:', pagarmeResponse.status, pagarmeText.substring(0, 800))

      // Marcar ordem como falha
      await supabase.from('asaas_orders').update({
        status: 'failed',
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      return new Response(JSON.stringify({ error: 'Erro ao processar pagamento. Tente outro método.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let pagarmeData: any
    try {
      pagarmeData = JSON.parse(pagarmeText)
    } catch {
      console.error('Erro ao parsear resposta Pagar.me:', pagarmeText.substring(0, 300))
      return new Response(JSON.stringify({ error: 'Resposta inválida do gateway' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Atualizar ordem com payment_id
    const charge = pagarmeData.charges?.[0]
    const chargeStatus = charge?.status || pagarmeData.status
    const isPaid = chargeStatus === 'paid'

    // Capturar erro do antifraude ou gateway
    const gatewayError = charge?.last_transaction?.gateway_response?.errors?.[0]
    const antifraudStatus = charge?.last_transaction?.antifraud_response?.status
    const gatewayMessage = gatewayError?.message || charge?.last_transaction?.acquirer_message || null

    console.log(`✅ One-Click Pagar.me: ${pagarmeData.id} | Status: ${chargeStatus} | Antifraude: ${antifraudStatus || 'N/A'} | GW: ${gatewayMessage || 'OK'}`)

    if (!isPaid && chargeStatus === 'failed') {
      console.error(`❌ One-Click FALHOU: ${JSON.stringify({
        charge_status: chargeStatus,
        antifraud: antifraudStatus,
        gateway_error: gatewayMessage,
        acquirer_return_code: charge?.last_transaction?.acquirer_return_code,
        acquirer_message: charge?.last_transaction?.acquirer_message,
      })}`)
    }

    // IMPORTANT: Keep status as 'pending' even when paid, so webhook-pagarme
    // can acquire the lock (pending→processing) and handle credit provisioning,
    // email sending, profile enrichment, etc. The frontend uses `is_paid` from
    // the response to show success, independently of DB status.
    await supabase.from('asaas_orders').update({
      asaas_payment_id: pagarmeData.id,
      payment_method: 'credit_card',
      status: chargeStatus === 'failed' ? 'failed' : 'pending',
      gateway_error_code: charge?.last_transaction?.acquirer_return_code || null,
      gateway_error_message: gatewayMessage || null,
    }).eq('id', order.id)

    // 7. Enviar InitiateCheckout + Purchase (se pago) para Meta CAPI
    const capiEventId = crypto.randomUUID()
    try {
      await fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          event_name: 'InitiateCheckout',
          email: user.email,
          value: Number(product.price),
          currency: 'BRL',
          utm_data: utm_data || null,
          fbp: fbp || null,
          fbc: fbc || null,
          event_id: capiEventId,
          event_source_url: 'https://arcanoapp.voxvisual.com.br',
          client_ip_address: clientIp,
          client_user_agent: clientUserAgent,
        }),
      })
      console.log(`📊 Meta CAPI InitiateCheckout (one-click) sent`)
    } catch (e: any) {
      console.warn(`⚠️ Meta CAPI InitiateCheckout falhou: ${e.message}`)
    }

    if (isPaid) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({
            event_name: 'Purchase',
            email: user.email,
            value: Number(product.price),
            currency: 'BRL',
            utm_data: utm_data || null,
            fbp: fbp || null,
            fbc: fbc || null,
            event_id: `purchase_${order.id}`,
            event_source_url: 'https://arcanoapp.voxvisual.com.br',
            client_ip_address: clientIp,
            client_user_agent: clientUserAgent,
          }),
        })
        console.log(`📊 Meta CAPI Purchase (one-click) sent`)
      } catch (e: any) {
        console.warn(`⚠️ Meta CAPI Purchase falhou: ${e.message}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      pagarme_order_id: pagarmeData.id,
      status: chargeStatus,
      is_paid: isPaid,
      event_id: capiEventId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Erro geral one-click:', error.message)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

/**
 * Edge Function: create-mp-checkout
 * Cria uma preferência de pagamento no Mercado Pago e retorna a URL do checkout.
 * Recebe: { product_slug, user_email, user_name, user_document }
 * Retorna: { checkout_url, order_id }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const { product_slug, user_email, user_name, user_document, utm_data, fbp, fbc, user_agent: clientUA, event_id: clientEventId } = await req.json()

    if (!product_slug || !user_email) {
      return new Response(JSON.stringify({ error: 'product_slug e user_email são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const email = user_email.toLowerCase().trim()
    const payerName = (user_name || '').trim()
    const payerDocument = (user_document || '').replace(/\D/g, '')

    // Validação básica de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')

    if (!mpAccessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN não configurado')
      return new Response(JSON.stringify({ error: 'Configuração de pagamento indisponível' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Rate limiting: 5 checkouts por minuto por email
    const { data: rateCheck } = await supabase.rpc('check_rate_limit', {
      _ip_address: email,
      _endpoint: 'mp-checkout',
      _max_requests: 5,
      _window_seconds: 60,
    })
    if (rateCheck && rateCheck[0] && !rateCheck[0].allowed) {
      return new Response(JSON.stringify({ error: 'Muitas tentativas. Aguarde 1 minuto.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Buscar produto
    const { data: product, error: productError } = await supabase
      .from('mp_products')
      .select('*')
      .eq('slug', product_slug)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      console.error('Produto não encontrado:', product_slug, productError)
      return new Response(JSON.stringify({ error: 'Produto não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Criar ordem interna (com dados de atribuição Meta)
    const { data: order, error: orderError } = await supabase
      .from('mp_orders')
      .insert({
        user_email: email,
        user_name: payerName || null,
        product_id: product.id,
        amount: product.price,
        status: 'pending',
        utm_data: sanitizeUtmData(utm_data),
        meta_fbp: fbp || null,
        meta_fbc: fbc || null,
        meta_user_agent: clientUA || null,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Erro ao criar ordem:', orderError)
      return new Response(JSON.stringify({ error: 'Erro ao criar ordem' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📦 Ordem criada: ${order.id} | Produto: ${product.title} | Email: ${email}`)

    // 3. Criar preferência no Mercado Pago com payer completo
    const payer: any = { email }
    if (payerName && payerName.length > 0) {
      const nameParts = payerName.split(' ').filter(p => p.length > 0)
      payer.name = nameParts[0] || payerName
      payer.surname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0]
    } else {
      // Fallback: usar parte do email como nome se o campo veio vazio
      const fallbackName = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').trim() || 'Cliente'
      payer.name = fallbackName
      payer.surname = fallbackName
    }
    if (payerDocument && payerDocument.length === 11) {
      payer.identification = {
        type: 'CPF',
        number: payerDocument,
      }
    }

    const preferenceBody = {
      items: [
        {
          id: product.slug,
          title: product.title,
          quantity: 1,
          unit_price: Number(product.price),
          currency_id: 'BRL'
        }
      ],
      external_reference: order.id,
      payer,
      payment_methods: {
        installments: 12
      },
      back_urls: {
        success: 'https://arcanoapp.lovable.app/sucesso-compra?gateway=mercadopago',
        failure: 'https://arcanoapp.lovable.app/planos-upscaler-arcano-69?mp_status=failure',
        pending: 'https://arcanoapp.lovable.app/planos-upscaler-arcano-69?mp_status=pending'
      },
      auto_return: 'approved',
      notification_url: `${supabaseUrl}/functions/v1/webhook-mercadopago`
    }

    console.log(`🔄 Enviando preferência ao MP com payer:`, JSON.stringify(payer))

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`
      },
      body: JSON.stringify(preferenceBody)
    })

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text()
      console.error('Erro Mercado Pago:', mpResponse.status, errorText)
      return new Response(JSON.stringify({ error: `Erro ao criar checkout (${mpResponse.status}): ${errorText}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const mpData = await mpResponse.json()

    // 4. Atualizar ordem com preference_id
    await supabase
      .from('mp_orders')
      .update({ preference_id: mpData.id })
      .eq('id', order.id)

    console.log(`✅ Checkout criado: ${mpData.id} | init_point: ${mpData.init_point?.substring(0, 60)}...`)

    // Meta Conversions API - InitiateCheckout (fire-and-forget)
    try {
      const metaPixelId = '1162356848586894'
      const metaAccessToken = Deno.env.get('META_ACCESS_TOKEN')
      if (metaAccessToken) {
        const eventId = clientEventId || `ic_mp_${Date.now()}`
        const capiPayload = {
          data: [{
            event_name: 'InitiateCheckout',
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            event_source_url: 'https://arcanoapp.lovable.app/planos-upscaler-arcano-69',
            action_source: 'website',
            user_data: {
              em: [email ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email)).then(b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')) : null].filter(Boolean),
              ...(fbp ? { fbp } : {}),
              ...(fbc ? { fbc } : {}),
              client_user_agent: clientUA || null,
            },
            custom_data: {
              content_name: product.title,
              content_ids: [product.slug],
              content_type: 'product',
              value: Number(product.price),
              currency: 'BRL',
            }
          }]
        }
        fetch(`https://graph.facebook.com/v21.0/${metaPixelId}/events?access_token=${metaAccessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(capiPayload)
        }).then(r => r.text()).then(t => console.log(`📊 Meta CAPI InitiateCheckout: ${t}`)).catch(() => {})
      }
    } catch (capiErr) {
      console.error('Meta CAPI error (non-blocking):', capiErr)
    }

    return new Response(JSON.stringify({
      checkout_url: mpData.init_point,
      order_id: order.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

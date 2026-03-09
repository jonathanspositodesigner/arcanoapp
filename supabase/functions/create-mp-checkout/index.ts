/**
 * Edge Function: create-mp-checkout
 * Cria uma preferência de pagamento no Mercado Pago e retorna a URL do checkout.
 * Recebe: { product_slug, user_email }
 * Retorna: { checkout_url, order_id }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { product_slug, user_email, utm_data } = await req.json()

    if (!product_slug || !user_email) {
      return new Response(JSON.stringify({ error: 'product_slug e user_email são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const email = user_email.toLowerCase().trim()

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

    // 2. Criar ordem interna
    const { data: order, error: orderError } = await supabase
      .from('mp_orders')
      .insert({
        user_email: email,
        product_id: product.id,
        amount: product.price,
        status: 'pending'
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

    // 3. Criar preferência no Mercado Pago
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
      payer: {
        email: email
      },
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" }
        ],
        installments: 12
      },
      back_urls: {
        success: 'https://arcanoapp.lovable.app/ferramentas-ia?mp_status=success',
        failure: 'https://arcanoapp.lovable.app/ferramentas-ia?mp_status=failure',
        pending: 'https://arcanoapp.lovable.app/ferramentas-ia?mp_status=pending'
      },
      auto_return: 'approved',
      notification_url: `${supabaseUrl}/functions/v1/webhook-mercadopago`
    }

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
      return new Response(JSON.stringify({ error: 'Erro ao criar checkout' }), {
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

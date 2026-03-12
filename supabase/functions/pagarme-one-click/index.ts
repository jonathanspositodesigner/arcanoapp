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
        utm_data: utm_data || null
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

    // 4. Criar pedido direto no Pagar.me com card_id
    const amountInCents = Math.round(Number(product.price) * 100)

    const orderPayload = {
      items: [
        {
          amount: amountInCents,
          description: product.title,
          quantity: 1
        }
      ],
      customer_id: savedCard.pagarme_customer_id,
      payments: [
        {
          payment_method: 'credit_card',
          credit_card: {
            card_id: savedCard.pagarme_card_id,
            operation_type: 'auth_and_capture',
            installments: 1
          }
        }
      ],
      metadata: {
        order_id: order.id
      }
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

    // 5. Atualizar ordem com payment_id
    await supabase.from('asaas_orders').update({
      asaas_payment_id: pagarmeData.id
    }).eq('id', order.id)

    const chargeStatus = pagarmeData.charges?.[0]?.status || pagarmeData.status
    const isPaid = chargeStatus === 'paid'

    console.log(`✅ One-Click Pagar.me: ${pagarmeData.id} | Status: ${chargeStatus}`)

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      pagarme_order_id: pagarmeData.id,
      status: chargeStatus,
      is_paid: isPaid
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

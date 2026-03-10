/**
 * Edge Function: create-pagarme-checkout
 * Cria um pedido com checkout no Pagar.me e retorna a URL de pagamento.
 * Recebe: { product_slug, user_email, user_phone, user_name, billing_type, utm_data }
 * Retorna: { checkout_url, order_id }
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
    const { product_slug, user_email, user_phone, user_name, user_cpf, billing_type, utm_data } = await req.json()

    if (!product_slug || !user_email) {
      return new Response(JSON.stringify({ error: 'product_slug e user_email são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const email = user_email.toLowerCase().trim()
    const phoneDigits = user_phone ? user_phone.replace(/\D/g, '') : null

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 11) {
      return new Response(JSON.stringify({ error: 'Celular inválido. Informe DDD + número.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse phone: DDD (2 digits) + number (8-9 digits)
    const areaCode = phoneDigits.slice(0, 2)
    const phoneNumber = phoneDigits.slice(2)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY')

    if (!pagarmeSecretKey) {
      console.error('PAGARME_SECRET_KEY não configurado')
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
      .from('asaas_orders')
      .insert({
        user_email: email,
        product_id: product.id,
        amount: product.price,
        status: 'pending',
        asaas_customer_id: null,
        utm_data: utm_data || null
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

    // 3. Montar payload do checkout Pagar.me (valores em centavos)
    const amountInCents = Math.round(Number(product.price) * 100)

    let acceptedPaymentMethods: string[]
    if (billing_type === 'PIX') {
      acceptedPaymentMethods = ['pix']
    } else if (billing_type === 'CREDIT_CARD') {
      acceptedPaymentMethods = ['credit_card']
    } else {
      acceptedPaymentMethods = ['pix', 'credit_card']
    }

    const customerName = user_name?.trim() || email.split('@')[0]

    const checkoutPayload: Record<string, unknown> = {
      items: [
        {
          amount: amountInCents,
          description: product.title,
          quantity: 1
        }
      ],
      customer: {
        name: customerName,
        email: email,
        type: 'individual',
        document: user_cpf ? user_cpf.replace(/\D/g, '') : undefined,
        document_type: user_cpf ? 'CPF' : undefined,
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: areaCode,
            number: phoneNumber
          }
        }
      },
      payments: [
        {
          payment_method: 'checkout',
          checkout: {
            expires_in: 259200,
            accepted_payment_methods: acceptedPaymentMethods,
            success_url: `https://arcanoapp.voxvisual.com.br/upscaler-arcano?payment=success`,
            customer_editable: false,
            billing_address_editable: billing_type === 'CREDIT_CARD',
            skip_checkout_success_page: true,
            ...(billing_type === 'PIX' ? {
              billing_address: {
                line_1: '1, Av Paulista, Bela Vista',
                zip_code: '01310100',
                city: 'São Paulo',
                state: 'SP',
                country: 'BR'
              }
            } : {}),
            credit_card: {
              capture: true,
              installments: [
                { number: 1, total: amountInCents },
                { number: 2, total: amountInCents },
                { number: 3, total: amountInCents }
              ]
            },
            pix: {
              expires_in: 259200
            }
          }
        }
      ],
      metadata: {
        order_id: order.id
      }
    }

    const authHeader = 'Basic ' + btoa(pagarmeSecretKey + ':')

    // 4. Criar pedido no Pagar.me
    const pagarmeResponse = await fetch(`${PAGARME_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(checkoutPayload)
    })

    const pagarmeResponseText = await pagarmeResponse.text()

    if (!pagarmeResponse.ok) {
      console.error('Erro Pagar.me:', pagarmeResponse.status, pagarmeResponseText.substring(0, 800))
      return new Response(JSON.stringify({ error: 'Erro ao criar cobrança' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let pagarmeData: any
    try {
      pagarmeData = JSON.parse(pagarmeResponseText)
    } catch {
      console.error('Erro ao parsear resposta Pagar.me:', pagarmeResponseText.substring(0, 300))
      return new Response(JSON.stringify({ error: 'Resposta inválida do gateway' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 5. Extrair URL do checkout - múltiplos fallbacks
    console.log(`🔍 Resposta Pagar.me (structure): charges=${!!pagarmeData.charges}, checkouts=${!!pagarmeData.checkouts}`)
    
    const lastTransaction = pagarmeData.charges?.[0]?.last_transaction
    const checkoutUrl = 
      lastTransaction?.url ||
      lastTransaction?.payment_url ||
      lastTransaction?.checkout_url ||
      pagarmeData.checkouts?.[0]?.payment_url ||
      pagarmeData.checkouts?.[0]?.url ||
      pagarmeData.charges?.[0]?.url ||
      null

    if (!checkoutUrl) {
      console.error('URL de checkout não encontrada. Resposta completa:', JSON.stringify(pagarmeData).substring(0, 1500))
      return new Response(JSON.stringify({ error: 'Erro ao gerar link de pagamento' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 6. Atualizar ordem com payment_id do Pagar.me
    await supabase
      .from('asaas_orders')
      .update({ asaas_payment_id: pagarmeData.id })
      .eq('id', order.id)

    console.log(`✅ Checkout Pagar.me criado: ${pagarmeData.id} | URL: ${checkoutUrl.substring(0, 80)}...`)

    return new Response(JSON.stringify({
      checkout_url: checkoutUrl,
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

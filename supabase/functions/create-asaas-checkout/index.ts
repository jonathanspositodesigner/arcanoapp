/**
 * Edge Function: create-asaas-checkout
 * Cria uma cobrança no Asaas e retorna a URL do checkout (PIX + Cartão).
 * Recebe: { product_slug, user_email, utm_data }
 * Retorna: { checkout_url, order_id }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_API_URL = 'https://api.asaas.com/v3'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { product_slug, user_email, user_cpf, utm_data } = await req.json()

    if (!product_slug || !user_email) {
      return new Response(JSON.stringify({ error: 'product_slug e user_email são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const email = user_email.toLowerCase().trim()
    const cpf = user_cpf ? user_cpf.replace(/\D/g, '') : null

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')

    if (!asaasApiKey) {
      console.error('ASAAS_API_KEY não configurado')
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

    const asaasHeaders = {
      'Content-Type': 'application/json',
      'access_token': asaasApiKey
    }

    // 2. Criar ou buscar cliente no Asaas
    // Primeiro buscar por email
    const searchResponse = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(email)}`, {
      headers: asaasHeaders
    })
    const searchData = await searchResponse.json()

    let customerId: string

    if (searchData.data && searchData.data.length > 0) {
      customerId = searchData.data[0].id
      console.log(`👤 Cliente existente no Asaas: ${customerId}`)
    } else {
      // Criar novo cliente
      const createCustomerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify({
          name: email.split('@')[0],
          email: email,
          notificationDisabled: false
        })
      })

      if (!createCustomerResponse.ok) {
        const errorText = await createCustomerResponse.text()
        console.error('Erro ao criar cliente Asaas:', createCustomerResponse.status, errorText)
        return new Response(JSON.stringify({ error: 'Erro ao criar cliente' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const customerData = await createCustomerResponse.json()
      customerId = customerData.id
      console.log(`✅ Novo cliente Asaas criado: ${customerId}`)
    }

    // 3. Criar ordem interna
    const { data: order, error: orderError } = await supabase
      .from('asaas_orders')
      .insert({
        user_email: email,
        product_id: product.id,
        amount: product.price,
        status: 'pending',
        asaas_customer_id: customerId,
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

    // 4. Criar cobrança no Asaas
    // billingType UNDEFINED = mostra PIX + Cartão na mesma tela
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3) // Vencimento em 3 dias

    const paymentBody = {
      customer: customerId,
      billingType: 'UNDEFINED',
      value: Number(product.price),
      dueDate: dueDate.toISOString().split('T')[0],
      description: product.title,
      externalReference: order.id,
      postalService: false
    }

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(paymentBody)
    })

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text()
      console.error('Erro Asaas:', paymentResponse.status, errorText)
      return new Response(JSON.stringify({ error: 'Erro ao criar cobrança' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const paymentData = await paymentResponse.json()

    // 5. Atualizar ordem com payment_id
    await supabase
      .from('asaas_orders')
      .update({ asaas_payment_id: paymentData.id })
      .eq('id', order.id)

    console.log(`✅ Cobrança Asaas criada: ${paymentData.id} | invoiceUrl: ${paymentData.invoiceUrl?.substring(0, 60)}...`)

    return new Response(JSON.stringify({
      checkout_url: paymentData.invoiceUrl,
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

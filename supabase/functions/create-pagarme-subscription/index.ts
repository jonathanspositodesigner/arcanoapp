/**
 * Edge Function: create-pagarme-subscription
 * Cria uma assinatura recorrente no Pagar.me usando card_token.
 * Recebe: { product_slug, card_token, user_email, user_phone, user_name, user_cpf, user_address, utm_data }
 * Retorna: { success, order_id, subscription_id }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const { product_slug, card_token, user_email, user_phone, user_name, user_cpf, utm_data, user_address } = await req.json()

    if (!product_slug || !user_email || !card_token) {
      return new Response(JSON.stringify({ error: 'product_slug, user_email e card_token são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const email = user_email.toLowerCase().trim()
    const phoneDigits = user_phone ? user_phone.replace(/\D/g, '') : null

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!phoneDigits || phoneDigits.length < 10 || phoneDigits.length > 11) {
      return new Response(JSON.stringify({ error: 'Celular inválido. Informe DDD + número.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const areaCode = phoneDigits.slice(0, 2)
    const phoneNumber = phoneDigits.slice(2)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY')

    if (!pagarmeSecretKey) {
      return new Response(JSON.stringify({ error: 'Configuração de pagamento indisponível' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Rate limit
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rateLimitKey = `subscription_${email}_${clientIp}`
    const { data: rlData } = await supabase.rpc('check_rate_limit', {
      _ip_address: rateLimitKey,
      _endpoint: 'create-pagarme-subscription',
      _max_requests: 3,
      _window_seconds: 60
    })
    if (rlData && rlData.length > 0 && !rlData[0].allowed) {
      return new Response(JSON.stringify({ error: 'Muitas tentativas. Aguarde 1 minuto.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
      console.error(`[${requestId}] Produto não encontrado: ${product_slug}`)
      return new Response(JSON.stringify({ error: 'Produto não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (product.type !== 'subscription') {
      return new Response(JSON.stringify({ error: 'Este produto não é uma assinatura' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const cleanCpf = user_cpf ? user_cpf.replace(/\D/g, '') : null

    // 2. Criar ordem interna
    const { data: order, error: orderError } = await supabase
      .from('asaas_orders')
      .insert({
        user_email: email,
        product_id: product.id,
        amount: product.price,
        status: 'pending',
        asaas_customer_id: null,
        utm_data: utm_data || null,
        user_name: user_name?.trim() || null,
        user_phone: phoneDigits || null,
        user_cpf: cleanCpf,
        user_address_line: user_address?.line_1 || null,
        user_address_zip: user_address?.zip_code || null,
        user_address_city: user_address?.city || null,
        user_address_state: user_address?.state || null,
        user_address_country: user_address?.country || 'BR'
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error(`[${requestId}] Erro ao criar ordem:`, orderError)
      return new Response(JSON.stringify({ error: 'Erro ao criar ordem' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📦 [${requestId}] Ordem criada: ${order.id} | Produto: ${product.title} | Email: ${email}`)

    // Salvar dados no perfil imediatamente (pré-checkout)
    const trimmedName = user_name?.trim() || null
    if (trimmedName || cleanCpf || phoneDigits || user_address?.line_1) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, name, phone, cpf, address_line, address_zip, address_city, address_state, address_country')
        .eq('email', email)
        .maybeSingle()

      if (existingProfile) {
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (!existingProfile.name && trimmedName) updates.name = trimmedName
        if (!existingProfile.cpf && cleanCpf) updates.cpf = cleanCpf
        if (!existingProfile.phone && phoneDigits) updates.phone = phoneDigits
        if (!existingProfile.address_line && user_address?.line_1) {
          updates.address_line = user_address.line_1
          updates.address_zip = user_address.zip_code || null
          updates.address_city = user_address.city || null
          updates.address_state = user_address.state || null
          updates.address_country = user_address.country || 'BR'
        }
        if (Object.keys(updates).length > 1) {
          await supabase.from('profiles').update(updates).eq('id', existingProfile.id)
        }
      }
    }

    // 3. Determinar intervalo de cobrança
    const interval = product.billing_period === 'anual' ? 'year' : 'month'
    const amountInCents = Math.round(Number(product.price) * 100)
    const customerName = user_name?.trim() || email.split('@')[0]

    // 4. Montar payload de subscription do Pagar.me
    const subscriptionPayload: Record<string, unknown> = {
      payment_method: 'credit_card',
      interval: interval,
      interval_count: 1,
      billing_type: 'prepaid',
      minimum_price: amountInCents,
      currency: 'BRL',
      card_token: card_token,
      customer: {
        name: customerName,
        email: email,
        type: 'individual',
        document: cleanCpf || undefined,
        document_type: cleanCpf ? 'CPF' : undefined,
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: areaCode,
            number: phoneNumber
          }
        },
        ...(user_address?.line_1 ? {
          address: {
            line_1: user_address.line_1,
            zip_code: user_address.zip_code || '01310100',
            city: user_address.city || 'São Paulo',
            state: user_address.state || 'SP',
            country: user_address.country || 'BR'
          }
        } : {})
      },
      items: [
        {
          description: product.title,
          quantity: 1,
          pricing_scheme: {
            price: amountInCents
          }
        }
      ],
      metadata: {
        order_id: order.id,
        product_slug: product.slug
      }
    }

    const authHeader = 'Basic ' + btoa(pagarmeSecretKey + ':')

    console.log(`🔄 [${requestId}] Criando subscription no Pagar.me (interval: ${interval}, amount: ${amountInCents})`)

    // 5. Criar subscription no Pagar.me
    const pagarmeResponse = await fetch(`${PAGARME_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(subscriptionPayload)
    })

    const pagarmeResponseText = await pagarmeResponse.text()

    if (!pagarmeResponse.ok) {
      console.error(`[${requestId}] Erro Pagar.me:`, pagarmeResponse.status, pagarmeResponseText.substring(0, 800))
      
      let errorMsg = 'Erro ao criar assinatura. Verifique os dados do cartão.'
      try {
        const parsed = JSON.parse(pagarmeResponseText)
        errorMsg = parsed?.message || parsed?.errors?.[0]?.message || errorMsg
      } catch {}

      // Marcar ordem como falha
      await supabase.from('asaas_orders').update({
        status: 'failed',
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let pagarmeData: any
    try {
      pagarmeData = JSON.parse(pagarmeResponseText)
    } catch {
      console.error(`[${requestId}] Erro ao parsear resposta:`, pagarmeResponseText.substring(0, 300))
      return new Response(JSON.stringify({ error: 'Resposta inválida do gateway' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const subscriptionId = pagarmeData.id
    console.log(`✅ [${requestId}] Subscription criada: ${subscriptionId} (status: ${pagarmeData.status})`)

    // 6. Atualizar ordem com subscription_id
    await supabase.from('asaas_orders').update({
      pagarme_subscription_id: subscriptionId,
      asaas_payment_id: pagarmeData.current_charge?.id || subscriptionId,
      updated_at: new Date().toISOString()
    }).eq('id', order.id)

    // Se a primeira cobrança já veio paga, o webhook vai processar.
    // Mas se o status já for 'active' e a charge já for 'paid', não precisa esperar webhook
    const chargeStatus = pagarmeData.current_charge?.status
    console.log(`   ├─ Subscription status: ${pagarmeData.status}, charge status: ${chargeStatus}`)

    return new Response(JSON.stringify({
      success: true,
      order_id: order.id,
      subscription_id: subscriptionId,
      status: pagarmeData.status,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error(`❌ [${requestId}] Erro geral:`, error.message)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

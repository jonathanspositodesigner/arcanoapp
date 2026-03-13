/**
 * Edge Function: create-pagarme-checkout
 * Cria um pedido com checkout no Pagar.me e retorna a URL de pagamento.
 * Recebe: { product_slug, user_email, user_phone, user_name, billing_type, utm_data }
 * Retorna: { checkout_url, order_id }
 * 
 * OTIMIZADO: Rate limit + produto em paralelo, Meta CAPI fire-and-forget,
 * updates pós-checkout não bloqueiam resposta.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

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
    const { product_slug, user_email, user_phone, user_name, user_cpf, billing_type, utm_data, user_address, fbp, fbc } = await req.json()
    const clientUserAgent = req.headers.get('user-agent') || null

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
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // ===== OTIMIZAÇÃO: Rate limit + busca de produto em PARALELO =====
    const rateLimitKey = `checkout_${email}_${clientIp}`

    const [rlResult, productResult] = await Promise.all([
      supabase.rpc('check_rate_limit', {
        _ip_address: rateLimitKey,
        _endpoint: 'create-pagarme-checkout',
        _max_requests: 5,
        _window_seconds: 60
      }),
      supabase
        .from('mp_products')
        .select('*')
        .eq('slug', product_slug)
        .eq('is_active', true)
        .single()
    ])

    // Verificar rate limit
    if (rlResult.data && rlResult.data.length > 0 && !rlResult.data[0].allowed) {
      console.warn(`🚫 Rate limit atingido: ${email} (${clientIp})`)
      return new Response(JSON.stringify({ error: 'Muitas tentativas. Aguarde 1 minuto.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verificar produto
    const product = productResult.data
    if (productResult.error || !product) {
      console.error('Produto não encontrado:', product_slug, productResult.error)
      return new Response(JSON.stringify({ error: 'Produto não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Criar ordem interna
    const cleanCpf = user_cpf ? user_cpf.replace(/\D/g, '') : null

    const { data: order, error: orderError } = await supabase
      .from('asaas_orders')
      .insert({
        user_email: email,
        product_id: product.id,
        amount: product.price,
        status: 'pending',
        asaas_customer_id: null,
        utm_data: sanitizeUtmData(utm_data),
        user_name: user_name?.trim() || null,
        user_phone: phoneDigits || null,
        user_cpf: cleanCpf,
        user_address_line: user_address?.line_1 || null,
        user_address_zip: user_address?.zip_code || null,
        user_address_city: user_address?.city || null,
        user_address_state: user_address?.state || null,
        user_address_country: user_address?.country || 'BR',
        meta_fbp: fbp || null,
        meta_fbc: fbc || null,
        meta_user_agent: clientUserAgent || null,
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

    // OTIMIZAÇÃO: Atualizar perfil sem bloquear (fire-and-forget)
    const trimmedName = user_name?.trim() || null
    if (trimmedName || cleanCpf || phoneDigits || user_address?.line_1) {
      // Não aguarda — roda em background
      supabase
        .from('profiles')
        .select('id, name, phone, cpf, address_line, address_zip, address_city, address_state, address_country')
        .eq('email', email)
        .maybeSingle()
        .then(({ data: existingProfile }) => {
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
              supabase.from('profiles').update(updates).eq('id', existingProfile.id)
                .then(() => console.log(`👤 Perfil atualizado (pré-checkout): ${email}`))
                .catch((err: any) => console.warn(`⚠️ Falha ao atualizar perfil: ${err.message}`))
            }
          }
        })
        .catch((err: any) => console.warn(`⚠️ Falha ao buscar perfil: ${err.message}`))
    }

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
            success_url: product.pack_slug === 'upscaler-arcano'
              ? `https://arcanoapp.voxvisual.com.br/sucesso-upscaler-arcano`
              : `https://arcanoapp.voxvisual.com.br/sucesso-compra`,
            customer_editable: false,
            billing_address_editable: billing_type === 'CREDIT_CARD',
            skip_checkout_success_page: billing_type === 'CREDIT_CARD',
            ...(billing_type === 'PIX' ? {
              billing_address: user_address?.line_1 ? {
                line_1: user_address.line_1,
                zip_code: user_address.zip_code || '01310100',
                city: user_address.city || 'São Paulo',
                state: user_address.state || 'SP',
                country: user_address.country || 'BR'
              } : {
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

    // Preparar dados para fire-and-forget
    const capiEventId = crypto.randomUUID()
    let effectiveFbc = fbc || null
    let effectiveFbp = fbp || null
    const fbclid = utm_data?.fbclid || null
    if (!effectiveFbc && fbclid) {
      effectiveFbc = `fb.1.${Date.now()}.${fbclid}`
      console.log(`🔗 fbc gerado a partir do fbclid: ${effectiveFbc.substring(0, 30)}...`)
    }
    if (!effectiveFbp && fbclid) {
      effectiveFbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`
      console.log(`🔗 fbp fallback gerado: ${effectiveFbp}`)
    }

    console.log(`✅ Checkout Pagar.me criado: ${pagarmeData.id} | URL: ${checkoutUrl.substring(0, 80)}...`)

    // ===== RETORNAR RESPOSTA IMEDIATAMENTE =====
    // Tudo abaixo roda em background (fire-and-forget)
    const response = new Response(JSON.stringify({
      checkout_url: checkoutUrl,
      order_id: order.id,
      event_id: capiEventId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    // 6. FIRE-AND-FORGET: Atualizar ordem com payment_id + fbc/fbp
    const orderUpdates: Record<string, unknown> = { asaas_payment_id: pagarmeData.id }
    if ((effectiveFbc && !fbc) || (effectiveFbp && !fbp)) {
      orderUpdates.meta_fbc = effectiveFbc
      orderUpdates.meta_fbp = effectiveFbp
    }
    supabase
      .from('asaas_orders')
      .update(orderUpdates)
      .eq('id', order.id)
      .then(() => console.log(`📝 Ordem atualizada com payment_id: ${pagarmeData.id}`))
      .catch((err: any) => console.warn(`⚠️ Falha ao atualizar ordem: ${err.message}`))

    // 7. FIRE-AND-FORGET: Meta CAPI InitiateCheckout
    fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        event_name: 'InitiateCheckout',
        email,
        value: Number(product.price),
        currency: 'BRL',
        utm_data: sanitizeUtmData(utm_data),
        fbp: effectiveFbp,
        fbc: effectiveFbc,
        event_id: capiEventId,
        event_source_url: 'https://arcanoapp.voxvisual.com.br',
        client_ip_address: clientIp !== 'unknown' ? clientIp : null,
        client_user_agent: clientUserAgent,
      }),
    })
      .then((r) => console.log(`📊 Meta CAPI InitiateCheckout: ${r.status}`))
      .catch((err: any) => console.warn(`⚠️ Meta CAPI InitiateCheckout falhou: ${err.message}`))

    return response

  } catch (error) {
    console.error('Erro geral:', error)
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

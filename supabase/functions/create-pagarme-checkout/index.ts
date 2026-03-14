/**
 * Edge Function: create-pagarme-checkout
 * Cria um pedido com checkout no Pagar.me e retorna a URL de pagamento.
 * 
 * BLINDADO: retry com backoff, idempotency_key, request_id rastreável,
 * mark failed on error, timeout por tentativa, normalização robusta de telefone.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const PAGARME_API_URL = 'https://api.pagar.me/core/v5'

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

/** Normaliza telefone brasileiro: remove prefixo 55 se presente, valida DDD+número */
function normalizePhone(raw: string | null): { areaCode: string; phoneNumber: string; fullDigits: string } | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  // Remove country code 55 if present (13 digits = 55 + DDD + 9-digit number, 12 = 55 + DDD + 8-digit)
  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length < 10 || digits.length > 11) return null;
  return {
    areaCode: digits.slice(0, 2),
    phoneNumber: digits.slice(2),
    fullDigits: digits,
  };
}

/** Fetch com retry automático para 5xx/429/timeout, backoff curto */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  { maxRetries = 2, timeoutMs = 25000, idempotencyKey }: { maxRetries?: number; timeoutMs?: number; idempotencyKey?: string }
): Promise<{ response: Response; responseText: string }> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
      if (idempotencyKey) {
        headers['X-Idempotency-Key'] = idempotencyKey;
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const responseText = await response.text();

      // Retry on 5xx or 429
      if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
        const backoffMs = (attempt + 1) * 1500; // 1.5s, 3s
        console.warn(`⚠️ Pagar.me retornou ${response.status}, retry ${attempt + 1}/${maxRetries} em ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      return { response, responseText };
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = err;

      if (attempt < maxRetries) {
        const backoffMs = (attempt + 1) * 2000;
        const errType = err?.name === 'AbortError' ? 'timeout' : 'network';
        console.warn(`⚠️ Pagar.me ${errType} error, retry ${attempt + 1}/${maxRetries} em ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
    }
  }

  // All retries exhausted
  const errMsg = lastError?.name === 'AbortError'
    ? 'Timeout ao conectar com o gateway de pagamento após múltiplas tentativas'
    : `Falha de rede com Pagar.me após múltiplas tentativas: ${lastError?.message || 'unknown'}`;
  throw new Error(errMsg);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID();
  let orderId: string | null = null;

  // Helper to return structured error
  const errorResponse = (error: string, status: number, errorCode?: string) => {
    return new Response(JSON.stringify({ error, request_id: requestId, error_code: errorCode || 'UNKNOWN' }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  };

  let supabase: any = null;

  try {
    const { product_slug, user_email, user_phone, user_name, user_cpf, billing_type, utm_data, user_address, fbp, fbc } = await req.json()
    const clientUserAgent = req.headers.get('user-agent') || null

    if (!product_slug || !user_email) {
      return errorResponse('product_slug e user_email são obrigatórios', 400, 'MISSING_FIELDS');
    }

    const email = user_email.toLowerCase().trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('Email inválido', 400, 'INVALID_EMAIL');
    }

    // Normalizar telefone com tolerância a prefixo 55
    const phone = normalizePhone(user_phone);
    if (!phone) {
      return errorResponse('Celular inválido. Informe DDD + número (ex: 11999998888).', 400, 'INVALID_PHONE');
    }

    // Validar CPF basicamente (11 dígitos)
    const cleanCpf = user_cpf ? user_cpf.replace(/\D/g, '') : null;
    if (cleanCpf && cleanCpf.length !== 11) {
      return errorResponse('CPF inválido. Informe os 11 dígitos.', 400, 'INVALID_CPF');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY')

    if (!pagarmeSecretKey) {
      console.error(`[${requestId}] PAGARME_SECRET_KEY não configurado`)
      return errorResponse('Configuração de pagamento indisponível', 500, 'CONFIG_ERROR');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // ===== Rate limit + busca de produto em PARALELO =====
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

    if (rlResult.data && rlResult.data.length > 0 && !rlResult.data[0].allowed) {
      console.warn(`[${requestId}] 🚫 Rate limit: ${email} (${clientIp})`)
      return errorResponse('Muitas tentativas. Aguarde 1 minuto.', 429, 'RATE_LIMITED');
    }

    const product = productResult.data
    if (productResult.error || !product) {
      console.error(`[${requestId}] Produto não encontrado: ${product_slug}`, productResult.error)
      return errorResponse('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
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
        utm_data: sanitizeUtmData(utm_data),
        user_name: user_name?.trim() || null,
        user_phone: phone.fullDigits,
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
      console.error(`[${requestId}] Erro ao criar ordem:`, orderError)
      return errorResponse('Erro ao criar ordem', 500, 'ORDER_CREATE_FAILED');
    }

    orderId = order.id;
    console.log(`[${requestId}] 📦 Ordem: ${orderId} | ${product.title} | ${email}`)

    // Fire-and-forget: atualizar perfil
    const trimmedName = user_name?.trim() || null
    if (trimmedName || cleanCpf || phone.fullDigits || user_address?.line_1) {
      supabase
        .from('profiles')
        .select('id, name, phone, cpf, address_line, address_zip, address_city, address_state, address_country')
        .eq('email', email)
        .maybeSingle()
        .then(({ data: existingProfile }: any) => {
          if (existingProfile) {
            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (!existingProfile.name && trimmedName) updates.name = trimmedName
            if (!existingProfile.cpf && cleanCpf) updates.cpf = cleanCpf
            if (!existingProfile.phone && phone.fullDigits) updates.phone = phone.fullDigits
            if (!existingProfile.address_line && user_address?.line_1) {
              updates.address_line = user_address.line_1
              updates.address_zip = user_address.zip_code || null
              updates.address_city = user_address.city || null
              updates.address_state = user_address.state || null
              updates.address_country = user_address.country || 'BR'
            }
            if (Object.keys(updates).length > 1) {
              supabase.from('profiles').update(updates).eq('id', existingProfile.id)
                .then(() => console.log(`[${requestId}] 👤 Perfil atualizado`))
                .catch((err: any) => console.warn(`[${requestId}] ⚠️ Perfil: ${err.message}`))
            }
          }
        })
        .catch((err: any) => console.warn(`[${requestId}] ⚠️ Busca perfil: ${err.message}`))
    }

    // 3. Montar payload checkout Pagar.me
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
        document: cleanCpf || undefined,
        document_type: cleanCpf ? 'CPF' : undefined,
        phones: {
          mobile_phone: {
            country_code: '55',
            area_code: phone.areaCode,
            number: phone.phoneNumber
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
            ...(billing_type === 'PIX' ? (
              user_address?.line_1 ? {
                billing_address: {
                  line_1: user_address.line_1,
                  zip_code: user_address.zip_code || '01310100',
                  city: user_address.city || 'São Paulo',
                  state: user_address.state || 'SP',
                  country: user_address.country || 'BR'
                }
              } : {
                billing_address_editable: true
              }
            ) : {}),
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
        order_id: order.id,
        request_id: requestId
      }
    }

    const authHeader = 'Basic ' + btoa(pagarmeSecretKey + ':')
    const idempotencyKey = `checkout_${order.id}`

    console.log(`[${requestId}] 🔑 Calling Pagar.me | Key: ${pagarmeSecretKey.substring(0, 8)}... | Idempotency: ${idempotencyKey}`)

    // 4. Criar pedido no Pagar.me com RETRY
    let pagarmeResponseText: string
    let pagarmeResponse: Response
    try {
      const result = await fetchWithRetry(
        `${PAGARME_API_URL}/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(checkoutPayload),
        },
        { maxRetries: 2, timeoutMs: 25000, idempotencyKey }
      );
      pagarmeResponse = result.response;
      pagarmeResponseText = result.responseText;
    } catch (fetchErr: any) {
      console.error(`[${requestId}] ❌ Gateway falhou após retries: ${fetchErr.message}`)
      // MARK ORDER AS FAILED
      await supabase.from('asaas_orders').update({ status: 'failed', payment_method: 'checkout_failed' }).eq('id', order.id);
      return errorResponse('Erro de comunicação com o gateway. Tente novamente em alguns instantes.', 502, 'GATEWAY_UNREACHABLE');
    }

    if (!pagarmeResponse.ok) {
      console.error(`[${requestId}] Erro Pagar.me ${pagarmeResponse.status}: ${pagarmeResponseText.substring(0, 800)}`)
      // MARK ORDER AS FAILED
      await supabase.from('asaas_orders').update({ status: 'failed', payment_method: 'checkout_failed' }).eq('id', order.id);
      return errorResponse('Erro ao criar cobrança. Tente novamente.', 500, 'GATEWAY_ERROR');
    }

    let pagarmeData: any
    try {
      pagarmeData = JSON.parse(pagarmeResponseText)
    } catch {
      console.error(`[${requestId}] Parse error: ${pagarmeResponseText.substring(0, 300)}`)
      await supabase.from('asaas_orders').update({ status: 'failed', payment_method: 'checkout_failed' }).eq('id', order.id);
      return errorResponse('Resposta inválida do gateway', 500, 'GATEWAY_PARSE_ERROR');
    }

    // 5. Extrair URL do checkout
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
      console.error(`[${requestId}] URL não encontrada. Resposta: ${JSON.stringify(pagarmeData).substring(0, 1500)}`)
      await supabase.from('asaas_orders').update({ status: 'failed', payment_method: 'checkout_failed' }).eq('id', order.id);
      return errorResponse('Erro ao gerar link de pagamento', 500, 'NO_CHECKOUT_URL');
    }

    // Preparar dados para fire-and-forget
    const capiEventId = crypto.randomUUID()
    let effectiveFbc = fbc || null
    let effectiveFbp = fbp || null
    const fbclid = utm_data?.fbclid || null
    if (!effectiveFbc && fbclid) {
      effectiveFbc = `fb.1.${Date.now()}.${fbclid}`
    }
    if (!effectiveFbp && fbclid) {
      effectiveFbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`
    }

    console.log(`[${requestId}] ✅ Checkout criado: ${pagarmeData.id} | URL: ${checkoutUrl.substring(0, 80)}...`)

    // ===== RETORNAR RESPOSTA IMEDIATAMENTE =====
    const response = new Response(JSON.stringify({
      checkout_url: checkoutUrl,
      order_id: order.id,
      event_id: capiEventId,
      request_id: requestId,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    // 6. FIRE-AND-FORGET: Atualizar ordem com payment_id
    const orderUpdates: Record<string, unknown> = { asaas_payment_id: pagarmeData.id }
    if ((effectiveFbc && !fbc) || (effectiveFbp && !fbp)) {
      orderUpdates.meta_fbc = effectiveFbc
      orderUpdates.meta_fbp = effectiveFbp
    }
    supabase
      .from('asaas_orders')
      .update(orderUpdates)
      .eq('id', order.id)
      .then(() => console.log(`[${requestId}] 📝 Ordem atualizada: ${pagarmeData.id}`))
      .catch((err: any) => console.warn(`[${requestId}] ⚠️ Update ordem: ${err.message}`))

    // 7. FIRE-AND-FORGET: Meta CAPI
    const supabaseUrl2 = Deno.env.get('SUPABASE_URL')!
    fetch(`${supabaseUrl2}/functions/v1/meta-capi-event`, {
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
      .then((r) => console.log(`[${requestId}] 📊 Meta CAPI: ${r.status}`))
      .catch((err: any) => console.warn(`[${requestId}] ⚠️ Meta CAPI: ${err.message}`))

    return response

  } catch (error: any) {
    console.error(`[${requestId}] Erro geral:`, error)
    // Mark order as failed if we have one
    if (orderId && supabase) {
      try {
        await supabase.from('asaas_orders').update({ status: 'failed', payment_method: 'checkout_failed' }).eq('id', orderId);
      } catch {}
    }
    return errorResponse('Erro interno. Tente novamente.', 500, 'INTERNAL_ERROR');
  }
})

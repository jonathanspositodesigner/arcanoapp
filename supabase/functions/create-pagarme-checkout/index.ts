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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
  { maxRetries = 2, timeoutMs = 15000, idempotencyKey }: { maxRetries?: number; timeoutMs?: number; idempotencyKey?: string }
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

  // ===== Ping handler: warm the runtime without executing logic =====
  try {
    const clonedReq = req.clone();
    const maybeBody = await clonedReq.json().catch(() => null);
    if (maybeBody?.ping) {
      return new Response(JSON.stringify({ pong: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch { /* not JSON, continue */ }

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
    const { product_slug, user_email, user_phone, user_name, user_cpf, billing_type, utm_data, user_address, fbp, fbc, lightweight } = await req.json()
    const clientUserAgent = req.headers.get('user-agent') || null
    const isPureCreditCardCheckout = billing_type === 'CREDIT_CARD'
    const isLightweightFallback = lightweight === true
    const useMinimalValidation = isLightweightFallback || isPureCreditCardCheckout
    const shouldPersistPersonalData = !isPureCreditCardCheckout

    if (!product_slug) {
      return errorResponse('product_slug é obrigatório', 400, 'MISSING_FIELDS');
    }

    // Cartão puro: não enviamos nome/email fictícios ao gateway
    let email: string
    let customerEmail: string | null = null
    if (user_email) {
      email = user_email.toLowerCase().trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse('Email inválido', 400, 'INVALID_EMAIL');
      }
      customerEmail = email
    } else if (isPureCreditCardCheckout) {
      email = `checkout-${crypto.randomUUID().slice(0, 8)}@temp.arcano`
      console.log(`[${requestId}] 💳 Cartão puro sem email — sem pré-preenchimento de cliente no checkout`)
    } else {
      return errorResponse('user_email é obrigatório para este método', 400, 'MISSING_FIELDS');
    }

    // Modo mínimo: validações relaxadas para checkout puro no cartão/fallback lightweight
    let phone: { areaCode: string; phoneNumber: string; fullDigits: string } | null = null;
    let cleanCpf: string | null = null;

    if (useMinimalValidation) {
      // Minimal: try to parse phone but don't fail if missing
      phone = normalizePhone(user_phone);
      cleanCpf = user_cpf ? user_cpf.replace(/\D/g, '') : null;
      console.log(`[${requestId}] ⚡ Modo mínimo ativo (${isPureCreditCardCheckout ? 'cartão puro' : 'lightweight'}) - validações relaxadas`)
    } else {
      // Full mode: validate everything
      phone = normalizePhone(user_phone);
      if (!phone) {
        return errorResponse('Celular inválido. Informe DDD + número (ex: 11999998888).', 400, 'INVALID_PHONE');
      }

      cleanCpf = user_cpf ? user_cpf.replace(/\D/g, '') : null;
      if (cleanCpf) {
        if (cleanCpf.length !== 11 || /^(\d)\1{10}$/.test(cleanCpf)) {
          return errorResponse('CPF inválido. Verifique os dígitos informados.', 400, 'INVALID_CPF');
        }
        for (let t = 9; t < 11; t++) {
          let sum = 0;
          for (let i = 0; i < t; i++) sum += parseInt(cleanCpf[i]) * (t + 1 - i);
          const remainder = (sum * 10) % 11;
          if ((remainder === 10 ? 0 : remainder) !== parseInt(cleanCpf[t])) {
            return errorResponse('CPF inválido. Verifique os dígitos informados.', 400, 'INVALID_CPF');
          }
        }
      }
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

    // Rate limit: fire-and-forget (non-blocking) — log only, don't block checkout
    supabase.rpc('check_rate_limit', {
      _ip_address: rateLimitKey,
      _endpoint: 'create-pagarme-checkout',
      _max_requests: 5,
      _window_seconds: 60
    }).then((rlResult: any) => {
      if (rlResult.data && rlResult.data.length > 0 && !rlResult.data[0].allowed) {
        console.warn(`[${requestId}] 🚫 Rate limit exceeded: ${email} (${clientIp})`);
      }
    }).catch(() => {});

    // Product lookup (blocking — required)
    const productResult = await supabase
      .from('mp_products')
      .select('*')
      .eq('slug', product_slug)
      .eq('is_active', true)
      .single()

    const product = productResult.data
    if (productResult.error || !product) {
      console.error(`[${requestId}] Produto não encontrado: ${product_slug}`, productResult.error)
      return errorResponse('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // 2. Dedup robusto: evita múltiplos pendings por tentativas/fallback no mesmo email
    let order: any = null
    const dedupWindowIso = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const baseOrderPayload = {
      user_email: email,
      product_id: product.id,
      amount: product.price,
      utm_data: isLightweightFallback
        ? { ...(sanitizeUtmData(utm_data) || {}), race_fallback: true }
        : sanitizeUtmData(utm_data),
      user_name: shouldPersistPersonalData ? (user_name?.trim() || null) : null,
      user_phone: shouldPersistPersonalData ? (phone?.fullDigits || null) : null,
      user_cpf: shouldPersistPersonalData ? cleanCpf : null,
      user_address_line: shouldPersistPersonalData ? (user_address?.line_1 || null) : null,
      user_address_zip: shouldPersistPersonalData ? (user_address?.zip_code || null) : null,
      user_address_city: shouldPersistPersonalData ? (user_address?.city || null) : null,
      user_address_state: shouldPersistPersonalData ? (user_address?.state || null) : null,
      user_address_country: shouldPersistPersonalData ? (user_address?.country || 'BR') : null,
      meta_fbp: fbp || null,
      meta_fbc: fbc || null,
      meta_user_agent: clientUserAgent || null,
    }

    // 2.1 Reuso preferencial: mesmo produto + pending recente
    const { data: exactPendingOrder } = await supabase
      .from('asaas_orders')
      .select('id')
      .eq('user_email', email)
      .eq('product_id', product.id)
      .eq('status', 'pending')
      .gte('created_at', dedupWindowIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (exactPendingOrder) {
      order = exactPendingOrder
      console.log(`[${requestId}] ♻️ Reutilizando pending exato: ${order.id} | ${email}`)
    } else {
      // 2.2 Fallback: pending recente do mesmo email sem checkout já emitido
      const { data: reusablePendingOrder } = await supabase
        .from('asaas_orders')
        .select('id, product_id, amount, asaas_payment_id')
        .eq('user_email', email)
        .eq('status', 'pending')
        .gte('created_at', dedupWindowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (reusablePendingOrder) {
        const sameProduct = reusablePendingOrder.product_id === product.id
        const sameAmount = Number(reusablePendingOrder.amount || 0) === Number(product.price)

        // Se já existe payment_id e produto mudou, não reutiliza para evitar colisão de idempotência
        if (!sameProduct && reusablePendingOrder.asaas_payment_id) {
          console.log(`[${requestId}] ↪️ Pending recente já com payment_id e produto diferente, criando nova ordem`)
        } else {
          if (!sameProduct || !sameAmount) {
            await supabase
              .from('asaas_orders')
              .update({
                ...baseOrderPayload,
                updated_at: new Date().toISOString(),
              })
              .eq('id', reusablePendingOrder.id)
          }
          order = { id: reusablePendingOrder.id }
          console.log(`[${requestId}] ♻️ Reutilizando pending por email: ${order.id} | ${email}`)
        }
      }

      if (!order) {
        const { data: newOrder, error: orderError } = await supabase
          .from('asaas_orders')
          .insert({
            ...baseOrderPayload,
            status: 'pending',
            asaas_customer_id: null,
          })
          .select('id')
          .single()

        if (orderError || !newOrder) {
          console.error(`[${requestId}] Erro ao criar ordem:`, orderError)
          return errorResponse('Erro ao criar ordem', 500, 'ORDER_CREATE_FAILED');
        }
        order = newOrder
      }
    }

    orderId = order.id;
    console.log(`[${requestId}] 📦 Ordem: ${orderId} | ${product.title} | ${email}`)

    // Fire-and-forget: atualizar perfil (desabilitado no modo cartão puro)
    const trimmedName = user_name?.trim() || null
    if (shouldPersistPersonalData && (trimmedName || cleanCpf || phone?.fullDigits || user_address?.line_1)) {
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
            if (!existingProfile.phone && phone?.fullDigits) updates.phone = phone.fullDigits
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

    // Cartão puro: customer mínimo obrigatório pela API Pagar.me, mas customer_editable=true
    // para que o cliente preencha tudo no checkout hospedado
    let customerObj: Record<string, unknown>

    if (isPureCreditCardCheckout) {
      // Mínimo absoluto exigido pela API — será sobrescrito pelo cliente no checkout
      customerObj = {
        name: 'Cliente',
        email: email !== `checkout-${email.split('-')[1]}` ? email : `temp-${Date.now()}@checkout.arcano`,
        type: 'individual',
      }
    } else {
      const customerName = user_name?.trim() || email.split('@')[0]
      customerObj = {
        name: customerName,
        email: email,
        type: 'individual',
      }

      if (cleanCpf) {
        customerObj.document = cleanCpf
        customerObj.document_type = 'CPF'
      }
      if (phone) {
        customerObj.phones = {
          mobile_phone: {
            country_code: '55',
            area_code: phone.areaCode,
            number: phone.phoneNumber
          }
        }
      }
      if (user_address?.line_1 && user_address?.zip_code && user_address?.city && user_address?.state) {
        customerObj.address = {
          line_1: user_address.line_1,
          zip_code: user_address.zip_code.replace(/\D/g, ''),
          city: user_address.city,
          state: user_address.state,
          country: user_address.country || 'BR'
        }
      }
    }

    // Gerar code do item para antifraude
    const itemCode = product.slug || product.id || 'PROD001'

    const checkoutPayload: Record<string, unknown> = {
      items: [
        {
          amount: amountInCents,
          description: product.title,
          quantity: 1,
          code: itemCode
        }
      ],
      customer: customerObj,
      payments: [
        {
          payment_method: 'checkout',
          checkout: {
            expires_in: 259200,
            accepted_payment_methods: acceptedPaymentMethods,
            success_url: `https://arcanoapp.voxvisual.com.br/sucesso-compra`,
            // Modo mínimo/cartão puro: gateway coleta dados direto no checkout hospedado
            customer_editable: useMinimalValidation,
            billing_address_editable: true,
            skip_checkout_success_page: billing_type === 'CREDIT_CARD',
            ...(!useMinimalValidation && (user_address?.line_1 && user_address?.zip_code && user_address?.city && user_address?.state) ? {
              billing_address: {
                line_1: user_address.line_1,
                zip_code: user_address.zip_code.replace(/\D/g, ''),
                city: user_address.city,
                state: user_address.state,
                country: user_address.country || 'BR'
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
        order_id: order.id,
        request_id: requestId,
        ...(isLightweightFallback ? { lightweight: true } : {}),
        ...(isPureCreditCardCheckout ? { pure_credit_card_checkout: true } : {})
      }
    }

    const authHeader = 'Basic ' + btoa(pagarmeSecretKey + ':')
    const idempotencyKey = `checkout_${order.id}`

    const pagarmeStartTime = Date.now()
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
        { maxRetries: 2, timeoutMs: 15000, idempotencyKey }
      );
      pagarmeResponse = result.response;
      pagarmeResponseText = result.responseText;
    } catch (fetchErr: any) {
      console.error(`[${requestId}] ❌ Gateway falhou após retries: ${fetchErr.message}`)
      // MARK ORDER AS FAILED
      await supabase.from('asaas_orders').update({ status: 'failed', payment_method: 'checkout_failed' }).eq('id', order.id);
      return errorResponse('Erro de comunicação com o gateway. Tente novamente em alguns instantes.', 502, 'GATEWAY_UNREACHABLE');
    }

    const pagarmeElapsed = Date.now() - pagarmeStartTime
    console.log(`[${requestId}] ⏱️ Pagar.me respondeu em ${pagarmeElapsed}ms (status: ${pagarmeResponse.status})`)

    if (!pagarmeResponse.ok) {
      console.error(`[${requestId}] Erro Pagar.me ${pagarmeResponse.status}: ${pagarmeResponseText.substring(0, 800)}`)
      // MARK ORDER AS FAILED
      await supabase.from('asaas_orders').update({ 
        status: 'failed', 
        payment_method: 'checkout_failed',
        gateway_error_code: String(pagarmeResponse.status),
        gateway_error_message: pagarmeResponseText.substring(0, 500),
      }).eq('id', order.id);
      
      // Parse 4xx errors for user-friendly messages
      if (pagarmeResponse.status >= 400 && pagarmeResponse.status < 500) {
        try {
          const errData = JSON.parse(pagarmeResponseText);
          const errMessages: string[] = [];
          if (errData.errors && Array.isArray(errData.errors)) {
            for (const e of errData.errors) {
              errMessages.push(e.message || e.description || JSON.stringify(e));
            }
          } else if (errData.message) {
            errMessages.push(errData.message);
          }
          const userMsg = errMessages.length > 0 
            ? `Erro de validação: ${errMessages.join('; ')}` 
            : 'Erro de validação nos dados. Verifique CPF e endereço.';
          return errorResponse(userMsg, 422, 'GATEWAY_VALIDATION_ERROR');
        } catch {
          // Fall through to generic error
        }
      }
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

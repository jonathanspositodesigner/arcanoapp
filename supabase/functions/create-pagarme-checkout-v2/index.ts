/**
 * Edge Function: create-pagarme-checkout-v2
 * Checkout direto — recebe apenas product_slug, retorna checkout_url.
 * O cliente preenche tudo (nome, CPF, email, endereço, pagamento) na página do Pagar.me.
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
      if (idempotencyKey) headers['X-Idempotency-Key'] = idempotencyKey;

      const response = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(timeout);
      const responseText = await response.text();

      if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
        const backoffMs = (attempt + 1) * 1500;
        console.warn(`⚠️ Pagar.me ${response.status}, retry ${attempt + 1}/${maxRetries} em ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      return { response, responseText };
    } catch (err: any) {
      clearTimeout(timeout);
      lastError = err;
      if (attempt < maxRetries) {
        const backoffMs = (attempt + 1) * 2000;
        console.warn(`⚠️ Pagar.me error, retry ${attempt + 1}/${maxRetries} em ${backoffMs}ms`);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
    }
  }
  throw new Error(lastError?.name === 'AbortError'
    ? 'Timeout ao conectar com o gateway de pagamento'
    : `Falha de rede com Pagar.me: ${lastError?.message || 'unknown'}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID();
  let orderId: string | null = null;

  const errorResponse = (error: string, status: number, errorCode?: string) =>
    new Response(JSON.stringify({ error, request_id: requestId, error_code: errorCode || 'UNKNOWN' }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  try {
    const body = await req.json()
    const { product_slug, utm_data, fbp, fbc, customer_name, customer_email, customer_document } = body

    if (!product_slug || typeof product_slug !== 'string' || !product_slug.trim()) {
      return errorResponse('product_slug é obrigatório', 400, 'MISSING_FIELDS');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY')

    if (!pagarmeSecretKey) {
      console.error(`[${requestId}] PAGARME_SECRET_KEY não configurado`)
      return errorResponse('Configuração de pagamento indisponível', 500, 'CONFIG_ERROR');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const clientUserAgent = req.headers.get('user-agent') || null
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    // Buscar produto
    const { data: product, error: productError } = await supabase
      .from('mp_products')
      .select('*')
      .eq('slug', product_slug.trim())
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      console.error(`[${requestId}] Produto não encontrado: ${product_slug}`, productError)
      return errorResponse('Produto não encontrado', 404, 'PRODUCT_NOT_FOUND');
    }

    // Criar ordem pendente — salva dados do cliente quando disponíveis
    const sanitizedUtm = sanitizeUtmData(utm_data)
    const trimmedEmail = customer_email?.trim()?.toLowerCase() || null
    const trimmedName = customer_name?.trim() || null
    const trimmedCpf = customer_document?.replace(/\D/g, '') || null
    const { data: order, error: orderError } = await supabase
      .from('asaas_orders')
      .insert({
        user_email: trimmedEmail,
        user_name: trimmedName,
        user_cpf: trimmedCpf,
        product_id: product.id,
        amount: product.price,
        status: 'pending',
        utm_data: sanitizedUtm,
        meta_fbp: fbp || null,
        meta_fbc: fbc || null,
        meta_user_agent: clientUserAgent,
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error(`[${requestId}] Erro ao criar ordem:`, orderError)
      return errorResponse('Erro ao criar ordem', 500, 'ORDER_CREATE_FAILED');
    }

    orderId = order.id
    console.log(`[${requestId}] 📦 Ordem criada: ${orderId} | ${product.title} | R$${Number(product.price).toFixed(2)}`)

    // Montar payload Pagar.me — checkout totalmente hospedado
    const amountInCents = Math.round(Number(product.price) * 100)
    const idempotencyKey = `v2_${orderId}_${Date.now()}`
    const itemCode = product.slug || product.id || 'PROD001'

    const customerObj = (customer_name && customer_email && customer_document) ? {
      name: customer_name,
      email: customer_email,
      type: 'individual',
      document: customer_document.replace(/\D/g, ''),
      document_type: 'CPF',
    } : undefined;

    const checkoutPayload: any = {
      items: [{
        amount: amountInCents,
        description: product.title,
        quantity: 1,
        code: itemCode,
      }],
      payments: [{
        payment_method: 'checkout',
        checkout: {
          expires_in: 259200,
          accepted_payment_methods: ['pix', 'credit_card'],
          success_url: 'https://arcanoapp.voxvisual.com.br/sucesso-compra',
          customer_editable: true,
          billing_address_editable: true,
          credit_card: {
            capture: true,
            installments: [
              { number: 1, total: amountInCents },
              { number: 2, total: amountInCents },
              { number: 3, total: amountInCents },
            ],
          },
          pix: {
            expires_in: 259200,
          },
        }
      }],
      metadata: {
        order_id: orderId,
        product_slug: product_slug.trim(),
        source: 'checkout-v2',
      },
      closed: false,
    }

    if (customerObj) {
      checkoutPayload.customer = customerObj;
    }

    console.log(`[${requestId}] 🚀 Chamando Pagar.me /orders`)

    const authHeader = 'Basic ' + btoa(pagarmeSecretKey + ':')
    const { response, responseText } = await fetchWithRetry(
      `${PAGARME_API_URL}/orders`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify(checkoutPayload),
      },
      { maxRetries: 2, timeoutMs: 15000, idempotencyKey }
    )

    if (!response.ok) {
      console.error(`[${requestId}] ❌ Pagar.me ${response.status}: ${responseText.substring(0, 800)}`)

      Promise.resolve(supabase.from('asaas_orders').update({
        status: 'failed',
        gateway_error_code: String(response.status),
        gateway_error_message: responseText.substring(0, 500),
        last_attempt_at: new Date().toISOString(),
      }).eq('id', orderId)).then(() => {}).catch(() => {})

      if (response.status >= 400 && response.status < 500) {
        try {
          const errData = JSON.parse(responseText)
          const friendly = errData?.message || 'Erro de validação ao criar checkout'
          return errorResponse(friendly, 422, 'PAGARME_VALIDATION')
        } catch {
          return errorResponse('Erro de validação ao criar checkout', 422, 'PAGARME_VALIDATION')
        }
      }

      return errorResponse('Erro ao criar checkout', 500, 'PAGARME_ERROR');
    }

    let pagarmeData: any
    try {
      pagarmeData = JSON.parse(responseText)
    } catch {
      return errorResponse('Resposta inválida do gateway', 500, 'PARSE_ERROR');
    }

    const lastTransaction = pagarmeData?.charges?.[0]?.last_transaction
    const checkoutUrl =
      lastTransaction?.url ||
      lastTransaction?.payment_url ||
      lastTransaction?.checkout_url ||
      pagarmeData?.checkouts?.[0]?.payment_url ||
      pagarmeData?.checkouts?.[0]?.url ||
      pagarmeData?.charges?.[0]?.url ||
      null

    if (!checkoutUrl) {
      console.error(`[${requestId}] Sem checkout URL na resposta:`, responseText.substring(0, 600))
      return errorResponse('URL de checkout não encontrada', 500, 'NO_CHECKOUT_URL');
    }

    const pagarmeOrderId = pagarmeData?.id || null
    console.log(`[${requestId}] ✅ Checkout criado: ${checkoutUrl.substring(0, 60)}...`)

    // Fire-and-forget: atualizar ordem com IDs do Pagar.me
    Promise.resolve(supabase.from('asaas_orders').update({
      asaas_payment_id: pagarmeOrderId,
      checkout_request_id: requestId,
      last_attempt_at: new Date().toISOString(),
    }).eq('id', orderId)).then(() => {}).catch(() => {})

    // Fire-and-forget: Meta CAPI InitiateCheckout
    if (sanitizedUtm || fbp || fbc) {
      const metaAccessToken = Deno.env.get('META_ACCESS_TOKEN')
      if (metaAccessToken) {
        fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            event_name: 'InitiateCheckout',
            value: Number(product.price),
            currency: 'BRL',
            utm_data: sanitizedUtm,
            fbp, fbc,
            event_id: `ic_v2_${orderId}`,
            event_source_url: 'https://arcanoapp.voxvisual.com.br/planos-upscaler-arcano',
            client_ip_address: clientIp,
            client_user_agent: clientUserAgent,
          }),
        }).catch(() => {})
      }
    }

    return new Response(JSON.stringify({
      checkout_url: checkoutUrl,
      order_id: orderId,
      request_id: requestId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error(`[${requestId}] Erro geral:`, err.message)

    // Mark order as failed if we have one
    if (orderId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        await supabase.from('asaas_orders').update({
          status: 'failed',
          gateway_error_message: err.message?.substring(0, 500),
          last_attempt_at: new Date().toISOString(),
        }).eq('id', orderId)
      } catch {}
    }

    const isTimeout = err.message?.includes('Timeout')
    return errorResponse(
      isTimeout ? 'Gateway de pagamento demorou demais. Tente novamente.' : 'Erro ao processar checkout',
      isTimeout ? 504 : 500,
      isTimeout ? 'TIMEOUT' : 'INTERNAL_ERROR'
    );
  }
})

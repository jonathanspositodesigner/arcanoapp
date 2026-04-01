/**
 * Edge Function: create-mp-checkout
 * PROXY → Redireciona todas as requisições para create-pagarme-checkout-v2.
 * Mantido ativo para compatibilidade com bundles cacheados (PWA/Service Worker).
 * Mapeia os campos do formato antigo (MP) para o formato novo (Pagar.me).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    // Mapear campos do formato antigo (MP) para o formato novo (Pagar.me v2)
    const mappedBody = {
      product_slug: body.product_slug,
      customer_name: body.user_name || body.customer_name || null,
      customer_email: body.user_email || body.customer_email || null,
      customer_document: body.user_document || body.customer_document || null,
      utm_data: body.utm_data || null,
      fbp: body.fbp || null,
      fbc: body.fbc || null,
    }

    console.log(`[mp-checkout-proxy] Redirecionando ${body.product_slug} → create-pagarme-checkout-v2`)

    // Proxy para a função Pagar.me v2
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const response = await fetch(`${supabaseUrl}/functions/v1/create-pagarme-checkout-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.get('Authorization') || '',
        'apikey': req.headers.get('apikey') || '',
        'x-forwarded-for': req.headers.get('x-forwarded-for') || '',
        'user-agent': req.headers.get('user-agent') || '',
      },
      body: JSON.stringify(mappedBody),
    })

    const responseText = await response.text()

    return new Response(responseText, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('[mp-checkout-proxy] Erro:', error)
    return new Response(JSON.stringify({ error: 'Erro interno no proxy de checkout' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

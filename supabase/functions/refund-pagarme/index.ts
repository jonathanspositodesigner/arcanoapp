/**
 * Edge Function: refund-pagarme
 * Admin-only: efetua reembolso via API Pagar.me e revoga acesso do usuário.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Auth: validate admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userId = claimsData.claims.sub as string

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { order_id } = await req.json()
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`🔄 [refund-pagarme] Admin ${userId} solicitou reembolso da ordem ${order_id}`)

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('asaas_orders')
      .select('*, mp_products(*)')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Ordem não encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (order.status === 'refunded') {
      return new Response(JSON.stringify({ error: 'Ordem já foi reembolsada' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const chargeId = order.asaas_payment_id
    if (!chargeId) {
      return new Response(JSON.stringify({ error: 'Charge ID não encontrado nesta ordem' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Call Pagar.me API to void/refund the charge
    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY')
    if (!pagarmeSecretKey) {
      return new Response(JSON.stringify({ error: 'PAGARME_SECRET_KEY não configurada' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const basicAuth = btoa(`${pagarmeSecretKey}:`)

    console.log(`   ├─ 💳 Chamando Pagar.me: POST /charges/${chargeId}/void`)

    const pagarmeResponse = await fetch(`https://api.pagar.me/core/v5/charges/${chargeId}/void`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    })

    const pagarmeBody = await pagarmeResponse.text()
    console.log(`   ├─ Pagar.me response: ${pagarmeResponse.status} - ${pagarmeBody}`)

    if (!pagarmeResponse.ok) {
      let errorMsg = `Erro Pagar.me (${pagarmeResponse.status})`
      try {
        const parsed = JSON.parse(pagarmeBody)
        errorMsg = parsed?.message || parsed?.errors?.[0]?.message || errorMsg
      } catch {}
      return new Response(JSON.stringify({ error: errorMsg }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`   ├─ ✅ Reembolso Pagar.me aceito`)

    // Revoke access
    const product = order.mp_products

    if (order.user_id && product?.pack_slug) {
      await supabase
        .from('user_pack_purchases')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', order.user_id)
        .eq('pack_slug', product.pack_slug)
      console.log(`   ├─ ✅ Acesso revogado: ${product.pack_slug}`)
    }

    if (order.user_id && product?.type === 'credits' && product?.credits_amount > 0) {
      const { error: revokeError } = await supabase.rpc('remove_lifetime_credits', {
        _user_id: order.user_id,
        _amount: product.credits_amount,
        _description: `Reembolso manual Pagar.me: ${product.title}`
      })
      if (revokeError) {
        console.error(`   ├─ ❌ Erro ao revogar créditos:`, revokeError)
      } else {
        console.log(`   ├─ ✅ Créditos revogados: ${product.credits_amount}`)
      }
    }

    // Update order status
    await supabase.from('asaas_orders').update({
      status: 'refunded',
      updated_at: new Date().toISOString()
    }).eq('id', order.id)

    // Log
    await supabase.from('webhook_logs').insert({
      platform: 'pagarme',
      event_type: 'manual_refund',
      transaction_id: `manual_refund_${order.id}_${Date.now()}`,
      status: 'refunded',
      email: order.user_email,
      product_name: product?.title,
      amount: Number(order.amount),
      raw_payload: { order_id, admin_user_id: userId, charge_id: chargeId },
    })

    console.log(`✅ [refund-pagarme] Reembolso concluído com sucesso`)

    return new Response(JSON.stringify({ success: true, message: 'Reembolso realizado com sucesso' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error(`❌ [refund-pagarme] Erro:`, error.message)
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

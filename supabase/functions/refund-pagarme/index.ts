/**
 * Edge Function: refund-pagarme
 * Admin-only: efetua reembolso via API Pagar.me e revoga acesso do usuário.
 * Requires admin password confirmation for security.
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

    const { order_id, admin_password } = await req.json()
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!admin_password) {
      return new Response(JSON.stringify({ error: 'Senha de confirmação é obrigatória' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify admin password using anonClient (NOT service role client to avoid corrupting its state)
    const { data: adminUser } = await supabase.auth.admin.getUserById(userId)
    if (!adminUser?.user?.email) {
      return new Response(JSON.stringify({ error: 'Admin user not found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const verifyClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: adminUser.user.email,
      password: admin_password,
    })
    if (signInError) {
      console.log(`❌ [refund-pagarme] Senha incorreta para admin ${userId}`)
      return new Response(JSON.stringify({ error: 'Senha incorreta. Reembolso negado.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`🔄 [refund-pagarme] Admin ${userId} solicitou reembolso da ordem ${order_id} (senha verificada)`)

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

    const paymentId = order.asaas_payment_id
    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'Payment ID não encontrado nesta ordem' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY')
    if (!pagarmeSecretKey) {
      return new Response(JSON.stringify({ error: 'PAGARME_SECRET_KEY não configurada' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const basicAuth = btoa(`${pagarmeSecretKey}:`)

    // Resolve charge ID - if payment_id is an order (or_), fetch charges from it
    let chargeId = paymentId
    if (paymentId.startsWith('or_')) {
      console.log(`   ├─ 🔍 Payment ID é um order (${paymentId}), buscando charges...`)
      const orderResponse = await fetch(`https://api.pagar.me/core/v5/orders/${paymentId}`, {
        headers: { 'Authorization': `Basic ${basicAuth}` },
      })
      if (orderResponse.ok) {
        const orderData = await orderResponse.json()
        const charges = orderData?.charges
        if (charges && charges.length > 0) {
          chargeId = charges[0].id
          console.log(`   ├─ ✅ Charge encontrada: ${chargeId} (status: ${charges[0].status})`)
        } else {
          return new Response(JSON.stringify({ error: 'Nenhuma charge encontrada nesta ordem Pagar.me' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else {
        const errBody = await orderResponse.text()
        console.error(`   ├─ ❌ Erro ao buscar order Pagar.me: ${orderResponse.status} - ${errBody}`)
        return new Response(JSON.stringify({ error: `Erro ao buscar ordem no Pagar.me (${orderResponse.status})` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Check current charge status
    let alreadyRefunded = false
    console.log(`   ├─ 🔍 Verificando status da charge ${chargeId}`)
    const checkResponse = await fetch(`https://api.pagar.me/core/v5/charges/${chargeId}`, {
      headers: { 'Authorization': `Basic ${basicAuth}` },
    })

    if (checkResponse.ok) {
      const chargeData = await checkResponse.json()
      const chargeStatus = chargeData?.status
      console.log(`   ├─ Status atual da charge: ${chargeStatus}`)
      if (['voided', 'refunded', 'canceled'].includes(chargeStatus)) {
        alreadyRefunded = true
        console.log(`   ├─ ⚠️ Charge já estornada no Pagar.me (${chargeStatus}). Prosseguindo com atualização local.`)
      }
    }

    if (!alreadyRefunded) {
      console.log(`   ├─ 💳 Chamando Pagar.me: DELETE /charges/${chargeId}`)
      const pagarmeResponse = await fetch(`https://api.pagar.me/core/v5/charges/${chargeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
      })

      const pagarmeBody = await pagarmeResponse.text()
      console.log(`   ├─ Pagar.me response: ${pagarmeResponse.status} - ${pagarmeBody}`)

      if (!pagarmeResponse.ok) {
        let detectedAlreadyRefunded = false
        try {
          const parsed = JSON.parse(pagarmeBody)
          const st = parsed?.status || parsed?.last_transaction?.status
          if (['voided', 'refunded', 'canceled'].includes(st) ||
              pagarmeBody.toLowerCase().includes('already') ||
              pagarmeBody.toLowerCase().includes('voided')) {
            detectedAlreadyRefunded = true
          }
        } catch {}

        if (detectedAlreadyRefunded) {
          alreadyRefunded = true
          console.log(`   ├─ ⚠️ API retornou erro mas charge já estornada. Prosseguindo com atualização local.`)
        } else {
          let errorMsg = `Erro Pagar.me (${pagarmeResponse.status})`
          try {
            const parsed = JSON.parse(pagarmeBody)
            errorMsg = parsed?.message || parsed?.errors?.[0]?.message || errorMsg
          } catch {}
          return new Response(JSON.stringify({ error: errorMsg }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      } else {
        console.log(`   ├─ ✅ Reembolso Pagar.me aceito`)
      }
    }

    // Revoke access
    const product = order.mp_products
    console.log(`   ├─ 📦 Produto: ${JSON.stringify({ type: product?.type, credits_amount: product?.credits_amount, pack_slug: product?.pack_slug, title: product?.title })}`)
    console.log(`   ├─ 👤 user_id da ordem: ${order.user_id}`)

    if (order.user_id && product?.pack_slug) {
      await supabase
        .from('user_pack_purchases')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', order.user_id)
        .eq('pack_slug', product.pack_slug)
      console.log(`   ├─ ✅ Acesso revogado: ${product.pack_slug}`)

      const REFUND_BUNDLE_EXTRA_PACKS: Record<string, string[]> = {
        'pack4lancamento': ['pack-de-sao-joao'],
        'combo-1e2-1ano': ['pack-arcano-vol-2'],
        'combo-1ao3-vitalicio': ['pack-arcano-vol-2', 'pack-arcano-vol-3']
      }
      const extraSlugs = REFUND_BUNDLE_EXTRA_PACKS[product.slug] || []
      for (const extraSlug of extraSlugs) {
        await supabase
          .from('user_pack_purchases')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', order.user_id)
          .eq('pack_slug', extraSlug)
        console.log(`   ├─ ✅ Bundle: acesso extra revogado: ${extraSlug}`)
      }
    }

    if (order.user_id && product?.type === 'credits' && product?.credits_amount > 0) {
      console.log(`   ├─ 🔄 Revogando ${product.credits_amount} créditos lifetime do usuário ${order.user_id}...`)
      const { data: revokeData, error: revokeError } = await supabase.rpc('revoke_lifetime_credits_on_refund', {
        _user_id: order.user_id,
        _amount: product.credits_amount,
        _description: `Reembolso manual Pagar.me: ${product.title}`
      })
      if (revokeError) {
        console.error(`   ├─ ❌ Erro de transporte ao revogar créditos:`, revokeError)
        return new Response(JSON.stringify({ error: `Falha ao revogar créditos: ${revokeError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const revokeResult = revokeData?.[0] || revokeData
      if (!revokeResult?.success) {
        console.error(`   ├─ ❌ Revogação falhou:`, revokeResult)
        return new Response(JSON.stringify({ error: `Falha ao revogar créditos: ${revokeResult?.error_message || 'Erro desconhecido'}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      console.log(`   ├─ ✅ Créditos revogados: ${revokeResult.amount_revoked} (novo saldo: ${revokeResult.new_balance})`)
    } else {
      console.log(`   ├─ ⚠️ Sem créditos para revogar (user_id: ${!!order.user_id}, type: ${product?.type}, credits_amount: ${product?.credits_amount})`)
    }

    // === LANDING BUNDLE REVOCATION ===
    if (order.user_id && product?.type === 'landing_bundle') {
      console.log(`   ├─ 📋 Revogando landing_bundle...`)

      // Revoke lifetime credits
      if (product.credits_amount > 0) {
        console.log(`   ├─ 🔄 Revogando ${product.credits_amount} créditos lifetime...`)
        const { data: revokeData, error: revokeError } = await supabase.rpc('revoke_lifetime_credits_on_refund', {
          _user_id: order.user_id,
          _amount: product.credits_amount,
          _description: `Reembolso manual landing_bundle: ${product.title}`
        })
        if (revokeError) {
          console.error(`   ├─ ❌ Erro ao revogar créditos:`, revokeError)
          return new Response(JSON.stringify({ error: `Falha ao revogar créditos: ${revokeError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const revokeResult = revokeData?.[0] || revokeData
        if (!revokeResult?.success) {
          console.error(`   ├─ ❌ Revogação falhou:`, revokeResult)
          return new Response(JSON.stringify({ error: `Falha ao revogar créditos: ${revokeResult?.error_message || 'Erro desconhecido'}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        console.log(`   ├─ ✅ Créditos revogados: ${revokeResult.amount_revoked} (novo saldo: ${revokeResult.new_balance})`)
      }

      // Reset to free plan
      await supabase.from('planos2_subscriptions').upsert({
        user_id: order.user_id,
        plan_slug: 'free',
        is_active: true,
        credits_per_month: 100,
        daily_prompt_limit: 5,
        has_image_generation: false,
        has_video_generation: false,
        cost_multiplier: 1.0,
        expires_at: null,
        pagarme_subscription_id: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      console.log(`   ├─ ✅ Landing bundle revogado → free`)
    }

    // === SUBSCRIPTION PLAN REVOCATION ===
    if (order.user_id && product?.type === 'subscription') {
      console.log(`   ├─ 📋 Revogando plano de assinatura...`)

      // Cancel the subscription on Pagar.me if exists
      const subId = order.pagarme_subscription_id
      if (subId) {
        console.log(`   ├─ 🔄 Cancelando subscription ${subId} no Pagar.me...`)
        try {
          const cancelResponse = await fetch(`https://api.pagar.me/core/v5/subscriptions/${subId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Basic ${basicAuth}` },
          })
          const cancelBody = await cancelResponse.text()
          console.log(`   ├─ Pagar.me cancel response: ${cancelResponse.status} - ${cancelBody.substring(0, 200)}`)
          if (cancelResponse.ok) {
            console.log(`   ├─ ✅ Subscription cancelada no Pagar.me`)
          } else {
            console.warn(`   ├─ ⚠️ Erro ao cancelar subscription (não-bloqueante): ${cancelResponse.status}`)
          }
        } catch (cancelErr: any) {
          console.warn(`   ├─ ⚠️ Erro ao cancelar subscription: ${cancelErr.message}`)
        }
      }

      // Reset to free plan
      await supabase.from('planos2_subscriptions').upsert({
        user_id: order.user_id,
        plan_slug: 'free',
        is_active: true,
        credits_per_month: 100,
        daily_prompt_limit: 5,
        has_image_generation: false,
        has_video_generation: false,
        cost_multiplier: 1.0,
        expires_at: null,
        pagarme_subscription_id: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Zero out monthly credits
      const { error: zeroError } = await supabase.rpc('reset_upscaler_credits', {
        _user_id: order.user_id,
        _amount: 0,
        _description: `Reembolso manual Pagar.me: plano revogado → free`
      })
      if (zeroError) {
        console.error(`   ├─ ❌ Erro ao zerar créditos:`, zeroError)
        return new Response(JSON.stringify({ error: `Falha ao zerar créditos: ${zeroError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      console.log(`   ├─ ✅ Plano revogado → free, créditos mensais zerados`)
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
      raw_payload: { order_id, admin_user_id: userId, charge_id: chargeId, already_refunded: alreadyRefunded },
    })

    const msg = alreadyRefunded
      ? 'Venda já estava reembolsada no Pagar.me. Status local atualizado e acesso revogado.'
      : 'Reembolso realizado com sucesso'
    console.log(`✅ [refund-pagarme] Reembolso concluído com sucesso (already_refunded: ${alreadyRefunded})`)

    return new Response(JSON.stringify({ success: true, already_refunded: alreadyRefunded, message: msg }), {
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

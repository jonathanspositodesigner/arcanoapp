/**
 * Edge Function: webhook-mercadopago
 * Recebe notificações do Mercado Pago, valida o pagamento e libera acesso.
 * Reutiliza a mesma lógica do webhook-greenn-artes para criação de usuário e acesso.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID().slice(0, 8)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')

    if (!mpAccessToken) {
      console.error(`[${requestId}] MERCADOPAGO_ACCESS_TOKEN não configurado`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse do body - MP pode enviar como query params ou JSON
    let body: any = {}
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      body = await req.json()
    } else {
      const text = await req.text()
      try { body = JSON.parse(text) } catch { body = {} }
    }

    // Também checar query params (MP às vezes envia assim)
    const url = new URL(req.url)
    const queryType = url.searchParams.get('type') || url.searchParams.get('topic')
    const queryDataId = url.searchParams.get('data.id') || url.searchParams.get('id')

    const notificationType = body.type || body.topic || queryType
    const paymentId = body.data?.id || queryDataId

    console.log(`\n🔔 [${requestId}] WEBHOOK MERCADO PAGO`)
    console.log(`   ├─ type: ${notificationType}`)
    console.log(`   ├─ payment_id: ${paymentId}`)

    // Só processar notificações de pagamento
    if (notificationType !== 'payment' && notificationType !== 'merchant_order') {
      console.log(`   ├─ ⏭️ Tipo ignorado: ${notificationType}`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    if (!paymentId) {
      console.log(`   ├─ ⏭️ Sem payment_id`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Buscar detalhes do pagamento na API do Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com.br/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` }
    })

    if (!paymentResponse.ok) {
      console.error(`   ├─ ❌ Erro ao buscar pagamento: ${paymentResponse.status}`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const payment = await paymentResponse.json()

    const paymentStatus = payment.status // approved, pending, rejected, refunded, etc
    const externalReference = payment.external_reference // = mp_orders.id
    const payerEmail = payment.payer?.email?.toLowerCase().trim()
    const paymentAmount = payment.transaction_amount

    console.log(`   ├─ status: ${paymentStatus}`)
    console.log(`   ├─ external_reference: ${externalReference}`)
    console.log(`   ├─ payer_email: ${payerEmail}`)
    console.log(`   ├─ amount: ${paymentAmount}`)

    if (!externalReference) {
      console.log(`   ├─ ⏭️ Sem external_reference`)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    // Buscar ordem interna
    const { data: order, error: orderError } = await supabase
      .from('mp_orders')
      .select('*, mp_products(*)')
      .eq('id', externalReference)
      .single()

    if (orderError || !order) {
      console.error(`   ├─ ❌ Ordem não encontrada: ${externalReference}`, orderError)
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    const product = order.mp_products
    console.log(`   ├─ produto: ${product?.title}`)
    console.log(`   ├─ ordem status atual: ${order.status}`)

    // =============================================
    // PAGAMENTO APROVADO
    // =============================================
    if (paymentStatus === 'approved' && order.status === 'pending') {
      console.log(`\n✅ [${requestId}] PAGAMENTO APROVADO - Processando...`)

      const email = order.user_email

      // 1. Criar ou buscar usuário (mesma lógica do webhook-greenn-artes)
      let userId: string | null = null

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, password: email, email_confirm: true
      })

      if (createError) {
        if (createError.message?.includes('email') || createError.code === 'email_exists') {
          // Buscar existente via profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .maybeSingle()

          if (profile) {
            userId = profile.id
            console.log(`   ├─ 👤 Usuário existente (profile): ${userId}`)
          } else {
            // Busca paginada em auth.users
            let page = 1
            while (!userId && page <= 10) {
              const { data: usersPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
              const found = usersPage?.users?.find((u: any) => u.email?.toLowerCase() === email)
              if (found) userId = found.id
              if (!usersPage?.users?.length || usersPage.users.length < 1000) break
              page++
            }
            if (userId) {
              console.log(`   ├─ 👤 Usuário existente (auth): ${userId}`)
            }
          }

          if (!userId) {
            console.error(`   ├─ ❌ Usuário existe mas não encontrado`)
            await supabase.from('mp_orders').update({
              status: 'error',
              updated_at: new Date().toISOString()
            }).eq('id', order.id)
            return new Response('OK', { status: 200, headers: corsHeaders })
          }
        } else {
          throw createError
        }
      } else {
        userId = newUser.user.id
        console.log(`   ├─ ✅ Novo usuário criado: ${userId}`)
      }

      // 2. Upsert profile
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        password_changed: false,
        email_verified: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      console.log(`   ├─ ✅ Profile atualizado`)

      // 3. Processar de acordo com o tipo do produto
      if (product.type === 'pack' && product.pack_slug) {
        // Verificar se já tem acesso
        const { data: existingPurchase } = await supabase
          .from('user_pack_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('pack_slug', product.pack_slug)
          .eq('is_active', true)
          .maybeSingle()

        if (!existingPurchase) {
          await supabase.from('user_pack_purchases').insert({
            user_id: userId,
            pack_slug: product.pack_slug,
            access_type: product.access_type || 'vitalicio',
            has_bonus_access: true,
            expires_at: null,
            product_name: product.title,
            platform: 'mercadopago'
          })
          console.log(`   ├─ ✅ Acesso concedido: ${product.pack_slug} (${product.access_type})`)
        } else {
          console.log(`   ├─ ℹ️ Acesso já existente: ${product.pack_slug}`)
        }
      }

      if (product.type === 'credits' && product.credits_amount > 0) {
        const { error: creditsError } = await supabase.rpc('add_lifetime_credits', {
          _user_id: userId,
          _amount: product.credits_amount,
          _description: `Compra MP: ${product.title}`
        })
        if (creditsError) {
          console.error(`   ├─ ❌ Erro ao adicionar créditos:`, creditsError)
        } else {
          console.log(`   ├─ ✅ +${product.credits_amount} créditos adicionados`)
        }
      }

      // 4. Atualizar ordem
      await supabase.from('mp_orders').update({
        status: 'paid',
        user_id: userId,
        mp_payment_id: String(paymentId),
        updated_at: new Date().toISOString()
      }).eq('id', order.id)

      console.log(`\n✅ [${requestId}] PROCESSAMENTO CONCLUÍDO COM SUCESSO`)
    }

    // =============================================
    // REEMBOLSO
    // =============================================
    else if ((paymentStatus === 'refunded' || paymentStatus === 'cancelled' || paymentStatus === 'charged_back') && order.status === 'paid') {
      console.log(`\n🚫 [${requestId}] REEMBOLSO/CHARGEBACK - Revogando acesso...`)

      if (order.user_id && product.pack_slug) {
        await supabase
          .from('user_pack_purchases')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', order.user_id)
          .eq('pack_slug', product.pack_slug)
        
        console.log(`   ├─ ✅ Acesso revogado: ${product.pack_slug}`)
      }

      await supabase.from('mp_orders').update({
        status: 'refunded',
        updated_at: new Date().toISOString()
      }).eq('id', order.id)
    }

    // Outros status (pending, in_process, rejected)
    else {
      console.log(`   ├─ ℹ️ Status ${paymentStatus} / ordem ${order.status} - sem ação`)
    }

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO:`, error)
    return new Response('OK', { status: 200, headers: corsHeaders })
  }
})

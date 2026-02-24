/**
 * Webhook Greenn - Planos v2 (/planos-2)
 * 
 * Completamente SEPARADO dos webhooks existentes.
 * Processa apenas produtos dos novos planos.
 * 
 * Produto 160732 = Starter (1.800 créditos/mês, 5 prompts premium/dia)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeamento de produtos → configuração do plano
const PLANOS2_PRODUCTS: Record<number, {
  slug: string;
  credits_per_month: number;
  daily_prompt_limit: number | null;
  has_image_generation: boolean;
  has_video_generation: boolean;
}> = {
  160732: {
    slug: 'starter',
    credits_per_month: 1800,
    daily_prompt_limit: 5,
    has_image_generation: false,
    has_video_generation: false,
  },
  // Futuros planos serão adicionados aqui
}

async function isEmailBlacklisted(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('blacklisted_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  return !!data
}

async function findOrCreateUser(
  supabase: any,
  email: string,
  clientName: string,
  requestId: string
): Promise<{ userId: string | null; isNewUser: boolean }> {
  console.log(`   ├─ [${requestId}] 🔍 Tentando criar/buscar usuário: ${email}`)

  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: email,
    email_confirm: true,
  })

  if (newUser?.user) {
    console.log(`   ├─ [${requestId}] ✅ Novo usuário criado: ${newUser.user.id}`)
    
    // Create profile
    await supabase.from('profiles').upsert({
      id: newUser.user.id,
      email: email.toLowerCase(),
      name: clientName || email.split('@')[0],
      email_verified: true,
      password_changed: false,
    }, { onConflict: 'id' })

    return { userId: newUser.user.id, isNewUser: true }
  }

  if (createError?.message?.includes('already been registered') ||
      createError?.message?.includes('email_exists') ||
      createError?.message?.includes('already exists')) {
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (profile?.id) {
      console.log(`   ├─ [${requestId}] ✅ Usuário encontrado: ${profile.id}`)
      return { userId: profile.id, isNewUser: false }
    }

    // Fallback: paginated search
    for (let page = 1; page <= 10; page++) {
      const { data: usersPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
      if (!usersPage?.users?.length) break
      const found = usersPage.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
      if (found) {
        console.log(`   ├─ [${requestId}] ✅ Usuário encontrado via auth: ${found.id}`)
        return { userId: found.id, isNewUser: false }
      }
    }
  }

  console.log(`   ├─ [${requestId}] ❌ Erro: ${createError?.message}`)
  return { userId: null, isNewUser: false }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const requestId = crypto.randomUUID().substring(0, 8)
  console.log(`\n🔔 [${requestId}] webhook-greenn-planos2 recebido`)

  try {
    const payload = await req.json()
    
    const status = payload.status || payload.sale_status_enum
    const productId = payload.product?.id || payload.prod
    const contractId = payload.contract_id || payload.subscription?.id || null
    const email = (payload.client?.email || payload.email || '').trim().toLowerCase()
    const clientName = payload.client?.name || payload.name || ''

    console.log(`   ├─ [${requestId}] Status: ${status}, Produto: ${productId}, Email: ${email}`)

    // Only process approved sales
    if (!['approved', 'completed', 'paid'].includes(String(status).toLowerCase())) {
      console.log(`   └─ [${requestId}] ⏭️ Status ignorado: ${status}`)
      return new Response(JSON.stringify({ success: true, action: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if product is a planos2 product
    const planConfig = PLANOS2_PRODUCTS[Number(productId)]
    if (!planConfig) {
      console.log(`   └─ [${requestId}] ⏭️ Produto ${productId} não é planos2`)
      return new Response(JSON.stringify({ success: true, action: 'not_planos2_product' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!email) {
      console.log(`   └─ [${requestId}] ❌ Email não fornecido`)
      return new Response(JSON.stringify({ success: false, error: 'Email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Log webhook
    await supabase.from('webhook_logs').insert({
      source: 'greenn_planos2',
      event_type: status,
      payload,
      email,
      product_id: productId,
      greenn_contract_id: contractId,
    })

    // Check blacklist
    if (await isEmailBlacklisted(supabase, email)) {
      console.log(`   └─ [${requestId}] 🚫 Email blacklisted: ${email}`)
      return new Response(JSON.stringify({ success: true, action: 'blacklisted' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Idempotency check via contract_id
    if (contractId) {
      const { data: existingLog } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('greenn_contract_id', String(contractId))
        .eq('source', 'greenn_planos2')
        .eq('status', 'success')
        .maybeSingle()

      if (existingLog) {
        console.log(`   └─ [${requestId}] ⏭️ Contrato já processado: ${contractId}`)
        return new Response(JSON.stringify({ success: true, action: 'already_processed' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Find or create user
    const { userId, isNewUser } = await findOrCreateUser(supabase, email, clientName, requestId)
    if (!userId) {
      console.log(`   └─ [${requestId}] ❌ Falha ao criar/buscar usuário`)
      return new Response(JSON.stringify({ success: false, error: 'User creation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Upsert planos2 subscription
    const { error: subError } = await supabase
      .from('planos2_subscriptions')
      .upsert({
        user_id: userId,
        plan_slug: planConfig.slug,
        is_active: true,
        credits_per_month: planConfig.credits_per_month,
        daily_prompt_limit: planConfig.daily_prompt_limit,
        has_image_generation: planConfig.has_image_generation,
        has_video_generation: planConfig.has_video_generation,
        greenn_product_id: Number(productId),
        greenn_contract_id: contractId ? String(contractId) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (subError) {
      console.error(`   ├─ [${requestId}] ❌ Erro ao salvar subscription:`, subError)
    } else {
      console.log(`   ├─ [${requestId}] ✅ Subscription salva: ${planConfig.slug}`)
    }

    // Grant monthly credits via reset (non-cumulative)
    const { data: resetResult, error: resetError } = await supabase.rpc('reset_upscaler_credits', {
      _user_id: userId,
      _amount: planConfig.credits_per_month,
      _description: `Créditos mensais - Plano ${planConfig.slug.charAt(0).toUpperCase() + planConfig.slug.slice(1)} (${planConfig.credits_per_month}/mês)`,
    })

    if (resetError) {
      console.error(`   ├─ [${requestId}] ❌ Erro ao conceder créditos:`, resetError)
    } else {
      console.log(`   ├─ [${requestId}] ✅ ${planConfig.credits_per_month} créditos mensais concedidos`)
    }

    // Mark webhook as success
    if (contractId) {
      await supabase
        .from('webhook_logs')
        .update({ status: 'success' })
        .eq('greenn_contract_id', String(contractId))
        .eq('source', 'greenn_planos2')
    }

    console.log(`   └─ [${requestId}] ✅ Plano ${planConfig.slug} ativado para ${email}`)

    return new Response(JSON.stringify({ 
      success: true, 
      plan: planConfig.slug,
      credits: planConfig.credits_per_month,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error(`   └─ [${requestId}] ❌ Erro:`, error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

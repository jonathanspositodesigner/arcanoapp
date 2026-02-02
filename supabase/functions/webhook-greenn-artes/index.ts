import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface para mapeamento de produtos por ID
interface ProductMapping {
  packSlug: string
  accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio'
  hasBonusAccess: boolean
  isFerramentaIA?: boolean
}

// Interface para promoções
interface PromotionMapping {
  promotionId: string
  promotionSlug: string
  hasBonusAccess: boolean
  items: Array<{
    packSlug: string
    accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio'
  }>
}

// Mapeamento LEGADO
const LEGACY_PRODUCT_ID_MAPPING: Record<number, ProductMapping> = {
  89608: { packSlug: 'pack-arcano-vol-1', accessType: '6_meses', hasBonusAccess: false },
  89595: { packSlug: 'pack-arcano-vol-1', accessType: '1_ano', hasBonusAccess: true },
  92417: { packSlug: 'pack-arcano-vol-1', accessType: 'vitalicio', hasBonusAccess: true },
  149334: { packSlug: 'pack-arcano-vol-1', accessType: 'vitalicio', hasBonusAccess: true },
  115168: { packSlug: 'pack-arcano-vol-2', accessType: '6_meses', hasBonusAccess: false },
  115163: { packSlug: 'pack-arcano-vol-2', accessType: '1_ano', hasBonusAccess: true },
  115171: { packSlug: 'pack-arcano-vol-2', accessType: 'vitalicio', hasBonusAccess: true },
  149342: { packSlug: 'pack-arcano-vol-2', accessType: 'vitalicio', hasBonusAccess: true },
}

// Textos de email por idioma
const emailTexts = {
  pt: {
    greeting: 'Olá',
    accessData: '📋 Dados do seu primeiro acesso:',
    email: 'Email',
    password: 'Senha',
    securityWarning: 'Por segurança, você deverá trocar sua senha no primeiro acesso.',
    clickButtonArtes: 'Clique no botão acima para fazer seu primeiro login e começar a explorar artes editáveis em PSD e Canva!',
    clickButtonIA: 'Clique no botão acima para fazer seu primeiro login e começar a usar sua ferramenta de IA!',
    copyrightArtes: '© Biblioteca de Artes Arcanas',
    copyrightIA: '© Ferramentas IA Arcanas',
    important: 'Importante'
  },
  es: {
    greeting: 'Hola',
    accessData: '📋 Datos de tu primer acceso:',
    email: 'Email',
    password: 'Contraseña',
    securityWarning: 'Por seguridad, deberás cambiar tu contraseña en el primer acceso.',
    clickButtonArtes: '¡Haz clic en el botón de arriba para iniciar sesión y explorar artes editables en PSD y Canva!',
    clickButtonIA: '¡Haz clic en el botón de arriba para iniciar sesión y usar tu herramienta de IA!',
    copyrightArtes: '© Biblioteca de Artes Arcanas',
    copyrightIA: '© Herramientas IA Arcanas',
    important: 'Importante'
  }
}

function extractUtmSource(payload: any): string | null {
  const saleMetas = payload.saleMetas || []
  for (const meta of saleMetas) {
    if (meta.meta_key === 'utm_source') {
      return meta.meta_value || null
    }
  }
  return null
}

function extractLocale(payload: any): 'pt' | 'es' {
  const saleMetas = payload.saleMetas || []
  for (const meta of saleMetas) {
    if (meta.meta_key === 'utm_locale' && meta.meta_value === 'es') {
      return 'es'
    }
  }
  return 'pt'
}

function isFromApp(payload: any): boolean {
  const utmSource = extractUtmSource(payload)
  return utmSource?.toLowerCase() === 'aplicativo'
}

async function isEmailBlacklisted(supabase: any, email: string): Promise<boolean> {
  const { data } = await supabase
    .from('blacklisted_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  return !!data
}

async function addToBlacklist(supabase: any, email: string, reason: string, requestId: string): Promise<void> {
  try {
    await supabase.from('blacklisted_emails').upsert({
      email: email.toLowerCase(),
      reason,
      auto_blocked: true,
      blocked_at: new Date().toISOString()
    }, { onConflict: 'email' })
    console.log(`   ├─ [${requestId}] 🚫 Email adicionado à blacklist: ${email} (${reason})`)
  } catch (e) {
    console.error(`   ├─ [${requestId}] ❌ Erro ao adicionar à blacklist:`, e)
  }
}

async function findPromotionMappingInDatabase(supabase: any, productId: number, requestId: string): Promise<PromotionMapping | null> {
  const { data: promotion, error } = await supabase
    .from('artes_promotions')
    .select('id, slug, has_bonus_access, greenn_product_id')
    .eq('greenn_product_id', productId)
    .eq('is_active', true)
    .maybeSingle()
  
  if (error || !promotion) return null

  const { data: items } = await supabase
    .from('artes_promotion_items')
    .select('pack_slug, access_type')
    .eq('promotion_id', promotion.id)

  if (!items?.length) return null

  console.log(`   ├─ [${requestId}] ✅ PROMOÇÃO encontrada: ${promotion.slug} (${items.length} packs)`)

  return {
    promotionId: promotion.id,
    promotionSlug: promotion.slug,
    hasBonusAccess: promotion.has_bonus_access,
    items: items.map((item: any) => ({
      packSlug: item.pack_slug,
      accessType: item.access_type
    }))
  }
}

async function findProductMappingInDatabase(supabase: any, productId: number, requestId: string): Promise<ProductMapping | null> {
  const { data: packs, error } = await supabase
    .from('artes_packs')
    .select('slug, type, greenn_product_id_6_meses, greenn_product_id_1_ano, greenn_product_id_order_bump, greenn_product_id_vitalicio')
  
  if (error) return null

  for (const pack of packs || []) {
    const isFerramentaIA = pack.type === 'ferramentas_ia'
    
    if (pack.greenn_product_id_6_meses === productId) {
      console.log(`   ├─ [${requestId}] ✅ PACK: ${pack.slug} (6_meses)`)
      return { packSlug: pack.slug, accessType: '6_meses', hasBonusAccess: false, isFerramentaIA }
    }
    if (pack.greenn_product_id_1_ano === productId) {
      console.log(`   ├─ [${requestId}] ✅ PACK: ${pack.slug} (1_ano)`)
      return { packSlug: pack.slug, accessType: '1_ano', hasBonusAccess: true, isFerramentaIA }
    }
    if (pack.greenn_product_id_order_bump === productId || pack.greenn_product_id_vitalicio === productId) {
      console.log(`   ├─ [${requestId}] ✅ PACK: ${pack.slug} (vitalicio)`)
      return { packSlug: pack.slug, accessType: 'vitalicio', hasBonusAccess: true, isFerramentaIA }
    }
  }

  return null
}

function calculateExpirationDate(accessType: string): Date | null {
  if (accessType === 'vitalicio') return null
  
  const expiresAt = new Date()
  if (accessType === '3_meses') expiresAt.setMonth(expiresAt.getMonth() + 3)
  else if (accessType === '6_meses') expiresAt.setMonth(expiresAt.getMonth() + 6)
  else if (accessType === '1_ano') expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  
  return expiresAt
}

async function processPackPurchase(
  supabase: any,
  userId: string,
  packSlug: string,
  accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio',
  hasBonusAccess: boolean,
  contractId: string | undefined,
  productName: string,
  platform: string,
  requestId: string
): Promise<void> {
  const expiresAt = calculateExpirationDate(accessType)
  
  const { data: existingPurchase } = await supabase
    .from('user_pack_purchases')
    .select('id, expires_at, access_type, has_bonus_access')
    .eq('user_id', userId)
    .eq('pack_slug', packSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (existingPurchase) {
    const accessPriority: Record<string, number> = { '3_meses': 1, '6_meses': 2, '1_ano': 3, 'vitalicio': 4 }
    const currentPriority = accessPriority[existingPurchase.access_type] || 0
    const newPriority = accessPriority[accessType] || 0
    
    if (newPriority >= currentPriority) {
      let newExpiresAt = expiresAt
      
      if (accessType !== 'vitalicio' && existingPurchase.access_type !== 'vitalicio' && existingPurchase.expires_at) {
        const currentExpires = new Date(existingPurchase.expires_at)
        const now = new Date()
        
        if (currentExpires > now && expiresAt) {
          newExpiresAt = new Date(currentExpires)
          if (accessType === '3_meses') newExpiresAt.setMonth(newExpiresAt.getMonth() + 3)
          else if (accessType === '6_meses') newExpiresAt.setMonth(newExpiresAt.getMonth() + 6)
          else if (accessType === '1_ano') newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1)
        }
      }

      await supabase
        .from('user_pack_purchases')
        .update({
          access_type: accessType,
          has_bonus_access: hasBonusAccess || existingPurchase.has_bonus_access,
          expires_at: newExpiresAt ? newExpiresAt.toISOString() : null,
          greenn_contract_id: contractId,
          product_name: productName,
          platform: platform,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPurchase.id)
      
      console.log(`   ├─ [${requestId}] ✅ Pack ATUALIZADO: ${packSlug}`)
    }
  } else {
    await supabase
      .from('user_pack_purchases')
      .insert({
        user_id: userId,
        pack_slug: packSlug,
        access_type: accessType,
        has_bonus_access: hasBonusAccess,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        greenn_contract_id: contractId,
        product_name: productName,
        platform: platform
      })
    
    console.log(`   ├─ [${requestId}] ✅ Pack CRIADO: ${packSlug}`)
  }
}

async function sendWelcomeEmail(supabase: any, email: string, name: string, packInfo: string, requestId: string, isFerramentaIA: boolean = false, locale: 'pt' | 'es' = 'pt'): Promise<void> {
  const t = emailTexts[locale]
  const platform = isFerramentaIA ? 'ferramentas_ia' : 'artes'
  
  // Gerar dedup_key: email|product|YYYYMMDDHHMM
  const now = new Date()
  const dedupMinute = now.toISOString().slice(0, 16).replace(/[-T:]/g, '') // YYYYMMDDHHMM
  const dedupKey = `${email}|${packInfo}|${dedupMinute}`
  const trackingId = crypto.randomUUID()
  
  try {
    // PASSO 1: Tentar INSERT primeiro (atômico) - quem conseguir primeiro ganha
    const { data: inserted, error: insertError } = await supabase
      .from('welcome_email_logs')
      .insert({
        email,
        name,
        platform,
        product_info: packInfo,
        status: 'pending',
        tracking_id: trackingId,
        template_used: 'default',
        locale,
        dedup_key: dedupKey
      })
      .select('id, tracking_id')
      .single()
    
    // Se falhou por duplicata (unique constraint), ignorar silenciosamente
    if (insertError?.code === '23505') {
      console.log(`   ├─ [${requestId}] ⏭️ Email duplicado bloqueado por constraint`)
      return
    }
    
    if (insertError) {
      console.log(`   ├─ [${requestId}] ❌ Erro ao inserir log: ${insertError.message}`)
      return
    }
    
    const logId = inserted.id
    console.log(`   ├─ [${requestId}] 🔒 Lock obtido (dedup_key: ${dedupKey.slice(-20)})`)
    
    // PASSO 2: Enviar email (apenas quem conseguiu o INSERT)
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    
    if (!clientId || !clientSecret) {
      console.log(`   ├─ [${requestId}] ⚠️ SendPulse não configurado`)
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: 'SendPulse não configurado' }).eq('id', logId)
      return
    }

    const templatePlatform = isFerramentaIA ? 'ferramentas_ia' : 'artes'
    const { data: template } = await supabase
      .from('welcome_email_templates')
      .select('*')
      .eq('platform', templatePlatform)
      .eq('locale', locale)
      .eq('is_active', true)
      .maybeSingle()

    const defaultContent = isFerramentaIA 
      ? { heading: 'Sua Ferramenta de IA está Ativada!', intro: 'Sua compra foi confirmada!', button_text: 'Acessar Ferramenta', footer: 'Dúvidas? Responda este email!' }
      : { heading: 'Bem-vindo à Biblioteca de Artes!', intro: 'Sua compra foi confirmada!', button_text: 'Acessar Plataforma', footer: 'Dúvidas? Responda este email!' }
    
    let templateContent = { ...defaultContent }
    if (template?.content) {
      try { templateContent = JSON.parse(template.content) } catch (e) {}
    }

    const subject = template?.subject || '🎨 Bem-vindo - Seu acesso está pronto!'
    const senderName = template?.sender_name || 'Biblioteca de Artes'
    const senderEmail = template?.sender_email || 'contato@voxvisual.com.br'
    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const platformUrl = isFerramentaIA ? 'https://arcanoapp.voxvisual.com.br/ferramentas-ia' : 'https://arcanolab.voxvisual.com.br/login-artes'
    const clickTrackingUrl = `${trackingBaseUrl}?id=${trackingId}&action=click&redirect=${encodeURIComponent(platformUrl)}`

    const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    })

    if (!tokenResponse.ok) {
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: 'Falha ao obter token SendPulse' }).eq('id', logId)
      return
    }

    const { access_token } = await tokenResponse.json()

    const welcomeHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;background:#f4f4f4;padding:20px}.container{max-width:600px;margin:0 auto;background:white;padding:40px;border-radius:12px}h1{color:#d4af37;text-align:center}.cta-button{display:block;background:#d4af37;color:white;text-align:center;padding:16px;border-radius:8px;text-decoration:none;margin:20px 0}.credentials{background:#fefce8;padding:20px;border-radius:8px;margin:20px 0}</style></head><body><div class="container"><h1>${isFerramentaIA ? '🤖' : '🎨'} ${templateContent.heading}</h1><p>${t.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p><p>${templateContent.intro}</p><div class="credentials"><h3>${t.accessData}</h3><p><strong>${t.email}:</strong> ${email}</p><p><strong>${t.password}:</strong> ${email}</p><p>⚠️ ${t.securityWarning}</p></div><a href="${clickTrackingUrl}" class="cta-button">🚀 ${templateContent.button_text}</a><p style="text-align:center;color:#666">${isFerramentaIA ? t.clickButtonIA : t.clickButtonArtes}</p><p style="text-align:center;color:#666;font-size:12px">${templateContent.footer}</p></div><img src="${trackingBaseUrl}?id=${trackingId}&action=open" width="1" height="1" style="display:none"/></body></html>`

    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${access_token}` },
      body: JSON.stringify({
        email: {
          html: btoa(unescape(encodeURIComponent(welcomeHtml))),
          text: `${templateContent.heading} - Email: ${email}, Senha: ${email}`,
          subject,
          from: { name: senderName, email: senderEmail },
          to: [{ email, name: name || "" }],
        },
      }),
    })

    const result = await emailResponse.json()
    
    // PASSO 3: Atualizar status para sent ou failed
    await supabase.from('welcome_email_logs').update({
      status: result.result === true ? 'sent' : 'failed',
      error_message: result.result !== true ? JSON.stringify(result) : null,
      template_used: template?.id || 'default',
      email_content: welcomeHtml // Salvar HTML para prévia
    }).eq('id', logId)
    
    console.log(`   ├─ [${requestId}] ${result.result === true ? '✅ Email enviado' : '❌ Falha no email'}`)
  } catch (error) {
    console.log(`   ├─ [${requestId}] ❌ Erro email: ${error}`)
    // Tentar marcar como falha se temos o trackingId
    try {
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: String(error) }).eq('tracking_id', trackingId)
    } catch (e) {}
  }
}

// ============================================================================
// PROCESSAMENTO EM BACKGROUND
// ============================================================================
async function processGreennArtesWebhook(supabase: any, payload: any, logId: string, requestId: string): Promise<void> {
  const email = payload.client?.email?.toLowerCase().trim()
  const clientName = payload.client?.name || ''
  const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
  const productName = payload.product?.name || ''
  const productId = payload.product?.id
  const offerName = payload.offer?.name || ''
  const status = payload.currentStatus
  const contractId = payload.contract?.id || payload.sale?.id
  const utmSource = extractUtmSource(payload)
  const fromApp = isFromApp(payload)
  const userLocale = extractLocale(payload)

  try {
    // Handle refunded/chargeback
    if (status === 'refunded' || status === 'chargeback') {
      console.log(`\n🚫 [${requestId}] PROCESSANDO ${status.toUpperCase()}`)
      
      if (status === 'chargeback') {
        await addToBlacklist(supabase, email, 'chargeback', requestId)
      }

      // Tentar desativar por greenn_contract_id primeiro (indexado)
      if (contractId) {
        const { data: purchases } = await supabase
          .from('user_pack_purchases')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('greenn_contract_id', contractId)
          .select('id')
        
        if (purchases?.length) {
          console.log(`   ├─ ✅ ${purchases.length} acesso(s) desativado(s) via contract_id`)
          await supabase.from('webhook_logs').update({ result: 'success' }).eq('id', logId)
          return
        }
      }

      // Fallback por email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle()
      
      if (profile) {
        await supabase
          .from('user_pack_purchases')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', profile.id)
          .eq('is_active', true)
        
        console.log(`   └─ ✅ Acesso desativado via email`)
      }

      await supabase.from('webhook_logs').update({ result: 'success' }).eq('id', logId)
      return
    }

    // Handle paid/approved
    if (status === 'paid' || status === 'approved') {
      // Check blacklist
      if (await isEmailBlacklisted(supabase, email)) {
        console.log(`   ├─ 🚫 Email bloqueado`)
        await supabase.from('webhook_logs').update({ result: 'blocked', error_message: 'Email na blacklist' }).eq('id', logId)
        return
      }

      // Find mapping
      let promotionMapping: PromotionMapping | null = null
      let packMapping: ProductMapping | null = null
      let mappingType = 'none'

      if (productId) {
        promotionMapping = await findPromotionMappingInDatabase(supabase, productId, requestId)
        if (promotionMapping) {
          mappingType = 'promotion'
        } else {
          packMapping = await findProductMappingInDatabase(supabase, productId, requestId)
          if (packMapping) mappingType = 'pack'
          else if (LEGACY_PRODUCT_ID_MAPPING[productId]) {
            packMapping = LEGACY_PRODUCT_ID_MAPPING[productId]
            mappingType = 'legacy'
          }
        }
      }

      // Fallback name detection
      if (mappingType === 'none') {
        const nameLower = (productName + ' ' + offerName).toLowerCase()
        let packSlug = ''
        let accessType: '3_meses' | '6_meses' | '1_ano' | 'vitalicio' = '6_meses'
        let hasBonusAccess = false
        
        if (nameLower.includes('vol.1') || nameLower.includes('vol 1')) packSlug = 'pack-arcano-vol-1'
        else if (nameLower.includes('vol.2') || nameLower.includes('vol 2')) packSlug = 'pack-arcano-vol-2'
        else if (nameLower.includes('vol.3') || nameLower.includes('vol 3')) packSlug = 'pack-arcano-vol-3'
        else if (nameLower.includes('halloween')) packSlug = 'pack-de-halloween'
        else if (nameLower.includes('carnaval')) packSlug = 'pack-de-carnaval'
        else if (nameLower.includes('arcano')) packSlug = 'pack-arcano-vol-1'

        if (nameLower.includes('vitalício') || nameLower.includes('vitalicio')) { accessType = 'vitalicio'; hasBonusAccess = true }
        else if (nameLower.includes('1 ano') || nameLower.includes('anual')) { accessType = '1_ano'; hasBonusAccess = true }
        else if (nameLower.includes('3 meses')) accessType = '3_meses'

        if (packSlug) {
          packMapping = { packSlug, accessType, hasBonusAccess }
          mappingType = 'name_detection'
        }
      }

      if (mappingType !== 'promotion' && !packMapping) {
        console.log(`   ├─ ❌ Mapeamento não encontrado`)
        await supabase.from('webhook_logs').update({ result: 'failed', error_message: 'Mapeamento não encontrado' }).eq('id', logId)
        return
      }

      // Handle abandoned checkout conversion
      if (productId) {
        const { data: abandonedCheckout } = await supabase
          .from('abandoned_checkouts')
          .select('id, abandoned_at')
          .eq('email', email)
          .eq('product_id', productId)
          .neq('remarketing_status', 'converted')
          .maybeSingle()

        if (abandonedCheckout) {
          const minutesSince = (Date.now() - new Date(abandonedCheckout.abandoned_at).getTime()) / 60000
          if (minutesSince < 15) {
            await supabase.from('abandoned_checkouts').delete().eq('id', abandonedCheckout.id)
          } else {
            await supabase.from('abandoned_checkouts').update({ remarketing_status: 'converted' }).eq('id', abandonedCheckout.id)
          }
        }
      }

      // Create/find user
      let userId: string | null = null

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email, password: email, email_confirm: true
      })

      if (createError) {
        if (createError.message?.includes('email') || createError.code === 'email_exists') {
          const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
          
          if (profile) {
            userId = profile.id
          } else {
            let page = 1
            while (!userId && page <= 10) {
              const { data: usersPage } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
              const found = usersPage?.users?.find((u: any) => u.email?.toLowerCase() === email)
              if (found) userId = found.id
              if (!usersPage?.users?.length || usersPage.users.length < 1000) break
              page++
            }
          }
          
          if (!userId) {
            await supabase.from('webhook_logs').update({ result: 'failed', error_message: 'Usuário existe mas não encontrado' }).eq('id', logId)
            return
          }
        } else {
          throw createError
        }
      } else {
        userId = newUser.user.id
        console.log(`   ├─ ✅ Novo usuário: ${userId}`)
      }

      // Upsert profile
      await supabase.from('profiles').upsert({
        id: userId, name: clientName, phone: clientPhone, email, locale: userLocale, password_changed: false, updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

      // Process packs
      const platform = fromApp ? 'app' : 'eventos'
      let processedPacks: string[] = []

      if (mappingType === 'promotion' && promotionMapping) {
        for (const item of promotionMapping.items) {
          await processPackPurchase(supabase, userId!, item.packSlug, item.accessType, promotionMapping.hasBonusAccess, contractId, productName, platform, requestId)
          processedPacks.push(item.packSlug)
        }
      } else if (packMapping) {
        await processPackPurchase(supabase, userId!, packMapping.packSlug, packMapping.accessType, packMapping.hasBonusAccess, contractId, productName, platform, requestId)
        processedPacks.push(packMapping.packSlug)
      }

      // Mark success BEFORE email + limpar payload (economizar espaço)
      await supabase.from('webhook_logs').update({ 
        result: 'success', 
        mapping_type: mappingType,
        payload: {} // Limpar payload para sucesso
      }).eq('id', logId)

      // Send email (non-blocking failure)
      const packInfo = processedPacks.length > 1 ? `${processedPacks.length} Packs` : packMapping?.packSlug || 'Pack'
      try {
        await sendWelcomeEmail(supabase, email, clientName, packInfo, requestId, packMapping?.isFerramentaIA || false, userLocale)
      } catch (e) {
        console.log(`   ├─ ⚠️ Falha no email (acesso já liberado)`)
      }

      console.log(`\n✅ [${requestId}] PROCESSAMENTO CONCLUÍDO - Packs: ${processedPacks.join(', ')}`)
      return
    }

    // Handle waiting_payment
    if (status === 'waiting_payment') {
      const { data: existing } = await supabase
        .from('abandoned_checkouts')
        .select('id')
        .eq('email', email)
        .eq('product_id', productId)
        .gte('abandoned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle()

      if (!existing) {
        await supabase.from('abandoned_checkouts').insert({
          email, name: clientName, phone: clientPhone, product_id: productId,
          product_name: productName, offer_name: offerName, remarketing_status: 'pending', platform: 'artes-eventos'
        })
      }

      await supabase.from('webhook_logs').update({ 
        result: 'ignored', 
        error_message: 'waiting_payment',
        payload: {} // Limpar payload para ignored
      }).eq('id', logId)
      return
    }

    // Other statuses
    await supabase.from('webhook_logs').update({ 
      result: 'ignored', 
      error_message: `Status: ${status}`,
      payload: {} // Limpar payload para ignored
    }).eq('id', logId)

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO:`, error)
    // Manter payload completo para falhas (debug)
    await supabase.from('webhook_logs').update({ 
      result: 'failed', 
      error_message: error instanceof Error ? error.message : 'Erro desconhecido' 
    }).eq('id', logId)
  }
}

// ============================================================================
// HANDLER PRINCIPAL - ACK RÁPIDO
// ============================================================================
Deno.serve(async (req) => {
  const startTime = Date.now()
  const requestId = crypto.randomUUID().slice(0, 8)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  console.log(`\n${'='.repeat(70)}`)
  console.log(`🚀 [${requestId}] WEBHOOK ARTES - ${new Date().toISOString()}`)
  console.log(`${'='.repeat(70)}`)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  try {
    const payload = await req.json()
    
    const email = payload.client?.email?.toLowerCase().trim()
    const productId = payload.product?.id
    const status = payload.currentStatus
    const eventType = payload.event
    const utmSource = extractUtmSource(payload)
    const fromApp = isFromApp(payload)

    console.log(`📦 [${requestId}] Dados: email=${email}, productId=${productId}, status=${status}, event=${eventType}`)

    // Handle checkoutAbandoned separately (quick response)
    if (eventType === 'checkoutAbandoned') {
      const leadEmail = payload.lead?.email?.toLowerCase().trim()
      if (leadEmail) {
        const { data: existing } = await supabase
          .from('abandoned_checkouts')
          .select('id')
          .eq('email', leadEmail)
          .eq('product_id', productId)
          .gte('abandoned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle()

        if (!existing) {
          await supabase.from('abandoned_checkouts').insert({
            email: leadEmail,
            name: payload.lead?.name || '',
            phone: payload.lead?.cellphone?.replace(/\D/g, '') || '',
            product_id: productId,
            product_name: payload.product?.name || '',
            offer_name: payload.offer?.name || '',
            checkout_step: payload.lead?.step || 0,
            remarketing_status: 'pending',
            platform: 'artes-eventos'
          })
        }
      }
      return new Response(JSON.stringify({ success: true, message: 'Lead captured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate email
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Limpeza automática de logs > 30 dias (async, não bloqueia)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    Promise.resolve(
      supabase.from('webhook_logs')
        .delete()
        .lt('received_at', thirtyDaysAgo)
        .limit(100)
    ).then(() => console.log(`   🧹 Limpeza automática executada`))
     .catch(() => {})

    // Log to webhook_logs (durable)
    const { data: logEntry, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        payload,
        platform: fromApp ? 'app' : 'artes-eventos',
        email,
        product_id: productId || null,
        status,
        utm_source: utmSource,
        from_app: fromApp,
        result: 'received'
      })
      .select('id')
      .single()

    if (logError || !logEntry) {
      console.error(`❌ [${requestId}] Falha ao gravar log:`, logError)
      return new Response(JSON.stringify({ error: 'Failed to log webhook' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const logId = logEntry.id
    console.log(`   ✅ Log criado: ${logId}`)

    // Schedule background processing
    // @ts-ignore
    EdgeRuntime.waitUntil(processGreennArtesWebhook(supabase, payload, logId, requestId))

    // Return 200 immediately
    const duration = Date.now() - startTime
    console.log(`\n🚀 [${requestId}] ACK RÁPIDO em ${duration}ms - Processamento em background`)
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook received, processing in background',
      logId,
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO:`, error)
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

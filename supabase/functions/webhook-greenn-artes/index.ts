/**
 * ⚠️ ATENÇÃO - REGRA CRÍTICA DO PROJETO ⚠️
 * 
 * NÃO FAZER NENHUMA MIGRAÇÃO NESTE ARQUIVO:
 * - NÃO mudar para Deno.serve()
 * - NÃO alterar imports (std, npm:, etc)
 * - NÃO "modernizar" ou "atualizar" padrões
 * 
 * Qualquer alteração de padrão requer autorização EXPLÍCITA.
 * Regras completas em: .lovable/RULES.md
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

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

// Mapeamento de produtos de CRÉDITOS
const CREDITS_PRODUCT_MAPPING: Record<number, { amount: number; name: string }> = {
  // Créditos PUROS
  156946: { amount: 1500, name: 'Pacote +1.500 Créditos' },
  156948: { amount: 4200, name: 'Pacote +4.200 Créditos' },
  156952: { amount: 14000, name: 'Pacote +14.000 Créditos' },
  // Upscaler Arcano - Planos
  156954: { amount: 1800, name: 'Upscaler Arcano - Plano Starter' },
  156957: { amount: 4200, name: 'Upscaler Arcano - Plano Pro' },
  156960: { amount: 12000, name: 'Upscaler Arcano - Plano Studio' },
  // Arcano Cloner
  159713: { amount: 4200, name: 'Arcano Cloner' }
}

// Mapeamento de planos Upscaler Arcano (para email personalizado)
const UPSCALER_PLAN_NAMES: Record<number, string> = {
  156954: 'Starter',
  156957: 'Pro',
  156960: 'Studio'
}

// Produtos Arcano Cloner (para email personalizado)
const ARCANO_CLONER_PRODUCT_IDS: number[] = [159713]

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
    clickButtonCreditos: 'Clique no botão acima para acessar suas ferramentas de IA e começar a usar seus créditos!',
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
    clickButtonCreditos: '¡Haz clic en el botón de arriba para acceder a tus herramientas de IA y empezar a usar tus créditos!',
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

function extractFullUtmData(payload: any): Record<string, string> | null {
  const saleMetas = payload.saleMetas || []
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_term', 'xcod', 'fbclid']
  const utmData: Record<string, string> = {}
  for (const meta of saleMetas) {
    if (utmKeys.includes(meta.meta_key) && meta.meta_value) {
      utmData[meta.meta_key] = meta.meta_value
    }
  }
  return Object.keys(utmData).length > 0 ? utmData : null
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
// EMAIL DE CRÉDITOS
// ============================================================================
async function sendCreditsWelcomeEmail(
  supabase: any, 
  email: string, 
  name: string, 
  creditsAmount: number, 
  requestId: string, 
  locale: 'pt' | 'es' = 'pt',
  productId?: number
): Promise<void> {
  const t = emailTexts[locale]
  
  // Gerar dedup_key: email|creditos|YYYYMMDDHHMM
  const now = new Date()
  const dedupMinute = now.toISOString().slice(0, 16).replace(/[-T:]/g, '')
  const dedupKey = `${email}|creditos-${creditsAmount}|${dedupMinute}`
  const trackingId = crypto.randomUUID()
  
  // Detectar tipo de produto
  const isArcanoCloner = productId ? ARCANO_CLONER_PRODUCT_IDS.includes(productId) : false
  const upscalerPlanName = productId ? UPSCALER_PLAN_NAMES[productId] : null
  const isUpscaler = !!upscalerPlanName && !isArcanoCloner
  
  try {
    // Tentar INSERT primeiro (atômico)
    const { data: inserted, error: insertError } = await supabase
      .from('welcome_email_logs')
      .insert({
        email,
        name,
        platform: 'creditos',
        product_info: isUpscaler 
          ? `Upscaler Arcano - Plano ${upscalerPlanName} (+${creditsAmount.toLocaleString('pt-BR')} Créditos)`
          : `+${creditsAmount.toLocaleString('pt-BR')} Créditos`,
        status: 'pending',
        tracking_id: trackingId,
        template_used: isUpscaler ? 'upscaler_arcano' : 'creditos',
        locale,
        dedup_key: dedupKey
      })
      .select('id, tracking_id')
      .single()
    
    if (insertError?.code === '23505') {
      console.log(`   ├─ [${requestId}] ⏭️ Email de créditos duplicado bloqueado`)
      return
    }
    
    if (insertError) {
      console.log(`   ├─ [${requestId}] ❌ Erro ao inserir log de créditos: ${insertError.message}`)
      return
    }
    
    const logId = inserted.id
    console.log(`   ├─ [${requestId}] 🔒 Lock obtido para email de créditos${isUpscaler ? ` (Upscaler ${upscalerPlanName})` : ''}`)
    
    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    
    if (!clientId || !clientSecret) {
      console.log(`   ├─ [${requestId}] ⚠️ SendPulse não configurado`)
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: 'SendPulse não configurado' }).eq('id', logId)
      return
    }

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

    const trackingBaseUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking`
    const creditsFormatted = creditsAmount.toLocaleString('pt-BR')
    
    let emailHtml: string
    let emailSubject: string
    let senderName: string
    
    if (isArcanoCloner) {
      // ========================================
      // TEMPLATE ARCANO CLONER
      // ========================================
      const platformUrl = 'https://arcanolab.voxvisual.com.br/'
      const clickTrackingUrl = `${trackingBaseUrl}?id=${trackingId}&action=click&redirect=${encodeURIComponent(platformUrl)}`
      
      emailSubject = `🤖 Arcano Cloner | Acesso Ativado! +${creditsFormatted} Créditos`
      senderName = 'Arcano App'
      
      emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;background:#0D0221;padding:20px}
.container{max-width:600px;margin:0 auto;background:#1A0A2E;padding:40px;border-radius:16px;border:1px solid rgba(124,58,237,0.4)}
.header{text-align:center;padding:24px 0 16px}
.robot-icon{font-size:48px;display:block;margin-bottom:12px}
h1{background:linear-gradient(135deg,#a78bfa,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:32px;margin:0 0 4px;letter-spacing:2px}
.subtitle{color:#c4b5fd;font-size:15px;margin:0 0 16px}
.badge{display:inline-block;background:linear-gradient(135deg,rgba(34,197,94,0.2),rgba(16,185,129,0.2));border:1px solid rgba(34,197,94,0.4);color:#4ade80;padding:8px 20px;border-radius:20px;font-weight:bold;font-size:14px}
.divider{border:none;border-top:1px solid rgba(124,58,237,0.2);margin:24px 0}
.credits-box{background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);padding:32px;border-radius:16px;text-align:center;margin:24px 0}
.credits-amount{font-size:56px;font-weight:bold;color:#fff;line-height:1}
.credits-label{color:rgba(255,255,255,0.9);margin-top:10px;font-size:16px}
.credits-lifetime{color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;letter-spacing:1px;text-transform:uppercase}
.credentials{background:rgba(255,255,255,0.04);padding:20px 24px;border-radius:12px;margin:20px 0;border:1px solid rgba(255,255,255,0.08)}
.credentials h3{color:#a78bfa;margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:1px}
.credentials p{color:#e2e8f0;margin:6px 0;font-size:14px}
.warning{color:#fbbf24;font-size:13px;margin-top:10px;display:flex;align-items:center;gap:6px}
.cta-button{display:block;background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;text-align:center;padding:18px;border-radius:12px;text-decoration:none;margin:24px 0;font-weight:bold;font-size:18px;letter-spacing:0.5px}
.footer{text-align:center;color:#4b5563;font-size:12px;margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.05)}
p{color:#cbd5e1}
strong{color:#e2e8f0}
</style></head><body><div class="container">
<div class="header">
  <span class="robot-icon">🤖</span>
  <h1>ARCANO CLONER</h1>
  <div class="subtitle">Ferramenta de Fotos com Inteligência Artificial</div>
  <div class="badge">✅ ACESSO ATIVADO</div>
</div>
<hr class="divider">
<p>${t.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p>
<p>Você adquiriu o <strong>Arcano Cloner</strong> — a ferramenta de geração de fotos com inteligência artificial. Seus créditos vitalícios já foram adicionados à sua conta!</p>
<div class="credits-box">
  <div class="credits-amount">+${creditsFormatted}</div>
  <div class="credits-label">créditos adicionados à sua conta</div>
  <div class="credits-lifetime">⭐ VITALÍCIOS ⭐</div>
</div>
<div class="credentials">
  <h3>📋 Dados do seu primeiro acesso:</h3>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Senha:</strong> ${email}</p>
  <p class="warning">⚠️ <span>${t.securityWarning}</span></p>
</div>
<a href="${clickTrackingUrl}" class="cta-button">🚀 ACESSAR MEU PRODUTO</a>
<p style="text-align:center;color:#6b7280;font-size:13px">arcanolab.voxvisual.com.br</p>
<div class="footer">© Arcano App<br>Dúvidas? Responda este email!</div>
</div><img src="${trackingBaseUrl}?id=${trackingId}&action=open" width="1" height="1" style="display:none"/></body></html>`
    } else if (isUpscaler) {
      // ========================================
      // TEMPLATE UPSCALER ARCANO
      // ========================================
      const platformUrl = 'https://arcanolab.voxvisual.com.br/'
      const clickTrackingUrl = `${trackingBaseUrl}?id=${trackingId}&action=click&redirect=${encodeURIComponent(platformUrl)}`
      
      emailSubject = `Upscaler Arcano - Plano ${upscalerPlanName} | +${creditsFormatted} Créditos Adicionados!`
      senderName = 'Arcano App'
      
      emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:sans-serif;background:#1a1a2e;padding:20px}
.container{max-width:600px;margin:0 auto;background:linear-gradient(180deg,#16213e 0%,#1a1a2e 100%);padding:40px;border-radius:16px;border:1px solid rgba(139,92,246,0.3)}
h1{background:linear-gradient(135deg,#a78bfa,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-align:center;font-size:28px;margin-bottom:4px}
.plan-badge{text-align:center;color:#c4b5fd;font-size:18px;margin-bottom:24px}
.credits-box{background:linear-gradient(135deg,#7c3aed 0%,#ec4899 100%);padding:30px;border-radius:16px;text-align:center;margin:24px 0}
.credits-amount{font-size:48px;font-weight:bold;color:#fff}
.credits-label{color:rgba(255,255,255,0.9);margin-top:8px;font-size:16px}
.tools-info{background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);padding:16px;border-radius:12px;margin:20px 0;color:#c4b5fd;text-align:center}
.credentials{background:rgba(255,255,255,0.05);padding:20px;border-radius:12px;margin:20px 0;border:1px solid rgba(255,255,255,0.1)}
.credentials h3{color:#a78bfa;margin-top:0}
.credentials p{color:#e2e8f0;margin:8px 0}
.cta-button{display:block;background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;text-align:center;padding:18px;border-radius:12px;text-decoration:none;margin:24px 0;font-weight:bold;font-size:18px}
.footer{text-align:center;color:#64748b;font-size:12px;margin-top:24px}
p{color:#cbd5e1}
</style></head><body><div class="container">
<h1>UPSCALER ARCANO</h1>
<div class="plan-badge">Plano ${upscalerPlanName}</div>
<p>${t.greeting}${name ? ` <strong style="color:#e2e8f0">${name}</strong>` : ''}!</p>
<p>Sua compra do <strong style="color:#a78bfa">Upscaler Arcano - Plano ${upscalerPlanName}</strong> foi confirmada com sucesso!</p>
<div class="credits-box"><div class="credits-amount">+${creditsFormatted}</div><div class="credits-label">créditos adicionados à sua conta</div></div>
<div class="tools-info">Use seus créditos nas ferramentas de IA: Upscaler Arcano, Forja de Selos 3D, e mais!</div>
<div class="credentials"><h3>${t.accessData}</h3><p><strong>${t.email}:</strong> ${email}</p><p><strong>${t.password}:</strong> ${email}</p><p>⚠️ <span style="color:#fbbf24">${t.securityWarning}</span></p></div>
<a href="${clickTrackingUrl}" class="cta-button">🚀 ACESSAR MINHA CONTA</a>
<p style="text-align:center;color:#94a3b8">Clique no botão acima para fazer seu primeiro login!</p>
<div class="footer">Dúvidas? Responda este email!<br>© Arcano App</div>
</div><img src="${trackingBaseUrl}?id=${trackingId}&action=open" width="1" height="1" style="display:none"/></body></html>`
    } else {
      // ========================================
      // TEMPLATE GENÉRICO DE CRÉDITOS (existente)
      // ========================================
      const platformUrl = 'https://arcanoapp.voxvisual.com.br/ferramentas-ia'
      const clickTrackingUrl = `${trackingBaseUrl}?id=${trackingId}&action=click&redirect=${encodeURIComponent(platformUrl)}`
      
      const heading = locale === 'es' ? '¡Tus Créditos fueron Añadidos!' : 'Seus Créditos foram Adicionados!'
      const intro = locale === 'es' 
        ? `¡Tu compra de <strong>+${creditsFormatted} créditos</strong> fue confirmada y ya está disponible en tu cuenta!`
        : `Sua compra de <strong>+${creditsFormatted} créditos</strong> foi confirmada e já está disponível na sua conta!`
      const buttonText = locale === 'es' ? 'Acceder a las Herramientas' : 'Acessar Ferramentas'
      const toolsInfo = locale === 'es' 
        ? 'Usa tus créditos en nuestras herramientas de IA: Upscaler Arcano, Forja de Sellos 3D, y más!'
        : 'Use seus créditos em nossas ferramentas de IA: Upscaler Arcano, Forja de Selos 3D, e mais!'
      const footer = locale === 'es' ? '¿Dudas? Responde este email!' : 'Dúvidas? Responda este email!'
      
      emailSubject = `🎫 +${creditsFormatted} Créditos Adicionados à sua Conta!`
      senderName = 'Ferramentas IA Arcanas'
      
      emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;background:#f4f4f4;padding:20px}.container{max-width:600px;margin:0 auto;background:white;padding:40px;border-radius:12px}h1{color:#d4af37;text-align:center}.cta-button{display:block;background:#d4af37;color:white;text-align:center;padding:16px;border-radius:8px;text-decoration:none;margin:20px 0}.credits-box{background:linear-gradient(135deg,#fefce8 0%,#fef3c7 100%);padding:24px;border-radius:12px;margin:20px 0;text-align:center;border:2px solid #d4af37}.credits-amount{font-size:36px;font-weight:bold;color:#d4af37}.credentials{background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0}</style></head><body><div class="container"><h1>🎫 ${heading}</h1><p>${t.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p><p>${intro}</p><div class="credits-box"><div class="credits-amount">+${creditsFormatted}</div><div style="color:#666;margin-top:8px">${locale === 'es' ? 'créditos añadidos' : 'créditos adicionados'}</div></div><p style="text-align:center;color:#666">${toolsInfo}</p><div class="credentials"><h3>${t.accessData}</h3><p><strong>${t.email}:</strong> ${email}</p><p><strong>${t.password}:</strong> ${email}</p><p>⚠️ ${t.securityWarning}</p></div><a href="${clickTrackingUrl}" class="cta-button">🚀 ${buttonText}</a><p style="text-align:center;color:#666">${t.clickButtonCreditos}</p><p style="text-align:center;color:#666;font-size:12px">${footer}</p></div><img src="${trackingBaseUrl}?id=${trackingId}&action=open" width="1" height="1" style="display:none"/></body></html>`
    }

    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${access_token}` },
      body: JSON.stringify({
        email: {
          html: btoa(unescape(encodeURIComponent(emailHtml))),
          text: isArcanoCloner 
            ? `Arcano Cloner - +${creditsFormatted} créditos vitalícios! Email: ${email}, Senha: ${email}`
            : isUpscaler 
            ? `Upscaler Arcano - Plano ${upscalerPlanName} - +${creditsFormatted} créditos! Email: ${email}, Senha: ${email}`
            : `+${creditsFormatted} créditos adicionados! Email: ${email}, Senha: ${email}`,
          subject: emailSubject,
          from: { name: senderName, email: 'contato@voxvisual.com.br' },
          to: [{ email, name: name || "" }],
        },
      }),
    })

    const result = await emailResponse.json()
    
    await supabase.from('welcome_email_logs').update({
      status: result.result === true ? 'sent' : 'failed',
      error_message: result.result !== true ? JSON.stringify(result) : null,
      email_content: emailHtml
    }).eq('id', logId)
    
    console.log(`   ├─ [${requestId}] ${result.result === true ? '✅ Email de créditos enviado' : '❌ Falha no email de créditos'}${isArcanoCloner ? ' (Arcano Cloner)' : isUpscaler ? ` (Upscaler ${upscalerPlanName})` : ''}`)
  } catch (error) {
    console.log(`   ├─ [${requestId}] ❌ Erro email créditos: ${error}`)
    try {
      await supabase.from('welcome_email_logs').update({ status: 'failed', error_message: String(error) }).eq('tracking_id', trackingId)
    } catch (e) {}
  }
}

// ============================================================================
// PROCESSAMENTO DE CRÉDITOS
// ============================================================================
async function processCreditsWebhook(
  supabase: any, 
  payload: any, 
  logId: string, 
  requestId: string,
  creditsProduct: { amount: number; name: string }
): Promise<void> {
  const email = payload.client?.email?.toLowerCase().trim()
  const clientName = payload.client?.name || ''
  const clientPhone = payload.client?.phone?.replace(/\D/g, '') || ''
  const userLocale = extractLocale(payload)
  const productId = payload.product?.id

  console.log(`\n🎫 [${requestId}] PROCESSANDO CRÉDITOS: +${creditsProduct.amount}`)
  console.log(`   ├─ Email: ${email}`)
  console.log(`   ├─ Nome: ${clientName}`)

  try {
    // Verificar blacklist
    if (await isEmailBlacklisted(supabase, email)) {
      console.log(`   ├─ 🚫 Email bloqueado`)
      await supabase.from('webhook_logs').update({ 
        result: 'blocked', 
        error_message: 'Email na blacklist',
        platform: 'creditos'
      }).eq('id', logId)
      return
    }

    // Criar ou buscar usuário
    let userId: string | null = null

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email, password: email, email_confirm: true
    })

    if (createError) {
      if (createError.message?.includes('email') || createError.code === 'email_exists') {
        // Buscar usuário existente
        const { data: profile } = await supabase.from('profiles').select('id').ilike('email', email).maybeSingle()
        
        if (profile) {
          userId = profile.id
          console.log(`   ├─ 👤 Usuário existente encontrado via profile: ${userId}`)
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
            console.log(`   ├─ 👤 Usuário existente encontrado via auth: ${userId}`)
          }
        }
        
        if (!userId) {
          console.log(`   ├─ ❌ Usuário existe mas não encontrado`)
          await supabase.from('webhook_logs').update({ 
            result: 'failed', 
            error_message: 'Usuário existe mas não encontrado',
            platform: 'creditos'
          }).eq('id', logId)
          return
        }
      } else {
        throw createError
      }
    } else {
      userId = newUser.user.id
      console.log(`   ├─ ✅ Novo usuário criado: ${userId}`)
    }

    // Upsert profile — check if profile exists to avoid resetting password_changed
    const { data: existingProfileArtes } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
    const profileDataArtes: Record<string, unknown> = {
      id: userId, name: clientName, phone: clientPhone, email, locale: userLocale, email_verified: true, updated_at: new Date().toISOString()
    }
    if (!existingProfileArtes) { profileDataArtes.password_changed = false }
    await supabase.from('profiles').upsert(profileDataArtes, { onConflict: 'id' })
    console.log(`   ├─ ✅ Profile atualizado`)

    // ── IDEMPOTÊNCIA: checar se este contract/sale já foi processado ──
    const contractId = payload.contract?.id || payload.sale?.id
    if (contractId) {
      const { data: alreadyProcessed } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('product_id', productId)
        .eq('result', 'success')
        .eq('greenn_contract_id', String(contractId))
        .neq('id', logId)
        .maybeSingle()

      if (alreadyProcessed) {
        console.log(`   ├─ ⚠️ DUPLICATA DETECTADA: contract/sale ${contractId} já processado. Ignorando.`)
        await supabase.from('webhook_logs').update({ 
          result: 'duplicate', 
          error_message: `Webhook duplicado - contract/sale ${contractId} já processado`,
          platform: 'creditos'
        }).eq('id', logId)
        return
      }
    }

    // Adicionar créditos vitalícios
    const { data: creditsResult, error: creditsError } = await supabase.rpc('add_lifetime_credits', {
      _user_id: userId,
      _amount: creditsProduct.amount,
      _description: `Compra: ${creditsProduct.name}`
    })

    if (creditsError) {
      console.log(`   ├─ ❌ Erro ao adicionar créditos: ${creditsError.message}`)
      await supabase.from('webhook_logs').update({ 
        result: 'failed', 
        error_message: `Erro RPC add_lifetime_credits: ${creditsError.message}`,
        platform: 'creditos'
      }).eq('id', logId)
      return
    }

    const newBalance = creditsResult?.[0]?.new_balance || creditsProduct.amount
    console.log(`   ├─ ✅ +${creditsProduct.amount} créditos adicionados (novo saldo: ${newBalance})`)

    // Criar/atualizar registro em user_pack_purchases para exibição correta na home
    const PRODUCT_PACK_SLUGS: Record<number, string> = {
      159713: 'arcano-cloner',
      156954: 'upscaller-arcano',
      156957: 'upscaller-arcano',
      156960: 'upscaller-arcano',
      156946: 'upscaller-arcano',
      156948: 'upscaller-arcano',
      156952: 'upscaller-arcano',
    }
    const packSlugForProduct = productId ? PRODUCT_PACK_SLUGS[productId] : null
    if (packSlugForProduct && userId) {
      const { data: existingPackPurchase } = await supabase
        .from('user_pack_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('pack_slug', packSlugForProduct)
        .eq('is_active', true)
        .maybeSingle()

      if (!existingPackPurchase) {
        await supabase.from('user_pack_purchases').insert({
          user_id: userId,
          pack_slug: packSlugForProduct,
          access_type: 'vitalicio',
          has_bonus_access: false,
          expires_at: null,
          greenn_contract_id: payload.contract?.id || payload.sale?.id,
          product_name: creditsProduct.name,
          platform: 'creditos'
        })
        console.log(`   ├─ ✅ user_pack_purchases criado: ${packSlugForProduct}`)
      } else {
        console.log(`   ├─ ℹ️ user_pack_purchases já existe: ${packSlugForProduct}`)
      }
    }

    // Marcar sucesso ANTES do email
    await supabase.from('webhook_logs').update({ 
      result: 'success',
      platform: 'creditos',
      payload: {} // Limpar payload
    }).eq('id', logId)

    // Enviar email de boas-vindas (não bloqueia)
    try {
      await sendCreditsWelcomeEmail(supabase, email, clientName, creditsProduct.amount, requestId, userLocale, productId)
    } catch (e) {
      console.log(`   ├─ ⚠️ Falha no email (créditos já liberados)`)
      console.error(`   ├─ ❌ Erro detalhado do email:`, (e as Error)?.message || e)
    }

    console.log(`\n✅ [${requestId}] CRÉDITOS PROCESSADOS COM SUCESSO`)

  } catch (error) {
    console.error(`\n❌ [${requestId}] ERRO CRÉDITOS:`, error)
    await supabase.from('webhook_logs').update({ 
      result: 'failed', 
      error_message: error instanceof Error ? error.message : 'Erro desconhecido',
      platform: 'creditos'
    }).eq('id', logId)
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

      // Verificar se é produto de créditos - revogar créditos
      const creditsProduct = productId ? CREDITS_PRODUCT_MAPPING[productId] : null
      if (creditsProduct && email) {
        console.log(`   ├─ 🎫 Produto de créditos detectado: ${creditsProduct.amount} créditos`)
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .maybeSingle()
        
        if (profile?.id) {
          const { data: revokeResult, error: revokeError } = await supabase.rpc('revoke_credits_on_refund', {
            _user_id: profile.id,
            _amount: creditsProduct.amount,
            _description: `Reembolso (${status}): ${creditsProduct.name}`
          })
          
          if (revokeError) {
            console.log(`   ├─ ❌ Erro ao revogar créditos: ${revokeError.message}`)
          } else {
            const revoked = revokeResult?.[0]?.amount_revoked || 0
            console.log(`   ├─ ✅ ${revoked} créditos revogados`)
          }
        } else {
          console.log(`   ├─ ⚠️ Usuário não encontrado para revogar créditos`)
        }
      }

      // Desativar acesso a packs (lógica existente)
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
      const { data: profileFallback } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle()
      
      if (profileFallback) {
        await supabase
          .from('user_pack_purchases')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', profileFallback.id)
          .eq('is_active', true)
        
        console.log(`   └─ ✅ Acesso desativado via email`)
      }

      await supabase.from('webhook_logs').update({ result: 'success' }).eq('id', logId)
      return
    }

    // Handle paid/approved
    if (status === 'paid' || status === 'approved') {
      // ========================================
      // VERIFICAR SE É PRODUTO DE CRÉDITOS
      // ========================================
      const creditsProduct = productId ? CREDITS_PRODUCT_MAPPING[productId] : null
      if (creditsProduct) {
        console.log(`   ├─ 🎫 PRODUTO DE CRÉDITOS DETECTADO: ${creditsProduct.amount} créditos`)
        await processCreditsWebhook(supabase, payload, logId, requestId, creditsProduct)
        return  // Não continuar para processamento de artes
      }

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

      // Upsert profile — check if profile exists to avoid resetting password_changed
      const { data: existingProfileEv } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
      const profileDataEv: Record<string, unknown> = {
        id: userId, name: clientName, phone: clientPhone, email, locale: userLocale, email_verified: true, updated_at: new Date().toISOString()
      }
      if (!existingProfileEv) { profileDataEv.password_changed = false }
      await supabase.from('profiles').upsert(profileDataEv, { onConflict: 'id' })

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
      // SKIP email for Upscaler Arcano (vitalício) - requested by admin
      const isUpscalerArcano = processedPacks.includes('upscaller-arcano') || packMapping?.packSlug === 'upscaller-arcano'
      if (isUpscalerArcano) {
        console.log(`   ├─ ⏭️ Email de boas-vindas PULADO (Upscaler Arcano vitalício)`)
      } else {
        const packInfo = processedPacks.length > 1 ? `${processedPacks.length} Packs` : packMapping?.packSlug || 'Pack'
        const artesBackoffDelays = [2000, 5000, 10000]
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await sendWelcomeEmail(supabase, email, clientName, packInfo, requestId, packMapping?.isFerramentaIA || false, userLocale)
            break // Success
          } catch (e) {
            console.log(`   ├─ ⚠️ Email tentativa ${attempt + 1}/3 falhou: ${e}`)
            if (attempt < 2) {
              const delay = artesBackoffDelays[attempt]
              console.log(`   ├─ ⏳ Retry em ${delay / 1000}s...`)
              await new Promise(resolve => setTimeout(resolve, delay))
            } else {
              console.log(`   ├─ ⚠️ Email falhou após 3 tentativas (acesso já liberado)`)
            }
          }
        }
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
serve(async (req) => {
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
    // ===== Greenn Webhook Token Validation =====
    const greennToken = Deno.env.get('GREENN_WEBHOOK_TOKEN')
    if (greennToken) {
      const url = new URL(req.url)
      const tokenParam = url.searchParams.get('token')
      if (tokenParam !== greennToken) {
        console.error(`🚫 [${requestId}] Token inválido ou ausente - rejeitado`)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      console.log(`✅ [${requestId}] Token Greenn válido`)
    }

    const payload = await req.json()
    
    const email = payload.client?.email?.toLowerCase().trim()
    const productId = payload.product?.id
    const status = payload.currentStatus
    const eventType = payload.event
    const utmSource = extractUtmSource(payload)
    const fromApp = isFromApp(payload)

    // Detectar se é produto de créditos para log inicial
    const isCreditsProduct = productId && CREDITS_PRODUCT_MAPPING[productId]
    const logPlatform = isCreditsProduct ? 'creditos' : (fromApp ? 'app' : 'artes-eventos')

    console.log(`📦 [${requestId}] Dados: email=${email}, productId=${productId}, status=${status}, event=${eventType}, platform=${logPlatform}`)

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

    // Log to webhook_logs (durable) - platform já detecta créditos
    const greennContractId = payload.contract?.id || payload.sale?.id || null
    const { data: logEntry, error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        payload,
        platform: logPlatform,
        email,
        product_id: productId || null,
        status,
        utm_source: utmSource,
        utm_data: extractFullUtmData(payload),
        from_app: fromApp,
        result: 'received',
        greenn_contract_id: greennContractId ? String(greennContractId) : null,
        amount: payload.sale?.amount || null,
        product_name: payload.product?.name || null,
        payment_method: payload.currentSale?.method || payload.sale?.method || payload.sale?.payment_method || payload.payment?.method || null
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

    // Processar webhook
    await processGreennArtesWebhook(supabase, payload, logId, requestId)

    // Retornar resposta
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

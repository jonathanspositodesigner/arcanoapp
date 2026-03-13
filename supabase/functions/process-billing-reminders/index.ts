import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAGARME_API_URL = 'https://api.pagar.me/core/v5'

// ========== PLAN BENEFITS MAPPING ==========
interface PlanInfo {
  displayName: string
  benefits: string[]
  losses: string[]
}

const PLAN_INFO: Record<string, PlanInfo> = {
  'plano-starter': {
    displayName: 'Starter',
    benefits: [
      '1.800 créditos mensais para uso nas ferramentas de IA',
      '5 prompts premium por dia',
      'Acesso às ferramentas de IA da plataforma',
      'Suporte via WhatsApp',
    ],
    losses: [
      'Seus 1.800 créditos mensais para uso nas ferramentas',
      'O acesso a 5 prompts premium por dia',
      'A possibilidade de usar as ferramentas de IA normalmente',
    ],
  },
  'plano-pro': {
    displayName: 'Pro',
    benefits: [
      '4.200 créditos mensais para uso nas ferramentas de IA',
      '10 prompts premium por dia',
      'Geração de imagens com IA',
      'Geração de vídeos com IA',
      'Suporte prioritário via WhatsApp',
    ],
    losses: [
      'Seus 4.200 créditos mensais para uso nas ferramentas',
      'O acesso a 10 prompts premium por dia',
      'A geração de imagens e vídeos com IA',
      'A prioridade no suporte via WhatsApp',
    ],
  },
  'plano-ultimate': {
    displayName: 'Ultimate',
    benefits: [
      '10.800 créditos mensais para uso nas ferramentas de IA',
      '24 prompts premium por dia',
      'Geração de imagens com IA',
      'Geração de vídeos com IA',
      'Suporte prioritário via WhatsApp',
    ],
    losses: [
      'Seus 10.800 créditos mensais para uso nas ferramentas',
      'O acesso a 24 prompts premium por dia',
      'A geração de imagens e vídeos com IA',
      'O suporte prioritário',
    ],
  },
  'plano-unlimited': {
    displayName: 'Unlimited',
    benefits: [
      'Créditos ilimitados para uso nas ferramentas de IA',
      'Prompts premium ilimitados por dia',
      'Geração de imagens com IA',
      'Geração de vídeos com IA',
      'Fila prioritária em todas as ferramentas',
      'Suporte VIP via WhatsApp',
    ],
    losses: [
      'Seus créditos ilimitados para uso nas ferramentas',
      'O acesso ilimitado a prompts premium',
      'A geração de imagens e vídeos com IA',
      'A fila prioritária em todas as ferramentas',
      'O suporte VIP',
    ],
  },
}

function getPlanInfo(planSlug: string): PlanInfo {
  // Strip "-mensal" or "-anual" suffix
  const basePlan = planSlug.replace(/-mensal$/, '').replace(/-anual$/, '')
  return PLAN_INFO[basePlan] || {
    displayName: planSlug,
    benefits: ['Acesso às ferramentas da plataforma', 'Créditos mensais do plano', 'Conteúdos premium liberados'],
    losses: ['O acesso às ferramentas da plataforma', 'Seus créditos mensais', 'Os conteúdos premium'],
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ========== SENDPULSE ==========
async function getSendPulseToken(): Promise<string> {
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: Deno.env.get("SENDPULSE_CLIENT_ID"),
      client_secret: Deno.env.get("SENDPULSE_CLIENT_SECRET"),
    }),
  })
  if (!response.ok) throw new Error(`SendPulse token error: ${response.status}`)
  const data = await response.json()
  return data.access_token
}

// ========== PAGAR.ME CHECKOUT ==========
async function createPixCheckout(
  pagarmeSecretKey: string,
  userEmail: string,
  userName: string,
  productTitle: string,
  amountInCents: number,
  orderId: string,
): Promise<{ checkoutUrl: string; pixCopyPaste: string | null }> {
  const authHeader = 'Basic ' + btoa(pagarmeSecretKey + ':')
  const payload = {
    items: [{
      amount: amountInCents,
      description: `Renovação - ${productTitle}`,
      quantity: 1,
    }],
    customer: {
      name: userName || userEmail.split('@')[0],
      email: userEmail,
      type: 'individual',
      phones: { mobile_phone: { country_code: '55', area_code: '11', number: '999999999' } },
    },
    payments: [{
      payment_method: 'checkout',
      checkout: {
        expires_in: 259200, // 3 days
        accepted_payment_methods: ['pix'],
        success_url: 'https://arcanoapp.voxvisual.com.br/sucesso-compra',
        customer_editable: true,
        billing_address_editable: false,
        skip_checkout_success_page: false,
        billing_address: {
          line_1: '1, Av Paulista, Bela Vista',
          zip_code: '01310100',
          city: 'São Paulo',
          state: 'SP',
          country: 'BR',
        },
        pix: { expires_in: 259200 },
      },
    }],
    metadata: { order_id: orderId, billing_reminder: 'true' },
  }

  const resp = await fetch(`${PAGARME_API_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Pagar.me error ${resp.status}: ${txt.substring(0, 300)}`)
  }

  const data = await resp.json()
  const lastTx = data.charges?.[0]?.last_transaction
  const checkoutUrl = lastTx?.url || lastTx?.payment_url || data.checkouts?.[0]?.payment_url || null
  const pixCopyPaste = lastTx?.qr_code || null

  if (!checkoutUrl) throw new Error('No checkout URL in Pagar.me response')
  return { checkoutUrl, pixCopyPaste }
}

// ========== EMAIL TEMPLATES ==========
function getUnsubscribeLink(email: string): string {
  const baseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  return `${baseUrl}/functions/v1/email-unsubscribe?email=${encodeURIComponent(email)}`
}

function buildBenefitsList(items: string[]): string {
  return items.map(b => `<li style="color:#e2d8f0;font-size:15px;padding:6px 0;line-height:1.5;">✅ ${b}</li>`).join('')
}

function buildLossesList(items: string[]): string {
  return items.map(b => `<li style="color:#fca5a5;font-size:15px;padding:6px 0;line-height:1.5;">❌ ${b}</li>`).join('')
}

interface EmailData {
  userName: string
  planName: string
  planValue: string
  dueDate: string
  benefits: string[]
  losses: string[]
  checkoutUrl: string
  pixCopyPaste: string | null
  email: string
}

function wrapEmail(subject: string, preheader: string, bodyContent: string, email: string): string {
  const unsubscribeLink = getUnsubscribeLink(email)
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<span style="display:none;font-size:1px;color:#0d0015;max-height:0;overflow:hidden;">${preheader}</span>
</head>
<body style="margin:0;padding:0;background-color:#0d0015;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:48px 16px;">
  <div style="background:linear-gradient(160deg,#1e0a3c 0%,#2a1252 40%,#1e0a3c 100%);border-radius:20px;padding:50px 40px;border:1px solid rgba(212,175,55,0.15);">
    ${bodyContent}
    <div style="text-align:center;margin:32px 0 16px;">
      <a href="\${CHECKOUT_URL}" style="display:inline-block;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 100%);color:#1a0533;text-decoration:none;padding:18px 52px;border-radius:12px;font-weight:700;font-size:17px;letter-spacing:0.3px;box-shadow:0 6px 24px rgba(212,175,55,0.4);">
        Pagar agora →
      </a>
    </div>
    \${PIX_SECTION}
  </div>
  <div style="background:#150828;border-radius:0 0 20px 20px;padding:28px 40px;border:1px solid rgba(212,175,55,0.15);border-top:none;text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0 0 10px;">
      <a href="https://wa.me/5533988819891" style="color:#a78bfa;text-decoration:underline;font-size:12px;">Precisa de ajuda? Fale conosco</a>
    </p>
    <p style="color:#4b5563;font-size:11px;margin:0 0 8px;">Vox Visual © ${new Date().getFullYear()}</p>
    <p style="margin:0;"><a href="${unsubscribeLink}" style="color:#4b5563;font-size:11px;text-decoration:underline;">Cancelar inscrição de emails</a></p>
  </div>
</div>
</body>
</html>`.replace('${CHECKOUT_URL}', '{{CHECKOUT_URL}}').replace('${PIX_SECTION}', '{{PIX_SECTION}}')
}

function buildPixSection(pixCopyPaste: string | null): string {
  if (!pixCopyPaste) return ''
  return `<div style="background:rgba(255,255,255,0.06);border-radius:14px;padding:20px;margin-top:16px;border:1px solid rgba(212,175,55,0.25);text-align:center;">
    <p style="color:#d4af37;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 12px;">Pix Copia e Cola</p>
    <p style="color:#e2d8f0;font-size:13px;word-break:break-all;margin:0;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-family:monospace;">${pixCopyPaste}</p>
  </div>`
}

function getEmailTemplate(dayOffset: number, d: EmailData): { subject: string; html: string } {
  const benefitsHtml = buildBenefitsList(d.benefits)
  const lossesHtml = buildLossesList(d.losses)
  const pixSection = buildPixSection(d.pixCopyPaste)

  let subject = ''
  let preheader = ''
  let body = ''

  switch (dayOffset) {
    case 0: // DIA DO VENCIMENTO
      subject = `Seu acesso ao plano ${d.planName} vence hoje`
      preheader = 'Faça o pagamento por Pix e continue com seu acesso normalmente.'
      body = `
        <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">⏰ Seu plano vence hoje</h1>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">${d.userName}</strong>.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">O seu plano <strong style="color:#f5e27a;">${d.planName}</strong> vence hoje, <strong>${d.dueDate}</strong>.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">Para continuar com acesso normal à plataforma, basta realizar o pagamento da sua renovação no valor de <strong style="color:#f5e27a;">${d.planValue}</strong>.</p>
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Com a assinatura ativa, você continua tendo acesso a:</p>
        <ul style="list-style:none;padding:0;margin:0 0 24px;">${benefitsHtml}</ul>
        <p style="color:#e2d8f0;font-size:15px;margin:0 0 8px;text-align:center;">Evite interrupções no seu acesso e mantenha sua assinatura ativa normalmente.</p>`
      break

    case 1: // 1 DIA APÓS
      subject = `Seu pagamento do plano ${d.planName} ainda está pendente`
      preheader = 'Ainda dá tempo de regularizar e continuar com seu acesso normalmente.'
      body = `
        <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">⚠️ Pagamento pendente</h1>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">${d.userName}</strong>.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Identificamos que o pagamento da sua assinatura <strong style="color:#f5e27a;">${d.planName}</strong> ainda não foi concluído.</p>
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Seu plano inclui recursos importantes como:</p>
        <ul style="list-style:none;padding:0;margin:0 0 24px;">${benefitsHtml}</ul>
        <p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">Para evitar qualquer impacto no seu acesso, faça a regularização agora por Pix:</p>
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Valor da renovação: <strong style="color:#f5e27a;">${d.planValue}</strong></p>
        <p style="color:#e2d8f0;font-size:15px;margin:0 0 8px;text-align:center;">Quanto antes você regularizar, mais fácil será continuar usando a plataforma sem pausas e sem perder o ritmo.</p>`
      break

    case 2: // 2 DIAS APÓS — dor da perda
      subject = `Você pode perder o acesso ao que já usa no seu plano`
      preheader = 'Seu pagamento segue pendente e seu acesso pode ser impactado.'
      body = `
        <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">🔴 Risco de perda de acesso</h1>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">${d.userName}</strong>.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Seu plano <strong style="color:#f5e27a;">${d.planName}</strong> está com pagamento pendente há 2 dias.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">A partir daqui, o problema não é só uma cobrança em aberto. É o risco de perder o acesso ao que já faz parte da sua rotina dentro da plataforma.</p>
        <p style="color:#fca5a5;font-size:14px;font-weight:600;margin:0 0 8px;">Sem a renovação, você pode deixar de ter acesso a:</p>
        <ul style="list-style:none;padding:0;margin:0 0 16px;">${lossesHtml}</ul>
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Isso pode significar perder recursos como:</p>
        <ul style="list-style:none;padding:0;margin:0 0 24px;">${benefitsHtml}</ul>
        <p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">Se você já usa esse plano no dia a dia, interromper agora significa abrir mão de algo que já estava disponível.</p>
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Valor: <strong style="color:#f5e27a;">${d.planValue}</strong></p>`
      break

    case 3: // 3 DIAS APÓS — prejuízo prático
      subject = `Ficar sem seu plano pode custar mais do que a renovação`
      preheader = 'O prejuízo de interromper seu acesso pode ser maior do que parece.'
      body = `
        <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">💸 O custo de não renovar</h1>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">${d.userName}</strong>.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Seu pagamento do plano <strong style="color:#f5e27a;">${d.planName}</strong> continua pendente.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">Muita gente deixa para depois e só percebe o custo real quando perde acesso ao que já estava usando.</p>
        <p style="color:#fca5a5;font-size:14px;font-weight:600;margin:0 0 8px;">Ao não renovar, você corre o risco de ficar sem:</p>
        <ul style="list-style:none;padding:0;margin:0 0 16px;">${benefitsHtml}</ul>
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Na prática, isso pode significar:</p>
        <ul style="list-style:none;padding:0;margin:0 0 24px;">
          <li style="color:#e2d8f0;font-size:15px;padding:4px 0;">⚠️ Interromper sua rotina dentro da plataforma</li>
          <li style="color:#e2d8f0;font-size:15px;padding:4px 0;">⚠️ Perder velocidade no que já vinha fazendo</li>
          <li style="color:#e2d8f0;font-size:15px;padding:4px 0;">⚠️ Deixar de usar vantagens já liberadas no seu plano</li>
          <li style="color:#e2d8f0;font-size:15px;padding:4px 0;">⚠️ Voltar a ter limitações justamente quando precisa continuar</li>
        </ul>
        <p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">O valor para manter tudo ativo é <strong style="color:#f5e27a;">${d.planValue}</strong>, mas o custo de perder o acesso pode ser ainda maior em tempo, atraso e oportunidade desperdiçada.</p>`
      break

    case 4: // 4 DIAS APÓS — FOMO
      subject = `Enquanto outros continuam com acesso, seu plano segue pendente`
      preheader = 'Não fique de fora dos recursos do seu plano por falta de renovação.'
      body = `
        <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">👀 Não fique para trás</h1>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">${d.userName}</strong>.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Seu plano <strong style="color:#f5e27a;">${d.planName}</strong> ainda não foi renovado.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">Enquanto assinantes ativos continuam usando normalmente os recursos disponíveis, seu acesso corre o risco de ser interrompido por falta de pagamento.</p>
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Com a assinatura ativa, você segue com acesso a:</p>
        <ul style="list-style:none;padding:0;margin:0 0 16px;">${benefitsHtml}</ul>
        <p style="color:#fca5a5;font-size:14px;font-weight:600;margin:0 0 8px;">Sem renovar, você pode ficar de fora de:</p>
        <ul style="list-style:none;padding:0;margin:0 0 24px;">${lossesHtml}</ul>
        <p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">Se você pretende continuar usando a plataforma, o melhor momento para regularizar é agora.</p>
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Valor: <strong style="color:#f5e27a;">${d.planValue}</strong></p>`
      break

    case 5: // 5 DIAS APÓS — último aviso
      subject = `Último aviso: regularize hoje seu plano ${d.planName}`
      preheader = 'Este é o último lembrete para manter sua assinatura ativa.'
      body = `
        <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0 0 20px;text-align:center;">🚨 Último aviso</h1>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá, <strong style="color:#f5e27a;">${d.userName}</strong>.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 16px;">Este é o <strong style="color:#fca5a5;">último aviso</strong> sobre a pendência da sua assinatura <strong style="color:#f5e27a;">${d.planName}</strong>.</p>
        <p style="color:#e2d8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">Seu pagamento via Pix ainda não foi identificado e, sem a regularização, você poderá perder o acesso aos benefícios do seu plano, incluindo:</p>
        <ul style="list-style:none;padding:0;margin:0 0 16px;">${benefitsHtml}</ul>
        <p style="color:#fca5a5;font-size:14px;font-weight:600;margin:0 0 8px;">Resumo do que você deixa de ter sem renovar:</p>
        <ul style="list-style:none;padding:0;margin:0 0 24px;">${lossesHtml}</ul>
        <p style="color:#e2d8f0;font-size:15px;line-height:1.6;margin:0 0 8px;">Se você quer continuar com seu plano ativo, faça o pagamento agora:</p>
        <p style="color:#c4b5fd;font-size:14px;margin:0 0 8px;">Valor: <strong style="color:#f5e27a;">${d.planValue}</strong></p>
        <p style="color:#9ca3af;font-size:13px;margin:16px 0 0;text-align:center;font-style:italic;">Após isso, a assinatura poderá seguir o fluxo normal de expiração da plataforma.</p>`
      break
  }

  // Build final HTML with checkout URL and pix section injected
  let html = wrapEmail(subject, preheader, body, d.email)
  html = html.replace('{{CHECKOUT_URL}}', d.checkoutUrl)
  html = html.replace('{{PIX_SECTION}}', pixSection)

  return { subject, html }
}

// ========== MAIN ==========
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const pagarmeSecretKey = Deno.env.get('PAGARME_SECRET_KEY')

    if (!pagarmeSecretKey) {
      console.error('❌ PAGARME_SECRET_KEY not configured')
      return new Response(JSON.stringify({ error: 'Missing config' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // Calculate date range: from 5 days ago to today
    const fiveDaysAgo = new Date(now)
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0]

    console.log(`🔄 Processing billing reminders for ${todayStr} (range: ${fiveDaysAgoStr} to ${todayStr})`)

    // 1. Fetch expiring/expired Pix subscriptions
    // Only Pix subscriptions (no pagarme_subscription_id = not recurring card)
    const { data: subscriptions, error: subError } = await supabase
      .from('planos2_subscriptions')
      .select('id, user_id, plan_slug, expires_at, pagarme_subscription_id')
      .neq('plan_slug', 'free')
      .is('pagarme_subscription_id', null) // Only Pix (no recurring card subscription)
      .gte('expires_at', fiveDaysAgoStr + 'T00:00:00Z')
      .lte('expires_at', todayStr + 'T23:59:59Z')

    if (subError) {
      console.error('❌ Error fetching subscriptions:', subError)
      return new Response(JSON.stringify({ error: 'DB error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('✅ No subscriptions to process')
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`📋 Found ${subscriptions.length} subscriptions in range`)

    // 2. Get SendPulse token once
    const spToken = await getSendPulseToken()
    let processed = 0
    let skipped = 0
    let errors = 0

    for (const sub of subscriptions) {
      try {
        const expiresAt = new Date(sub.expires_at)
        const dayOffset = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24))

        // Only process days 0-5
        if (dayOffset < 0 || dayOffset > 5) {
          skipped++
          continue
        }

        // 3. Check if already sent for this day_offset
        const { data: existingReminder } = await supabase
          .from('subscription_billing_reminders')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('day_offset', dayOffset)
          .eq('due_date', expiresAt.toISOString().split('T')[0])
          .maybeSingle()

        if (existingReminder) {
          skipped++
          continue
        }

        // 4. Check if stopped (paid) - look for previous reminders with stopped_reason
        const { data: stoppedReminder } = await supabase
          .from('subscription_billing_reminders')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('due_date', expiresAt.toISOString().split('T')[0])
          .not('stopped_reason', 'is', null)
          .limit(1)
          .maybeSingle()

        if (stoppedReminder) {
          skipped++
          continue
        }

        // 5. Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', sub.user_id)
          .maybeSingle()

        if (!profile?.email) {
          console.warn(`⚠️ No profile/email for user ${sub.user_id}`)
          skipped++
          continue
        }

        const userEmail = profile.email.toLowerCase()

        // 6. Check blacklist
        const { data: blacklisted } = await supabase
          .from('blacklisted_emails')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle()

        if (blacklisted) {
          console.log(`🚫 Blacklisted email: ${userEmail}`)
          // Record as stopped
          await supabase.from('subscription_billing_reminders').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            plan_slug: sub.plan_slug,
            due_date: expiresAt.toISOString().split('T')[0],
            day_offset: dayOffset,
            email_sent_to: userEmail,
            stopped_reason: 'unsubscribed',
          })
          skipped++
          continue
        }

        // 7. Check if user renewed (new paid order after expires_at)
        // Check if the subscription expires_at was extended (webhook updated it)
        const { data: currentSub } = await supabase
          .from('planos2_subscriptions')
          .select('expires_at')
          .eq('id', sub.id)
          .single()

        if (currentSub) {
          const currentExpires = new Date(currentSub.expires_at)
          // If expires_at has been pushed to the future (more than 1 day ahead), user renewed
          const tomorrow = new Date(now)
          tomorrow.setDate(tomorrow.getDate() + 1)
          if (currentExpires > tomorrow) {
            console.log(`✅ User ${userEmail} renewed (expires_at extended)`)
            await supabase.from('subscription_billing_reminders').insert({
              user_id: sub.user_id,
              subscription_id: sub.id,
              plan_slug: sub.plan_slug,
              due_date: expiresAt.toISOString().split('T')[0],
              day_offset: dayOffset,
              email_sent_to: userEmail,
              stopped_reason: 'paid',
            })
            skipped++
            continue
          }
        }

        // Also check asaas_orders for a recent paid order
        const { data: recentOrder } = await supabase
          .from('asaas_orders')
          .select('id')
          .eq('user_email', userEmail)
          .eq('status', 'confirmed')
          .gte('paid_at', expiresAt.toISOString())
          .limit(1)
          .maybeSingle()

        if (recentOrder) {
          console.log(`✅ User ${userEmail} has paid order after expiry`)
          await supabase.from('subscription_billing_reminders').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            plan_slug: sub.plan_slug,
            due_date: expiresAt.toISOString().split('T')[0],
            day_offset: dayOffset,
            email_sent_to: userEmail,
            stopped_reason: 'paid',
          })
          skipped++
          continue
        }

        // 8. Get product info for price
        const { data: product } = await supabase
          .from('mp_products')
          .select('price, title')
          .eq('plan_slug', sub.plan_slug)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        const planInfo = getPlanInfo(sub.plan_slug)
        const price = product?.price || 0
        const productTitle = product?.title || planInfo.displayName

        if (price <= 0) {
          console.warn(`⚠️ No price found for plan_slug: ${sub.plan_slug}`)
          skipped++
          continue
        }

        // 9. Create Pagar.me PIX checkout
        let checkoutUrl = ''
        let pixCopyPaste: string | null = null
        try {
          const checkout = await createPixCheckout(
            pagarmeSecretKey,
            userEmail,
            profile.name || '',
            productTitle,
            Math.round(price * 100),
            crypto.randomUUID(), // dummy order ID for the metadata
          )
          checkoutUrl = checkout.checkoutUrl
          pixCopyPaste = checkout.pixCopyPaste
        } catch (err: any) {
          console.error(`❌ Failed to create checkout for ${userEmail}:`, err.message)
          errors++
          continue
        }

        // 10. Build and send email
        const emailData: EmailData = {
          userName: profile.name || userEmail.split('@')[0],
          planName: planInfo.displayName,
          planValue: formatCurrency(price),
          dueDate: formatDate(expiresAt),
          benefits: planInfo.benefits,
          losses: planInfo.losses,
          checkoutUrl,
          pixCopyPaste,
          email: userEmail,
        }

        const { subject, html } = getEmailTemplate(dayOffset, emailData)
        const htmlBase64 = btoa(unescape(encodeURIComponent(html)))

        const emailPayload = {
          email: {
            html: htmlBase64,
            text: "",
            subject,
            from: { name: "Vox Visual", email: "contato@voxvisual.com.br" },
            to: [{ name: profile.name || userEmail, email: userEmail }],
          },
        }

        const emailResp = await fetch("https://api.sendpulse.com/smtp/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${spToken}`,
          },
          body: JSON.stringify(emailPayload),
        })

        const emailResult = await emailResp.text()

        if (!emailResp.ok) {
          console.error(`❌ SendPulse error for ${userEmail}:`, emailResult.substring(0, 200))
          errors++
          continue
        }

        // 11. Record in control table
        await supabase.from('subscription_billing_reminders').insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          plan_slug: sub.plan_slug,
          due_date: expiresAt.toISOString().split('T')[0],
          day_offset: dayOffset,
          email_sent_to: userEmail,
          checkout_url: checkoutUrl,
        })

        console.log(`📧 Sent day ${dayOffset} reminder to ${userEmail} (plan: ${sub.plan_slug})`)
        processed++

      } catch (err: any) {
        console.error(`❌ Error processing subscription ${sub.id}:`, err.message)
        errors++
      }
    }

    const summary = { processed, skipped, errors, total: subscriptions.length }
    console.log(`✅ Done:`, JSON.stringify(summary))

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('❌ Fatal error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

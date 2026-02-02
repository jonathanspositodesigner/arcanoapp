import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface CustomerToResend {
  email: string;
  name: string;
  platform: string;
  product_id: number | null;
}

// Mapeamento de plataformas para templates
const PLATFORM_TEMPLATE_MAP: Record<string, { platform: string; locale: string }> = {
  'artes-eventos': { platform: 'artes', locale: 'pt' },
  'artes-musicos': { platform: 'musicos', locale: 'es' },
  'hotmart-es': { platform: 'ferramentas_ia', locale: 'es' },
  'prompts': { platform: 'promptverso', locale: 'pt' },
};

// Mapeamento de produtos
const PRODUCT_NAMES: Record<number, string> = {
  267850: 'Artes Arcanas Vitalício',
  267873: 'Artes Arcanas 1 Ano',
  267872: 'Artes Arcanas 6 Meses',
  339215: 'Músicos Vitalício',
  339213: 'Músicos 1 Ano',
  339214: 'Músicos 6 Meses',
  274697: 'PromptClub Vitalício',
  274698: 'PromptClub 1 Ano',
  274699: 'PromptClub 6 Meses',
  7004722: 'Upscaler Arcano (ES)',
  148481: 'Upscaler Arcano (BR)',
};

// URLs de login por plataforma
const PLATFORM_URLS: Record<string, string> = {
  'ferramentas_ia': 'https://arcanoapp.voxvisual.com.br/ferramentas-ia-es',
  'artes': 'https://arcanoapp.voxvisual.com.br/login-artes',
  'musicos': 'https://arcanoapp.voxvisual.com.br/login-musicos',
  'promptverso': 'https://arcanoapp.voxvisual.com.br/login',
};

// Textos por locale
const TEXTS = {
  es: {
    greeting: 'Hola',
    accessData: '📋 Datos de tu acceso:',
    email: 'Email',
    password: 'Contraseña',
    securityWarning: 'Por seguridad, deberás cambiar tu contraseña en el primer acceso.',
    clickButton: '¡Haz clic en el botón para acceder!',
    copyright: '© Herramientas IA Arcanas',
    important: 'Importante',
    forgotPassword: '¿Olvidaste tu contraseña?',
    accessNow: 'Acceder Ahora',
    purchaseConfirmed: '¡Tu compra fue confirmada con éxito!',
    alreadyHaveAccess: 'Ya tienes acceso en tu cuenta. Usa tu email y contraseña actuales para ingresar.',
  },
  pt: {
    greeting: 'Olá',
    accessData: '📋 Dados do seu acesso:',
    email: 'Email',
    password: 'Senha',
    securityWarning: 'Por segurança, você deverá trocar sua senha no primeiro acesso.',
    clickButton: 'Clique no botão para acessar!',
    copyright: '© ArcanoApp',
    important: 'Importante',
    forgotPassword: 'Esqueceu sua senha?',
    accessNow: 'Acessar Agora',
    purchaseConfirmed: 'Sua compra foi confirmada com sucesso!',
    alreadyHaveAccess: 'Você já tem acesso em sua conta. Use seu email e senha atuais para entrar.',
  }
};

// Verificar se é um usuário novo ou antigo
async function isNewUser(supabaseAdmin: any, email: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('password_changed, created_at')
    .ilike('email', email.toLowerCase())
    .maybeSingle();

  if (!profile) return true; // Novo usuário se não tem profile

  // Se password_changed é true, é cliente antigo que já mudou senha
  if (profile.password_changed) return false;

  // Se foi criado há mais de 1 hora, é cliente antigo
  const createdAt = new Date(profile.created_at);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return createdAt > hourAgo;
}

// Gerar HTML do email
function generateEmailHtml(
  name: string,
  email: string,
  productName: string,
  isNew: boolean,
  locale: 'es' | 'pt',
  platformUrl: string,
  trackingPixelUrl: string
): string {
  const t = TEXTS[locale];
  
  const credentialsSection = isNew ? `
    <div class="credentials">
      <h3>${t.accessData}</h3>
      <p><strong>${t.email}:</strong> ${email}</p>
      <p><strong>${t.password}:</strong> <span class="highlight">${email}</span></p>
      <div class="warning">
        <p>⚠️ <strong>${t.important}:</strong> ${t.securityWarning}</p>
      </div>
    </div>
  ` : `
    <div class="info-box">
      <p>${t.alreadyHaveAccess}</p>
    </div>
  `;

  const forgotPasswordLink = !isNew ? `
    <p style="text-align:center;color:#666;font-size:13px;">
      ${t.forgotPassword} 
      <a href="${platformUrl.replace('/ferramentas-ia-es', '/forgot-password').replace('/login-artes', '/forgot-password-artes').replace('/login-musicos', '/forgot-password-musicos')}" 
         style="color:#d4af37;">
        ${locale === 'es' ? 'Recuperar aquí' : 'Recuperar aqui'}
      </a>
    </p>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f4; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    h1 { color: #d4af37; text-align: center; margin: 0 0 20px 0; font-size: 28px; }
    p { color: #333; line-height: 1.6; margin: 0 0 16px 0; }
    .cta-button { display: block; background: linear-gradient(135deg, #d4af37, #b8962e); color: white; text-align: center; padding: 18px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 30px 0; }
    .credentials { background: linear-gradient(135deg, #fefce8, #fef3c7); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #fde68a; }
    .credentials h3 { margin: 0 0 16px 0; color: #92400e; font-size: 18px; }
    .credentials p { margin: 8px 0; color: #333; }
    .highlight { background: #fff; padding: 10px 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 15px; border: 1px solid #e5e7eb; display: inline-block; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-top: 16px; }
    .warning p { color: #92400e; font-size: 13px; margin: 0; }
    .info-box { background: #e0f2fe; border: 1px solid #38bdf8; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .info-box p { color: #0369a1; margin: 0; }
    .pack-badge { background: #d4af37; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
    .footer { color: #666; font-size: 13px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${isNew ? '🤖 ' : '🎉 '}${isNew ? (locale === 'es' ? '¡Tu Herramienta de IA está Activada!' : 'Sua Ferramenta de IA está Ativada!') : (locale === 'es' ? '¡Compra Confirmada!' : 'Compra Confirmada!')}</h1>
    
    <p>${t.greeting}${name ? ` <strong>${name}</strong>` : ''}!</p>
    
    <p>${t.purchaseConfirmed}</p>
    
    <div style="text-align: center;">
      <span class="pack-badge">✨ ${productName}</span>
    </div>
    
    ${credentialsSection}
    
    <a href="${platformUrl}" class="cta-button">
      🚀 ${t.accessNow}
    </a>
    
    <p style="text-align: center; color: #666;">
      ${t.clickButton}
    </p>
    
    ${forgotPasswordLink}
    
    <div class="footer">
      <p>${t.copyright}</p>
    </div>
  </div>
  <img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" />
</body>
</html>
`;
}

// Obter token do SendPulse
async function getSendPulseToken(): Promise<string | null> {
  const clientId = Deno.env.get("SENDPULSE_CLIENT_ID");
  const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET");
  
  if (!clientId || !clientSecret) {
    console.log("   ⚠️ SendPulse não configurado");
    return null;
  }

  const tokenResponse = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    console.log("   ❌ Falha ao obter token SendPulse");
    return null;
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Enviar email via SendPulse
async function sendViaSendPulse(
  token: string,
  email: string,
  name: string,
  subject: string,
  html: string,
  senderName: string,
  senderEmail: string
): Promise<boolean> {
  const htmlBase64 = btoa(unescape(encodeURIComponent(html)));

  const response = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: {
        html: htmlBase64,
        text: `${subject} - Acesse: ${email}`,
        subject,
        from: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email, name: name || "" }],
      },
    }),
  });

  const result = await response.json();
  return result.result === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obter token SendPulse uma vez
    const sendPulseToken = await getSendPulseToken();
    if (!sendPulseToken) {
      return new Response(
        JSON.stringify({ success: false, error: "SendPulse não configurado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const customers: CustomerToResend[] = body.customers || [];

    if (customers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum cliente fornecido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`📧 Iniciando reenvio para ${customers.length} clientes via SendPulse`);

    const results: Array<{ email: string; status: string; error?: string }> = [];
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    for (const customer of customers) {
      try {
        // Determinar template baseado na plataforma
        const templateConfig = PLATFORM_TEMPLATE_MAP[customer.platform] || { platform: 'artes', locale: 'pt' };
        const locale = templateConfig.locale as 'es' | 'pt';
        
        console.log(`\n📤 Processando: ${customer.email} (${customer.platform} -> ${templateConfig.platform}/${locale})`);

        // Verificar se já foi enviado recentemente (últimos 5 minutos)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: existingLog } = await supabaseAdmin
          .from("welcome_email_logs")
          .select("id, sent_at")
          .eq("email", customer.email.toLowerCase())
          .eq("status", "sent")
          .gte("sent_at", fiveMinutesAgo)
          .maybeSingle();

        if (existingLog) {
          console.log(`   ⏭️ Já enviado há pouco tempo, ignorando`);
          results.push({ email: customer.email, status: "skipped", error: "Email enviado recentemente" });
          continue;
        }

        // Buscar template
        const { data: template, error: templateError } = await supabaseAdmin
          .from("welcome_email_templates")
          .select("*")
          .eq("platform", templateConfig.platform)
          .eq("is_active", true)
          .eq("locale", locale)
          .maybeSingle();

        if (templateError || !template) {
          console.log(`   ⚠️ Template não encontrado para ${templateConfig.platform}/${locale}`);
          results.push({ email: customer.email, status: "failed", error: `Template não encontrado: ${templateConfig.platform}/${locale}` });
          continue;
        }

        // Verificar se é cliente novo ou antigo
        const isNew = await isNewUser(supabaseAdmin, customer.email);
        console.log(`   ├─ Cliente: ${isNew ? 'NOVO' : 'ANTIGO (sem senha no email)'}`);

        // Gerar tracking ID
        const trackingId = crypto.randomUUID();
        const trackingPixelUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking?id=${trackingId}&action=open`;

        // Preparar conteúdo do email
        const productName = customer.product_id 
          ? (PRODUCT_NAMES[customer.product_id] || `Produto #${customer.product_id}`) 
          : 'Seu produto';
        
        const platformUrl = PLATFORM_URLS[templateConfig.platform] || 'https://arcanoapp.voxvisual.com.br';
        
        const emailHtml = generateEmailHtml(
          customer.name || "Cliente",
          customer.email,
          productName,
          isNew,
          locale,
          platformUrl,
          trackingPixelUrl
        );

        // Enviar email via SendPulse
        const success = await sendViaSendPulse(
          sendPulseToken,
          customer.email,
          customer.name || "",
          template.subject,
          emailHtml,
          template.sender_name || 'ArcanoApp',
          template.sender_email || 'contato@voxvisual.com.br'
        );

        // Gerar dedup_key para o registro
        const now = new Date();
        const minuteKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const dedupKey = `${customer.email}|${customer.platform}|resend|${minuteKey}`;

        // Registrar no log - usar a plataforma original para matching correto no monitor
        await supabaseAdmin.from("welcome_email_logs").insert({
          email: customer.email.toLowerCase(),
          name: customer.name,
          platform: templateConfig.platform, // Usar platform do template para matching
          status: success ? "sent" : "failed",
          template_used: template.id,
          tracking_id: trackingId,
          product_info: `${productName} (reenvio manual)`,
          locale: locale,
          dedup_key: dedupKey,
          error_message: success ? null : "Falha no envio via SendPulse"
        });

        if (success) {
          results.push({ email: customer.email, status: "sent" });
          console.log(`   ✅ Email enviado com sucesso`);
        } else {
          results.push({ email: customer.email, status: "failed", error: "Falha no SendPulse" });
          console.log(`   ❌ Falha no envio`);
        }

        // Delay de 500ms para evitar rate limit
        await delay(500);

      } catch (customerError) {
        const errorMessage = customerError instanceof Error ? customerError.message : "Erro desconhecido";
        
        // Log de falha
        try {
          await supabaseAdmin.from("welcome_email_logs").insert({
            email: customer.email.toLowerCase(),
            name: customer.name,
            platform: customer.platform,
            status: "failed",
            error_message: errorMessage,
            product_info: `Reenvio manual falhou`,
            locale: 'pt',
          });
        } catch {
          // ignore logging error
        }

        results.push({ email: customer.email, status: "failed", error: errorMessage });
        console.error(`   ❌ Erro ao enviar para ${customer.email}:`, errorMessage);
      }
    }

    const sentCount = results.filter(r => r.status === "sent").length;
    const failedCount = results.filter(r => r.status === "failed").length;
    const skippedCount = results.filter(r => r.status === "skipped").length;

    console.log(`\n📊 Resumo: ${sentCount} enviados, ${failedCount} falhas, ${skippedCount} ignorados`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: customers.length,
          sent: sentCount,
          failed: failedCount,
          skipped: skippedCount,
        },
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Erro geral:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

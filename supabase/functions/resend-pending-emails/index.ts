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
  'artes-musicos': { platform: 'musicos', locale: 'pt' },
  'hotmart-es': { platform: 'ferramentas_ia', locale: 'es' },
  'prompts': { platform: 'prompts', locale: 'pt' },
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    // Parse body - aceita lista de customers ou usa lista fixa
    const body = await req.json().catch(() => ({}));
    const customers: CustomerToResend[] = body.customers || [];

    if (customers.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum cliente fornecido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`📧 Iniciando reenvio para ${customers.length} clientes`);

    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const customer of customers) {
      try {
        // Determinar template baseado na plataforma
        const templateConfig = PLATFORM_TEMPLATE_MAP[customer.platform] || { platform: 'artes', locale: 'pt' };
        
        console.log(`\n📤 Processando: ${customer.email} (${customer.platform} -> ${templateConfig.platform})`);

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
          .eq("locale", templateConfig.locale)
          .maybeSingle();

        if (templateError || !template) {
          console.log(`   ⚠️ Template não encontrado para ${templateConfig.platform}/${templateConfig.locale}`);
          results.push({ email: customer.email, status: "failed", error: `Template não encontrado: ${templateConfig.platform}` });
          continue;
        }

        // Gerar tracking ID
        const trackingId = crypto.randomUUID();
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const trackingPixelUrl = `${supabaseUrl}/functions/v1/welcome-email-tracking?id=${trackingId}&action=open`;

        // Preparar conteúdo do email
        const productName = customer.product_id ? (PRODUCT_NAMES[customer.product_id] || `Produto #${customer.product_id}`) : 'Seu produto';
        
        let emailContent = template.content
          .replace(/\{\{name\}\}/g, customer.name || "Cliente")
          .replace(/\{\{email\}\}/g, customer.email)
          .replace(/\{\{product\}\}/g, productName);

        // Adicionar pixel de tracking
        if (emailContent.includes("</body>")) {
          emailContent = emailContent.replace(
            "</body>",
            `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" /></body>`
          );
        }

        // Enviar email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${template.sender_name} <${template.sender_email}>`,
            to: [customer.email],
            subject: template.subject,
            html: emailContent,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          throw new Error(`Resend error: ${errorText}`);
        }

        const emailResult = await emailResponse.json();

        // Gerar dedup_key para o registro
        const now = new Date();
        const minuteKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const dedupKey = `${customer.email}|${customer.platform}|resend|${minuteKey}`;

        // Registrar no log
        await supabaseAdmin.from("welcome_email_logs").insert({
          email: customer.email.toLowerCase(),
          name: customer.name,
          platform: customer.platform, // Usar a plataforma original para matching correto
          status: "sent",
          template_used: template.id,
          tracking_id: trackingId,
          product_info: `${productName} (reenvio manual)`,
          locale: templateConfig.locale,
          dedup_key: dedupKey,
        });

        results.push({ email: customer.email, status: "sent" });
        console.log(`   ✅ Email enviado com sucesso`);

        // Delay de 1 segundo para evitar rate limit
        await delay(1000);

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

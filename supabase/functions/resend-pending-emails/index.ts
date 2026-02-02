import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Lista dos clientes que faltam (os que deram rate limit)
const AFFECTED_CUSTOMERS = [
  { email: "studio.2023.inovacao@gmail.com", name: "Léo" },
  { email: "renatomizaelfotografia@gmail.com", name: "RENATO" },
  { email: "fabioxgomes@gmail.com", name: "Fabio" },
  { email: "lekfred@gmail.com", name: "LEKFRD" },
];

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

    // Buscar template ativo para artes (o template correto para artes-eventos)
    const { data: template, error: templateError } = await supabaseAdmin
      .from("welcome_email_templates")
      .select("*")
      .eq("platform", "artes")
      .eq("is_active", true)
      .eq("locale", "pt")
      .single();

    if (templateError || !template) {
      throw new Error(`Template não encontrado: ${templateError?.message}`);
    }

    const results: Array<{ email: string; status: string; error?: string }> = [];

    for (const customer of AFFECTED_CUSTOMERS) {
      try {
        // Verificar se já foi enviado (para não duplicar)
        const { data: existingLog } = await supabaseAdmin
          .from("welcome_email_logs")
          .select("id")
          .eq("email", customer.email)
          .eq("platform", "artes-eventos")
          .eq("status", "sent")
          .maybeSingle();

        if (existingLog) {
          results.push({ email: customer.email, status: "skipped", error: "Já enviado anteriormente" });
          continue;
        }

        // Gerar tracking ID
        const trackingId = crypto.randomUUID();
        const trackingPixelUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/welcome-email-tracking?id=${trackingId}&event=open`;

        // Preparar conteúdo do email
        let emailContent = template.content
          .replace(/\{\{name\}\}/g, customer.name || "Cliente")
          .replace(/\{\{email\}\}/g, customer.email);

        // Adicionar pixel de tracking
        emailContent = emailContent.replace(
          "</body>",
          `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" /></body>`
        );

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
        const dedupKey = `${customer.email}|artes-eventos|upscaler-arcano|${minuteKey}`;

        // Registrar no log
        await supabaseAdmin.from("welcome_email_logs").insert({
          email: customer.email,
          name: customer.name,
          platform: "artes-eventos",
          status: "sent",
          template_used: template.id,
          tracking_id: trackingId,
          product_info: "Upscaler Arcano (reenvio manual)",
          locale: "pt",
          dedup_key: dedupKey,
        });

        results.push({ email: customer.email, status: "sent" });
        console.log(`✅ Email enviado para ${customer.email}`);

        // Delay de 1 segundo para evitar rate limit
        await delay(1000);

      } catch (customerError) {
        const errorMessage = customerError instanceof Error ? customerError.message : "Erro desconhecido";
        results.push({ email: customer.email, status: "failed", error: errorMessage });
        console.error(`❌ Erro ao enviar para ${customer.email}:`, errorMessage);
      }
    }

    const sentCount = results.filter(r => r.status === "sent").length;
    const failedCount = results.filter(r => r.status === "failed").length;
    const skippedCount = results.filter(r => r.status === "skipped").length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: AFFECTED_CUSTOMERS.length,
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

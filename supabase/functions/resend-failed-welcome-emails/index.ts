import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SendPulse credentials
const SENDPULSE_CLIENT_ID = Deno.env.get("SENDPULSE_CLIENT_ID");
const SENDPULSE_CLIENT_SECRET = Deno.env.get("SENDPULSE_CLIENT_SECRET");

interface FailedEmail {
  id: string;
  email: string;
  name: string | null;
  platform: string;
  product_info: string | null;
}

// Get SendPulse access token
async function getSendPulseToken(): Promise<string> {
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: SENDPULSE_CLIENT_ID,
      client_secret: SENDPULSE_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get SendPulse token: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Platform configurations
const platformConfig: Record<string, { 
  senderName: string; 
  senderEmail: string;
  loginUrl: string;
  heading: string;
  footer: string;
}> = {
  artes: {
    senderName: "Biblioteca de Artes Arcanas",
    senderEmail: "contato@voxvisual.com.br",
    loginUrl: "https://arcanolab.voxvisual.com.br/login-artes",
    heading: "Bem-vindo à Biblioteca de Artes Arcanas!",
    footer: "Biblioteca de Artes Arcanas - Sua fonte de artes editáveis",
  },
  ferramentas_ia: {
    senderName: "Ferramentas IA Arcanas",
    senderEmail: "contato@voxvisual.com.br",
    loginUrl: "https://arcanolab.voxvisual.com.br/ferramentas-ia",
    heading: "Bem-vindo às Ferramentas IA Arcanas!",
    footer: "Ferramentas IA Arcanas - Potencialize sua criatividade",
  },
  promptverso: {
    senderName: "Promptverso",
    senderEmail: "contato@voxvisual.com.br",
    loginUrl: "https://arcanolab.voxvisual.com.br/login",
    heading: "Bem-vindo ao Promptverso!",
    footer: "Promptverso - Sua biblioteca de prompts",
  },
};

// Build welcome email HTML
function buildWelcomeEmailHtml(
  email: string,
  name: string | null,
  platform: string,
  productInfo: string | null
): string {
  const config = platformConfig[platform] || platformConfig.artes;
  const packInfo = productInfo || "Acesso Completo";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #1a1a2e; color: #333; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .logo { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }
    .logo h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .credentials { background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; }
    .credentials h3 { margin-top: 0; color: #333; }
    .highlight { background: #667eea; color: white; padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 16px; }
    .cta-button { display: block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 30px; font-weight: bold; text-align: center; margin: 24px 0; font-size: 16px; }
    .warning { background: #fef3cd; border-radius: 8px; padding: 12px; margin-top: 16px; }
    .warning p { color: #92400e; font-size: 13px; margin: 0; }
    .pack-badge { background: #d4af37; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 16px; }
    .footer { color: #666; font-size: 13px; text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>🎨 ${config.heading}</h1>
    </div>
    <div class="content">
      <p>Olá${name ? ` <strong>${name}</strong>` : ''}!</p>
      
      <p>Sua compra foi confirmada e seu acesso já está liberado!</p>
      
      <div style="text-align: center;">
        <span class="pack-badge">✨ ${packInfo}</span>
      </div>
      
      <div class="credentials">
        <h3>📋 Dados do seu acesso:</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Senha:</strong> <span class="highlight">${email}</span></p>
        <div class="warning">
          <p>⚠️ <strong>Importante:</strong> Por segurança, você deverá trocar sua senha no primeiro acesso.</p>
        </div>
      </div>
      
      <a href="${config.loginUrl}" class="cta-button">
        🚀 Acessar Agora
      </a>
      
      <p style="text-align: center; color: #666;">
        Clique no botão acima para fazer seu primeiro login!
      </p>
      
      <div class="footer">
        <p>${config.footer}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get failed welcome emails from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: failedEmails, error: fetchError } = await supabase
      .from("welcome_email_logs")
      .select("id, email, name, platform, product_info")
      .eq("status", "failed")
      .gte("sent_at", sevenDaysAgo.toISOString())
      .order("sent_at", { ascending: false });

    if (fetchError) {
      throw new Error(`Error fetching failed emails: ${fetchError.message}`);
    }

    if (!failedEmails || failedEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No failed emails to resend", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get SendPulse token
    const token = await getSendPulseToken();

    const results = {
      total: failedEmails.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as string[],
    };

    // Group by email to avoid duplicates
    const uniqueEmails = new Map<string, FailedEmail>();
    for (const email of failedEmails) {
      if (!uniqueEmails.has(email.email)) {
        uniqueEmails.set(email.email, email);
      }
    }

    results.total = uniqueEmails.size;

    for (const [emailAddress, failedEmail] of uniqueEmails) {
      try {
        // Check if already successfully sent
        const { data: successLog } = await supabase
          .from("welcome_email_logs")
          .select("id")
          .eq("email", emailAddress)
          .eq("status", "sent")
          .gte("sent_at", sevenDaysAgo.toISOString())
          .limit(1);

        if (successLog && successLog.length > 0) {
          results.skipped++;
          results.details.push(`${emailAddress}: Already received welcome email`);
          continue;
        }

        const config = platformConfig[failedEmail.platform] || platformConfig.artes;
        const html = buildWelcomeEmailHtml(
          emailAddress,
          failedEmail.name,
          failedEmail.platform,
          failedEmail.product_info
        );
        const htmlBase64 = btoa(unescape(encodeURIComponent(html)));

        const emailPayload = {
          email: {
            subject: `🎉 ${config.heading.replace("!", "")} - Seus dados de acesso`,
            from: { name: config.senderName, email: config.senderEmail },
            to: [{ email: emailAddress, name: failedEmail.name || emailAddress }],
            html: htmlBase64,
          },
        };

        const sendResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(emailPayload),
        });

        const sendResult = await sendResponse.json();

        if (sendResponse.ok && sendResult.result === true) {
          results.sent++;
          results.details.push(`${emailAddress}: Sent successfully`);

          // Log successful resend
          await supabase.from("welcome_email_logs").insert({
            email: emailAddress,
            name: failedEmail.name,
            platform: failedEmail.platform,
            product_info: failedEmail.product_info,
            status: "sent",
            template_used: "resend_recovery",
          });
        } else {
          results.failed++;
          results.details.push(`${emailAddress}: Failed - ${JSON.stringify(sendResult)}`);
        }
      } catch (error: any) {
        results.failed++;
        results.details.push(`${emailAddress}: Error - ${error.message}`);
      }
    }

    console.log("Resend results:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in resend-failed-welcome-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

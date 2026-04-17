import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout:${label}`)), ms)),
  ]);
}

// SendPulse OAuth2 token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSendPulseToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  const response = await withTimeout(fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: Deno.env.get("SENDPULSE_CLIENT_ID"),
      client_secret: Deno.env.get("SENDPULSE_CLIENT_SECRET"),
    }),
  }), 8000, "sendpulse_token");

  if (!response.ok) {
    const errorText = await response.text();
    console.error("SendPulse token error:", errorText);
    throw new Error(`Failed to get SendPulse token: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 3300000,
  };

  return data.access_token;
}

function buildRecoveryEmailHtml(recoveryLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0D0221;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0221;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:500px;background-color:#1A0A2E;border-radius:12px;border:1px solid rgba(139,92,246,0.2);padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="color:#ffffff;font-size:24px;margin:0;">🔐 Crie sua senha</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#c4b5fd;font-size:16px;line-height:1.6;margin:0;text-align:center;">
            Clique no botão abaixo para criar sua senha e acessar a plataforma.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${recoveryLink}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
            Criar minha senha
          </a>
        </td></tr>
        <tr><td>
          <p style="color:#7c3aed;font-size:13px;text-align:center;margin:0;">
            Se o botão não funcionar, copie e cole este link no navegador:
          </p>
          <p style="color:#a78bfa;font-size:12px;text-align:center;word-break:break-all;margin:8px 0 0 0;">
            ${recoveryLink}
          </p>
        </td></tr>
        <tr><td style="padding-top:32px;border-top:1px solid rgba(139,92,246,0.2);margin-top:32px;">
          <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">
            Este link expira em 24 horas. Se você não solicitou este email, ignore-o.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirect_url } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`[send-recovery-email] Generating recovery link for: ${normalizedEmail}`);

    if (!Deno.env.get("SENDPULSE_CLIENT_ID") || !Deno.env.get("SENDPULSE_CLIENT_SECRET")) {
      throw new Error("Configuração de email indisponível");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check blacklist
    const { data: blacklisted } = await supabaseAdmin
      .from("blacklisted_emails")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (blacklisted) {
      console.log(`[send-recovery-email] Email ${normalizedEmail} is blacklisted`);
      return new Response(
        JSON.stringify({ success: false, error: "Email bloqueado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate recovery link via admin API
    const { data: linkData, error: linkError } = await withTimeout(supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: redirect_url || undefined,
      },
    }), 10000, "generate_recovery_link");

    if (linkError) {
      console.error("[send-recovery-email] generateLink error:", linkError);
      return new Response(
        JSON.stringify({ success: false, error: linkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      console.error("[send-recovery-email] No action_link in response:", JSON.stringify(linkData));
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate recovery link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract token_hash from the action_link to build a safe URL
    // Gmail/Outlook prefetch bots consume /verify links, so we redirect to the app page instead
    const actionUrl = new URL(actionLink);
    const tokenHash = actionUrl.searchParams.get("token") || actionUrl.searchParams.get("token_hash");
    const type = actionUrl.searchParams.get("type") || "recovery";

    // Build safe recovery link pointing to the app's reset page
    const baseRedirectUrl = redirect_url || "https://arcanoapp.voxvisual.com.br/reset-password";
    const safeUrl = new URL(baseRedirectUrl);
    if (tokenHash) {
      safeUrl.searchParams.set("token_hash", tokenHash);
    }
    safeUrl.searchParams.set("type", type);
    const recoveryLink = safeUrl.toString();

    console.log(`[send-recovery-email] Safe recovery link generated (token_hash flow)`);

    // Build email HTML
    const htmlContent = buildRecoveryEmailHtml(recoveryLink);

    // Send via SendPulse
    const token = await getSendPulseToken();
    const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

    const emailPayload = {
      email: {
        html: htmlBase64,
        text: "",
        subject: "🔐 Crie sua senha - Primeiro Acesso",
        from: { name: "Arcano App", email: "contato@voxvisual.com.br" },
        to: [{ name: normalizedEmail, email: normalizedEmail }],
      },
    };

    const sendResponse = await withTimeout(fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(emailPayload),
    }), 10000, "sendpulse_send_email");

    const sendResult = await sendResponse.text();
    console.log(`[send-recovery-email] SendPulse response: ${sendResponse.status} - ${sendResult}`);

    if (!sendResponse.ok) {
      throw new Error(sendResult || `Email provider error: ${sendResponse.status}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-recovery-email] Error:", error);
    const message = typeof error?.message === "string" && error.message.startsWith("timeout:")
      ? "Tempo excedido ao processar o email de recuperação"
      : (error?.message || "Erro ao enviar email de recuperação");
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

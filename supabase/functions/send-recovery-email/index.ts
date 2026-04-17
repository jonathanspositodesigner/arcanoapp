import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_NAME = "Arcano App";
const FROM_EMAIL = "contato@voxvisual.com.br";
const RESEND_FROM = `${FROM_NAME} <${FROM_EMAIL}>`;
const RECOVERY_SUBJECT = "🔐 Crie sua senha - Primeiro Acesso";

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout:${label}`)), ms)),
  ]);
}

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

async function sendViaResend(toEmail: string, htmlContent: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("Configuração Resend indisponível");
  }

  const response = await withTimeout(fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [toEmail],
      subject: RECOVERY_SUBJECT,
      html: htmlContent,
    }),
  }), 10000, "resend_send_email");

  const responseText = await response.text();
  console.log(`[send-recovery-email] Resend response: ${response.status} - ${responseText}`);

  if (!response.ok) {
    throw new Error(responseText || `Resend error: ${response.status}`);
  }

  return { provider: "resend" };
}

async function sendViaSendPulse(toEmail: string, htmlContent: string) {
  const token = await getSendPulseToken();
  const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

  const emailPayload = {
    email: {
      html: htmlBase64,
      text: "",
      subject: RECOVERY_SUBJECT,
      from: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ name: toEmail, email: toEmail }],
    },
  };

  const response = await withTimeout(fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(emailPayload),
  }), 10000, "sendpulse_send_email");

  const responseText = await response.text();
  console.log(`[send-recovery-email] SendPulse response: ${response.status} - ${responseText}`);

  if (!response.ok) {
    throw new Error(responseText || `SendPulse error: ${response.status}`);
  }

  return { provider: "sendpulse" };
}

async function deliverRecoveryEmail(toEmail: string, recoveryLink: string) {
  const htmlContent = buildRecoveryEmailHtml(recoveryLink);
  const attempts = [
    () => sendViaResend(toEmail, htmlContent),
    () => sendViaSendPulse(toEmail, htmlContent),
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      console.log(`[send-recovery-email] Delivery succeeded via ${result.provider} for ${toEmail}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error("[send-recovery-email] Delivery attempt failed:", error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Erro ao enviar email de recuperação");
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    const actionUrl = new URL(actionLink);
    const tokenHash = actionUrl.searchParams.get("token") || actionUrl.searchParams.get("token_hash");
    const type = actionUrl.searchParams.get("type") || "recovery";

    const baseRedirectUrl = redirect_url || "https://arcanoapp.voxvisual.com.br/reset-password";
    const safeUrl = new URL(baseRedirectUrl);
    if (tokenHash) {
      safeUrl.searchParams.set("token_hash", tokenHash);
    }
    safeUrl.searchParams.set("type", type);
    const recoveryLink = safeUrl.toString();

    console.log("[send-recovery-email] Safe recovery link generated (token_hash flow)");

    const delivery = await deliverRecoveryEmail(normalizedEmail, recoveryLink);

    return new Response(
      JSON.stringify({ success: true, provider: delivery.provider }),
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

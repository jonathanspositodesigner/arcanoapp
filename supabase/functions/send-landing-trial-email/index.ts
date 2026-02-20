import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getSendPulseToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: Deno.env.get("SENDPULSE_CLIENT_ID"),
      client_secret: Deno.env.get("SENDPULSE_CLIENT_SECRET"),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("SendPulse token error:", errorText);
    throw new Error(`Failed to get SendPulse token: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 3300000 };
  return data.access_token;
}

function buildTrialEmailHtml(confirmLink: string, name: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0D0221;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0221;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:500px;background-color:#1A0A2E;border-radius:12px;border:1px solid rgba(236,72,153,0.3);padding:40px;">
        <tr><td align="center" style="padding-bottom:8px;">
          <div style="font-size:48px;">🎉</div>
        </td></tr>
        <tr><td align="center" style="padding-bottom:16px;">
          <h1 style="color:#ffffff;font-size:22px;margin:0;">Ative seu Teste Grátis</h1>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <p style="color:#c4b5fd;font-size:15px;line-height:1.6;margin:0;text-align:center;">
            Olá <strong style="color:#f0abfc;">${name}</strong>! Seu teste grátis do <strong style="color:#ec4899;">Arcano Cloner</strong> está quase pronto.
          </p>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <table width="100%" style="background:rgba(236,72,153,0.1);border:1px solid rgba(236,72,153,0.2);border-radius:8px;padding:16px;">
            <tr><td align="center">
              <p style="color:#f0abfc;font-size:14px;margin:0 0 4px 0;font-weight:bold;">O que você recebe:</p>
              <p style="color:#ffffff;font-size:20px;margin:0;font-weight:bold;">240 créditos gratuitos</p>
              <p style="color:#ec4899;font-size:13px;margin:4px 0 0 0;">⏱️ Válidos por 24 horas</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${confirmLink}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
            🚀 Ativar Teste Grátis
          </a>
        </td></tr>
        <tr><td>
          <p style="color:#7c3aed;font-size:13px;text-align:center;margin:0;">
            Se o botão não funcionar, copie e cole este link:
          </p>
          <p style="color:#a78bfa;font-size:11px;text-align:center;word-break:break-all;margin:8px 0 0 0;">
            ${confirmLink}
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;border-top:1px solid rgba(139,92,246,0.2);margin-top:24px;">
          <p style="color:#6b7280;font-size:11px;text-align:center;margin:0;">
            Este link expira em 24 horas. Após ativar, seus 240 créditos serão válidos por mais 24h.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, whatsapp } = await req.json();

    if (!name || !email || !whatsapp) {
      return new Response(
        JSON.stringify({ success: false, error: "Todos os campos são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (name.length > 100 || whatsapp.length > 30) {
      return new Response(
        JSON.stringify({ success: false, error: "Dados inválidos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from("landing_cloner_trials")
      .select("id, confirmed_at, created_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      if (existing.confirmed_at) {
        return new Response(
          JSON.stringify({ success: false, error: "Este email já foi cadastrado e confirmado" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limit: 2 min between resends
      const createdAt = new Date(existing.created_at).getTime();
      if (Date.now() - createdAt < 120000) {
        return new Response(
          JSON.stringify({ success: false, error: "Aguarde 2 minutos antes de reenviar" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update token and resend
      const newToken = crypto.randomUUID();
      const newExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("landing_cloner_trials")
        .update({
          token: newToken,
          token_expires_at: newExpires,
          created_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const confirmLink = `${supabaseUrl}/functions/v1/confirm-landing-trial?token=${newToken}`;
      const htmlContent = buildTrialEmailHtml(confirmLink, name);

      const sendPulseToken = await getSendPulseToken();
      const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

      await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sendPulseToken}`,
        },
        body: JSON.stringify({
          email: {
            html: htmlBase64,
            text: "",
            subject: "🎉 Ative seu Teste Grátis - Arcano Cloner",
            from: { name: "Arcano App", email: "contato@voxvisual.com.br" },
            to: [{ name: name.trim(), email: normalizedEmail }],
          },
        }),
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // New registration
    const token = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("landing_cloner_trials")
      .insert({
        email: normalizedEmail,
        name: name.trim().substring(0, 100),
        whatsapp: whatsapp.trim().substring(0, 30),
        token,
        token_expires_at: tokenExpiresAt,
      });

    if (insertError) {
      console.error("[send-landing-trial-email] Insert error:", insertError);
      throw new Error("Failed to create trial record");
    }

    // Build confirmation link
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const confirmLink = `${supabaseUrl}/functions/v1/confirm-landing-trial?token=${token}`;
    const htmlContent = buildTrialEmailHtml(confirmLink, name.trim());

    // Send via SendPulse
    const sendPulseToken = await getSendPulseToken();
    const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

    const sendResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sendPulseToken}`,
      },
      body: JSON.stringify({
        email: {
          html: htmlBase64,
          text: "",
          subject: "🎉 Ative seu Teste Grátis - Arcano Cloner",
          from: { name: "Arcano App", email: "contato@voxvisual.com.br" },
          to: [{ name: name.trim(), email: normalizedEmail }],
        },
      }),
    });

    const sendResult = await sendResponse.text();
    console.log(`[send-landing-trial-email] SendPulse response: ${sendResponse.status} - ${sendResult}`);

    if (!sendResponse.ok) {
      throw new Error(`SendPulse error: ${sendResult}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-landing-trial-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

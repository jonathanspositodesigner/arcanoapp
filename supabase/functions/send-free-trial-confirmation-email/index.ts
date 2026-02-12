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
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 3300000,
  };

  return data.access_token;
}

function buildFreeTrialEmailHtml(confirmLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0D0221;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0221;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:500px;background-color:#1A0A2E;border-radius:12px;border:1px solid rgba(139,92,246,0.2);padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="font-size:48px;margin-bottom:12px;">🎁</div>
          <h1 style="color:#ffffff;font-size:24px;margin:0;">Confirme e Resgate seus Créditos!</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#c4b5fd;font-size:16px;line-height:1.6;margin:0;text-align:center;">
            Clique no botão abaixo para confirmar seu email e receber <strong style="color:#ffffff;">300 créditos grátis</strong> para usar nas ferramentas de IA.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${confirmLink}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:8px;font-size:18px;font-weight:bold;">
            🎉 Confirmar Email e Resgatar Créditos
          </a>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <div style="background:rgba(139,92,246,0.15);border-radius:8px;padding:16px;border:1px solid rgba(139,92,246,0.2);">
            <p style="color:#a78bfa;font-size:14px;text-align:center;margin:0;">
              ⏳ Créditos válidos por 1 mês após o resgate
            </p>
          </div>
        </td></tr>
        <tr><td>
          <p style="color:#7c3aed;font-size:13px;text-align:center;margin:0;">
            Se o botão não funcionar, copie e cole este link no navegador:
          </p>
          <p style="color:#a78bfa;font-size:12px;text-align:center;word-break:break-all;margin:8px 0 0 0;">
            ${confirmLink}
          </p>
        </td></tr>
        <tr><td style="padding-top:32px;border-top:1px solid rgba(139,92,246,0.2);margin-top:32px;">
          <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">
            Este link expira em 24 horas. Se você não criou esta conta, ignore este email.
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
    const { email, user_id } = await req.json();

    if (!email || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "email and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`[send-free-trial-confirmation-email] Sending to: ${normalizedEmail}, user: ${user_id}`);

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
      console.log(`[send-free-trial-confirmation-email] Email ${normalizedEmail} is blacklisted`);
      return new Response(
        JSON.stringify({ success: false, error: "Email bloqueado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalidate any existing tokens for this user
    await supabaseAdmin
      .from("email_confirmation_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .is("used_at", null);

    // Generate new token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("email_confirmation_tokens")
      .insert({
        user_id,
        email: normalizedEmail,
        token,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("[send-free-trial-confirmation-email] Token insert error:", insertError);
      throw new Error("Failed to create confirmation token");
    }

    // Build confirmation link - points to the FREE TRIAL confirm function
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const confirmLink = `${supabaseUrl}/functions/v1/confirm-email-free-trial?token=${token}`;

    // Build email HTML
    const htmlContent = buildFreeTrialEmailHtml(confirmLink);

    // Send via SendPulse
    const sendPulseToken = await getSendPulseToken();
    const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

    const emailPayload = {
      email: {
        html: htmlBase64,
        text: "",
        subject: "🎁 Confirme seu email e resgate 300 créditos grátis!",
        from: { name: "Arcano App", email: "contato@voxvisual.com.br" },
        to: [{ name: normalizedEmail, email: normalizedEmail }],
      },
    };

    const sendResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sendPulseToken}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const sendResult = await sendResponse.text();
    console.log(`[send-free-trial-confirmation-email] SendPulse response: ${sendResponse.status} - ${sendResult}`);

    if (!sendResponse.ok) {
      throw new Error(`SendPulse error: ${sendResult}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-free-trial-confirmation-email] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const REDIRECT_URL = "https://arcanoapp.voxvisual.com.br/ferramentas-ia-aplicativo";

function buildSuccessHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Créditos Resgatados!</title>
</head>
<body style="margin:0;padding:0;background-color:#0D0221;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0221;padding:40px 20px;min-height:100vh;">
    <tr><td align="center" valign="middle">
      <table width="100%" style="max-width:500px;background-color:#1A0A2E;border-radius:12px;border:1px solid rgba(139,92,246,0.2);padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="font-size:64px;margin-bottom:16px;">🎉</div>
          <h1 style="color:#ffffff;font-size:24px;margin:0;">Créditos Resgatados!</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#c4b5fd;font-size:16px;line-height:1.6;margin:0;text-align:center;">
            Seu email foi confirmado e seus <strong style="color:#ffffff;">300 créditos grátis</strong> já estão na sua conta. Faça login para começar a usar!
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${REDIRECT_URL}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
            Ir para as Ferramentas de IA
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildErrorHtml(message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro na Confirmação</title>
</head>
<body style="margin:0;padding:0;background-color:#0D0221;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0221;padding:40px 20px;min-height:100vh;">
    <tr><td align="center" valign="middle">
      <table width="100%" style="max-width:500px;background-color:#1A0A2E;border-radius:12px;border:1px solid rgba(139,92,246,0.2);padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="font-size:64px;margin-bottom:16px;">❌</div>
          <h1 style="color:#ffffff;font-size:24px;margin:0;">Erro na Confirmação</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#c4b5fd;font-size:16px;line-height:1.6;margin:0;text-align:center;">
            ${message}
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${REDIRECT_URL}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
            Ir para a Plataforma
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(buildErrorHtml("Token não fornecido."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    console.log(`[confirm-email-free-trial] Validating token: ${token.substring(0, 8)}...`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("email_confirmation_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error("[confirm-email-free-trial] Token not found:", tokenError);
      return new Response(buildErrorHtml("Link inválido ou já utilizado. Tente criar uma nova conta."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Check if already used - still show success since it was already processed
    if (tokenData.used_at) {
      console.log("[confirm-email-free-trial] Token already used, redirecting to login");
      return new Response(buildSuccessHtml(), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("[confirm-email-free-trial] Token expired");
      return new Response(buildErrorHtml("Este link expirou. Tente criar uma nova conta para receber um novo link."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Mark token as used
    await supabaseAdmin
      .from("email_confirmation_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    // Update profile email_verified
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", tokenData.user_id);

    if (updateError) {
      console.error("[confirm-email-free-trial] Profile update error:", updateError);
      return new Response(buildErrorHtml("Erro ao confirmar email. Tente novamente."), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    console.log(`[confirm-email-free-trial] Email confirmed for user: ${tokenData.user_id}`);

    // === CLAIM FREE TRIAL CREDITS ===
    try {
      const { data: claimResult, error: claimError } = await supabaseAdmin
        .rpc('claim_arcano_free_trial_atomic', {
          p_user_id: tokenData.user_id,
          p_email: tokenData.email,
        });

      if (claimError) {
        console.error("[confirm-email-free-trial] Claim error:", claimError);
        // Don't fail the whole flow - email is already confirmed
      } else {
        console.log(`[confirm-email-free-trial] Claim result:`, claimResult);
      }
    } catch (claimErr) {
      console.error("[confirm-email-free-trial] Claim exception:", claimErr);
      // Don't fail - email is confirmed, credits can be claimed later
    }

    // === GENERATE MAGIC LINK FOR AUTO-LOGIN ===
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: tokenData.email,
        options: {
          redirectTo: REDIRECT_URL,
        },
      });

      if (linkError || !linkData) {
        console.error("[confirm-email-free-trial] Magic link error:", linkError);
        // Fallback: redirect to tool page (user will need to login manually)
        return new Response(buildSuccessHtml(), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // The hashed_token from generateLink needs to be used with the Supabase auth verify endpoint
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const magicLinkRedirect = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(REDIRECT_URL)}`;

      console.log(`[confirm-email-free-trial] Redirecting to magic link for auto-login`);

      return new Response(null, {
        status: 302,
        headers: { "Location": magicLinkRedirect },
      });
    } catch (magicErr) {
      console.error("[confirm-email-free-trial] Magic link exception:", magicErr);
      // Fallback: show success page with login button
      return new Response(buildSuccessHtml(), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch (error: any) {
    console.error("[confirm-email-free-trial] Error:", error);
    return new Response(buildErrorHtml("Erro interno. Tente novamente mais tarde."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

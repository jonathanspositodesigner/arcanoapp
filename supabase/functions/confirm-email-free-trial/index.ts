import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DEFAULT_REDIRECT_URL = "https://arcanoapp.voxvisual.com.br/";
const BASE_URL = "https://arcanoapp.voxvisual.com.br";

function buildSuccessHtml(redirectUrl: string): string {
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
            Seu email foi confirmado e seus <strong style="color:#ffffff;">300 créditos grátis</strong> já estão na sua conta. Válidos por 24 horas!
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${redirectUrl}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
            Ir para as Ferramentas de IA
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildErrorHtml(message: string, redirectUrl: string): string {
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
          <a href="${redirectUrl}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
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
      return new Response(buildErrorHtml("Token não fornecido.", DEFAULT_REDIRECT_URL), {
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
      return new Response(buildErrorHtml("Link inválido ou já utilizado. Tente criar uma nova conta.", DEFAULT_REDIRECT_URL), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Determine redirect URL from token's redirect_path or use default
    const redirectUrl = tokenData.redirect_path
      ? `${BASE_URL}${tokenData.redirect_path}`
      : DEFAULT_REDIRECT_URL;

    // Check if already used - still show success since it was already processed
    if (tokenData.used_at) {
      console.log("[confirm-email-free-trial] Token already used, redirecting to login");
      return new Response(buildSuccessHtml(redirectUrl), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("[confirm-email-free-trial] Token expired");
      return new Response(buildErrorHtml("Este link expirou. Tente criar uma nova conta para receber um novo link.", redirectUrl), {
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
      return new Response(buildErrorHtml("Erro ao confirmar email. Tente novamente.", redirectUrl), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    console.log(`[confirm-email-free-trial] Email confirmed for user: ${tokenData.user_id}`);

    // === CLAIM FREE TRIAL CREDITS (with fallback) ===
    let creditsClaimed = false;
    try {
      const { data: claimResult, error: claimError } = await supabaseAdmin
        .rpc('claim_arcano_free_trial_atomic', {
          p_user_id: tokenData.user_id,
          p_email: tokenData.email,
        });

      if (claimError) {
        console.error("[confirm-email-free-trial] RPC error, using fallback:", claimError);
      } else if (claimResult?.[0]?.already_claimed) {
        console.log(`[confirm-email-free-trial] Already claimed for ${tokenData.email}`);
        creditsClaimed = true;
      } else {
        console.log(`[confirm-email-free-trial] RPC claim result:`, claimResult);
        creditsClaimed = true;
      }
    } catch (claimErr) {
      console.error("[confirm-email-free-trial] RPC exception:", claimErr);
    }

    // Fallback: direct insert with service_role if RPC failed
    if (!creditsClaimed) {
      try {
        console.log(`[confirm-email-free-trial] Fallback: direct insert for ${tokenData.user_id}`);

        await supabaseAdmin
          .from("arcano_cloner_free_trials")
          .insert({
            user_id: tokenData.user_id,
            email: tokenData.email,
            credits_granted: 300,
          });

        const { error: creditError } = await supabaseAdmin
          .from("upscaler_credits")
          .upsert(
            {
              user_id: tokenData.user_id,
              monthly_balance: 300,
              lifetime_balance: 0,
              balance: 300,
              landing_trial_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (creditError) {
          console.error("[confirm-email-free-trial] Fallback credit upsert error:", creditError);
        } else {
          await supabaseAdmin
            .from("upscaler_credit_transactions")
            .insert({
              user_id: tokenData.user_id,
              amount: 300,
              balance_type: "monthly",
              type: "grant",
              description: "300 créditos grátis - válidos por 24h (fallback)",
            });
          creditsClaimed = true;
          console.log(`[confirm-email-free-trial] Fallback succeeded for ${tokenData.user_id}`);
        }
      } catch (fallbackErr) {
        console.error("[confirm-email-free-trial] Fallback exception:", fallbackErr);
      }
    }

    // === GENERATE MAGIC LINK FOR AUTO-LOGIN ===
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: tokenData.email,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (linkError || !linkData) {
        console.error("[confirm-email-free-trial] Magic link error:", linkError);
        return new Response(buildSuccessHtml(redirectUrl), {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const magicLinkRedirect = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(redirectUrl)}`;

      console.log(`[confirm-email-free-trial] Redirecting to magic link for auto-login -> ${redirectUrl}`);

      return new Response(null, {
        status: 302,
        headers: { "Location": magicLinkRedirect },
      });
    } catch (magicErr) {
      console.error("[confirm-email-free-trial] Magic link exception:", magicErr);
      return new Response(buildSuccessHtml(redirectUrl), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch (error: any) {
    console.error("[confirm-email-free-trial] Error:", error);
    return new Response(buildErrorHtml("Erro interno. Tente novamente mais tarde.", DEFAULT_REDIRECT_URL), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

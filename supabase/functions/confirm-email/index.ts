import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function buildSuccessHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Confirmado!</title>
</head>
<body style="margin:0;padding:0;background-color:#0D0221;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0221;padding:40px 20px;min-height:100vh;">
    <tr><td align="center" valign="middle">
      <table width="100%" style="max-width:500px;background-color:#1A0A2E;border-radius:12px;border:1px solid rgba(139,92,246,0.2);padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="font-size:64px;margin-bottom:16px;">✅</div>
          <h1 style="color:#ffffff;font-size:24px;margin:0;">Email Confirmado!</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#c4b5fd;font-size:16px;line-height:1.6;margin:0;text-align:center;">
            Sua conta foi ativada com sucesso. Agora você pode fazer login na plataforma.
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="https://arcanoapp.voxvisual.com.br/" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
            Ir para o Login
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
          <a href="https://arcanoapp.voxvisual.com.br/" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:bold;">
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

    console.log(`[confirm-email] Validating token: ${token.substring(0, 8)}...`);

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
      console.error("[confirm-email] Token not found:", tokenError);
      return new Response(buildErrorHtml("Link inválido ou já utilizado. Tente criar uma nova conta."), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Check if already used
    if (tokenData.used_at) {
      console.log("[confirm-email] Token already used, redirecting to home");
      return new Response(null, {
        status: 302,
        headers: { "Location": "https://arcanoapp.voxvisual.com.br/" },
      });
    }

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("[confirm-email] Token expired");
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
      console.error("[confirm-email] Profile update error:", updateError);
      return new Response(buildErrorHtml("Erro ao confirmar email. Tente novamente."), {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    console.log(`[confirm-email] Email confirmed for user: ${tokenData.user_id}`);

    // Grant 300 free monthly credits for new users (Planos v2 - Free plan)
    try {
      // Check if user already has a planos2 subscription
      const { data: existingSub } = await supabaseAdmin
        .from("planos2_subscriptions")
        .select("id")
        .eq("user_id", tokenData.user_id)
        .maybeSingle();

      if (!existingSub) {
        // Create free plan subscription
        await supabaseAdmin
          .from("planos2_subscriptions")
          .insert({
            user_id: tokenData.user_id,
            plan_slug: "free",
            is_active: true,
            credits_per_month: 100,
            daily_prompt_limit: 0,
            has_image_generation: false,
            has_video_generation: false,
          });

        // Grant 300 monthly credits only if user has no credits yet
        const { data: existingCredits } = await supabaseAdmin
          .from("upscaler_credits")
          .select("balance")
          .eq("user_id", tokenData.user_id)
          .maybeSingle();

        if (!existingCredits || existingCredits.balance === 0) {
          await supabaseAdmin.rpc("reset_upscaler_credits", {
            _user_id: tokenData.user_id,
            _amount: 300,
            _description: "Créditos iniciais - Plano Free (300 de boas-vindas)",
          });
          console.log(`[confirm-email] Granted 300 free monthly credits to user: ${tokenData.user_id}`);
        } else {
          console.log(`[confirm-email] User already has credits, skipping free grant: ${tokenData.user_id}`);
        }
      } else {
        console.log(`[confirm-email] User already has planos2 subscription, skipping: ${tokenData.user_id}`);
      }
    } catch (freeErr) {
      // Don't block email confirmation if free credits fail
      console.error("[confirm-email] Error granting free credits (non-blocking):", freeErr);
    }

    // Redirect directly to the app homepage
    return new Response(null, {
      status: 302,
      headers: { "Location": "https://arcanoapp.voxvisual.com.br/" },
    });
  } catch (error: any) {
    console.error("[confirm-email] Error:", error);
    return new Response(buildErrorHtml("Erro interno. Tente novamente mais tarde."), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

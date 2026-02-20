import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_AMOUNT = 240;
const CREDITS_EXPIRY_HOURS = 24;

// Get the app URL for redirects
function getAppUrl(): string {
  return "https://arcanoapp.com.br";
}

function errorPage(message: string): Response {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Erro</title></head>
<body style="margin:0;padding:40px 20px;background:#0D0221;font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="max-width:400px;background:#1A0A2E;border-radius:12px;border:1px solid rgba(236,72,153,0.3);padding:40px;text-align:center;">
    <div style="font-size:48px;margin-bottom:16px;">❌</div>
    <h1 style="color:#fff;font-size:20px;margin:0 0 12px 0;">Ops!</h1>
    <p style="color:#c4b5fd;font-size:14px;margin:0 0 24px 0;">${message}</p>
    <a href="${getAppUrl()}/arcanocloner-teste" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#8b5cf6);color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;">
      Voltar para a página
    </a>
  </div>
</body>
</html>`;
  return new Response(html, { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      return errorPage("Link inválido.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Validate token
    const { data: trial, error: trialError } = await supabaseAdmin
      .from("landing_cloner_trials")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (trialError || !trial) {
      console.error("[confirm-landing-trial] Token not found:", token);
      return errorPage("Link inválido ou expirado.");
    }

    if (trial.confirmed_at) {
      // Already confirmed - redirect to app
      return new Response(null, {
        status: 302,
        headers: { Location: `${getAppUrl()}/arcano-cloner` },
      });
    }

    if (new Date(trial.token_expires_at) < new Date()) {
      return errorPage("Este link expirou. Cadastre-se novamente na página do Arcano Cloner.");
    }

    const email = trial.email;
    const name = trial.name;

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[confirm-landing-trial] User already exists: ${userId}`);
    } else {
      // Create new user with email as password
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: email,
        email_confirm: true,
        user_metadata: { name },
      });

      if (createError) {
        console.error("[confirm-landing-trial] Create user error:", createError);
        return errorPage("Erro ao criar sua conta. Tente novamente.");
      }

      userId = newUser.user.id;

      // Create profile
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email,
        name,
        email_verified: true,
        password_changed: false,
      }, { onConflict: "id" });
    }

    // Mark trial as confirmed
    await supabaseAdmin
      .from("landing_cloner_trials")
      .update({
        confirmed_at: new Date().toISOString(),
        user_id: userId,
        credits_granted: CREDITS_AMOUNT,
        credits_expire_at: new Date(Date.now() + CREDITS_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", trial.id);

    // Grant credits with expiration flag
    const creditsExpireAt = new Date(Date.now() + CREDITS_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    // Check if user already has credits from this trial system
    const { data: existingCredits } = await supabaseAdmin
      .from("upscaler_credits")
      .select("landing_trial_expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingCredits?.landing_trial_expires_at) {
      // Already has landing trial credits, don't duplicate
      console.log(`[confirm-landing-trial] User ${userId} already has landing trial credits`);
    } else {
      // Upsert credits
      const { error: creditError } = await supabaseAdmin
        .from("upscaler_credits")
        .upsert({
          user_id: userId,
          monthly_balance: CREDITS_AMOUNT,
          lifetime_balance: 0,
          balance: CREDITS_AMOUNT,
          landing_trial_expires_at: creditsExpireAt,
        }, { 
          onConflict: "user_id",
        });

      if (creditError) {
        // Fallback: update existing record
        await supabaseAdmin
          .from("upscaler_credits")
          .update({
            monthly_balance: CREDITS_AMOUNT,
            balance: CREDITS_AMOUNT,
            landing_trial_expires_at: creditsExpireAt,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      }

      // Log transaction
      const { data: creditData } = await supabaseAdmin
        .from("upscaler_credits")
        .select("monthly_balance, lifetime_balance")
        .eq("user_id", userId)
        .single();

      const balanceAfter = (creditData?.monthly_balance || 0) + (creditData?.lifetime_balance || 0);

      await supabaseAdmin.from("upscaler_credit_transactions").insert({
        user_id: userId,
        amount: CREDITS_AMOUNT,
        balance_after: balanceAfter,
        transaction_type: "bonus",
        credit_type: "monthly",
        description: "landing_cloner_trial_240",
      });
    }

    // Generate magic link for auto-login
    const { data: magicLink, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${getAppUrl()}/arcano-cloner`,
      },
    });

    if (magicError || !magicLink?.properties?.action_link) {
      console.error("[confirm-landing-trial] Magic link error:", magicError);
      // Fallback: redirect to login
      return new Response(null, {
        status: 302,
        headers: { Location: `${getAppUrl()}/arcano-cloner` },
      });
    }

    // Redirect to magic link (auto-login)
    return new Response(null, {
      status: 302,
      headers: { Location: magicLink.properties.action_link },
    });
  } catch (error: any) {
    console.error("[confirm-landing-trial] Error:", error);
    return errorPage("Erro interno. Tente novamente mais tarde.");
  }
});

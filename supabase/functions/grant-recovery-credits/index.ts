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
  if (!response.ok) throw new Error(`SendPulse token error: ${response.status}`);
  const data = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 3300000 };
  return data.access_token;
}

function buildRecoveryEmailHtml(loginLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0D0221;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0221;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:500px;background-color:#1A0A2E;border-radius:12px;border:1px solid rgba(139,92,246,0.2);padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="font-size:48px;margin-bottom:12px;">🎉</div>
          <h1 style="color:#ffffff;font-size:24px;margin:0;">Seus 300 créditos grátis já estão na sua conta!</h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#c4b5fd;font-size:16px;line-height:1.6;margin:0;text-align:center;">
            Identificamos um problema técnico que impediu a entrega dos seus créditos gratuitos no momento do cadastro. Já corrigimos isso e seus <strong style="color:#ffffff;">300 créditos grátis</strong> foram adicionados à sua conta!
          </p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${loginLink}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:8px;font-size:18px;font-weight:bold;">
            🚀 Começar a Usar
          </a>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <div style="background:rgba(139,92,246,0.15);border-radius:8px;padding:16px;border:1px solid rgba(139,92,246,0.2);">
            <p style="color:#a78bfa;font-size:14px;text-align:center;margin:0;">
              ⏳ Créditos válidos por 1 mês a partir de hoje
            </p>
          </div>
        </td></tr>
        <tr><td style="padding-top:32px;border-top:1px solid rgba(139,92,246,0.2);">
          <p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">
            Pedimos desculpas pelo inconveniente. Se precisar de ajuda, entre em contato conosco.
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find all users who confirmed email (used_at NOT NULL) but have NO credits
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("email_confirmation_tokens")
      .select("user_id, email, used_at")
      .not("used_at", "is", null);

    if (tokensError) throw new Error(`Token query failed: ${tokensError.message}`);

    console.log(`[grant-recovery] Found ${tokens?.length || 0} total used tokens`);

    // Get all user_ids that already have credits
    const { data: existingCredits } = await supabaseAdmin
      .from("upscaler_credits")
      .select("user_id");

    const creditUserIds = new Set((existingCredits || []).map(c => c.user_id));

    // Get all user_ids that already have free trial records
    const { data: existingTrials } = await supabaseAdmin
      .from("arcano_cloner_free_trials")
      .select("user_id");

    const trialUserIds = new Set((existingTrials || []).map(t => t.user_id));

    // Filter: users with used token but NO credits and NO trial record
    const affectedUsers = (tokens || []).filter(t => 
      !creditUserIds.has(t.user_id) && !trialUserIds.has(t.user_id)
    );

    // Deduplicate by user_id (some may have multiple tokens)
    const uniqueUsers = new Map<string, { user_id: string; email: string }>();
    for (const u of affectedUsers) {
      if (!uniqueUsers.has(u.user_id)) {
        uniqueUsers.set(u.user_id, { user_id: u.user_id, email: u.email });
      }
    }

    const usersToProcess = Array.from(uniqueUsers.values());
    console.log(`[grant-recovery] ${usersToProcess.length} users need credit recovery`);

    const results: Array<{ email: string; status: string; error?: string }> = [];
    const REDIRECT_URL = "https://arcanoapp.lovable.app/ferramentas-ia-aplicativo";

    let sendPulseToken: string | null = null;
    try {
      sendPulseToken = await getSendPulseToken();
    } catch (e) {
      console.error("[grant-recovery] Failed to get SendPulse token:", e);
    }

    for (const user of usersToProcess) {
      try {
        console.log(`[grant-recovery] Processing ${user.email} (${user.user_id})`);

        // 1. Try RPC first
        let creditsGranted = false;
        const { data: rpcResult, error: rpcError } = await supabaseAdmin
          .rpc('claim_arcano_free_trial_atomic', {
            p_user_id: user.user_id,
            p_email: user.email,
          });

        if (!rpcError && rpcResult && !rpcResult[0]?.already_claimed) {
          creditsGranted = true;
          console.log(`[grant-recovery] RPC succeeded for ${user.email}`);
        } else {
          console.log(`[grant-recovery] RPC failed for ${user.email}, using direct insert. Error: ${rpcError?.message}`);

          // 2. Fallback: Direct inserts with service_role
          // Insert into arcano_cloner_free_trials
          const { error: trialError } = await supabaseAdmin
            .from("arcano_cloner_free_trials")
            .insert({
              user_id: user.user_id,
              email: user.email,
              credits_granted: 300,
            });

          if (trialError && !trialError.message?.includes("duplicate")) {
            console.error(`[grant-recovery] Trial insert error for ${user.email}:`, trialError);
          }

          // UPSERT into upscaler_credits
          const { error: creditError } = await supabaseAdmin
            .from("upscaler_credits")
            .upsert(
              {
                user_id: user.user_id,
                monthly_balance: 300,
                lifetime_balance: 0,
                balance: 300,
              },
              { onConflict: "user_id" }
            );

          if (creditError) {
            console.error(`[grant-recovery] Credit upsert error for ${user.email}:`, creditError);
            throw new Error(`Credit upsert failed: ${creditError.message}`);
          }

          // Record transaction
          const { error: txError } = await supabaseAdmin
            .from("upscaler_credit_transactions")
            .insert({
              user_id: user.user_id,
              amount: 300,
              balance_type: "monthly",
              type: "grant",
              description: "Recuperação: 300 créditos grátis (falha no resgate original)",
            });

          if (txError) {
            console.error(`[grant-recovery] Transaction log error for ${user.email}:`, txError);
          }

          creditsGranted = true;
          console.log(`[grant-recovery] Direct insert succeeded for ${user.email}`);
        }

        // 3. Send notification email
        if (creditsGranted && sendPulseToken) {
          try {
            // Generate magic link for auto-login
            let loginLink = REDIRECT_URL;
            try {
              const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: 'magiclink',
                email: user.email,
                options: { redirectTo: REDIRECT_URL },
              });

              if (!linkError && linkData) {
                const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
                loginLink = `${supabaseUrl}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(REDIRECT_URL)}`;
              }
            } catch (mlErr) {
              console.error(`[grant-recovery] Magic link error for ${user.email}:`, mlErr);
            }

            const htmlContent = buildRecoveryEmailHtml(loginLink);
            const htmlBase64 = btoa(unescape(encodeURIComponent(htmlContent)));

            const emailPayload = {
              email: {
                html: htmlBase64,
                text: "",
                subject: "🎉 Seus 300 créditos grátis já estão na sua conta!",
                from: { name: "Arcano App", email: "contato@voxvisual.com.br" },
                to: [{ name: user.email, email: user.email }],
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
            console.log(`[grant-recovery] Email sent to ${user.email}: ${sendResponse.status}`);

            if (!sendResponse.ok) {
              console.error(`[grant-recovery] SendPulse error for ${user.email}: ${sendResult}`);
            }
          } catch (emailErr) {
            console.error(`[grant-recovery] Email error for ${user.email}:`, emailErr);
          }
        }

        results.push({ email: user.email, status: "success" });
      } catch (userErr: any) {
        console.error(`[grant-recovery] Failed for ${user.email}:`, userErr);
        results.push({ email: user.email, status: "error", error: userErr.message });
      }
    }

    const summary = {
      total: usersToProcess.length,
      success: results.filter(r => r.status === "success").length,
      errors: results.filter(r => r.status === "error").length,
      results,
    };

    console.log(`[grant-recovery] DONE. Success: ${summary.success}, Errors: ${summary.errors}`);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[grant-recovery] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

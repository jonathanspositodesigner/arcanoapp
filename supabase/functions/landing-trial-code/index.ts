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

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getToolConfig(toolName: string) {
  if (toolName === 'cloner') {
    return {
      usesTotal: 1,
      emailSubject: '🔑 Seu código de teste gratuito - Arcano Cloner',
      usesLabel: '1 teste gratuito',
      toolLabel: 'Arcano Cloner',
    };
  }
  // Default: upscaler
  return {
    usesTotal: 3,
    emailSubject: '🔑 Seu código de teste gratuito - Upscaler Arcano',
    usesLabel: '3 testes gratuitos',
    toolLabel: 'Upscaler Arcano',
  };
}

function buildCodeEmailHtml(code: string, name: string, toolName: string): string {
  const config = getToolConfig(toolName);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0D0221;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0221;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:500px;background-color:#1A0A2E;border-radius:12px;border:1px solid rgba(139,92,246,0.2);padding:40px;">
<tr><td align="center" style="padding-bottom:24px;">
<div style="font-size:48px;margin-bottom:12px;">🔑</div>
<h1 style="color:#ffffff;font-size:24px;margin:0;">Seu Código de Teste Gratuito</h1>
</td></tr>
<tr><td style="padding-bottom:24px;">
<p style="color:#c4b5fd;font-size:16px;line-height:1.6;margin:0;text-align:center;">
Olá <strong style="color:#fff;">${name}</strong>, use o código abaixo para liberar <strong style="color:#fff;">${config.usesLabel}</strong> do ${config.toolLabel}:
</p>
</td></tr>
<tr><td align="center" style="padding-bottom:24px;">
<div style="background:linear-gradient(135deg,#8b5cf6,#ec4899);border-radius:12px;padding:20px 40px;display:inline-block;">
<span style="color:#ffffff;font-size:36px;font-weight:bold;letter-spacing:12px;font-family:monospace;">${code}</span>
</div>
</td></tr>
<tr><td>
<div style="background:rgba(139,92,246,0.15);border-radius:8px;padding:16px;border:1px solid rgba(139,92,246,0.2);">
<p style="color:#a78bfa;font-size:14px;text-align:center;margin:0;">⏳ Este código expira em 24 horas</p>
</div>
</td></tr>
<tr><td style="padding-top:32px;border-top:1px solid rgba(139,92,246,0.2);margin-top:32px;">
<p style="color:#6b7280;font-size:12px;text-align:center;margin:0;">Se você não solicitou este teste, ignore este email.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.json();
    const toolName = body.tool_name || 'upscaler';

    // === SEND ===
    if (path === "send") {
      const { email, name } = body;
      if (!email || !name) {
        return new Response(JSON.stringify({ error: "email e name são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const nameClean = name.trim().substring(0, 100);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return new Response(JSON.stringify({ error: "Email inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: existing } = await supabaseAdmin
        .from("landing_page_trials")
        .select("id, created_at, code_verified, uses_remaining")
        .eq("email", normalizedEmail)
        .eq("tool_name", toolName)
        .maybeSingle();

      if (existing) {
        if (existing.code_verified && existing.uses_remaining > 0) {
          return new Response(JSON.stringify({ already_verified: true, uses_remaining: existing.uses_remaining }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (existing.code_verified && existing.uses_remaining <= 0) {
          return new Response(JSON.stringify({ already_verified: true, uses_remaining: 0, finished: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const createdAt = new Date(existing.created_at).getTime();
        if (Date.now() - createdAt < 120000) {
          return new Response(JSON.stringify({ error: "Aguarde 2 minutos antes de solicitar um novo código" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const code = generateCode();
        await supabaseAdmin
          .from("landing_page_trials")
          .update({ code, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString(), code_verified: false })
          .eq("id", existing.id);

        const token = await getSendPulseToken();
        const config = getToolConfig(toolName);
        const html = buildCodeEmailHtml(code, nameClean, toolName);
        const htmlBase64 = btoa(unescape(encodeURIComponent(html)));
        await fetch("https://api.sendpulse.com/smtp/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: { html: htmlBase64, text: "", subject: config.emailSubject, from: { name: "Arcano App", email: "contato@voxvisual.com.br" }, to: [{ name: nameClean, email: normalizedEmail }] } }),
        });

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // New trial
      const code = generateCode();
      const config = getToolConfig(toolName);
      const { error: insertErr } = await supabaseAdmin
        .from("landing_page_trials")
        .insert({ 
          email: normalizedEmail, 
          name: nameClean, 
          code, 
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          tool_name: toolName,
          uses_remaining: config.usesTotal,
          uses_total: config.usesTotal,
        });

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return new Response(JSON.stringify({ error: "Erro ao criar trial" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const token = await getSendPulseToken();
      const html = buildCodeEmailHtml(code, nameClean, toolName);
      const htmlBase64 = btoa(unescape(encodeURIComponent(html)));
      const sendRes = await fetch("https://api.sendpulse.com/smtp/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: { html: htmlBase64, text: "", subject: config.emailSubject, from: { name: "Arcano App", email: "contato@voxvisual.com.br" }, to: [{ name: nameClean, email: normalizedEmail }] } }),
      });

      if (!sendRes.ok) {
        const errText = await sendRes.text();
        console.error("SendPulse error:", errText);
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === VERIFY ===
    if (path === "verify") {
      const { email, code } = body;
      if (!email || !code) {
        return new Response(JSON.stringify({ error: "email e code são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const { data: trial } = await supabaseAdmin
        .from("landing_page_trials")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("tool_name", toolName)
        .maybeSingle();

      if (!trial) {
        return new Response(JSON.stringify({ error: "Nenhum código encontrado para este email" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (new Date(trial.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Código expirado. Solicite um novo." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (trial.code !== code.trim()) {
        return new Response(JSON.stringify({ error: "Código incorreto" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabaseAdmin
        .from("landing_page_trials")
        .update({ code_verified: true, verified_at: new Date().toISOString() })
        .eq("id", trial.id);

      return new Response(JSON.stringify({ success: true, uses_remaining: trial.uses_remaining }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === CONSUME ===
    if (path === "consume") {
      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const { data: trial } = await supabaseAdmin
        .from("landing_page_trials")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("tool_name", toolName)
        .eq("code_verified", true)
        .maybeSingle();

      if (!trial) {
        return new Response(JSON.stringify({ error: "Trial não encontrado ou não verificado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (trial.uses_remaining <= 0) {
        return new Response(JSON.stringify({ error: "Testes esgotados", uses_remaining: 0 }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const newRemaining = trial.uses_remaining - 1;
      await supabaseAdmin
        .from("landing_page_trials")
        .update({ uses_remaining: newRemaining })
        .eq("id", trial.id);

      return new Response(JSON.stringify({ success: true, uses_remaining: newRemaining }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Endpoint inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("[landing-trial-code] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
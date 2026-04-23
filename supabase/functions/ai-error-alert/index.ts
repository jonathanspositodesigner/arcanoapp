import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALERT_EMAIL = "jonathandesigner1993@gmail.com";
const ERROR_THRESHOLD = 5;
const CHECK_WINDOW_MINUTES = 60;

// All AI tool job tables to monitor
const AI_TOOL_TABLES = [
  { table: "arcano_cloner_jobs", name: "Arcano Cloner" },
  { table: "upscaler_jobs", name: "Upscaler Arcano" },
  { table: "image_generator_jobs", name: "Nano Banana" },
  { table: "bg_remover_jobs", name: "Remover Fundo" },
  { table: "flyer_maker_jobs", name: "Flyer Maker" },
  { table: "pose_changer_jobs", name: "Pose Changer" },
  { table: "veste_ai_jobs", name: "Veste AI" },
  { table: "character_generator_jobs", name: "Gerador de Personagem" },
  { table: "movieled_maker_jobs", name: "MovieLED Maker" },
  { table: "video_generator_jobs", name: "Gerador de Vídeo" },
  { table: "gpt_image_jobs", name: "GPT Image" },
  { table: "seedance_jobs", name: "Seedance 2.0" },
];

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
    const errText = await response.text();
    throw new Error(`SendPulse token error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 3300000 };
  return data.access_token;
}

async function sendAlertEmail(token: string, toolAlerts: { name: string; errorCount: number; recentErrors: string[] }[]): Promise<void> {
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const toolRows = toolAlerts.map(t => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #374151; font-weight: bold; color: #f87171;">
        ${t.name}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #374151; text-align: center;">
        <span style="background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold;">
          ${t.errorCount} erros
        </span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #374151; font-size: 12px; color: #9ca3af;">
        ${t.recentErrors.slice(0, 3).map(e => `• ${e}`).join("<br>")}
      </td>
    </tr>
  `).join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="margin:0; padding:0; background:#0f172a; font-family: Arial, sans-serif;">
    <div style="max-width:600px; margin:0 auto; padding:32px 20px;">
      <div style="background: linear-gradient(135deg, #991b1b, #dc2626); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ ALERTA DE ERROS IA</h1>
        <p style="color: #fca5a5; margin: 8px 0 0; font-size: 14px;">
          ${toolAlerts.length} ferramenta(s) com ${ERROR_THRESHOLD}+ erros na última hora
        </p>
      </div>
      
      <div style="background: #1e293b; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px;">
          Verificado em: <strong style="color: #e2e8f0;">${now}</strong>
        </p>
        
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #374151; border-radius: 8px;">
          <thead>
            <tr style="background: #0f172a;">
              <th style="padding: 10px 16px; text-align: left; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Ferramenta</th>
              <th style="padding: 10px 16px; text-align: center; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Erros</th>
              <th style="padding: 10px 16px; text-align: left; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Últimos erros</th>
            </tr>
          </thead>
          <tbody>
            ${toolRows}
          </tbody>
        </table>
        
        <div style="margin-top: 24px; padding: 16px; background: #0f172a; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="color: #fbbf24; margin: 0; font-size: 13px; font-weight: bold;">Ação necessária</p>
          <p style="color: #94a3b8; margin: 8px 0 0; font-size: 13px;">
            Verifique os logs das ferramentas afetadas no painel admin (/custosia) para identificar a causa raiz.
          </p>
        </div>
      </div>
      
      <p style="text-align: center; color: #475569; font-size: 11px; margin-top: 16px;">
        Alerta automático do Arcano Lab — Monitoramento de IA
      </p>
    </div>
  </body>
  </html>`;

  const htmlBase64 = btoa(unescape(encodeURIComponent(html)));

  const emailPayload = {
    email: {
      html: htmlBase64,
      text: `ALERTA: ${toolAlerts.map(t => `${t.name}: ${t.errorCount} erros`).join(", ")}`,
      subject: `🚨 ALERTA IA: ${toolAlerts.map(t => t.name).join(", ")} com ${toolAlerts.reduce((s, t) => s + t.errorCount, 0)} erros/hora`,
      from: { name: "Arcano Lab Monitor", email: "contato@voxvisual.com.br" },
      to: [{ name: "Jonathan", email: ALERT_EMAIL }],
    },
  };

  const res = await fetch("https://api.sendpulse.com/smtp/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(emailPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SendPulse send error: ${res.status} - ${errText}`);
  }

  console.log(`✅ Alert email sent to ${ALERT_EMAIL}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const oneHourAgo = new Date(Date.now() - CHECK_WINDOW_MINUTES * 60 * 1000).toISOString();
    const toolAlerts: { name: string; errorCount: number; recentErrors: string[] }[] = [];

    console.log(`🔍 Checking AI tool errors since ${oneHourAgo}`);

    for (const tool of AI_TOOL_TABLES) {
      try {
        const { data, count } = await supabase
          .from(tool.table)
          .select("error_message, created_at", { count: "exact" })
          .eq("status", "failed")
          .gte("created_at", oneHourAgo)
          .order("created_at", { ascending: false })
          .limit(10);

        const errorCount = count ?? 0;

        if (errorCount >= ERROR_THRESHOLD) {
          const recentErrors = (data || [])
            .map((d: any) => {
              const msg = d.error_message || "Erro desconhecido";
              return msg.length > 80 ? msg.substring(0, 80) + "..." : msg;
            });

          toolAlerts.push({
            name: tool.name,
            errorCount,
            recentErrors,
          });

          console.log(`🚨 ${tool.name}: ${errorCount} erros na última hora`);
        } else {
          console.log(`✅ ${tool.name}: ${errorCount} erros (OK)`);
        }
      } catch (err) {
        console.error(`⚠️ Error checking ${tool.table}:`, err);
      }
    }

    if (toolAlerts.length > 0) {
      // Check cooldown: don't send more than 1 alert per tool per hour
      const { data: recentAlerts } = await supabase
        .from("app_settings")
        .select("value")
        .eq("id", "ai_error_alert_last_sent")
        .maybeSingle();

      const lastSent = recentAlerts?.value as any;
      const perToolCooldowns: Record<string, number> = lastSent?.per_tool || {};
      const cooldownMs = 60 * 60 * 1000; // 1 hour cooldown per tool

      // Filter out tools that were already alerted within cooldown
      const newAlerts = toolAlerts.filter(t => {
        const lastAlertedAt = perToolCooldowns[t.name] || 0;
        return Date.now() - lastAlertedAt > cooldownMs;
      });

      if (newAlerts.length > 0) {
        const token = await getSendPulseToken();
        await sendAlertEmail(token, newAlerts);

        // Update per-tool cooldown timestamps (preserve existing, update alerted ones)
        const updatedCooldowns = { ...perToolCooldowns };
        for (const t of newAlerts) {
          updatedCooldowns[t.name] = Date.now();
        }

        await supabase
          .from("app_settings")
          .upsert({
            id: "ai_error_alert_last_sent",
            value: {
              sent_at: new Date().toISOString(),
              per_tool: updatedCooldowns,
            },
            updated_at: new Date().toISOString(),
          });

        return new Response(
          JSON.stringify({ alerted: true, tools: newAlerts.map(t => t.name) }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.log("⏳ Cooldown active, skipping alert");
      }
    }

    return new Response(
      JSON.stringify({ alerted: false, message: "No tools exceeded error threshold" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ AI error alert failed:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
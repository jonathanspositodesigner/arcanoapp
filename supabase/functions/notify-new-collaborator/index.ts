import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nome, instagram, email, whatsapp, portfolio, created_at } = await req.json();

    if (!nome || !email) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getSendPulseToken();

    const dataFormatted = created_at
      ? new Date(created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#1a1a2e;color:#e0e0e0;padding:30px;border-radius:12px;">
        <h1 style="color:#a855f7;text-align:center;">🤝 Nova Solicitação de Colaborador</h1>
        <div style="background:#2a2a3e;padding:20px;border-radius:8px;margin:20px 0;">
          <p><strong style="color:#c084fc;">Nome:</strong> ${nome}</p>
          <p><strong style="color:#c084fc;">Instagram:</strong> ${instagram}</p>
          <p><strong style="color:#c084fc;">Email:</strong> ${email}</p>
          <p><strong style="color:#c084fc;">WhatsApp:</strong> ${whatsapp}</p>
          <p><strong style="color:#c084fc;">Portfólio:</strong> <a href="${portfolio}" style="color:#a855f7;">${portfolio}</a></p>
          <p><strong style="color:#c084fc;">Data:</strong> ${dataFormatted}</p>
        </div>
        <p style="text-align:center;color:#999;font-size:12px;">Arcano — Plataforma de IA</p>
      </div>
    `;

    const htmlBase64 = btoa(unescape(encodeURIComponent(html)));

    const emailResponse = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        email: {
          subject: "Nova solicitação de colaborador — Arcano",
          from: { name: "Arcano", email: "noreply@arcanolab.voxvisual.com.br" },
          to: [{ name: "Admin Arcano", email: "jonathandesigner1993@gmail.com" }],
          html: htmlBase64,
          encoding: "base64",
        },
      }),
    });

    const responseText = await emailResponse.text();
    console.log(`[notify-new-collaborator] SendPulse response: ${emailResponse.status} - ${responseText}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[notify-new-collaborator] Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
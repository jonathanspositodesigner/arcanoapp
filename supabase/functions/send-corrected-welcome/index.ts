import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { to, product_name } = await req.json();
    if (!to) return new Response(JSON.stringify({ error: "Missing 'to'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const clientId = Deno.env.get("SENDPULSE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("SENDPULSE_CLIENT_SECRET")!;

    const tokenRes = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    });
    const { access_token } = await tokenRes.json();

    const email = to;
    const displayName = product_name || "Plano Pro Mensal";
    const platformUrl = "https://arcanoapp.voxvisual.com.br/";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0d0015;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:48px 16px;">
  <div style="background:linear-gradient(160deg,#1e0a3c 0%,#2a1252 40%,#1e0a3c 100%);border-radius:20px 20px 0 0;padding:50px 40px 36px;text-align:center;border:1px solid rgba(212,175,55,0.15);border-bottom:none;">
    <div style="width:88px;height:88px;margin:0 auto 24px;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 50%,#d4af37 100%);border-radius:50%;line-height:88px;text-align:center;box-shadow:0 8px 32px rgba(212,175,55,0.35);">
      <span style="font-size:42px;line-height:88px;">✅</span>
    </div>
    <h1 style="color:#ffffff;font-size:28px;font-weight:700;margin:0 0 12px;">Compra Confirmada!</h1>
    <p style="color:#c4b5fd;font-size:17px;margin:0;line-height:1.5;">Seu acesso ao <strong style="color:#f5e27a;">${displayName}</strong> já está liberado.</p>
  </div>
  <div style="background:linear-gradient(180deg,#2a1252 0%,#1e0a3c 100%);padding:0 40px 40px;border:1px solid rgba(212,175,55,0.15);border-top:none;border-bottom:none;">
    <div style="background:rgba(255,255,255,0.06);border-radius:14px;padding:28px;margin-bottom:32px;border:1px solid rgba(212,175,55,0.25);">
      <p style="color:#d4af37;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 20px;text-align:center;">Suas credenciais de acesso</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#a78bfa;padding:12px 16px;font-size:14px;border-bottom:1px solid rgba(255,255,255,0.06);">📧 Email</td><td style="color:#ffffff;padding:12px 16px;font-size:14px;text-align:right;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);word-break:break-all;">${email}</td></tr>
        <tr><td style="color:#a78bfa;padding:12px 16px;font-size:14px;">🔑 Senha</td><td style="color:#ffffff;padding:12px 16px;font-size:14px;text-align:right;font-weight:600;word-break:break-all;">${email}</td></tr>
      </table>
      <div style="margin-top:16px;padding:10px 16px;background:rgba(248,113,113,0.1);border-radius:8px;border:1px solid rgba(248,113,113,0.2);text-align:center;">
        <p style="color:#fca5a5;font-size:12px;margin:0;">⚠️ Recomendamos alterar sua senha no primeiro acesso</p>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,rgba(74,222,128,0.12) 0%,rgba(34,197,94,0.08) 100%);border-radius:12px;padding:20px 24px;margin-bottom:32px;border:1px solid rgba(74,222,128,0.3);text-align:center;">
      <p style="color:#4ade80;font-size:15px;font-weight:700;margin:0 0 8px;">🎉 ${displayName} Ativado!</p>
      <p style="color:#bbf7d0;font-size:13px;margin:0;line-height:1.6;">Seus créditos e ferramentas de IA já estão disponíveis! Sua assinatura será renovada automaticamente a cada mês.</p>
    </div>
    <div style="text-align:center;padding-bottom:8px;">
      <a href="${platformUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37 0%,#f5e27a 100%);color:#1a0533;text-decoration:none;padding:18px 52px;border-radius:12px;font-weight:700;font-size:17px;box-shadow:0 6px 24px rgba(212,175,55,0.4);">Acessar Agora →</a>
    </div>
  </div>
  <div style="background:#150828;border-radius:0 0 20px 20px;padding:28px 40px;border:1px solid rgba(212,175,55,0.15);border-top:1px solid rgba(212,175,55,0.1);text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0 0 10px;"><a href="https://wa.me/5533988819891" style="color:#a78bfa;text-decoration:underline;">Problemas? Fale conosco</a></p>
    <p style="color:#4b5563;font-size:11px;margin:0;">Vox Visual © 2026</p>
  </div>
</div></body></html>`;

    const result = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${access_token}` },
      body: JSON.stringify({
        email: {
          html: btoa(unescape(encodeURIComponent(html))),
          text: `${displayName} ativado! Email: ${email}, Senha: ${email}. Acesse: ${platformUrl}`,
          subject: `🎉 ${displayName} ativado! Acesse sua conta`,
          from: { name: "ArcanoApp", email: "contato@voxvisual.com.br" },
          to: [{ email, name: "" }],
        },
      }),
    }).then(r => r.json());

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

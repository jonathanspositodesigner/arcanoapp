import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, success, failure_reason, device_fingerprint } = await req.json();

    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || 'unknown';
    const clientUserAgent = req.headers.get('user-agent') || 'unknown';

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Registra a tentativa no banco
    const { error: insertError } = await supabase
      .from("admin_login_attempts")
      .insert({
        email: email.toLowerCase().trim(),
        ip_address: clientIp,
        user_agent: clientUserAgent,
        success: success || false,
        failure_reason: failure_reason || null,
        device_fingerprint: device_fingerprint || null,
      });

    if (insertError) {
      console.error("Erro ao registrar tentativa:", insertError);
    }

    // Envia email de alerta para jonathan.lifecazy@gmail.com
    const now = new Date();
    const spTime = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const statusText = success ? '✅ LOGIN BEM-SUCEDIDO' : '🚨 TENTATIVA FALHA';
    const statusColor = success ? '#22c55e' : '#ef4444';

    const alertHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${statusColor}; padding: 15px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${statusText}</h1>
        </div>
        
        <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 20px;">
          <h2 style="color: #1a1a1a; margin: 0 0 15px; font-size: 16px;">Detalhes da Tentativa de Acesso Admin</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px; width: 140px;"><strong>Email:</strong></td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>IP:</strong></td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-family: monospace;">${clientIp}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Data/Hora (SP):</strong></td>
              <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px;">${spTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>Resultado:</strong></td>
              <td style="padding: 8px 0; color: ${statusColor}; font-size: 14px; font-weight: bold;">
                ${success ? 'Acesso autorizado' : (failure_reason || 'Falha no login')}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;"><strong>User-Agent:</strong></td>
              <td style="padding: 8px 0; color: #999; font-size: 11px; word-break: break-all;">${clientUserAgent}</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #999; font-size: 11px; text-align: center; margin-top: 15px;">
          Alerta automático de segurança — Arcano Lab Admin
        </p>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Arcano Lab <contato@voxvisual.com.br>",
        to: ["jonathan.lifecazy@gmail.com"],
        subject: `${statusText} — Admin Login: ${email} | IP: ${clientIp}`,
        html: alertHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Erro ao enviar email de alerta:", errorText);
    } else {
      console.log(`Alerta de login admin enviado | ${email} | success: ${success} | IP: ${clientIp}`);
    }

    return new Response(
      JSON.stringify({ logged: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na função log-admin-login-attempt:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
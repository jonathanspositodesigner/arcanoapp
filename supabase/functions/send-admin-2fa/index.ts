import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, device_fingerprint, device_name } = await req.json();

    if (!user_id || !email || !device_fingerprint) {
      return new Response(
        JSON.stringify({ error: "user_id, email e device_fingerprint são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Gera código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Expira em 5 minutos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalida códigos anteriores não usados
    await supabase
      .from("admin_verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user_id)
      .is("used_at", null);

    // Insere novo código
    const { error: insertError } = await supabase
      .from("admin_verification_codes")
      .insert({
        user_id,
        code,
        device_fingerprint,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Erro ao inserir código:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar código de verificação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Envia email via Resend
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; margin: 0;">Verificação de Segurança</h1>
        </div>
        
        <p style="color: #333; font-size: 16px;">
          Detectamos um acesso de um dispositivo ${device_name ? `(${device_name})` : 'desconhecido'}.
        </p>
        
        <p style="color: #333; font-size: 16px;">
          Seu código de verificação é:
        </p>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    padding: 25px; 
                    border-radius: 12px; 
                    text-align: center; 
                    margin: 25px 0;">
          <span style="font-size: 36px; 
                       font-weight: bold; 
                       letter-spacing: 10px; 
                       color: white;
                       font-family: 'Courier New', monospace;">
            ${code}
          </span>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center;">
          Este código expira em <strong>5 minutos</strong>.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Se você não tentou fazer login, ignore este email.<br>
            Sua conta permanece segura.
          </p>
        </div>
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
        to: [email],
        subject: `🔐 Código de Verificação: ${code}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Erro ao enviar email:", errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email de verificação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Código 2FA enviado para ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado por email" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na função send-admin-2fa:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
    const { user_id, email, device_fingerprint, device_name } = await req.json();

    // ========== INPUT VALIDATION ==========
    // Validate user_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!user_id || typeof user_id !== 'string' || !uuidRegex.test(user_id)) {
      return new Response(
        JSON.stringify({ error: "user_id inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email) || email.length > 320) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate device_fingerprint (should be a reasonable string)
    if (!device_fingerprint || typeof device_fingerprint !== 'string' || 
        device_fingerprint.length < 10 || device_fingerprint.length > 500) {
      return new Response(
        JSON.stringify({ error: "device_fingerprint inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate device_name if provided
    if (device_name !== undefined && (typeof device_name !== 'string' || device_name.length > 200)) {
      return new Response(
        JSON.stringify({ error: "device_name inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedEmail = email.toLowerCase().trim();

    // Verify user is an admin via user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.warn(`[2FA] Attempt from non-admin user_id: ${user_id}, email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: "Email não autorizado para 2FA" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up recovery_email from profiles
    const { data: profileData } = await supabase
      .from("profiles")
      .select("recovery_email")
      .eq("id", user_id)
      .maybeSingle();

    // Fallback hardcoded map (legacy, will be phased out as DB is populated)
    const legacyAlternateEmails: Record<string, string> = {
      "jonathan@admin.com": "jonathan.lifecazy@gmail.com",
      "david@admin.com": "davidsposito64@gmail.com",
      "herica@admin.com": "hericanagila53@gmail.com",
    };

    // Priority: DB recovery_email > hardcoded map > original email
    let targetEmail: string;
    if (profileData?.recovery_email) {
      targetEmail = profileData.recovery_email;
    } else if (legacyAlternateEmails[normalizedEmail]) {
      targetEmail = legacyAlternateEmails[normalizedEmail];
    } else {
      targetEmail = normalizedEmail;
    }

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
        to: [targetEmail],
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

    console.log(`Código 2FA enviado para ${targetEmail} (login: ${email})`);

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

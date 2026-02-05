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
    const { user_id, code, device_fingerprint, device_name, trust_device } = await req.json();

    if (!user_id || !code || !device_fingerprint) {
      return new Response(
        JSON.stringify({ error: "user_id, code e device_fingerprint são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Busca código válido
    const { data: codeData, error: codeError } = await supabase
      .from("admin_verification_codes")
      .select("*")
      .eq("user_id", user_id)
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeError) {
      console.error("Erro ao buscar código:", codeError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar código" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!codeData) {
      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido ou expirado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Marca código como usado
    await supabase
      .from("admin_verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", codeData.id);

    // Se trust_device é true, registra dispositivo como confiável
    if (trust_device) {
      const { error: deviceError } = await supabase
        .from("admin_trusted_devices")
        .upsert({
          user_id,
          device_fingerprint,
          device_name: device_name || null,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,device_fingerprint",
        });

      if (deviceError) {
        console.error("Erro ao registrar dispositivo:", deviceError);
        // Não falha a verificação, apenas loga o erro
      } else {
        console.log(`Dispositivo registrado como confiável para user ${user_id}`);
      }
    }

    console.log(`Código 2FA verificado com sucesso para user ${user_id}`);

    return new Response(
      JSON.stringify({ valid: true, message: "Código verificado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na função verify-admin-2fa:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

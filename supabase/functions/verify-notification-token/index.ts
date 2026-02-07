import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * VERIFY NOTIFICATION TOKEN
 * 
 * Valida tokens temporários de notificação push para recuperação de job.
 * - Verifica se token existe e não expirou (15 min TTL)
 * - Verifica se user_id corresponde
 * - Marca como consumido para auditoria
 * - Retorna dados do job para restauração de estado
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, userId } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: "Token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar token
    const { data: tokenData, error: tokenError } = await supabase
      .from("job_notification_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (tokenError) {
      console.error("[VerifyToken] Database error:", tokenError);
      return new Response(
        JSON.stringify({ valid: false, error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokenData) {
      console.log("[VerifyToken] Token not found:", token.substring(0, 8));
      return new Response(
        JSON.stringify({ valid: false, error: "Token not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar expiração (15 minutos)
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      console.log("[VerifyToken] Token expired:", token.substring(0, 8));
      // Limpar token expirado
      await supabase.from("job_notification_tokens").delete().eq("id", tokenData.id);
      return new Response(
        JSON.stringify({ valid: false, error: "Token expired" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar user_id (se fornecido)
    if (userId && tokenData.user_id !== userId) {
      console.log("[VerifyToken] User mismatch:", userId, "vs", tokenData.user_id);
      return new Response(
        JSON.stringify({ valid: false, error: "User mismatch" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Marcar como consumido (mas não deletar - permitir múltiplos dispositivos)
    await supabase
      .from("job_notification_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    console.log("[VerifyToken] Token valid for job:", tokenData.job_id);

    return new Response(
      JSON.stringify({
        valid: true,
        table: tokenData.table_name,
        jobId: tokenData.job_id,
        userId: tokenData.user_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[VerifyToken] Error:", message);
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

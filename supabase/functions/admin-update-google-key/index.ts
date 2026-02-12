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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado: admin necessário" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { api_key } = await req.json();
    if (!api_key || typeof api_key !== "string" || api_key.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Chave API inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update secret via Supabase Management API
    const accessToken = Deno.env.get("SUPABASE_ACCESS_TOKEN");
    const projectId = Deno.env.get("VITE_SUPABASE_PROJECT_ID") || "jooojbaljrshgpaxdlou";

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "SUPABASE_ACCESS_TOKEN não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update key_changed_at in google_api_config to reset budget tracking
    await supabase
      .from("google_api_config")
      .update({ key_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", "default");

    const mgmtResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}/secrets`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          { name: "GOOGLE_GEMINI_API_KEY", value: api_key.trim() },
        ]),
      }
    );

    if (!mgmtResponse.ok) {
      const errText = await mgmtResponse.text();
      console.error("Management API error:", errText);
      return new Response(JSON.stringify({ error: "Falha ao atualizar chave na API de gerenciamento" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Chave API atualizada com sucesso" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "no-store",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("id", "pwa_version")
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ version: "unknown" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const value = data.value as { version?: string } | null;

    return new Response(
      JSON.stringify({ version: value?.version ?? "unknown" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[pwa-version] Error:", e);
    return new Response(
      JSON.stringify({ version: "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

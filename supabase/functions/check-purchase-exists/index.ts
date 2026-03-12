import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, order_id } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ exists: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(order_id);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let query = supabaseAdmin
      .from("asaas_orders")
      .select("id")
      .eq("user_email", trimmedEmail);

    if (order_id) {
      if (isUUID) {
        query = supabaseAdmin
          .from("asaas_orders")
          .select("id")
          .eq("user_email", trimmedEmail)
          .or(`asaas_payment_id.eq.${order_id},id.eq.${order_id}`);
      } else {
        query = supabaseAdmin
          .from("asaas_orders")
          .select("id")
          .eq("user_email", trimmedEmail)
          .eq("asaas_payment_id", order_id);
      }
    }

    let { data, error } = await query.limit(1);

    // Fallback: if order_id filter returned nothing, try just by email
    if (!error && (!data || data.length === 0) && order_id) {
      const fallback = await supabaseAdmin
        .from("asaas_orders")
        .select("id")
        .eq("user_email", trimmedEmail)
        .limit(1);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("Check purchase error:", error);
      return new Response(
        JSON.stringify({ exists: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ exists: (data && data.length > 0) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Check purchase error:", err);
    return new Response(
      JSON.stringify({ exists: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

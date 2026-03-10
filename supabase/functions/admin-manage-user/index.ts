import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, email, updates } = await req.json();

    if (!email || !action) {
      return new Response(JSON.stringify({ error: "email and action are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (action === "update_profile") {
      // Find profile by email
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updateData: Record<string, any> = {};
      if (updates?.name !== undefined) updateData.name = updates.name;
      if (updates?.whatsapp !== undefined) updateData.whatsapp = updates.whatsapp;

      // If email changed, update both profile and auth
      const newEmail = updates?.email?.trim().toLowerCase();
      if (newEmail && newEmail !== normalizedEmail) {
        updateData.email = newEmail;
        // Update auth email
        await supabaseAdmin.auth.admin.updateUserById(profile.id, { email: newEmail });
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(updateData)
          .eq("id", profile.id);

        if (updateError) {
          console.error("Profile update error:", updateError);
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resend_welcome_email") {
      // Invoke the recovery email as a "welcome" with password creation
      const { data, error } = await supabaseAdmin.functions.invoke("send-recovery-email", {
        body: { email: normalizedEmail },
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[admin-manage-user] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

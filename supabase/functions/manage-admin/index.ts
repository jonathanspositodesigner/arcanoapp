import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManageAdminPayload {
  action: "create" | "update_password" | "delete";
  email?: string;
  name?: string;
  password?: string;
  user_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Unauthorized - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: ManageAdminPayload = await req.json();
    const { action } = payload;

    console.log(`Processing admin action: ${action}`);

    if (action === "create") {
      const { email, name, password } = payload;

      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        // User exists - check if already admin
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", existingProfile.id)
          .eq("role", "admin")
          .maybeSingle();

        if (existingRole) {
          return new Response(JSON.stringify({ error: "Este usuário já é um administrador" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Add admin role to existing user
        const { error: roleInsertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: existingProfile.id, role: "admin" });

        if (roleInsertError) {
          console.error("Error adding admin role:", roleInsertError);
          return new Response(JSON.stringify({ error: "Erro ao adicionar role de admin" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update password
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingProfile.id,
          { password }
        );

        if (updateError) {
          console.error("Error updating password:", updateError);
        }

        return new Response(JSON.stringify({ success: true, message: "Admin role added to existing user" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
      });

      if (createError || !newUser.user) {
        console.error("Error creating user:", createError);
        return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: newUser.user.id,
        email: normalizedEmail,
        name: name || null,
        password_changed: false,
      });

      if (profileError) {
        console.error("Error creating profile:", profileError);
      }

      // Add admin role
      const { error: roleInsertError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "admin" });

      if (roleInsertError) {
        console.error("Error adding admin role:", roleInsertError);
        return new Response(JSON.stringify({ error: "Erro ao adicionar role de admin" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Admin created: ${normalizedEmail}`);

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_password") {
      const { user_id, password } = payload;

      if (!user_id || !password) {
        return new Response(JSON.stringify({ error: "User ID and password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify target is an admin
      const { data: targetRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .eq("role", "admin")
        .maybeSingle();

      if (!targetRole) {
        return new Response(JSON.stringify({ error: "Target user is not an admin" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        { password }
      );

      if (updateError) {
        console.error("Error updating password:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Password updated for admin: ${user_id}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { user_id } = payload;

      if (!user_id) {
        return new Response(JSON.stringify({ error: "User ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent self-deletion
      if (user_id === userData.user.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify target is an admin
      const { data: targetRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .eq("role", "admin")
        .maybeSingle();

      if (!targetRole) {
        return new Response(JSON.stringify({ error: "Target user is not an admin" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove admin role
      const { error: roleDeleteError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", "admin");

      if (roleDeleteError) {
        console.error("Error removing admin role:", roleDeleteError);
        return new Response(JSON.stringify({ error: "Erro ao remover role de admin" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete profile
      await supabaseAdmin.from("profiles").delete().eq("id", user_id);

      // Delete user from auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        // Role already removed, so consider it a partial success
      }

      console.log(`Admin deleted: ${user_id}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
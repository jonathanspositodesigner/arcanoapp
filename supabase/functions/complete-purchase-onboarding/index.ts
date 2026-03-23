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
    const { email, password, order_id } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Validate that an order exists for this email
    const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(order_id);

    let orderQuery = supabaseAdmin
      .from("asaas_orders")
      .select("id, user_email, user_id, status")
      .eq("user_email", trimmedEmail);

    if (order_id) {
      if (isUUID) {
        orderQuery = supabaseAdmin
          .from("asaas_orders")
          .select("id, user_email, user_id, status")
          .eq("user_email", trimmedEmail)
          .or(`asaas_payment_id.eq.${order_id},id.eq.${order_id}`);
      } else {
        orderQuery = supabaseAdmin
          .from("asaas_orders")
          .select("id, user_email, user_id, status")
          .eq("user_email", trimmedEmail)
          .eq("asaas_payment_id", order_id);
      }
    }

    const { data: orders, error: orderError } = await orderQuery.limit(1);

    if (orderError) {
      console.error("Order lookup error:", orderError);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar pedido" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum pedido encontrado para este email. Verifique se digitou o email correto." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = orders[0];

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === trimmedEmail
    );

    let userId: string;

    if (existingUser) {
      // User exists in auth - just update password
      userId = existingUser.id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
      });
      if (updateError) {
        console.error("Update user error:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar senha" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new user with confirmed email
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password: password,
        email_confirm: true,
      });
      if (createError || !newUser?.user) {
        console.error("Create user error:", createError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar conta" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = newUser.user.id;
    }

    // Check if profile already exists to preserve password_changed status
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, password_changed")
      .eq("id", userId)
      .maybeSingle();

    // Only set password_changed = true if this is a NEW profile being created
    // For existing profiles, preserve their current password_changed status
    const passwordChangedValue = existingProfile ? existingProfile.password_changed : false;

    // Upsert profile
    await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: trimmedEmail,
          email_verified: true,
          password_changed: passwordChangedValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    // Link order to user if not linked
    if (!order.user_id) {
      await supabaseAdmin
        .from("asaas_orders")
        .update({ user_id: userId })
        .eq("id", order.id);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Conta configurada com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Onboarding error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

    // === STEP 1: Find order in asaas_orders ===
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

    let order = orders && orders.length > 0 ? orders[0] : null;
    let isMpOrder = false;

    // === STEP 2: Fallback to mp_orders if not found in asaas_orders ===
    if (!order) {
      const { data: mpOrders, error: mpError } = await supabaseAdmin
        .from("mp_orders")
        .select("id, user_email, user_id, status")
        .eq("user_email", trimmedEmail)
        .eq("status", "paid")
        .limit(1);

      if (mpError) {
        console.error("MP order lookup error:", mpError);
      }

      if (mpOrders && mpOrders.length > 0) {
        order = mpOrders[0];
        isMpOrder = true;
        console.log("Order found in mp_orders:", order.id);
      }
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Nenhum pedido encontrado para este email. Verifique se digitou o email correto." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === STEP 3: Find existing user via profiles (avoids listUsers pagination issue) ===
    let userId: string;

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, password_changed")
      .eq("email", trimmedEmail)
      .maybeSingle();

    if (existingProfile) {
      // User exists - update password
      userId = existingProfile.id;
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

      // Mark password_changed = true since user is actively setting their password
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: trimmedEmail,
            email_verified: true,
            password_changed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
    } else {
      // No profile found - check auth as fallback (edge case: user in auth but no profile)
      let existingAuthUser = null;
      try {
        // Search auth users with pagination to find by email
        let page = 1;
        const perPage = 1000;
        while (page <= 5) {
          const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
          });
          if (!usersPage?.users || usersPage.users.length === 0) break;
          const found = usersPage.users.find(
            (u) => u.email?.toLowerCase() === trimmedEmail
          );
          if (found) {
            existingAuthUser = found;
            break;
          }
          if (usersPage.users.length < perPage) break;
          page++;
        }
      } catch (e) {
        console.error("Auth user search error:", e);
      }

      if (existingAuthUser) {
        userId = existingAuthUser.id;
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
        // Create new user
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

      // Create profile for new user
      await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: trimmedEmail,
            email_verified: true,
            password_changed: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
    }

    // === STEP 4: Link order to user if not linked ===
    if (!order.user_id) {
      const orderTable = isMpOrder ? "mp_orders" : "asaas_orders";
      await supabaseAdmin
        .from(orderTable)
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

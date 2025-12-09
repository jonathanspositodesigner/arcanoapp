import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClientData {
  email: string;
  name: string;
  phone: string;
  packs: {
    pack_slug: string;
    access_type: "3_meses" | "6_meses" | "1_ano" | "vitalicio";
    has_bonus_access: boolean;
    purchase_date: string;
  }[];
}

interface ImportPayload {
  clients: ClientData[];
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

    const payload: ImportPayload = await req.json();
    const { clients } = payload;

    if (!clients || !Array.isArray(clients)) {
      return new Response(JSON.stringify({ error: "Invalid payload - clients array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${clients.length} clients...`);

    const results = {
      success: 0,
      errors: [] as { email: string; error: string }[],
      created: 0,
      updated: 0,
    };

    for (const client of clients) {
      try {
        const { email, name, phone, packs } = client;

        if (!email || !packs || packs.length === 0) {
          results.errors.push({ email: email || "unknown", error: "Missing email or packs" });
          continue;
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists - FIXED: Use pagination to search properly instead of listUsers()
        let userId: string;
        let isNewUser = false;

        // First, try to find user by querying profiles table (faster than auth pagination)
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", normalizedEmail)
          .maybeSingle();

        if (existingProfile) {
          userId = existingProfile.id;
          results.updated++;
          console.log(`User exists (from profile): ${normalizedEmail}`);
        } else {
          // If not found in profiles, search in auth with pagination
          let foundUser = null;
          let page = 1;
          const perPage = 1000;
          
          while (!foundUser) {
            const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
              page,
              perPage
            });
            
            if (!usersPage?.users || usersPage.users.length === 0) {
              break;
            }
            
            foundUser = usersPage.users.find(
              (u) => u.email?.toLowerCase() === normalizedEmail
            );
            
            if (usersPage.users.length < perPage) {
              break; // No more pages
            }
            
            page++;
          }

          if (foundUser) {
            userId = foundUser.id;
            results.updated++;
            console.log(`User exists (from auth): ${normalizedEmail}`);
          } else {
            // Create new user with email as password
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: normalizedEmail,
              password: normalizedEmail,
              email_confirm: true,
            });

            if (createError || !newUser.user) {
              console.error(`Error creating user ${normalizedEmail}:`, createError);
              results.errors.push({ email: normalizedEmail, error: createError?.message || "Failed to create user" });
              continue;
            }

            userId = newUser.user.id;
            isNewUser = true;
            results.created++;
            console.log(`User created: ${normalizedEmail}`);
          }
        }

        // Upsert profile
        const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            email: normalizedEmail,
            name: name || null,
            phone: phone || null,
            password_changed: false,
          },
          { onConflict: "id" }
        );

        if (profileError) {
          console.error(`Error upserting profile for ${normalizedEmail}:`, profileError);
        }

        // Process each pack for this client
        for (const pack of packs) {
          const { pack_slug, access_type, has_bonus_access, purchase_date } = pack;

          // Calculate expires_at based on purchase_date and access_type
          let expiresAt: string | null = null;
          const purchaseDateTime = new Date(purchase_date);

          if (access_type === "3_meses") {
            expiresAt = new Date(purchaseDateTime.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
          } else if (access_type === "6_meses") {
            expiresAt = new Date(purchaseDateTime.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
          } else if (access_type === "1_ano") {
            expiresAt = new Date(purchaseDateTime.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
          }
          // vitalicio = null (no expiration)

          // Check if this pack purchase already exists
          const { data: existingPurchase } = await supabaseAdmin
            .from("user_pack_purchases")
            .select("id, expires_at, has_bonus_access")
            .eq("user_id", userId)
            .eq("pack_slug", pack_slug)
            .maybeSingle();

          if (existingPurchase) {
            // Update if the new expiration is later or if it's lifetime
            const shouldUpdate =
              access_type === "vitalicio" ||
              !existingPurchase.expires_at ||
              (expiresAt && new Date(expiresAt) > new Date(existingPurchase.expires_at));

            if (shouldUpdate) {
              await supabaseAdmin
                .from("user_pack_purchases")
                .update({
                  access_type,
                  expires_at: expiresAt,
                  has_bonus_access: has_bonus_access || (existingPurchase.has_bonus_access as boolean),
                  is_active: true,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingPurchase.id);
            }
          } else {
            // Insert new pack purchase
            const { error: insertError } = await supabaseAdmin.from("user_pack_purchases").insert({
              user_id: userId,
              pack_slug,
              access_type,
              expires_at: expiresAt,
              has_bonus_access,
              is_active: true,
              purchased_at: purchaseDateTime.toISOString(),
            });

            if (insertError) {
              console.error(`Error inserting pack ${pack_slug} for ${normalizedEmail}:`, insertError);
            }
          }
        }

        results.success++;
      } catch (clientError) {
        console.error(`Error processing client:`, clientError);
        results.errors.push({ email: client.email || "unknown", error: String(clientError) });
      }
    }

    console.log(`Import completed: ${results.success} success, ${results.errors.length} errors`);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Import error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

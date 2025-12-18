import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreatePremiumUserPayload {
  email: string;
  name?: string;
  phone?: string;
  plan_type?: string;
  billing_period?: string;
  expiration_days?: number;
  is_active?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify that the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's token to check their role
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: requestingUser }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the requesting user is an admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: CreatePremiumUserPayload = await req.json();
    const { email, name, phone, plan_type, billing_period, expiration_days, is_active = true } = payload;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[create-premium-user-musicos] Processing: ${email}`);

    // Check if user already exists in Supabase Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`[create-premium-user-musicos] User exists: ${userId}`);
      
      // Update password to match email
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: email,
      });

      if (updateError) {
        console.error(`[create-premium-user-musicos] Error updating password:`, updateError);
      }
    } else {
      // Create new user with email as password
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: email,
        email_confirm: true,
      });

      if (createError) {
        console.error(`[create-premium-user-musicos] Error creating user:`, createError);
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log(`[create-premium-user-musicos] New user created: ${userId}`);
    }

    // Upsert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email.toLowerCase(),
        name: name || null,
        phone: phone || null,
        password_changed: false,
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error(`[create-premium-user-musicos] Profile error:`, profileError);
    }

    // Calculate expiration date
    let expiresAt: string | null = null;
    if (expiration_days && expiration_days > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expiration_days);
      expiresAt = expDate.toISOString();
    }

    // Check if premium record already exists
    const { data: existingPremium } = await supabase
      .from('premium_musicos_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingPremium) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('premium_musicos_users')
        .update({
          plan_type,
          billing_period,
          is_active,
          expires_at: expiresAt,
          subscribed_at: new Date().toISOString(),
        })
        .eq('id', existingPremium.id);

      if (updateError) {
        console.error(`[create-premium-user-musicos] Update error:`, updateError);
        return new Response(
          JSON.stringify({ error: `Failed to update premium: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Create new premium record
      const { error: insertError } = await supabase
        .from('premium_musicos_users')
        .insert({
          user_id: userId,
          plan_type,
          billing_period,
          is_active,
          expires_at: expiresAt,
          subscribed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(`[create-premium-user-musicos] Insert error:`, insertError);
        return new Response(
          JSON.stringify({ error: `Failed to create premium: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[create-premium-user-musicos] Success: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId,
        message: existingUser ? 'User updated' : 'User created'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[create-premium-user-musicos] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

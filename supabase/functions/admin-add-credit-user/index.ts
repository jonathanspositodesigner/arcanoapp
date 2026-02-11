import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'search' | 'add_credits';
  email: string;
  name?: string;
  creditType?: 'monthly' | 'lifetime';
  amount?: number;
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create client with user's auth to verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client to check role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has admin role
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Access denied: admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { action, email } = body;

    if (!email || !action) {
      return new Response(
        JSON.stringify({ error: 'Email and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // SEARCH ACTION
    if (action === 'search') {
      console.log('Searching for user:', normalizedEmail);

      // Search in profiles table first
      const { data: profileData, error: profileError } = await adminClient
        .from('profiles')
        .select('id, email, name')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (profileError) {
        console.error('Profile search error:', profileError);
        return new Response(
          JSON.stringify({ error: 'Error searching for user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (profileData) {
        console.log('User found in profiles:', profileData.id);
        return new Response(
          JSON.stringify({
            found: true,
            user: {
              id: profileData.id,
              email: profileData.email,
              name: profileData.name
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If not in profiles, check auth.users
      const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (!authError && authUsers?.users) {
        const authUser = authUsers.users.find(u => 
          u.email?.toLowerCase() === normalizedEmail
        );

        if (authUser) {
          console.log('User found in auth.users:', authUser.id);
          return new Response(
            JSON.stringify({
              found: true,
              user: {
                id: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.name || null
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log('User not found:', normalizedEmail);
      return new Response(
        JSON.stringify({ found: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ADD CREDITS ACTION
    if (action === 'add_credits') {
      const { name, creditType, amount, description } = body;

      if (!creditType || !amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Credit type and amount are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let userId: string;
      let userCreated = false;

      // First, check if user exists
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        userId = existingProfile.id;
        console.log('Using existing user:', userId);
      } else {
        // Check auth.users as well
        const { data: authUsers } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000
        });

        const existingAuthUser = authUsers?.users?.find(u => 
          u.email?.toLowerCase() === normalizedEmail
        );

        if (existingAuthUser) {
          userId = existingAuthUser.id;
          console.log('Using existing auth user:', userId);

          // Create profile if missing
          await adminClient
            .from('profiles')
            .upsert({
              id: userId,
              email: normalizedEmail,
              name: name || null
            }, { onConflict: 'id' });
        } else {
          // Create new user
          console.log('Creating new user:', normalizedEmail);

          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: normalizedEmail,
            password: normalizedEmail, // Default password = email
            email_confirm: true,
            user_metadata: { name: name || null }
          });

          if (createError) {
            console.error('Error creating user:', createError);
            return new Response(
              JSON.stringify({ error: `Error creating user: ${createError.message}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          userId = newUser.user.id;
          userCreated = true;

          // Create profile for new user
          await adminClient
            .from('profiles')
            .insert({
              id: userId,
              email: normalizedEmail,
              name: name || null,
              password_changed: false,
              email_verified: true,
            });

          console.log('New user created:', userId);
        }
      }

      // Add credits using the appropriate RPC
      const rpcName = creditType === 'monthly' ? 'add_upscaler_credits' : 'add_lifetime_credits';
      const creditDescription = description || `Créditos ${creditType === 'monthly' ? 'mensais' : 'vitalícios'} - Admin`;

      const { data: creditResult, error: creditError } = await adminClient.rpc(rpcName, {
        _user_id: userId,
        _amount: amount,
        _description: creditDescription
      });

      if (creditError) {
        console.error('Error adding credits:', creditError);
        return new Response(
          JSON.stringify({ error: `Error adding credits: ${creditError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = creditResult?.[0];
      console.log('Credits added successfully:', result);

      return new Response(
        JSON.stringify({
          success: true,
          user_created: userCreated,
          user_id: userId,
          new_balance: result?.new_balance || amount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

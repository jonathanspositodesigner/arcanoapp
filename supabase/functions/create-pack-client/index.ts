import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PackAccess {
  pack_slug: string;
  access_type: string;
  has_bonus: boolean;
  expires_at: string | null;
}

interface CreatePackClientPayload {
  email: string;
  name?: string;
  phone?: string;
  packs: PackAccess[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the requesting user is an admin
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requestingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('User is not admin:', roleError);
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar clientes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: CreatePackClientPayload = await req.json();
    console.log('Create pack client payload:', payload);

    const { email, name, phone, packs } = payload;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!packs || packs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Pelo menos um pack é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanPhone = phone?.replace(/\D/g, '') || '';

    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let userId: string | null = null;
    let isNewUser = false;

    // STEP 1: Try to find user by email in profiles first (faster)
    console.log('Checking profiles table for:', normalizedEmail);
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
      console.log('Found user via profiles table:', userId);
    }

    // STEP 2: If not found in profiles, search in Auth with pagination
    if (!userId) {
      console.log('Not in profiles, searching Auth...');
      
      // Try to create user first - if email exists, we'll get an error
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: normalizedEmail,
        email_confirm: true
      });

      if (createError) {
        // User exists in Auth but not in profiles (orphaned user)
        if (createError.message?.includes('already') || createError.message?.includes('exists')) {
          console.log('User exists in Auth but missing profile, searching...');
          
          // Paginated search for user in Auth
          let page = 1;
          const perPage = 1000;
          let found = false;
          
          while (!found && page <= 10) {
            const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
              page,
              perPage
            });
            
            if (!usersPage?.users?.length) break;
            
            const matchedUser = usersPage.users.find(u => 
              u.email?.toLowerCase() === normalizedEmail
            );
            
            if (matchedUser) {
              userId = matchedUser.id;
              found = true;
              console.log(`Found orphaned user on page ${page}:`, userId);
            }
            
            if (usersPage.users.length < perPage) break;
            page++;
          }
          
          if (!userId) {
            console.error('User exists in Auth but could not find after 10 pages');
            return new Response(
              JSON.stringify({ error: 'Usuário existe mas não foi encontrado. Contate o suporte.' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          console.error('Error creating user:', createError);
          return new Response(
            JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        userId = newUser.user?.id;
        isNewUser = true;
        console.log('Created new user:', userId);
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Falha ao obter ID do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // STEP 3: ALWAYS upsert profile (this fixes orphaned users!)
    console.log('Upserting profile for:', { id: userId, name, phone: cleanPhone, email: normalizedEmail });
    
    const { data: upsertedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        name: name || '',
        phone: cleanPhone,
        email: normalizedEmail,
        password_changed: false,
        email_verified: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.error('Profile upsert failed:', profileError);
      console.error('Profile upsert details:', JSON.stringify({ 
        userId, 
        name, 
        phone: cleanPhone, 
        email: normalizedEmail,
        errorCode: profileError.code,
        errorDetails: profileError.details
      }));
      return new Response(
        JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Profile upserted successfully:', upsertedProfile?.id);

    // Delete existing pack purchases for this user (to replace with new ones)
    const { error: deletePacksError } = await supabaseAdmin
      .from('user_pack_purchases')
      .delete()
      .eq('user_id', userId);

    if (deletePacksError) {
      console.error('Error deleting existing packs:', deletePacksError);
    }

    // Insert new pack purchases
    const packPurchases = packs.map(pack => ({
      user_id: userId,
      pack_slug: pack.pack_slug,
      access_type: pack.access_type,
      has_bonus_access: pack.has_bonus,
      expires_at: pack.expires_at,
      is_active: true,
      purchased_at: new Date().toISOString()
    }));

    console.log('Inserting pack purchases:', packPurchases);

    const { error: insertPacksError } = await supabaseAdmin
      .from('user_pack_purchases')
      .insert(packPurchases);

    if (insertPacksError) {
      console.error('Error inserting pack purchases:', insertPacksError);
      return new Response(
        JSON.stringify({ error: `Erro ao inserir packs: ${insertPacksError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Pack purchases inserted successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: isNewUser ? 'Cliente criado com sucesso' : 'Cliente atualizado com sucesso',
        userId,
        isNew: isNewUser
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

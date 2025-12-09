import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
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

    // Check if user exists in Auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let userId: string | null = null;
    let isNewUser = false;
    
    const existingUser = existingUsers?.users.find(u => u.email === normalizedEmail);
    
    if (existingUser) {
      userId = existingUser.id;
      console.log('Found existing user:', userId);
      // Do NOT update password for existing users - only set on creation
    } else {
      // Create new user with password equal to email
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: normalizedEmail,
        email_confirm: true
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${createError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user?.id;
      isNewUser = true;
      console.log('Created new user:', userId);
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Falha ao obter ID do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert profile with name and phone
    console.log('Upserting profile:', { id: userId, name, phone: cleanPhone, email: normalizedEmail });
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        name: name || '',
        phone: cleanPhone,
        email: normalizedEmail,
        password_changed: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Profile upserted successfully');

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

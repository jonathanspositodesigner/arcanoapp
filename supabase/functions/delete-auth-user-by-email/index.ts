import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserPayload {
  email: string;
}

serve(async (req) => {
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
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem excluir usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: DeleteUserPayload = await req.json();
    console.log('Delete user by email payload:', payload);

    if (!payload.email) {
      return new Response(
        JSON.stringify({ error: 'email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailToDelete = payload.email.toLowerCase().trim();

    // Use service role client to search for user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Search for user by email with pagination
    let foundUserId: string | null = null;
    let page = 1;
    const perPage = 1000;

    while (!foundUserId) {
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error('Error listing users:', listError);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar usuários: ' + listError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Search for the email in this page
      const user = usersData.users.find(u => u.email?.toLowerCase() === emailToDelete);
      if (user) {
        foundUserId = user.id;
        console.log('Found user:', foundUserId);
        break;
      }

      // If we got fewer users than perPage, we've reached the end
      if (usersData.users.length < perPage) {
        break;
      }

      page++;
    }

    if (!foundUserId) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado com este email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up related records in public tables
    console.log('Cleaning up related records...');

    // Delete from profiles
    await supabaseAdmin.from('profiles').delete().eq('id', foundUserId);
    
    // Delete from premium_users
    await supabaseAdmin.from('premium_users').delete().eq('user_id', foundUserId);
    
    // Delete from premium_artes_users
    await supabaseAdmin.from('premium_artes_users').delete().eq('user_id', foundUserId);
    
    // Delete from user_pack_purchases
    await supabaseAdmin.from('user_pack_purchases').delete().eq('user_id', foundUserId);
    
    // Delete from user_roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', foundUserId);

    // Delete the user from Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(foundUserId);

    if (deleteError) {
      console.error('Error deleting user from Auth:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao excluir usuário: ' + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User deleted successfully:', emailToDelete);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário excluído com sucesso',
        deleted_user_id: foundUserId,
        deleted_email: emailToDelete
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

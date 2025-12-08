import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { setupKey } = await req.json();
    
    // Simple security check - only run once with correct key
    if (setupKey !== 'setup-artes-2024') {
      return new Response(
        JSON.stringify({ error: 'Invalid setup key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: string[] = [];

    // Create premium unlimited user: jonathan.lifecazy@gmail.com
    const premiumEmail = 'jonathan.lifecazy@gmail.com';
    const premiumPassword = 'elozvgckc6';
    
    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let premiumUserId: string | null = null;
    
    const existingPremiumUser = existingUsers?.users.find(u => u.email === premiumEmail);
    
    if (existingPremiumUser) {
      premiumUserId = existingPremiumUser.id;
      // Update password
      await supabase.auth.admin.updateUserById(premiumUserId, { password: premiumPassword });
      results.push(`Updated existing user: ${premiumEmail}`);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: premiumEmail,
        password: premiumPassword,
        email_confirm: true
      });

      if (createError) {
        results.push(`Error creating ${premiumEmail}: ${createError.message}`);
      } else {
        premiumUserId = newUser.user?.id || null;
        results.push(`Created new user: ${premiumEmail}`);
      }
    }

    if (premiumUserId) {
      // Create profile
      await supabase.from('profiles').upsert({
        id: premiumUserId,
        name: 'Jonathan',
        email: premiumEmail,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

      // Check if already premium
      const { data: existingPremium } = await supabase
        .from('premium_artes_users')
        .select('id')
        .eq('user_id', premiumUserId)
        .maybeSingle();

      if (!existingPremium) {
        // Create premium artes record
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 10); // 10 years

        await supabase.from('premium_artes_users').insert({
          user_id: premiumUserId,
          is_active: true,
          plan_type: 'arcano_unlimited',
          billing_period: 'yearly',
          expires_at: expiresAt.toISOString(),
          subscribed_at: new Date().toISOString()
        });
        results.push(`Added premium artes status for: ${premiumEmail}`);
      } else {
        results.push(`Premium artes status already exists for: ${premiumEmail}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Setup failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

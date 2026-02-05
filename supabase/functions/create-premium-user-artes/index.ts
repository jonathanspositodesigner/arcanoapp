import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePremiumUserPayload {
  email: string;
  name?: string;
  phone?: string;
  planType: string;
  billingPeriod: string;
  expiresInDays: number;
  isActive: boolean;
  greennProductId?: number;
  greennContractId?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: CreatePremiumUserPayload = await req.json();
    console.log('Creating premium artes user:', payload.email);

    const { email, name, phone, planType, billingPeriod, expiresInDays, isActive, greennProductId, greennContractId } = payload;

    if (!email || !planType || !billingPeriod || !expiresInDays) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanPhone = phone?.replace(/\D/g, '') || '';

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let userId: string | null = null;
    
    const existingUser = existingUsers?.users.find(u => u.email === normalizedEmail);
    
    if (existingUser) {
      userId = existingUser.id;
      console.log('Found existing user, NOT updating password:', userId);
      // Do NOT update password for existing users - only set on first creation
    } else {
      // Create new user with password equal to email
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: normalizedEmail,
        email_confirm: true
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user?.id;
      console.log('Created new user:', userId);
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Failed to get user ID' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert profile with name and phone
    console.log('Upserting profile with data:', { id: userId, name: name || '', phone: cleanPhone, email: normalizedEmail });
    
    const { error: profileError } = await supabase
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
    } else {
      console.log('Profile upserted successfully for user:', userId);
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Check if premium record exists in premium_artes_users
    const { data: existingPremium } = await supabase
      .from('premium_artes_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingPremium) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('premium_artes_users')
        .update({
          is_active: isActive,
          plan_type: planType,
          billing_period: billingPeriod,
          expires_at: expiresAt.toISOString(),
          greenn_product_id: greennProductId || null,
          greenn_contract_id: greennContractId || null
        })
        .eq('id', existingPremium.id);

      if (updateError) {
        console.error('Error updating premium artes record:', updateError);
        return new Response(
          JSON.stringify({ error: `Failed to update premium artes record: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Updated existing premium artes record');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Premium artes user updated successfully',
          userId,
          expiresAt: expiresAt.toISOString(),
          isNew: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Create new premium record
      const { error: insertError } = await supabase
        .from('premium_artes_users')
        .insert({
          user_id: userId,
          is_active: isActive,
          plan_type: planType,
          billing_period: billingPeriod,
          expires_at: expiresAt.toISOString(),
          subscribed_at: new Date().toISOString(),
          greenn_product_id: greennProductId || null,
          greenn_contract_id: greennContractId || null
        });

      if (insertError) {
        console.error('Error inserting premium artes record:', insertError);
        return new Response(
          JSON.stringify({ error: `Failed to create premium artes record: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Created new premium artes record');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Premium artes user created successfully',
          userId,
          expiresAt: expiresAt.toISOString(),
          isNew: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

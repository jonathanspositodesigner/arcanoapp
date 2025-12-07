import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, bucket, isPremium } = await req.json();

    console.log(`Generating signed URL for ${bucket}/${filePath}, isPremium: ${isPremium}`);

    if (!filePath || !bucket) {
      return new Response(
        JSON.stringify({ error: 'Missing filePath or bucket parameter' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role for generating signed URLs
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // For premium content, verify user has premium access
    if (isPremium) {
      // Get the authorization header
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader) {
        // For non-authenticated users, return an error for premium content
        return new Response(
          JSON.stringify({ error: 'Authentication required for premium content' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Create user client to verify auth
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        }
      );

      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

      if (authError || !user) {
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check if user is premium or admin
      const { data: premiumData } = await supabaseAdmin
        .from('premium_users')
        .select('is_active, expires_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      const { data: adminRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      const isPremiumActive = premiumData && 
        premiumData.is_active && 
        (!premiumData.expires_at || new Date(premiumData.expires_at) > new Date());

      if (!isPremiumActive && !adminRole) {
        console.log(`User ${user.id} is not premium and not admin`);
        return new Response(
          JSON.stringify({ error: 'Premium subscription required' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log(`User ${user.id} verified as premium/admin`);
    }

    // Generate signed URL with 1 hour expiration
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600); // 1 hour expiration

    if (error) {
      console.error('Error creating signed URL:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate signed URL' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Signed URL generated successfully for ${bucket}/${filePath}`);

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in get-signed-url:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
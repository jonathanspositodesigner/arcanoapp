import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaimRequest {
  email: string;
  promo_code: string;
}

interface ClaimResponse {
  eligible: boolean;
  reason?: 'not_found' | 'no_pack' | 'already_claimed' | 'error';
  credits_added?: number;
  new_monthly_balance?: number;
  new_lifetime_balance?: number;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, promo_code } = await req.json() as ClaimRequest;

    // Validate input
    if (!email || !promo_code) {
      return new Response(
        JSON.stringify({ eligible: false, reason: 'error', message: 'Email e código da promoção são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only allow specific promo codes
    const validPromoCodes = ['UPSCALER_1500'];
    if (!validPromoCodes.includes(promo_code)) {
      return new Response(
        JSON.stringify({ eligible: false, reason: 'error', message: 'Código de promoção inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[claim-promo-credits] Checking eligibility for: ${normalizedEmail}, promo: ${promo_code}`);

    // 1. Find user by email in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('[claim-promo-credits] Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ eligible: false, reason: 'error', message: 'Erro ao verificar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.log(`[claim-promo-credits] No profile found for email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ 
          eligible: false, 
          reason: 'not_found', 
          message: 'Compra não encontrada. Verifique se usou o email correto da compra.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = profile.id;
    console.log(`[claim-promo-credits] Found user: ${userId}`);

    // 2. Check if user has the upscaller-arcano pack active
    const { data: pack, error: packError } = await supabase
      .from('user_pack_purchases')
      .select('id, pack_slug, access_type')
      .eq('user_id', userId)
      .eq('pack_slug', 'upscaller-arcano')
      .eq('is_active', true)
      .maybeSingle();

    if (packError) {
      console.error('[claim-promo-credits] Error fetching pack:', packError);
      return new Response(
        JSON.stringify({ eligible: false, reason: 'error', message: 'Erro ao verificar compra' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pack) {
      console.log(`[claim-promo-credits] No active upscaller-arcano pack for user: ${userId}`);
      return new Response(
        JSON.stringify({ 
          eligible: false, 
          reason: 'no_pack', 
          message: 'Compra não encontrada. Verifique se usou o email correto da compra.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[claim-promo-credits] User has pack: ${pack.pack_slug}, access: ${pack.access_type}`);

    // 3. Check if user already claimed this promo
    const { data: existingClaim, error: claimCheckError } = await supabase
      .from('promo_claims')
      .select('id, claimed_at')
      .eq('user_id', userId)
      .eq('promo_code', promo_code)
      .maybeSingle();

    if (claimCheckError) {
      console.error('[claim-promo-credits] Error checking existing claim:', claimCheckError);
      return new Response(
        JSON.stringify({ eligible: false, reason: 'error', message: 'Erro ao verificar resgate' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingClaim) {
      console.log(`[claim-promo-credits] User already claimed: ${existingClaim.claimed_at}`);
      return new Response(
        JSON.stringify({ 
          eligible: false, 
          reason: 'already_claimed', 
          message: 'Você já resgatou essa promoção anteriormente.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Add 1500 monthly credits using the RPC
    const creditsToAdd = 1500;
    const { data: creditResult, error: creditError } = await supabase.rpc('add_upscaler_credits', {
      _user_id: userId,
      _amount: creditsToAdd,
      _description: `Resgate promoção ${promo_code}`
    });

    if (creditError) {
      console.error('[claim-promo-credits] Error adding credits:', creditError);
      return new Response(
        JSON.stringify({ eligible: false, reason: 'error', message: 'Erro ao adicionar créditos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[claim-promo-credits] Credits added:`, creditResult);

    // 5. Register the claim
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const { error: claimInsertError } = await supabase
      .from('promo_claims')
      .insert({
        user_id: userId,
        promo_code: promo_code,
        credits_granted: creditsToAdd,
        credit_type: 'monthly',
        ip_address: ipAddress.substring(0, 45), // Limit IP length
        user_agent: userAgent.substring(0, 255) // Limit user agent length
      });

    if (claimInsertError) {
      console.error('[claim-promo-credits] Error registering claim:', claimInsertError);
      // Credits were already added, so we log the error but don't fail
      // The unique constraint will prevent double claims anyway
    }

    // Get final balance for response
    const newMonthlyBalance = creditResult?.[0]?.new_monthly_balance ?? creditsToAdd;
    const newLifetimeBalance = creditResult?.[0]?.new_lifetime_balance ?? 0;

    console.log(`[claim-promo-credits] SUCCESS - User ${userId} claimed ${creditsToAdd} credits`);

    const response: ClaimResponse = {
      eligible: true,
      credits_added: creditsToAdd,
      new_monthly_balance: newMonthlyBalance,
      new_lifetime_balance: newLifetimeBalance,
      message: `Parabéns! ${creditsToAdd.toLocaleString('pt-BR')} créditos adicionados com sucesso!`
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[claim-promo-credits] Unexpected error:', error);
    return new Response(
      JSON.stringify({ eligible: false, reason: 'error', message: 'Erro inesperado. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

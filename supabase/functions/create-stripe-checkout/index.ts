import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== JWT Authentication =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.1");
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { priceId, mode, productSlug, successUrl, cancelUrl, fbp, fbc, fbclid, userAgent, eventSourceUrl, eventId } = await req.json();

    if (!priceId || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: priceId, successUrl, cancelUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Capture real client IP from proxy headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || req.headers.get('x-real-ip')
      || '';

    // If fbc is missing but fbclid is present, reconstruct fbc
    let finalFbc = fbc || '';
    if (!finalFbc && fbclid) {
      finalFbc = `fb.1.${Date.now()}.${fbclid}`;
    }

    // If fbp is missing but we have fbclid, generate a pseudo fbp
    let finalFbp = fbp || '';
    if (!finalFbp && fbclid) {
      finalFbp = `fb.1.${Date.now()}.${Math.floor(Math.random() * 2147483647)}`;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Truncate all metadata values to stay within Stripe's 500-char limit
    const trunc = (val: string, max = 490) => (val || '').substring(0, max);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode === "subscription" ? "subscription" : "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_slug: trunc(productSlug || '', 100),
        meta_fbp: trunc(finalFbp, 490),
        meta_fbc: trunc(finalFbc, 490),
        meta_user_agent: trunc(userAgent || '', 490),
        meta_event_source_url: trunc(eventSourceUrl || '', 490),
        meta_client_ip: trunc(clientIp, 100),
        meta_fbclid: trunc(fbclid || '', 200),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[Stripe Checkout] Session created: ${session.id} | product: ${productSlug} | fbp: ${finalFbp ? '✅' : '❌'} | fbc: ${finalFbc ? '✅' : '❌'} | ip: ${clientIp ? '✅' : '❌'}`);

    // Fire-and-forget: Meta CAPI InitiateCheckout (dedup com Pixel via eventId)
    if (finalFbp || finalFbc || eventId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && supabaseServiceKey) {
        fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            event_name: 'InitiateCheckout',
            event_id: eventId || undefined,
            event_source_url: eventSourceUrl || undefined,
            fbp: finalFbp || undefined,
            fbc: finalFbc || undefined,
            client_user_agent: userAgent || undefined,
            client_ip_address: clientIp || undefined,
            pixel_id: '1383797283173351',
          }),
        }).catch((err) => console.warn('[Stripe Checkout] CAPI fire-and-forget error:', err.message));
      }
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Stripe Checkout] Error:", (error as Error)?.message);
    return new Response(
      JSON.stringify({ error: (error as Error)?.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

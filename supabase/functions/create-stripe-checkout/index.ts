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
    const { priceId, mode, productSlug, successUrl, cancelUrl, fbp, fbc, userAgent, eventSourceUrl, eventId } = await req.json();

    if (!priceId || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: priceId, successUrl, cancelUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode === "subscription" ? "subscription" : "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        product_slug: productSlug || "",
        meta_fbp: fbp || "",
        meta_fbc: fbc || "",
        meta_user_agent: userAgent || "",
        meta_event_source_url: eventSourceUrl || "",
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[Stripe Checkout] Session created: ${session.id} for product: ${productSlug}`);

    // Fire-and-forget: Meta CAPI InitiateCheckout (dedup com Pixel via eventId)
    if (fbp || fbc || eventId) {
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
            fbp: fbp || undefined,
            fbc: fbc || undefined,
            client_user_agent: userAgent || undefined,
            client_ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || undefined,
          }),
        }).catch((err) => console.warn('[Stripe Checkout] CAPI fire-and-forget error:', err.message));
      }
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Stripe Checkout] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    const { title, body, icon, url }: PushNotificationRequest = await req.json();

    if (!title || !body) {
      throw new Error("Title and body are required");
    }

    // Get all push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("*");

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    console.log(`Sending push notification to ${subscriptions?.length || 0} subscribers`);

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys missing - Public:", !!vapidPublicKey, "Private:", !!vapidPrivateKey);
      throw new Error("VAPID keys not configured");
    }

    console.log("VAPID Public Key (first 20 chars):", vapidPublicKey.substring(0, 20));
    console.log("VAPID keys loaded successfully");

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      'mailto:jonathandesigner1993@gmail.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/icon-192.png",
      url: url || "/biblioteca-prompts",
    });

    for (const subscription of subscriptions || []) {
      try {
        console.log(`Sending to: ${subscription.endpoint.substring(0, 60)}...`);
        
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
        results.success++;
        console.log(`Push sent successfully`);
        
      } catch (error: any) {
        console.error(`Failed: ${error.statusCode || 'unknown'} - ${error.message}`);
        
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired, remove it
          await supabaseClient
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", subscription.endpoint);
          console.log(`Removed expired subscription`);
        }
        
        results.failed++;
        results.errors.push(`${error.statusCode || 'error'}: ${error.message}`);
      }
    }

    console.log(`Results: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: `Push notification sent`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

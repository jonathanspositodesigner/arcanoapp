import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnnouncementRequest {
  push_title: string;
  push_body: string;
  push_url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ========== AUTHENTICATION CHECK ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the user's token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);

    if (claimsError || !claimsData?.user) {
      console.error("Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = claimsData.user.id;
    console.log(`User ${userId} attempting to send announcement`);

    // ========== ADMIN ROLE CHECK ==========
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Error checking admin role:", roleError.message);
      return new Response(
        JSON.stringify({ error: "Error verifying permissions" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!roleData) {
      console.error(`User ${userId} is not an admin - access denied`);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Admin ${userId} authorized to send announcement`);

    // ========== PROCESS ANNOUNCEMENT ==========
    const { 
      push_title, 
      push_body, 
      push_url, 
    }: AnnouncementRequest = await req.json();

    console.log("Starting push announcement:", { push_title, admin_user_id: userId });

    let pushSent = 0;
    let pushFailed = 0;

    // Send push notifications to all subscribers
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subscriptions && subscriptions.length > 0) {
      console.log(`Found ${subscriptions.length} push subscriptions`);
      
      // Call send-push-notification function
      const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          title: push_title,
          body: push_body,
          url: push_url || "/biblioteca-artes",
        }),
      });

      if (pushResponse.ok) {
        const pushResult = await pushResponse.json();
        pushSent = pushResult.sent || 0;
        pushFailed = pushResult.failed || 0;
        console.log(`Push notifications sent: ${pushSent}, failed: ${pushFailed}`);
      } else {
        console.error("Push notification error:", await pushResponse.text());
      }
    } else {
      console.log("No push subscriptions found");
    }

    console.log(`Announcement complete by admin ${userId}. Push: ${pushSent} sent, ${pushFailed} failed.`);

    return new Response(
      JSON.stringify({
        success: true,
        push: { sent: pushSent, failed: pushFailed },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-announcement:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

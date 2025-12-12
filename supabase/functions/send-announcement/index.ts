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
    const { 
      push_title, 
      push_body, 
      push_url, 
    }: AnnouncementRequest = await req.json();

    console.log("Starting push announcement:", { push_title });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    console.log(`Announcement complete. Push: ${pushSent} sent, ${pushFailed} failed.`);

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

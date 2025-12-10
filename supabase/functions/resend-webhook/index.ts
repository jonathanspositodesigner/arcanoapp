import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    click?: {
      link: string;
      timestamp: string;
    };
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const event: ResendWebhookEvent = await req.json();
    
    console.log("Received Resend webhook event:", event.type);
    console.log("Email ID:", event.data.email_id);

    const resendId = event.data.email_id;
    const eventTime = new Date().toISOString();

    // Find the log entry by resend_id
    const { data: logEntry, error: findError } = await supabaseClient
      .from("email_campaign_logs")
      .select("id, campaign_id, open_count, click_count")
      .eq("resend_id", resendId)
      .single();

    if (findError || !logEntry) {
      console.log("Log entry not found for resend_id:", resendId);
      return new Response(
        JSON.stringify({ success: true, message: "Log entry not found, event ignored" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let updateData: Record<string, any> = {};
    let campaignUpdateField: string | null = null;

    switch (event.type) {
      case "email.delivered":
        updateData = { 
          status: "delivered",
          delivered_at: eventTime 
        };
        campaignUpdateField = "delivered_count";
        break;

      case "email.opened":
        updateData = { 
          opened_at: eventTime,
          open_count: (logEntry.open_count || 0) + 1
        };
        // Only increment campaign counter on first open
        if (!logEntry.open_count || logEntry.open_count === 0) {
          campaignUpdateField = "opened_count";
        }
        break;

      case "email.clicked":
        updateData = { 
          clicked_at: eventTime,
          click_count: (logEntry.click_count || 0) + 1
        };
        // Only increment campaign counter on first click
        if (!logEntry.click_count || logEntry.click_count === 0) {
          campaignUpdateField = "clicked_count";
        }
        break;

      case "email.bounced":
        updateData = { 
          status: "bounced",
          bounced_at: eventTime,
          error_message: "Email bounced"
        };
        campaignUpdateField = "bounced_count";
        break;

      case "email.complained":
        updateData = { 
          status: "complained",
          complained_at: eventTime,
          error_message: "Marked as spam"
        };
        campaignUpdateField = "complained_count";
        break;

      default:
        console.log("Unhandled event type:", event.type);
        return new Response(
          JSON.stringify({ success: true, message: "Event type not handled" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    // Update the log entry
    const { error: updateError } = await supabaseClient
      .from("email_campaign_logs")
      .update(updateData)
      .eq("id", logEntry.id);

    if (updateError) {
      console.error("Error updating log entry:", updateError);
      throw updateError;
    }

    // Update campaign counter if needed
    if (campaignUpdateField && logEntry.campaign_id) {
      const { data: campaign } = await supabaseClient
        .from("email_campaigns")
        .select(campaignUpdateField)
        .eq("id", logEntry.campaign_id)
        .single();

      if (campaign) {
        const currentCount = (campaign as any)[campaignUpdateField] || 0;
        await supabaseClient
          .from("email_campaigns")
          .update({ [campaignUpdateField]: currentCount + 1 })
          .eq("id", logEntry.campaign_id);
      }
    }

    console.log("Successfully processed event:", event.type);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

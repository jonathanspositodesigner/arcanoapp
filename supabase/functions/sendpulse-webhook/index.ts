import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get raw body for logging
    const rawBody = await req.text();
    console.log("Raw webhook payload:", rawBody);
    
    // Parse the payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      // Try URL-encoded format
      const params = new URLSearchParams(rawBody);
      payload = Object.fromEntries(params.entries());
    }
    
    console.log("Parsed payload:", JSON.stringify(payload, null, 2));
    
    // SendPulse may send events in different formats
    // Check if it's an array of events or single event
    const events = Array.isArray(payload) ? payload : [payload];
    
    for (const eventData of events) {
      // Try different field names that SendPulse might use
      const eventType = eventData.event || eventData.action || eventData.type || eventData.status;
      const email = eventData.email || eventData.recipient || eventData.to;
      const messageId = eventData.id || eventData.message_id || eventData.smtp_id;
      
      console.log("Processing event:", eventType, "Email:", email, "ID:", messageId);

      if (!eventType) {
        console.log("No event type found, skipping");
        continue;
      }

      // Try to find the log entry by email ID first, then by email
      let logEntry: any = null;

      if (messageId) {
        const { data: entryById } = await supabaseClient
          .from("email_campaign_logs")
          .select("id, campaign_id, open_count, click_count")
          .eq("resend_id", messageId)
          .single();
        logEntry = entryById;
      }

      // If not found by ID, try by email (get most recent)
      if (!logEntry && email) {
        const { data: entryByEmail } = await supabaseClient
          .from("email_campaign_logs")
          .select("id, campaign_id, open_count, click_count")
          .eq("email", email)
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
          .limit(1)
          .single();
        logEntry = entryByEmail;
      }

      if (!logEntry) {
        console.log("Log entry not found for email:", email);
        continue;
      }

      let updateData: Record<string, any> = {};
      let campaignUpdateField: string | null = null;
      const eventTime = new Date().toISOString();

      // Normalize event type to lowercase
      const normalizedEvent = eventType.toLowerCase();

      if (normalizedEvent.includes("deliver")) {
        updateData = { 
          status: "delivered",
          delivered_at: eventTime 
        };
        campaignUpdateField = "delivered_count";
      } else if (normalizedEvent.includes("open")) {
        updateData = { 
          opened_at: eventTime,
          open_count: (logEntry.open_count || 0) + 1
        };
        if (!logEntry.open_count || logEntry.open_count === 0) {
          campaignUpdateField = "opened_count";
        }
      } else if (normalizedEvent.includes("click")) {
        updateData = { 
          clicked_at: eventTime,
          click_count: (logEntry.click_count || 0) + 1
        };
        if (!logEntry.click_count || logEntry.click_count === 0) {
          campaignUpdateField = "clicked_count";
        }
      } else if (normalizedEvent.includes("bounce") || normalizedEvent.includes("hard") || normalizedEvent.includes("soft")) {
        updateData = { 
          status: "bounced",
          bounced_at: eventTime,
          error_message: `Email bounced (${eventType})`
        };
        campaignUpdateField = "bounced_count";
      } else if (normalizedEvent.includes("spam") || normalizedEvent.includes("complaint")) {
        updateData = { 
          status: "complained",
          complained_at: eventTime,
          error_message: "Marked as spam"
        };
        campaignUpdateField = "complained_count";
      } else if (normalizedEvent.includes("unsub")) {
        updateData = { 
          status: "unsubscribed",
          error_message: "User unsubscribed"
        };
      } else {
        console.log("Unhandled event type:", eventType);
        continue;
      }

      // Update the log entry
      const { error: updateError } = await supabaseClient
        .from("email_campaign_logs")
        .update(updateData)
        .eq("id", logEntry.id);

      if (updateError) {
        console.error("Error updating log entry:", updateError);
        continue;
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

      console.log("Successfully processed event:", eventType, "for email:", email);
    }

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

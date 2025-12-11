import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SendPulse webhook event types
// https://sendpulse.com/knowledge-base/smtp/webhooks
interface SendPulseWebhookEvent {
  event: string; // delivered, opened, clicked, spam_complaint, hard_bounce, soft_bounce, unsubscribed
  email: string;
  sender_email?: string;
  send_date?: string;
  smtp_answer_code?: number;
  smtp_answer_code_explain?: string;
  smtp_answer_subcode?: string;
  smtp_last_response?: string;
  url?: string; // for click events
  id?: string; // email ID
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

    const event: SendPulseWebhookEvent = await req.json();
    
    console.log("Received SendPulse webhook event:", event.event);
    console.log("Email:", event.email);
    console.log("ID:", event.id);

    // Try to find the log entry by email ID first, then by email
    let logEntry: any = null;

    if (event.id) {
      const { data: entryById } = await supabaseClient
        .from("email_campaign_logs")
        .select("id, campaign_id, open_count, click_count")
        .eq("resend_id", event.id)
        .single();
      logEntry = entryById;
    }

    // If not found by ID, try by email (get most recent)
    if (!logEntry && event.email) {
      const { data: entryByEmail } = await supabaseClient
        .from("email_campaign_logs")
        .select("id, campaign_id, open_count, click_count")
        .eq("email", event.email)
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(1)
        .single();
      logEntry = entryByEmail;
    }

    if (!logEntry) {
      console.log("Log entry not found for email:", event.email);
      return new Response(
        JSON.stringify({ success: true, message: "Log entry not found, event ignored" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let updateData: Record<string, any> = {};
    let campaignUpdateField: string | null = null;
    const eventTime = new Date().toISOString();

    switch (event.event) {
      case "delivered":
        updateData = { 
          status: "delivered",
          delivered_at: eventTime 
        };
        campaignUpdateField = "delivered_count";
        break;

      case "opened":
        updateData = { 
          opened_at: eventTime,
          open_count: (logEntry.open_count || 0) + 1
        };
        // Only increment campaign counter on first open
        if (!logEntry.open_count || logEntry.open_count === 0) {
          campaignUpdateField = "opened_count";
        }
        break;

      case "clicked":
        updateData = { 
          clicked_at: eventTime,
          click_count: (logEntry.click_count || 0) + 1
        };
        // Only increment campaign counter on first click
        if (!logEntry.click_count || logEntry.click_count === 0) {
          campaignUpdateField = "clicked_count";
        }
        break;

      case "hard_bounce":
      case "soft_bounce":
        updateData = { 
          status: "bounced",
          bounced_at: eventTime,
          error_message: event.smtp_last_response || `Email bounced (${event.event})`
        };
        campaignUpdateField = "bounced_count";
        break;

      case "spam_complaint":
        updateData = { 
          status: "complained",
          complained_at: eventTime,
          error_message: "Marked as spam"
        };
        campaignUpdateField = "complained_count";
        break;

      case "unsubscribed":
        updateData = { 
          status: "unsubscribed",
          error_message: "User unsubscribed"
        };
        break;

      default:
        console.log("Unhandled event type:", event.event);
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

    console.log("Successfully processed event:", event.event);

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

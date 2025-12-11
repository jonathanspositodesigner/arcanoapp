import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Processing scheduled email campaigns...");

    // Fetch campaigns that are scheduled and ready to send
    const { data: campaigns, error } = await supabaseClient
      .from("email_campaigns")
      .select("*")
      .eq("is_scheduled", true)
      .eq("status", "scheduled")
      .lte("next_send_at", new Date().toISOString());

    if (error) {
      console.error("Error fetching scheduled campaigns:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${campaigns?.length || 0} campaigns to process`);

    let processedCount = 0;

    for (const campaign of campaigns || []) {
      console.log(`Processing campaign: ${campaign.id} - ${campaign.title}`);

      try {
        // Invoke the send-email-campaign function
        const { data, error: invokeError } = await supabaseClient.functions.invoke(
          "send-email-campaign",
          {
            body: { campaign_id: campaign.id },
          }
        );

        if (invokeError) {
          console.error(`Error invoking send-email-campaign for ${campaign.id}:`, invokeError);
          continue;
        }

        console.log(`Campaign ${campaign.id} sent successfully:`, data);

        // Update the campaign based on schedule type
        const scheduleType = campaign.schedule_type;
        let nextSendAt: Date | null = null;

        if (scheduleType === "once") {
          // One-time send - mark as no longer scheduled
          await supabaseClient
            .from("email_campaigns")
            .update({
              is_scheduled: false,
              last_scheduled_send_at: new Date().toISOString(),
            })
            .eq("id", campaign.id);
        } else {
          // Calculate next send time for recurring campaigns
          const now = new Date();
          const scheduledTime = campaign.scheduled_time; // HH:MM:SS format

          if (scheduleType === "daily") {
            // Next day at the scheduled time
            nextSendAt = new Date(now);
            nextSendAt.setDate(nextSendAt.getDate() + 1);
            if (scheduledTime) {
              const [hours, minutes] = scheduledTime.split(":");
              nextSendAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }
          } else if (scheduleType === "weekly") {
            // Next week on the same day at the scheduled time
            nextSendAt = new Date(now);
            nextSendAt.setDate(nextSendAt.getDate() + 7);
            if (scheduledTime) {
              const [hours, minutes] = scheduledTime.split(":");
              nextSendAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }
          } else if (scheduleType === "monthly") {
            // Next month on the same day at the scheduled time
            nextSendAt = new Date(now);
            nextSendAt.setMonth(nextSendAt.getMonth() + 1);
            if (campaign.scheduled_day_of_month) {
              nextSendAt.setDate(campaign.scheduled_day_of_month);
            }
            if (scheduledTime) {
              const [hours, minutes] = scheduledTime.split(":");
              nextSendAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }
          }

          // Reset status to scheduled for next send
          await supabaseClient
            .from("email_campaigns")
            .update({
              status: "scheduled",
              next_send_at: nextSendAt?.toISOString(),
              last_scheduled_send_at: new Date().toISOString(),
              // Reset counters for next send
              sent_count: 0,
              failed_count: 0,
              delivered_count: 0,
              opened_count: 0,
              clicked_count: 0,
              bounced_count: 0,
              complained_count: 0,
            })
            .eq("id", campaign.id);
        }

        processedCount++;
      } catch (campaignError: any) {
        console.error(`Error processing campaign ${campaign.id}:`, campaignError);
      }
    }

    console.log(`Processed ${processedCount} scheduled campaigns`);

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in process-scheduled-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
  email_subject: string;
  email_content: string;
  email_sender_name?: string;
  email_sender_email?: string;
  email_title?: string;
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
      email_subject, 
      email_content,
      email_sender_name = "ArcanoApp",
      email_sender_email = "contato@voxvisual.com.br",
      email_title = "Anúncio de Atualizações"
    }: AnnouncementRequest = await req.json();

    console.log("Starting announcement send:", { push_title, email_subject });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let pushSent = 0;
    let pushFailed = 0;
    let emailSent = 0;
    let emailFailed = 0;

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
    }

    // Send emails using send-email-campaign motor
    console.log("Creating email campaign for announcement...");
    
    // Create a campaign record
    const { data: campaignData, error: campaignError } = await supabase
      .from("email_campaigns")
      .insert({
        title: email_title,
        subject: email_subject,
        content: email_content,
        sender_name: email_sender_name,
        sender_email: email_sender_email,
        recipient_filter: "artes_pack", // Send to all artes pack purchasers
        status: "draft",
      })
      .select()
      .single();

    if (campaignError || !campaignData) {
      console.error("Error creating campaign:", campaignError);
      throw new Error("Failed to create email campaign");
    }

    console.log(`Created campaign ${campaignData.id}, invoking send-email-campaign...`);

    // Invoke send-email-campaign function
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-campaign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        campaign_id: campaignData.id,
      }),
    });

    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      emailSent = emailResult.sent || 0;
      emailFailed = emailResult.failed || 0;
      console.log(`Emails sent: ${emailSent}, failed: ${emailFailed}`);
    } else {
      const errorText = await emailResponse.text();
      console.error("Email campaign error:", errorText);
    }

    console.log(`Announcement complete. Push: ${pushSent} sent, ${pushFailed} failed. Email: ${emailSent} sent, ${emailFailed} failed.`);

    return new Response(
      JSON.stringify({
        success: true,
        push: { sent: pushSent, failed: pushFailed },
        email: { sent: emailSent, failed: emailFailed },
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

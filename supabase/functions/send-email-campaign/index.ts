import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignRequest {
  campaign_id: string;
  test_email?: string;
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

    const { campaign_id, test_email }: SendCampaignRequest = await req.json();

    console.log(`Processing campaign: ${campaign_id}, test_email: ${test_email}`);

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      console.error("Campaign not found:", campaignError);
      return new Response(
        JSON.stringify({ error: "Campanha não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If test email, send only to that address
    if (test_email) {
      console.log(`Sending test email to: ${test_email}`);
      
      const { error: sendError } = await resend.emails.send({
        from: `${campaign.sender_name} <${campaign.sender_email}>`,
        to: [test_email],
        subject: `[TESTE] ${campaign.subject}`,
        html: campaign.content,
      });

      if (sendError) {
        console.error("Error sending test email:", sendError);
        return new Response(
          JSON.stringify({ error: sendError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Email de teste enviado!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipients based on filter
    let recipients: string[] = [];
    const filter = campaign.recipient_filter;

    if (filter === "all") {
      const { data } = await supabaseClient
        .from("profiles")
        .select("email")
        .not("email", "is", null);
      recipients = data?.map((p) => p.email).filter(Boolean) || [];
    } else if (filter === "premium_prompts") {
      const { data } = await supabaseClient
        .from("premium_users")
        .select("user_id")
        .eq("is_active", true);
      
      if (data && data.length > 0) {
        const userIds = data.map((p) => p.user_id);
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("email")
          .in("id", userIds)
          .not("email", "is", null);
        recipients = profiles?.map((p) => p.email).filter(Boolean) || [];
      }
    } else if (filter === "artes_clients") {
      // All clients with any pack from Biblioteca de Artes
      const { data } = await supabaseClient
        .from("user_pack_purchases")
        .select("user_id")
        .eq("is_active", true);
      
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((p) => p.user_id))];
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("email")
          .in("id", userIds)
          .not("email", "is", null);
        recipients = profiles?.map((p) => p.email).filter(Boolean) || [];
      }
    } else if (filter === "artes_expired") {
      // Clients with ALL packs expired
      const { data: allPurchases } = await supabaseClient
        .from("user_pack_purchases")
        .select("user_id, access_type, expires_at")
        .eq("is_active", true);
      
      if (allPurchases && allPurchases.length > 0) {
        const now = new Date();
        const userPacks: Record<string, { hasActive: boolean }> = {};
        
        allPurchases.forEach(purchase => {
          if (!userPacks[purchase.user_id]) {
            userPacks[purchase.user_id] = { hasActive: false };
          }
          // Check if this pack is still active (not expired)
          if (purchase.access_type === 'vitalicio' || 
              !purchase.expires_at || 
              new Date(purchase.expires_at) > now) {
            userPacks[purchase.user_id].hasActive = true;
          }
        });

        // Get users where ALL packs are expired
        const expiredUserIds = Object.entries(userPacks)
          .filter(([_, data]) => !data.hasActive)
          .map(([userId, _]) => userId);

        if (expiredUserIds.length > 0) {
          const { data: profiles } = await supabaseClient
            .from("profiles")
            .select("email")
            .in("id", expiredUserIds)
            .not("email", "is", null);
          recipients = profiles?.map((p) => p.email).filter(Boolean) || [];
        }
      }
    } else if (filter === "specific_pack" && campaign.filter_value) {
      const { data } = await supabaseClient
        .from("user_pack_purchases")
        .select("user_id")
        .eq("pack_slug", campaign.filter_value)
        .eq("is_active", true);
      
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((p) => p.user_id))];
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("email")
          .in("id", userIds)
          .not("email", "is", null);
        recipients = profiles?.map((p) => p.email).filter(Boolean) || [];
      }
    }

    // Remove duplicates
    recipients = [...new Set(recipients)];

    console.log(`Found ${recipients.length} recipients for filter: ${filter}`);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum destinatário encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update campaign status to sending
    await supabaseClient
      .from("email_campaigns")
      .update({ 
        status: "sending", 
        recipients_count: recipients.length,
        sent_at: new Date().toISOString()
      })
      .eq("id", campaign_id);

    // Send emails in batches of 50
    const BATCH_SIZE = 50;
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (email) => {
        try {
          await resend.emails.send({
            from: `${campaign.sender_name} <${campaign.sender_email}>`,
            to: [email],
            subject: campaign.subject,
            html: campaign.content,
          });
          return { success: true };
        } catch (error) {
          console.error(`Failed to send to ${email}:`, error);
          return { success: false };
        }
      });

      const results = await Promise.all(promises);
      
      sentCount += results.filter((r) => r.success).length;
      failedCount += results.filter((r) => !r.success).length;

      // Update progress
      await supabaseClient
        .from("email_campaigns")
        .update({ 
          sent_count: sentCount,
          failed_count: failedCount
        })
        .eq("id", campaign_id);

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update final status
    const finalStatus = failedCount === 0 ? "sent" : failedCount === recipients.length ? "failed" : "sent";
    
    await supabaseClient
      .from("email_campaigns")
      .update({ 
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount
      })
      .eq("id", campaign_id);

    console.log(`Campaign completed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: sentCount, 
        failed_count: failedCount,
        total: recipients.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-email-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

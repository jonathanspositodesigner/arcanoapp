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

// Helper function to fetch all records with pagination
async function fetchAllRecords(supabaseClient: any, table: string, selectFields: string, filters: any = {}) {
  const allRecords: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabaseClient
      .from(table)
      .select(selectFields)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value === null) {
        query = query.not(key, "is", null);
      } else {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;
    
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      break;
    }
    
    if (data && data.length > 0) {
      allRecords.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
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
      console.log(`From: ${campaign.sender_name} <${campaign.sender_email}>`);
      console.log(`Subject: [TESTE] ${campaign.subject}`);
      
      try {
        const sendResult = await resend.emails.send({
          from: `${campaign.sender_name} <${campaign.sender_email}>`,
          to: [test_email],
          subject: `[TESTE] ${campaign.subject}`,
          html: campaign.content,
        });

        console.log("Resend API response:", JSON.stringify(sendResult));

        if (sendResult.error) {
          console.error("Error sending test email:", sendResult.error);
          return new Response(
            JSON.stringify({ error: sendResult.error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("Test email sent successfully, ID:", sendResult.data?.id);

        return new Response(
          JSON.stringify({ success: true, message: "Email de teste enviado!", email_id: sendResult.data?.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (sendError: any) {
        console.error("Exception sending test email:", sendError);
        return new Response(
          JSON.stringify({ error: sendError.message || "Erro ao enviar email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get recipients based on filter
    let recipients: string[] = [];
    const filter = campaign.recipient_filter;

    if (filter === "all") {
      const allProfiles = await fetchAllRecords(supabaseClient, "profiles", "email", {});
      recipients = allProfiles.map((p) => p.email).filter(Boolean);
    } else if (filter === "premium_prompts") {
      const premiumUsers = await fetchAllRecords(supabaseClient, "premium_users", "user_id", { is_active: true });
      
      if (premiumUsers.length > 0) {
        const userIds = premiumUsers.map((p) => p.user_id);
        // Fetch profiles in batches
        const allProfiles: any[] = [];
        for (let i = 0; i < userIds.length; i += 100) {
          const batch = userIds.slice(i, i + 100);
          const { data: profiles } = await supabaseClient
            .from("profiles")
            .select("email")
            .in("id", batch)
            .not("email", "is", null);
          if (profiles) allProfiles.push(...profiles);
        }
        recipients = allProfiles.map((p) => p.email).filter(Boolean);
      }
    } else if (filter === "artes_clients") {
      // All clients with any pack from Biblioteca de Artes
      const allPurchases = await fetchAllRecords(supabaseClient, "user_pack_purchases", "user_id", { is_active: true });
      const userIds = [...new Set(allPurchases.map((p) => p.user_id))];
      
      console.log(`Found ${userIds.length} unique artes clients`);
      
      // Fetch profiles in batches of 100
      const allProfiles: any[] = [];
      for (let i = 0; i < userIds.length; i += 100) {
        const batch = userIds.slice(i, i + 100);
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("email")
          .in("id", batch)
          .not("email", "is", null);
        if (profiles) allProfiles.push(...profiles);
      }
      recipients = allProfiles.map((p) => p.email).filter(Boolean);
    } else if (filter === "artes_expired") {
      // Clients with ALL packs expired
      const allPurchases = await fetchAllRecords(supabaseClient, "user_pack_purchases", "user_id, access_type, expires_at", { is_active: true });
      
      const now = new Date();
      const userPacks: Record<string, { hasActive: boolean }> = {};
      
      allPurchases.forEach((purchase: any) => {
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

      console.log(`Found ${expiredUserIds.length} users with all packs expired`);

      if (expiredUserIds.length > 0) {
        // Fetch profiles in batches of 100
        const allProfiles: any[] = [];
        for (let i = 0; i < expiredUserIds.length; i += 100) {
          const batch = expiredUserIds.slice(i, i + 100);
          const { data: profiles } = await supabaseClient
            .from("profiles")
            .select("email")
            .in("id", batch)
            .not("email", "is", null);
          if (profiles) allProfiles.push(...profiles);
        }
        recipients = allProfiles.map((p) => p.email).filter(Boolean);
      }
    } else if (filter === "specific_pack" && campaign.filter_value) {
      const packPurchases = await fetchAllRecords(supabaseClient, "user_pack_purchases", "user_id", { 
        is_active: true, 
        pack_slug: campaign.filter_value 
      });
      const userIds = [...new Set(packPurchases.map((p) => p.user_id))];
      
      // Fetch profiles in batches of 100
      const allProfiles: any[] = [];
      for (let i = 0; i < userIds.length; i += 100) {
        const batch = userIds.slice(i, i + 100);
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("email")
          .in("id", batch)
          .not("email", "is", null);
        if (profiles) allProfiles.push(...profiles);
      }
      recipients = allProfiles.map((p) => p.email).filter(Boolean);
    } else if (filter === "custom_email" && campaign.filter_value) {
      // Send to a specific custom email
      recipients = [campaign.filter_value.trim()];
      console.log(`Custom email recipient: ${campaign.filter_value}`);
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

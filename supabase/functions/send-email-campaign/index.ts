import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendCampaignRequest {
  campaign_id: string;
  test_email?: string;
  resume?: boolean;
  batch_size?: number;
}

// SendPulse OAuth2 token cache
let cachedToken: { token: string; expiresAt: number } | null = null;

// Get SendPulse OAuth2 token
async function getSendPulseToken(): Promise<string> {
  // Check if we have a valid cached token (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  console.log("Fetching new SendPulse token...");
  
  const response = await fetch("https://api.sendpulse.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: Deno.env.get("SENDPULSE_CLIENT_ID"),
      client_secret: Deno.env.get("SENDPULSE_CLIENT_SECRET"),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("SendPulse token error:", errorText);
    throw new Error(`Failed to get SendPulse token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  // Cache token (expires in 1 hour, we cache for 55 min)
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 3300000 // 55 minutes
  };

  console.log("SendPulse token obtained successfully");
  return data.access_token;
}

// Send email via SendPulse SMTP API
async function sendEmailViaSendPulse(params: {
  from_name: string;
  from_email: string;
  to_email: string;
  to_name?: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const token = await getSendPulseToken();
    
    // Convert HTML to Base64 (SendPulse requirement)
    const htmlBase64 = btoa(unescape(encodeURIComponent(params.html)));
    
    const response = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: {
          html: htmlBase64,
          text: "", // Plain text version (optional)
          subject: params.subject,
          from: {
            name: params.from_name,
            email: params.from_email,
          },
          to: [{ 
            email: params.to_email, 
            name: params.to_name || "" 
          }],
        },
      }),
    });

    const result = await response.json();
    
    console.log("SendPulse API response:", JSON.stringify(result));

    if (result.result === true) {
      return { success: true, id: result.id };
    } else {
      return { success: false, error: result.message || JSON.stringify(result) };
    }
  } catch (error: any) {
    console.error("SendPulse send error:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
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

    const { campaign_id, test_email, resume, batch_size }: SendCampaignRequest = await req.json();
    const BATCH_SIZE = batch_size || 50;

    console.log(`Processing campaign: ${campaign_id}, test_email: ${test_email}, resume: ${resume}, batch_size: ${BATCH_SIZE}`);

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
      
      const sendResult = await sendEmailViaSendPulse({
        from_name: campaign.sender_name,
        from_email: campaign.sender_email,
        to_email: test_email,
        subject: `[TESTE] ${campaign.subject}`,
        html: campaign.content,
      });

      if (!sendResult.success) {
        console.error("Error sending test email:", sendResult.error);
        return new Response(
          JSON.stringify({ error: sendResult.error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Test email sent successfully, ID:", sendResult.id);

      return new Response(
        JSON.stringify({ success: true, message: "Email de teste enviado!", email_id: sendResult.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== RESUME MODE ==========
    if (resume) {
      console.log(`RESUME MODE: Processing pending emails for campaign ${campaign_id}`);

      if (campaign.is_paused) {
        console.log("Campaign is paused, not processing");
        return new Response(
          JSON.stringify({ 
            success: true, 
            paused: true,
            message: "Campanha pausada",
            sent_count: campaign.sent_count || 0,
            failed_count: campaign.failed_count || 0
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: pendingLogs, error: logsError } = await supabaseClient
        .from("email_campaign_logs")
        .select("id, email")
        .eq("campaign_id", campaign_id)
        .eq("status", "pending")
        .limit(BATCH_SIZE);

      if (logsError) {
        console.error("Error fetching pending logs:", logsError);
        return new Response(
          JSON.stringify({ error: "Erro ao buscar emails pendentes" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!pendingLogs || pendingLogs.length === 0) {
        const sentCount = campaign.sent_count || 0;
        const failedCount = campaign.failed_count || 0;
        
        await supabaseClient
          .from("email_campaigns")
          .update({ status: "sent", is_paused: false })
          .eq("id", campaign_id);

        console.log("No more pending emails - campaign completed");
        return new Response(
          JSON.stringify({ 
            success: true, 
            completed: true,
            message: "Todos os emails foram enviados!",
            sent_count: sentCount,
            failed_count: failedCount
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Found ${pendingLogs.length} pending emails to process`);

      await supabaseClient
        .from("email_campaigns")
        .update({ status: "sending", is_paused: false })
        .eq("id", campaign_id);

      let sentCount = campaign.sent_count || 0;
      let failedCount = campaign.failed_count || 0;
      const DELAY_BETWEEN_EMAILS = 600;
      const MAX_RETRIES = 3;

      for (let i = 0; i < pendingLogs.length; i++) {
        // CHECK FOR PAUSE before each email
        const { data: currentCampaign } = await supabaseClient
          .from("email_campaigns")
          .select("is_paused")
          .eq("id", campaign_id)
          .single();

        if (currentCampaign?.is_paused) {
          console.log("Campaign paused by user, stopping processing");
          
          await supabaseClient
            .from("email_campaigns")
            .update({ 
              status: "paused",
              sent_count: sentCount,
              failed_count: failedCount
            })
            .eq("id", campaign_id);

          const { count: remainingAfterPause } = await supabaseClient
            .from("email_campaign_logs")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", campaign_id)
            .eq("status", "pending");

          return new Response(
            JSON.stringify({ 
              success: true, 
              paused: true,
              message: "Campanha pausada pelo usuário",
              sent_count: sentCount,
              failed_count: failedCount,
              remaining: remainingAfterPause || 0
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const log = pendingLogs[i];
        const email = log.email;
        let success = false;
        let retries = 0;
        let emailId: string | null = null;
        let errorMessage: string | null = null;

        while (!success && retries < MAX_RETRIES) {
          const result = await sendEmailViaSendPulse({
            from_name: campaign.sender_name,
            from_email: campaign.sender_email,
            to_email: email,
            subject: campaign.subject,
            html: campaign.content,
          });

          if (!result.success) {
            errorMessage = result.error || "Unknown error";
            
            if (errorMessage.includes("rate") || errorMessage.includes("limit") || errorMessage.includes("429")) {
              console.log(`Rate limit hit for ${email}, waiting 2 seconds before retry ${retries + 1}/${MAX_RETRIES}`);
              await new Promise((resolve) => setTimeout(resolve, 2000));
              retries++;
              continue;
            }
            
            console.error(`Failed to send to ${email}: ${errorMessage}`);
            failedCount++;
            
            await supabaseClient
              .from("email_campaign_logs")
              .update({
                status: "failed",
                error_message: errorMessage,
                sent_at: new Date().toISOString()
              })
              .eq("id", log.id);
            
            break;
          }

          success = true;
          sentCount++;
          emailId = result.id || null;
          
          console.log(`[${i + 1}/${pendingLogs.length}] Sent to ${email} (ID: ${emailId})`);
          
          await supabaseClient
            .from("email_campaign_logs")
            .update({
              status: "sent",
              resend_id: emailId, // Keep using resend_id column for compatibility
              sent_at: new Date().toISOString()
            })
            .eq("id", log.id);
        }

        if (!success && retries >= MAX_RETRIES) {
          console.error(`Max retries reached for ${email}`);
          failedCount++;
          
          await supabaseClient
            .from("email_campaign_logs")
            .update({
              status: "rate_limited",
              error_message: "Max retries exceeded due to rate limiting",
              sent_at: new Date().toISOString()
            })
            .eq("id", log.id);
        }

        await supabaseClient
          .from("email_campaigns")
          .update({ 
            sent_count: sentCount,
            failed_count: failedCount
          })
          .eq("id", campaign_id);

        if (i < pendingLogs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
        }
      }

      const { count: remainingCount } = await supabaseClient
        .from("email_campaign_logs")
        .select("*", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("status", "pending");

      const hasMore = (remainingCount || 0) > 0;

      if (!hasMore) {
        await supabaseClient
          .from("email_campaigns")
          .update({ status: "sent", is_paused: false })
          .eq("id", campaign_id);
      }

      console.log(`Batch completed: ${sentCount} sent, ${failedCount} failed, ${remainingCount || 0} remaining`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          completed: !hasMore,
          sent_count: sentCount,
          failed_count: failedCount,
          processed_this_batch: pendingLogs.length,
          remaining: remainingCount || 0,
          message: hasMore ? `Processados ${pendingLogs.length} emails, restam ${remainingCount}` : "Todos os emails foram enviados!"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== NORMAL MODE ==========
    let recipients: string[] = [];
    const filter = campaign.recipient_filter;

    if (filter === "all") {
      const allProfiles = await fetchAllRecords(supabaseClient, "profiles", "email", {});
      recipients = allProfiles.map((p) => p.email).filter(Boolean);
    } else if (filter === "premium_prompts") {
      const premiumUsers = await fetchAllRecords(supabaseClient, "premium_users", "user_id", { is_active: true });
      
      if (premiumUsers.length > 0) {
        const userIds = premiumUsers.map((p) => p.user_id);
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
      const allPurchases = await fetchAllRecords(supabaseClient, "user_pack_purchases", "user_id", { is_active: true });
      const userIds = [...new Set(allPurchases.map((p) => p.user_id))];
      
      console.log(`Found ${userIds.length} unique artes clients`);
      
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
      const allPurchases = await fetchAllRecords(supabaseClient, "user_pack_purchases", "user_id, access_type, expires_at", { is_active: true });
      
      const now = new Date();
      const userPacks: Record<string, { hasActive: boolean }> = {};
      
      allPurchases.forEach((purchase: any) => {
        if (!userPacks[purchase.user_id]) {
          userPacks[purchase.user_id] = { hasActive: false };
        }
        if (purchase.access_type === 'vitalicio' || 
            !purchase.expires_at || 
            new Date(purchase.expires_at) > now) {
          userPacks[purchase.user_id].hasActive = true;
        }
      });

      const expiredUserIds = Object.entries(userPacks)
        .filter(([_, data]) => !data.hasActive)
        .map(([userId, _]) => userId);

      console.log(`Found ${expiredUserIds.length} users with all packs expired`);

      if (expiredUserIds.length > 0) {
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
      recipients = [campaign.filter_value.trim()];
      console.log(`Custom email recipient: ${campaign.filter_value}`);
    } else if (filter === "pending_first_access") {
      const allProfiles = await fetchAllRecords(supabaseClient, "profiles", "email, password_changed", {});
      recipients = allProfiles
        .filter((p) => p.email && (p.password_changed === false || p.password_changed === null))
        .map((p) => p.email);
      console.log(`Found ${recipients.length} users with pending first access`);
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

    await supabaseClient
      .from("email_campaigns")
      .update({ 
        status: "sending", 
        recipients_count: recipients.length,
        sent_at: new Date().toISOString()
      })
      .eq("id", campaign_id);

    await supabaseClient
      .from("email_campaign_logs")
      .delete()
      .eq("campaign_id", campaign_id);

    const pendingLogs = recipients.map(email => ({
      campaign_id,
      email,
      status: "pending"
    }));

    for (let i = 0; i < pendingLogs.length; i += 100) {
      const batch = pendingLogs.slice(i, i + 100);
      await supabaseClient.from("email_campaign_logs").insert(batch);
    }

    console.log(`Created ${pendingLogs.length} pending log entries`);

    const firstBatch = recipients.slice(0, BATCH_SIZE);
    let sentCount = 0;
    let failedCount = 0;
    const DELAY_BETWEEN_EMAILS = 600;
    const MAX_RETRIES = 3;

    console.log(`Starting to send first batch of ${firstBatch.length} emails`);

    for (let i = 0; i < firstBatch.length; i++) {
      const { data: currentCampaign } = await supabaseClient
        .from("email_campaigns")
        .select("is_paused")
        .eq("id", campaign_id)
        .single();

      if (currentCampaign?.is_paused) {
        console.log("Campaign paused by user, stopping processing");
        
        await supabaseClient
          .from("email_campaigns")
          .update({ 
            status: "paused",
            sent_count: sentCount,
            failed_count: failedCount
          })
          .eq("id", campaign_id);

        const { count: remainingAfterPause } = await supabaseClient
          .from("email_campaign_logs")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", campaign_id)
          .eq("status", "pending");

        return new Response(
          JSON.stringify({ 
            success: true, 
            paused: true,
            message: "Campanha pausada pelo usuário",
            sent_count: sentCount,
            failed_count: failedCount,
            remaining: remainingAfterPause || 0,
            total: recipients.length
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const email = firstBatch[i];
      let success = false;
      let retries = 0;
      let emailId: string | null = null;
      let errorMessage: string | null = null;

      while (!success && retries < MAX_RETRIES) {
        const result = await sendEmailViaSendPulse({
          from_name: campaign.sender_name,
          from_email: campaign.sender_email,
          to_email: email,
          subject: campaign.subject,
          html: campaign.content,
        });

        if (!result.success) {
          errorMessage = result.error || "Unknown error";
          
          if (errorMessage.includes("rate") || errorMessage.includes("limit") || errorMessage.includes("429")) {
            console.log(`Rate limit hit for ${email}, waiting 2 seconds before retry ${retries + 1}/${MAX_RETRIES}`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            retries++;
            continue;
          }
          
          console.error(`Failed to send to ${email}: ${errorMessage}`);
          failedCount++;
          
          await supabaseClient
            .from("email_campaign_logs")
            .update({
              status: "failed",
              error_message: errorMessage,
              sent_at: new Date().toISOString()
            })
            .eq("campaign_id", campaign_id)
            .eq("email", email);
          
          break;
        }

        success = true;
        sentCount++;
        emailId = result.id || null;
        
        console.log(`[${i + 1}/${firstBatch.length}] Sent to ${email} (ID: ${emailId})`);
        
        await supabaseClient
          .from("email_campaign_logs")
          .update({
            status: "sent",
            resend_id: emailId,
            sent_at: new Date().toISOString()
          })
          .eq("campaign_id", campaign_id)
          .eq("email", email);
      }

      if (!success && retries >= MAX_RETRIES) {
        console.error(`Max retries reached for ${email}`);
        failedCount++;
        
        await supabaseClient
          .from("email_campaign_logs")
          .update({
            status: "rate_limited",
            error_message: "Max retries exceeded due to rate limiting",
            sent_at: new Date().toISOString()
          })
          .eq("campaign_id", campaign_id)
          .eq("email", email);
      }

      await supabaseClient
        .from("email_campaigns")
        .update({ 
          sent_count: sentCount,
          failed_count: failedCount
        })
        .eq("id", campaign_id);

      if (i < firstBatch.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
      }
    }

    await supabaseClient
      .from("email_campaigns")
      .update({ 
        sent_count: sentCount,
        failed_count: failedCount
      })
      .eq("id", campaign_id);

    const remaining = recipients.length - firstBatch.length;
    const hasMore = remaining > 0;

    if (!hasMore) {
      await supabaseClient
        .from("email_campaigns")
        .update({ status: "sent" })
        .eq("id", campaign_id);
    }

    console.log(`First batch completed: ${sentCount} sent, ${failedCount} failed, ${remaining} remaining`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        completed: !hasMore,
        sent_count: sentCount, 
        failed_count: failedCount,
        processed_this_batch: firstBatch.length,
        remaining: remaining,
        total: recipients.length,
        message: hasMore ? `Processados ${firstBatch.length} emails, restam ${remaining}. Use resume=true para continuar.` : "Todos os emails foram enviados!"
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

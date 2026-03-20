import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getAccountIds(): string[] {
  const accountIds: string[] = [];
  const id1 = Deno.env.get("META_AD_ACCOUNT_ID_1");
  const id2 = Deno.env.get("META_AD_ACCOUNT_ID_2");
  const id3 = Deno.env.get("META_AD_ACCOUNT_ID_3");
  if (id1) accountIds.push(id1.trim());
  if (id2) accountIds.push(id2.trim());
  if (id3) accountIds.push(id3.trim());
  if (accountIds.length === 0) {
    const legacy = Deno.env.get("META_AD_ACCOUNT_IDS");
    if (legacy) accountIds.push(...legacy.split(",").map(s => s.trim()));
  }
  return accountIds;
}

function getActionValue(actions: any[], actionType: string): number {
  const found = actions.find((a: any) => a.action_type === actionType);
  return found ? parseInt(found.value || "0") : 0;
}

function getActionMoneyValue(actionValues: any[], actionType: string): number {
  const found = actionValues.find((a: any) => a.action_type === actionType);
  return found ? parseFloat(found.value || "0") : 0;
}

function extractMetrics(row: any) {
  const actions = row.actions || [];
  const actionValues = row.action_values || [];
  const landingPageViews = getActionValue(actions, "landing_page_view");
  const initiatedCheckouts = getActionValue(actions, "offsite_conversion.fb_pixel_initiate_checkout")
    || getActionValue(actions, "initiate_checkout")
    || getActionValue(actions, "omni_initiated_checkout");
  const purchases = getActionValue(actions, "offsite_conversion.fb_pixel_purchase")
    || getActionValue(actions, "purchase")
    || getActionValue(actions, "omni_purchase");
  const purchaseValue = getActionMoneyValue(actionValues, "offsite_conversion.fb_pixel_purchase")
    || getActionMoneyValue(actionValues, "purchase")
    || getActionMoneyValue(actionValues, "omni_purchase");
  return { landingPageViews, initiatedCheckouts, purchases, purchaseValue };
}

async function fetchAllPages(url: string, accessToken: string): Promise<any[]> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  const rows = data.data || [];
  let nextUrl = data.paging?.next;
  while (nextUrl) {
    const nextRes = await fetch(nextUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const nextData = await nextRes.json();
    if (nextData.data) rows.push(...nextData.data);
    nextUrl = nextData.paging?.next;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== Auth + Admin Role Verification =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ===== End Auth Check =====

    let action = "fetch";
    let since: string | undefined;
    let until: string | undefined;
    let campaignIds: string[] = [];
    let adsetIds: string[] = [];
    let objectId: string | undefined;
    let newStatus: string | undefined;

    try {
      const body = await req.json();
      if (body.action) action = body.action;
      if (body.since) since = body.since;
      if (body.until) until = body.until;
      if (body.campaign_ids) campaignIds = body.campaign_ids;
      if (body.adset_ids) adsetIds = body.adset_ids;
      if (body.object_id) objectId = body.object_id;
      if (body.new_status) newStatus = body.new_status;
    } catch {
      // No body or invalid JSON — default to "fetch"
    }

    const appId = Deno.env.get("META_APP_ID")!;
    const appSecret = Deno.env.get("META_APP_SECRET")!;
    const accessToken = Deno.env.get("META_ACCESS_TOKEN")!;
    const accountIds = getAccountIds();

    // Exchange short-lived token for long-lived
    if (action === "exchange-token") {
      const url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          message: "Token trocado com sucesso!",
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in_seconds: data.expires_in,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const sinceDate = since || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const untilDate = until || today.toISOString().split("T")[0];
    const timeRange = JSON.stringify({ since: sinceDate, until: untilDate });

    // Fetch account-level insights
    if (action === "fetch") {
      const results: Record<string, unknown>[] = [];

      for (const accountId of accountIds) {
        const trimmedId = accountId.trim();
        const url = `https://graph.facebook.com/v21.0/act_${trimmedId}/insights?fields=spend,impressions,clicks,cpm,cpc,actions&time_range=${encodeURIComponent(timeRange)}&level=account&time_increment=1&limit=500`;

        try {
          const rows = await fetchAllPages(url, accessToken);

          for (const row of rows) {
            const { landingPageViews, initiatedCheckouts } = extractMetrics(row);
            await supabase.from("meta_ad_spend").upsert({
              account_id: trimmedId,
              date: row.date_start,
              spend: parseFloat(row.spend || "0"),
              impressions: parseInt(row.impressions || "0"),
              clicks: parseInt(row.clicks || "0"),
              cpm: parseFloat(row.cpm || "0"),
              cpc: parseFloat(row.cpc || "0"),
              landing_page_views: landingPageViews,
              initiated_checkouts: initiatedCheckouts,
            }, { onConflict: "account_id,date" });
          }

          results.push({ accountId: trimmedId, rowsProcessed: rows.length });
        } catch (err) {
          results.push({ accountId: trimmedId, error: err.message });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign-level insights
    if (action === "fetch-campaigns") {
      const results: Record<string, unknown>[] = [];

      for (const accountId of accountIds) {
        const trimmedId = accountId.trim();

        // Fetch campaign budgets/statuses
        const campaignBudgets: Record<string, { status: string; daily_budget: number }> = {};
        const campaignsUrl = `https://graph.facebook.com/v21.0/act_${trimmedId}/campaigns?fields=name,status,daily_budget,lifetime_budget&limit=500&access_token=${accessToken}`;
        const campaignsRes = await fetch(campaignsUrl);
        const campaignsData = await campaignsRes.json();
        if (campaignsData.data) {
          for (const c of campaignsData.data) {
            campaignBudgets[c.id] = {
              status: c.status || "UNKNOWN",
              daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : 0,
            };
          }
        }

        const insightsUrl = `https://graph.facebook.com/v21.0/act_${trimmedId}/insights?fields=spend,impressions,clicks,cpm,cpc,actions,action_values,campaign_id,campaign_name&time_range=${encodeURIComponent(timeRange)}&level=campaign&time_increment=1&limit=500`;

        try {
          const rows = await fetchAllPages(insightsUrl, accessToken);

          for (const row of rows) {
            const { landingPageViews, initiatedCheckouts, purchases, purchaseValue } = extractMetrics(row);
            const campaignId = row.campaign_id;
            const budgetInfo = campaignBudgets[campaignId];

            await supabase.from("meta_campaign_insights").upsert({
              account_id: trimmedId,
              campaign_id: campaignId,
              campaign_name: row.campaign_name || "Unknown",
              campaign_status: budgetInfo?.status || "UNKNOWN",
              daily_budget: budgetInfo?.daily_budget || 0,
              date: row.date_start,
              spend: parseFloat(row.spend || "0"),
              impressions: parseInt(row.impressions || "0"),
              clicks: parseInt(row.clicks || "0"),
              cpm: parseFloat(row.cpm || "0"),
              cpc: parseFloat(row.cpc || "0"),
              landing_page_views: landingPageViews,
              initiated_checkouts: initiatedCheckouts,
              meta_purchases: purchases,
              meta_purchase_value: purchaseValue,
            }, { onConflict: "campaign_id,date" });
          }

          results.push({ accountId: trimmedId, campaignRows: rows.length });
        } catch (err) {
          results.push({ accountId: trimmedId, error: err.message });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch adset-level insights for specific campaigns
    if (action === "fetch-adsets") {
      const results: Record<string, unknown>[] = [];

      for (const accountId of accountIds) {
        const trimmedId = accountId.trim();

        // Fetch adset metadata (statuses, budgets)
        const adsetMeta: Record<string, { status: string; daily_budget: number; campaign_id: string; campaign_name: string }> = {};
        
        // Build filtering: if campaignIds provided, filter by them
        let filterParam = "";
        if (campaignIds.length > 0) {
          const filtering = JSON.stringify([{ field: "campaign.id", operator: "IN", value: campaignIds }]);
          filterParam = `&filtering=${encodeURIComponent(filtering)}`;
        }

        const adsetsUrl = `https://graph.facebook.com/v21.0/act_${trimmedId}/adsets?fields=name,status,daily_budget,campaign_id,campaign{name}&limit=500${filterParam}&access_token=${accessToken}`;
        const adsetsRes = await fetch(adsetsUrl);
        const adsetsData = await adsetsRes.json();
        
        if (adsetsData.data) {
          for (const a of adsetsData.data) {
            adsetMeta[a.id] = {
              status: a.status || "UNKNOWN",
              daily_budget: a.daily_budget ? parseFloat(a.daily_budget) / 100 : 0,
              campaign_id: a.campaign_id || "",
              campaign_name: a.campaign?.name || "",
            };
          }
        }

        // Fetch adset-level insights
        const insightsUrl = `https://graph.facebook.com/v21.0/act_${trimmedId}/insights?fields=spend,impressions,clicks,cpm,cpc,actions,action_values,adset_id,adset_name,campaign_id,campaign_name&time_range=${encodeURIComponent(timeRange)}&level=adset&time_increment=1&limit=500${filterParam}`;

        try {
          const rows = await fetchAllPages(insightsUrl, accessToken);

          for (const row of rows) {
            const { landingPageViews, initiatedCheckouts, purchases, purchaseValue } = extractMetrics(row);
            const adsetId = row.adset_id;
            const meta = adsetMeta[adsetId];

            await supabase.from("meta_adset_insights").upsert({
              account_id: trimmedId,
              campaign_id: row.campaign_id || meta?.campaign_id || "",
              campaign_name: row.campaign_name || meta?.campaign_name || "Unknown",
              adset_id: adsetId,
              adset_name: row.adset_name || "Unknown",
              adset_status: meta?.status || "UNKNOWN",
              daily_budget: meta?.daily_budget || 0,
              date: row.date_start,
              spend: parseFloat(row.spend || "0"),
              impressions: parseInt(row.impressions || "0"),
              clicks: parseInt(row.clicks || "0"),
              cpm: parseFloat(row.cpm || "0"),
              cpc: parseFloat(row.cpc || "0"),
              landing_page_views: landingPageViews,
              initiated_checkouts: initiatedCheckouts,
              meta_purchases: purchases,
              meta_purchase_value: purchaseValue,
            }, { onConflict: "adset_id,date" });
          }

          results.push({ accountId: trimmedId, adsetRows: rows.length });
        } catch (err) {
          results.push({ accountId: trimmedId, error: err.message });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ad-level insights for specific adsets
    if (action === "fetch-ads") {
      const results: Record<string, unknown>[] = [];

      for (const accountId of accountIds) {
        const trimmedId = accountId.trim();

        // Fetch ad metadata
        const adMeta: Record<string, { status: string; adset_id: string; campaign_id: string }> = {};
        
        let filterParam = "";
        if (adsetIds.length > 0) {
          const filtering = JSON.stringify([{ field: "adset.id", operator: "IN", value: adsetIds }]);
          filterParam = `&filtering=${encodeURIComponent(filtering)}`;
        } else if (campaignIds.length > 0) {
          const filtering = JSON.stringify([{ field: "campaign.id", operator: "IN", value: campaignIds }]);
          filterParam = `&filtering=${encodeURIComponent(filtering)}`;
        }

        const adsUrl = `https://graph.facebook.com/v21.0/act_${trimmedId}/ads?fields=name,status,adset_id,campaign_id&limit=500${filterParam}&access_token=${accessToken}`;
        const adsRes = await fetch(adsUrl);
        const adsData = await adsRes.json();
        
        if (adsData.data) {
          for (const a of adsData.data) {
            adMeta[a.id] = {
              status: a.status || "UNKNOWN",
              adset_id: a.adset_id || "",
              campaign_id: a.campaign_id || "",
            };
          }
        }

        // Fetch ad-level insights
        const insightsUrl = `https://graph.facebook.com/v21.0/act_${trimmedId}/insights?fields=spend,impressions,clicks,cpm,cpc,actions,action_values,ad_id,ad_name,adset_id,campaign_id&time_range=${encodeURIComponent(timeRange)}&level=ad&time_increment=1&limit=500${filterParam}`;

        try {
          const rows = await fetchAllPages(insightsUrl, accessToken);

          for (const row of rows) {
            const { landingPageViews, initiatedCheckouts, purchases, purchaseValue } = extractMetrics(row);
            const adId = row.ad_id;
            const meta = adMeta[adId];

            await supabase.from("meta_ad_insights").upsert({
              account_id: trimmedId,
              campaign_id: row.campaign_id || meta?.campaign_id || "",
              adset_id: row.adset_id || meta?.adset_id || "",
              ad_id: adId,
              ad_name: row.ad_name || "Unknown",
              ad_status: meta?.status || "UNKNOWN",
              date: row.date_start,
              spend: parseFloat(row.spend || "0"),
              impressions: parseInt(row.impressions || "0"),
              clicks: parseInt(row.clicks || "0"),
              cpm: parseFloat(row.cpm || "0"),
              cpc: parseFloat(row.cpc || "0"),
              landing_page_views: landingPageViews,
              initiated_checkouts: initiatedCheckouts,
              meta_purchases: purchases,
              meta_purchase_value: purchaseValue,
            }, { onConflict: "ad_id,date" });
          }

          results.push({ accountId: trimmedId, adRows: rows.length });
        } catch (err) {
          results.push({ accountId: trimmedId, error: err.message });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status of a campaign, adset, or ad
    if (action === "update-status") {

      if (!objectId || !newStatus || !["ACTIVE", "PAUSED"].includes(newStatus)) {
        return new Response(
          JSON.stringify({ error: "object_id and new_status (ACTIVE|PAUSED) are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const url = `https://graph.facebook.com/v21.0/${objectId}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, object_id: objectId, new_status: newStatus }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action.' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let action = "fetch";
    let since: string | undefined;
    let until: string | undefined;

    try {
      const body = await req.json();
      if (body.action) action = body.action;
      if (body.since) since = body.since;
      if (body.until) until = body.until;
    } catch {
      // No body or invalid JSON — default to "fetch"
    }

    const appId = Deno.env.get("META_APP_ID")!;
    const appSecret = Deno.env.get("META_APP_SECRET")!;
    const accessToken = Deno.env.get("META_ACCESS_TOKEN")!;
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
          message: "Token trocado com sucesso! Copie o novo token abaixo e atualize o secret META_ACCESS_TOKEN manualmente.",
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in_seconds: data.expires_in,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch account-level insights
    if (action === "fetch") {
      const today = new Date();
      const sinceDate = since || new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const untilDate = until || today.toISOString().split("T")[0];

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const results: Record<string, unknown>[] = [];
      console.log("Account IDs to process:", accountIds);

      for (const accountId of accountIds) {
        const trimmedId = accountId.trim();
        console.log(`Processing account: "${trimmedId}"`);

        const timeRange = JSON.stringify({ since: sinceDate, until: untilDate });
        const url = `https://graph.facebook.com/v21.0/act_${trimmedId}/insights?fields=spend,impressions,clicks,cpm,cpc,actions&time_range=${encodeURIComponent(timeRange)}&level=account&time_increment=1&limit=500`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();

        console.log(`Account ${trimmedId} HTTP status: ${res.status}`);
        console.log(`Account ${trimmedId} response keys: ${JSON.stringify(Object.keys(data))}`);
        console.log(`Account ${trimmedId} rows: ${(data.data || []).length}`);
        
        if (data.error) {
          console.error(`Account ${trimmedId} META API ERROR:`, JSON.stringify(data.error));
          results.push({ accountId: trimmedId, error: data.error });
          continue;
        }
        
        if (!data.data || data.data.length === 0) {
          console.warn(`Account ${trimmedId} returned EMPTY data. Full response: ${JSON.stringify(data).substring(0, 500)}`);
        }

        const rows = data.data || [];
        let nextUrl = data.paging?.next;

        while (nextUrl) {
          const nextRes = await fetch(nextUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const nextData = await nextRes.json();
          if (nextData.data) rows.push(...nextData.data);
          nextUrl = nextData.paging?.next;
        }

        for (const row of rows) {
          const actions = row.actions || [];
          const getActionValue = (actionType: string) => {
            const found = actions.find((a: any) => a.action_type === actionType);
            return found ? parseInt(found.value || "0") : 0;
          };

          const landingPageViews = getActionValue("landing_page_view");
          const initiatedCheckouts = getActionValue("offsite_conversion.fb_pixel_initiate_checkout")
            || getActionValue("initiate_checkout")
            || getActionValue("omni_initiated_checkout");

          const { error: upsertError } = await supabase
            .from("meta_ad_spend")
            .upsert(
              {
                account_id: trimmedId,
                date: row.date_start,
                spend: parseFloat(row.spend || "0"),
                impressions: parseInt(row.impressions || "0"),
                clicks: parseInt(row.clicks || "0"),
                cpm: parseFloat(row.cpm || "0"),
                cpc: parseFloat(row.cpc || "0"),
                landing_page_views: landingPageViews,
                initiated_checkouts: initiatedCheckouts,
              },
              { onConflict: "account_id,date" }
            );

          if (upsertError) {
            console.error("Upsert error:", upsertError);
          }
        }

        results.push({
          accountId: trimmedId,
          rowsProcessed: rows.length,
          dateRange: { since: sinceDate, until: untilDate },
        });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign-level insights
    if (action === "fetch-campaigns") {
      const today = new Date();
      const sinceDate = since || new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const untilDate = until || today.toISOString().split("T")[0];

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const results: Record<string, unknown>[] = [];

      for (const accountId of accountIds) {
        const trimmedId = accountId.trim();
        console.log(`Fetching campaigns for account: "${trimmedId}"`);

        // 1. Fetch campaign budgets and statuses
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

        // 2. Fetch campaign-level insights with daily breakdown
        const timeRange = JSON.stringify({ since: sinceDate, until: untilDate });
        const insightsUrl = `https://graph.facebook.com/v21.0/act_${trimmedId}/insights?fields=spend,impressions,clicks,cpm,cpc,actions,campaign_id,campaign_name&time_range=${encodeURIComponent(timeRange)}&level=campaign&time_increment=1&limit=500`;

        const insightsRes = await fetch(insightsUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const insightsData = await insightsRes.json();

        if (insightsData.error) {
          console.error(`Campaign insights error for ${trimmedId}:`, JSON.stringify(insightsData.error));
          results.push({ accountId: trimmedId, error: insightsData.error });
          continue;
        }

        const rows = insightsData.data || [];
        let nextUrl = insightsData.paging?.next;

        while (nextUrl) {
          const nextRes = await fetch(nextUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const nextData = await nextRes.json();
          if (nextData.data) rows.push(...nextData.data);
          nextUrl = nextData.paging?.next;
        }

        console.log(`Account ${trimmedId}: ${rows.length} campaign insight rows`);

        for (const row of rows) {
          const actions = row.actions || [];
          const getActionValue = (actionType: string) => {
            const found = actions.find((a: any) => a.action_type === actionType);
            return found ? parseInt(found.value || "0") : 0;
          };

          const landingPageViews = getActionValue("landing_page_view");
          const initiatedCheckouts = getActionValue("offsite_conversion.fb_pixel_initiate_checkout")
            || getActionValue("initiate_checkout")
            || getActionValue("omni_initiated_checkout");

          const campaignId = row.campaign_id;
          const budgetInfo = campaignBudgets[campaignId];

          const { error: upsertError } = await supabase
            .from("meta_campaign_insights")
            .upsert(
              {
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
              },
              { onConflict: "campaign_id,date" }
            );

          if (upsertError) {
            console.error("Campaign upsert error:", upsertError);
          }
        }

        results.push({
          accountId: trimmedId,
          campaignRows: rows.length,
          campaignsFound: Object.keys(campaignBudgets).length,
          dateRange: { since: sinceDate, until: untilDate },
        });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "fetch", "fetch-campaigns" or "exchange-token".' }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    // Fallback para o formato antigo
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
          message:
            "Token trocado com sucesso! Copie o novo token abaixo e atualize o secret META_ACCESS_TOKEN manualmente.",
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in_seconds: data.expires_in,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch insights
    if (action === "fetch") {
      const today = new Date();
      const sinceDate =
        since ||
        new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
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
        
        const timeRange = JSON.stringify({
          since: sinceDate,
          until: untilDate,
        });
        const url = `https://graph.facebook.com/v21.0/act_${trimmedId}/insights?fields=spend,impressions,clicks,cpm,cpc,actions&time_range=${encodeURIComponent(timeRange)}&level=account&time_increment=1&limit=500`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();

        console.log(`Account ${trimmedId} response: rows=${(data.data||[]).length}`);

        if (data.error) {
          results.push({ accountId: trimmedId, error: data.error });
          continue;
        }

        const rows = data.data || [];
        let nextUrl = data.paging?.next;

        // Handle pagination
        while (nextUrl) {
          const nextRes = await fetch(nextUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const nextData = await nextRes.json();
          if (nextData.data) rows.push(...nextData.data);
          nextUrl = nextData.paging?.next;
        }

        // Upsert into meta_ad_spend
        for (const row of rows) {
          // Extract actions metrics
          const actions = row.actions || [];
          const getActionValue = (actionType: string) => {
            const action = actions.find((a: any) => a.action_type === actionType);
            return action ? parseInt(action.value || "0") : 0;
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

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "fetch" or "exchange-token".' }),
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

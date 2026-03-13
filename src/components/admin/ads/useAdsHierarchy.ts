import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SaleOrder } from "./useAdsCampaigns";

export type AdsLevel = "campaigns" | "adsets" | "ads";

export interface AggregatedItem {
  id: string;
  name: string;
  status: string;
  account_id: string;
  campaign_id: string;
  adset_id?: string;
  daily_budget: number;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  avg_cpm: number;
  avg_cpc: number;
  total_landing_page_views: number;
  total_initiated_checkouts: number;
  sales_count: number;
  revenue: number;
  cpa: number;
  profit: number;
  roi: number;
  roas: number;
}

function aggregate(rows: any[], idField: string, nameField: string, statusField: string): AggregatedItem[] {
  const map = new Map<string, AggregatedItem>();

  for (const row of rows) {
    const id = row[idField];
    const existing = map.get(id);
    const spend = Number(row.spend) || 0;
    const impressions = row.impressions || 0;
    const clicks = row.clicks || 0;
    const lpv = row.landing_page_views || 0;
    const ic = row.initiated_checkouts || 0;

    if (existing) {
      existing.total_spend += spend;
      existing.total_impressions += impressions;
      existing.total_clicks += clicks;
      existing.total_landing_page_views += lpv;
      existing.total_initiated_checkouts += ic;
      existing.name = row[nameField] || existing.name;
      existing.status = row[statusField] || existing.status;
      existing.daily_budget = Number(row.daily_budget) || existing.daily_budget;
    } else {
      map.set(id, {
        id,
        name: row[nameField] || "Unknown",
        status: row[statusField] || "UNKNOWN",
        account_id: row.account_id,
        campaign_id: row.campaign_id,
        adset_id: row.adset_id,
        daily_budget: Number(row.daily_budget) || 0,
        total_spend: spend,
        total_impressions: impressions,
        total_clicks: clicks,
        avg_cpm: 0,
        avg_cpc: 0,
        total_landing_page_views: lpv,
        total_initiated_checkouts: ic,
        sales_count: 0,
        revenue: 0,
        cpa: 0,
        profit: 0,
        roi: 0,
        roas: 0,
      });
    }
  }

  for (const item of map.values()) {
    item.avg_cpm = item.total_impressions > 0 ? (item.total_spend / item.total_impressions) * 1000 : 0;
    item.avg_cpc = item.total_clicks > 0 ? item.total_spend / item.total_clicks : 0;
  }

  return Array.from(map.values());
}

/**
 * Extract an ID from a UTM field. Supports formats:
 * - Pure ID: "123456789"
 * - Name|ID: "Campaign Name|123456789"
 * - {{template}} placeholders are ignored
 */
function extractIdFromUtm(utmValue: string | undefined | null): string {
  if (!utmValue || typeof utmValue !== "string" || utmValue.includes("{{")) return "";
  const parts = utmValue.split("|");
  return parts[parts.length - 1].trim();
}

function attributeSalesToItems(
  items: AggregatedItem[],
  sales: SaleOrder[],
  utmFields: string[]
): AggregatedItem[] {
  // Build a set of known item IDs for smart matching
  const knownIds = new Set(items.map(i => i.id));

  // Build map: item_id -> sales[]
  const salesMap = new Map<string, SaleOrder[]>();

  for (const sale of sales) {
    const utmSource = sale.utm_data?.utm_source || sale.utm_data?.source || "";
    const isFb = typeof utmSource === "string" && utmSource.toUpperCase().startsWith("FB");
    if (!isFb) continue;

    // Collect candidate IDs from multiple UTM fields
    const candidates: string[] = [];
    for (const field of utmFields) {
      const rawValue = sale.utm_data?.[field] || "";
      const resolvedId = extractIdFromUtm(rawValue);
      if (resolvedId) candidates.push(resolvedId);
    }

    // Smart match: find the first candidate that exists as a known item
    const matchedId = candidates.find(id => knownIds.has(id)) || "";

    if (matchedId) {
      const existing = salesMap.get(matchedId) || [];
      existing.push(sale);
      salesMap.set(matchedId, existing);
    }
  }

  return items.map((item) => {
    const matchedSales = salesMap.get(item.id) || [];
    const salesCount = matchedSales.length;
    const revenue = matchedSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const spend = item.total_spend;
    const profit = revenue - spend;
    const cpa = salesCount > 0 ? spend / salesCount : 0;
    const roi = spend > 0 ? revenue / spend : 0;
    const roas = spend > 0 ? revenue / spend : 0;

    return { ...item, sales_count: salesCount, revenue, cpa, profit, roi, roas };
  });
}

export function useAdsHierarchy(dateRange: { start: string; end: string }, sales: SaleOrder[]) {
  const [adsets, setAdsets] = useState<AggregatedItem[]>([]);
  const [ads, setAds] = useState<AggregatedItem[]>([]);
  const [isLoadingAdsets, setIsLoadingAdsets] = useState(false);
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [selectedAdsetIds, setSelectedAdsetIds] = useState<string[]>([]);
  const [currentLevel, setCurrentLevel] = useState<AdsLevel>("campaigns");
  const [breadcrumbs, setBreadcrumbs] = useState<{ level: AdsLevel; label: string; ids?: string[] }[]>([]);

  const fetchAdsets = useCallback(async (campaignIds: string[], campaignName?: string) => {
    setIsLoadingAdsets(true);
    setSelectedCampaignIds(campaignIds);
    setSelectedAdsetIds([]);
    setAds([]);

    try {
      await supabase.functions.invoke("fetch-meta-ads", {
        body: {
          action: "fetch-adsets",
          since: dateRange.start,
          until: dateRange.end,
          campaign_ids: campaignIds,
        },
      });

      let query = supabase
        .from("meta_adset_insights")
        .select("*")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);

      if (campaignIds.length === 1) {
        query = query.eq("campaign_id", campaignIds[0]);
      } else {
        query = query.in("campaign_id", campaignIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const aggregated = aggregate(data || [], "adset_id", "adset_name", "adset_status");
      // Attribute sales using utm_term (adset ID)
      const withSales = attributeSalesToItems(aggregated, sales, "utm_medium");
      setAdsets(withSales.sort((a, b) => b.total_spend - a.total_spend));
      setCurrentLevel("adsets");
      setBreadcrumbs([
        { level: "campaigns", label: "Campanhas" },
        { level: "adsets", label: campaignName || `${campaignIds.length} campanhas`, ids: campaignIds },
      ]);
    } catch (err: any) {
      console.error("Error fetching adsets:", err);
      toast.error("Erro ao carregar conjuntos de anúncios");
    } finally {
      setIsLoadingAdsets(false);
    }
  }, [dateRange, sales]);

  const fetchAds = useCallback(async (adsetIds: string[], adsetName?: string) => {
    setIsLoadingAds(true);
    setSelectedAdsetIds(adsetIds);

    try {
      await supabase.functions.invoke("fetch-meta-ads", {
        body: {
          action: "fetch-ads",
          since: dateRange.start,
          until: dateRange.end,
          adset_ids: adsetIds,
          campaign_ids: selectedCampaignIds,
        },
      });

      let query = supabase
        .from("meta_ad_insights")
        .select("*")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);

      if (adsetIds.length === 1) {
        query = query.eq("adset_id", adsetIds[0]);
      } else {
        query = query.in("adset_id", adsetIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const aggregated = aggregate(data || [], "ad_id", "ad_name", "ad_status");
      // Attribute sales using utm_content (ad ID)
      const withSales = attributeSalesToItems(aggregated, sales, "utm_content");
      setAds(withSales.sort((a, b) => b.total_spend - a.total_spend));
      setCurrentLevel("ads");
      setBreadcrumbs(prev => [
        ...prev.slice(0, 2),
        { level: "ads", label: adsetName || `${adsetIds.length} conjuntos`, ids: adsetIds },
      ]);
    } catch (err: any) {
      console.error("Error fetching ads:", err);
      toast.error("Erro ao carregar anúncios");
    } finally {
      setIsLoadingAds(false);
    }
  }, [dateRange, selectedCampaignIds, sales]);

  const navigateToLevel = useCallback((level: AdsLevel) => {
    if (level === "campaigns") {
      setCurrentLevel("campaigns");
      setSelectedCampaignIds([]);
      setSelectedAdsetIds([]);
      setAdsets([]);
      setAds([]);
      setBreadcrumbs([]);
    } else if (level === "adsets") {
      setCurrentLevel("adsets");
      setSelectedAdsetIds([]);
      setAds([]);
      setBreadcrumbs(prev => prev.slice(0, 2));
    }
  }, []);

  return {
    adsets,
    ads,
    isLoadingAdsets,
    isLoadingAds,
    selectedCampaignIds,
    selectedAdsetIds,
    currentLevel,
    breadcrumbs,
    fetchAdsets,
    fetchAds,
    navigateToLevel,
  };
}

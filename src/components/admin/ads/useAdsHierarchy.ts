import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  // Sales attribution
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

  // Calculate averages
  for (const item of map.values()) {
    item.avg_cpm = item.total_impressions > 0 ? (item.total_spend / item.total_impressions) * 1000 : 0;
    item.avg_cpc = item.total_clicks > 0 ? item.total_spend / item.total_clicks : 0;
  }

  return Array.from(map.values());
}

export function useAdsHierarchy(dateRange: { start: string; end: string }) {
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
      // First sync from Meta API
      await supabase.functions.invoke("fetch-meta-ads", {
        body: {
          action: "fetch-adsets",
          since: dateRange.start,
          until: dateRange.end,
          campaign_ids: campaignIds,
        },
      });

      // Then fetch from DB
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
      setAdsets(aggregated.sort((a, b) => b.total_spend - a.total_spend));
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
  }, [dateRange]);

  const fetchAds = useCallback(async (adsetIds: string[], adsetName?: string) => {
    setIsLoadingAds(true);
    setSelectedAdsetIds(adsetIds);

    try {
      // First sync from Meta API
      await supabase.functions.invoke("fetch-meta-ads", {
        body: {
          action: "fetch-ads",
          since: dateRange.start,
          until: dateRange.end,
          adset_ids: adsetIds,
          campaign_ids: selectedCampaignIds,
        },
      });

      // Then fetch from DB
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
      setAds(aggregated.sort((a, b) => b.total_spend - a.total_spend));
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
  }, [dateRange, selectedCampaignIds]);

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

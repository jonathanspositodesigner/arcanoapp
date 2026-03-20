import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AdsPeriod = "today" | "yesterday" | "7d" | "14d" | "30d" | "custom";

interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  account_id: string;
  daily_budget: number;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  avg_cpm: number;
  avg_cpc: number;
  total_landing_page_views: number;
  total_initiated_checkouts: number;
  total_meta_purchases: number;
  total_meta_purchase_value: number;
}

export interface CampaignWithSales extends CampaignInsight {
  sales_count: number;
  utm_sales_count: number;
  meta_sales_count: number;
  revenue: number;
  cpa: number;
  profit: number;
  roi: number;
  roas: number;
}

export interface SaleOrder {
  id: string;
  amount: number;
  status: string;
  utm_data: any;
  source_platform: string;
  user_email: string;
  product_title: string;
  paid_at: string;
  created_at: string;
}

function getDateRange(period: AdsPeriod, customStart?: Date, customEnd?: Date): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end = now;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "yesterday": {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      start = y;
      end = y;
      break;
    }
    case "7d":
      start = new Date(now.getTime() - 7 * 86400000);
      break;
    case "14d":
      start = new Date(now.getTime() - 14 * 86400000);
      break;
    case "30d":
      start = new Date(now.getTime() - 30 * 86400000);
      break;
    case "custom":
      start = customStart || new Date(now.getTime() - 30 * 86400000);
      end = customEnd || now;
      break;
    default:
      start = new Date(now.getTime() - 30 * 86400000);
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export function useAdsCampaigns(
  period: AdsPeriod,
  customStart?: Date,
  customEnd?: Date,
  accountFilter?: string,
  searchQuery?: string
) {
  const [campaigns, setCampaigns] = useState<CampaignInsight[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);

  const dateRange = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch campaign insights aggregated by campaign
      const { data: rawInsights, error: insightsError } = await supabase
        .from("meta_campaign_insights")
        .select("*")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end);

      if (insightsError) throw insightsError;

      // Aggregate by campaign_id
      const campaignMap = new Map<string, CampaignInsight>();
      const accountSet = new Set<string>();

      for (const row of rawInsights || []) {
        accountSet.add(row.account_id);
        const existing = campaignMap.get(row.campaign_id);
        if (existing) {
          existing.total_spend += Number(row.spend) || 0;
          existing.total_impressions += row.impressions || 0;
          existing.total_clicks += row.clicks || 0;
          existing.total_landing_page_views += row.landing_page_views || 0;
          existing.total_initiated_checkouts += row.initiated_checkouts || 0;
          existing.total_meta_purchases += (row as any).meta_purchases || 0;
          existing.total_meta_purchase_value += Number((row as any).meta_purchase_value) || 0;
          // Keep latest status/name/budget
          existing.campaign_name = row.campaign_name;
          existing.campaign_status = row.campaign_status || existing.campaign_status;
          existing.daily_budget = Number(row.daily_budget) || existing.daily_budget;
        } else {
          campaignMap.set(row.campaign_id, {
            campaign_id: row.campaign_id,
            campaign_name: row.campaign_name,
            campaign_status: row.campaign_status || "UNKNOWN",
            account_id: row.account_id,
            daily_budget: Number(row.daily_budget) || 0,
            total_spend: Number(row.spend) || 0,
            total_impressions: row.impressions || 0,
            total_clicks: row.clicks || 0,
            avg_cpm: 0,
            avg_cpc: 0,
            total_landing_page_views: row.landing_page_views || 0,
            total_initiated_checkouts: row.initiated_checkouts || 0,
            total_meta_purchases: (row as any).meta_purchases || 0,
            total_meta_purchase_value: Number((row as any).meta_purchase_value) || 0,
          });
        }
      }

      // Calc averages
      for (const c of campaignMap.values()) {
        c.avg_cpm = c.total_impressions > 0 ? (c.total_spend / c.total_impressions) * 1000 : 0;
        c.avg_cpc = c.total_clicks > 0 ? c.total_spend / c.total_clicks : 0;
      }

      setAccounts(Array.from(accountSet));
      setCampaigns(Array.from(campaignMap.values()));

      // Fetch sales for the same period
      // Meia-noite São Paulo = 03:00 UTC (UTC-3)
      const startTs = `${dateRange.start}T03:00:00.000Z`;
      const endTs = new Date(new Date(`${dateRange.end}T03:00:00.000Z`).getTime() + 86400000).toISOString();
      
      const { data: salesData, error: salesError } = await supabase.rpc(
        "get_unified_dashboard_orders",
        { _start: startTs, _end: endTs }
      );

      if (salesError) throw salesError;

      const approvedSales = (salesData || []).filter(
        (s: any) => s.status === "Paid" || s.status === "paid" || s.status === "approved" || s.paid_at
      );
      setSales(approvedSales);
    } catch (err: any) {
      console.error("Error fetching ads data:", err);
      toast.error("Erro ao carregar dados de campanhas");
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshCampaigns = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("fetch-meta-ads", {
        body: {
          action: "fetch-campaigns",
          since: dateRange.start,
          until: dateRange.end,
        },
      });
      if (error) throw error;
      toast.success("Campanhas atualizadas!");
      await fetchData();
    } catch (err: any) {
      console.error("Error refreshing campaigns:", err);
      toast.error("Erro ao atualizar campanhas");
    } finally {
      setIsRefreshing(false);
    }
  }, [dateRange, fetchData]);

  // Build a set of known campaign IDs for smart matching
  const campaignIdSet = useMemo(() => {
    return new Set(campaigns.map(c => c.campaign_id));
  }, [campaigns]);

  // Merge campaigns with sales attribution via smart campaign_id matching
  const campaignsWithSales = useMemo((): CampaignWithSales[] => {
    // 1. Identify FB sales and build a map: campaign_id -> sales[]
    const campaignSalesMap = new Map<string, SaleOrder[]>();
    const unidentifiedFbSales: SaleOrder[] = [];

    for (const sale of sales) {
      const utmSource = sale.utm_data?.utm_source || sale.utm_data?.source || "";
      const upperSource = typeof utmSource === "string" ? utmSource.toUpperCase() : "";
      const isFb = upperSource.startsWith("FB") || upperSource.startsWith("IG") || upperSource === "INSTAGRAM" || upperSource === "FACEBOOK" || upperSource === "META";
      if (!isFb) continue;

      const utmCampaign = sale.utm_data?.utm_campaign || "";
      const utmId = sale.utm_data?.utm_id || "";
      const utmContent = sale.utm_data?.utm_content || "";

      // Collect all candidate IDs from UTM fields
      const candidates: string[] = [];

      // From utm_id
      if (utmId && !String(utmId).includes("{{")) {
        candidates.push(String(utmId).trim());
      }

      // From utm_campaign "NAME|ID" format
      if (utmCampaign && !String(utmCampaign).includes("{{")) {
        const parts = String(utmCampaign).split("|");
        if (parts.length > 1) {
          candidates.push(parts[parts.length - 1].trim());
        }
      }

      // From utm_content (may contain campaign_id in some setups)
      if (utmContent && !String(utmContent).includes("{{")) {
        candidates.push(String(utmContent).trim());
      }

      // Smart match: find the first candidate that exists as a known campaign
      let resolvedCampaignId = candidates.find(id => campaignIdSet.has(id)) || "";

      // Fallback: use first non-empty candidate (legacy behavior)
      if (!resolvedCampaignId && candidates.length > 0) {
        resolvedCampaignId = candidates[0];
      }

      if (resolvedCampaignId) {
        const existing = campaignSalesMap.get(resolvedCampaignId) || [];
        existing.push(sale);
        campaignSalesMap.set(resolvedCampaignId, existing);
      } else {
        unidentifiedFbSales.push(sale);
      }
    }

    // 2. Filter campaigns by account/search
    const filtered = campaigns.filter((c) => {
      if (accountFilter && c.account_id !== accountFilter) return false;
      if (searchQuery && !c.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // 3. Direct attribution: each campaign gets only real matched sales revenue
    return filtered
      .map((c) => {
        const matchedSales = campaignSalesMap.get(c.campaign_id) || [];
        const utmSalesCount = matchedSales.length;
        const metaSalesCount = c.total_meta_purchases;
        const salesCount = Math.max(utmSalesCount, metaSalesCount);
        const revenue = matchedSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const spend = c.total_spend;
        const profit = revenue - spend;
        const cpa = salesCount > 0 ? spend / salesCount : 0;
        const roi = spend > 0 ? revenue / spend : 0;
        const roas = spend > 0 ? revenue / spend : 0;

        return { ...c, sales_count: salesCount, utm_sales_count: utmSalesCount, meta_sales_count: metaSalesCount, revenue, cpa, profit, roi, roas };
      })
      .sort((a, b) => b.total_spend - a.total_spend);
  }, [campaigns, sales, accountFilter, searchQuery, campaignIdSet]);

  // Untracked = sales that DON'T have FB utm_source (truly untrackable)
  const untrackedSales = useMemo(() => {
    return sales.filter((s) => {
      const utmSource = s.utm_data?.utm_source || s.utm_data?.source || "";
      return typeof utmSource !== "string" || !utmSource.toUpperCase().startsWith("FB");
    });
  }, [sales]);

  const totals = useMemo(() => {
    const t = campaignsWithSales.reduce(
      (acc, c) => ({
        spend: acc.spend + c.total_spend,
        sales: acc.sales + c.sales_count,
        revenue: acc.revenue + c.revenue,
        impressions: acc.impressions + c.total_impressions,
        clicks: acc.clicks + c.total_clicks,
      }),
      { spend: 0, sales: 0, revenue: 0, impressions: 0, clicks: 0 }
    );
    return {
      ...t,
      profit: t.revenue - t.spend,
      cpa: t.sales > 0 ? t.spend / t.sales : 0,
      roi: t.spend > 0 ? t.revenue / t.spend : 0,
      roas: t.spend > 0 ? t.revenue / t.spend : 0,
    };
  }, [campaignsWithSales]);

  return {
    campaignsWithSales,
    accounts,
    isLoading,
    isRefreshing,
    refreshCampaigns,
    untrackedSales,
    totals,
    dateRange,
    sales,
  };
}

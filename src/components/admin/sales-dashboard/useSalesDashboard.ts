import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, subMonths, startOfYear } from "date-fns";

export type PeriodPreset =
  | "today" | "yesterday" | "7d" | "15d" | "30d"
  | "3m" | "6m" | "1y" | "year" | "all" | "custom";

export interface DashboardOrder {
  id: string;
  status: string;
  amount: number;
  net_amount: number | null;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  user_email: string;
  product_title: string;
  product_id: string | null;
  utm_data: Record<string, string> | null;
  source_platform?: string;
}

export function getDateRange(preset: PeriodPreset, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (preset) {
    case "today": return { start: todayStart, end: todayEnd };
    case "yesterday": return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
    case "7d": return { start: startOfDay(subDays(now, 7)), end: todayEnd };
    case "15d": return { start: startOfDay(subDays(now, 15)), end: todayEnd };
    case "30d": return { start: startOfDay(subDays(now, 30)), end: todayEnd };
    case "3m": return { start: startOfDay(subMonths(now, 3)), end: todayEnd };
    case "6m": return { start: startOfDay(subMonths(now, 6)), end: todayEnd };
    case "1y": return { start: startOfDay(subMonths(now, 12)), end: todayEnd };
    case "year": return { start: startOfYear(now), end: todayEnd };
    case "all": return { start: new Date("2020-01-01"), end: todayEnd };
    case "custom":
      return {
        start: customStart ? startOfDay(customStart) : todayStart,
        end: customEnd ? endOfDay(customEnd) : todayEnd,
      };
    default: return { start: todayStart, end: todayEnd };
  }
}

export function useSalesDashboard() {
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageViews, setPageViews] = useState(0);
  const [adSpend, setAdSpend] = useState(0);
  const [metaClicks, setMetaClicks] = useState(0);
  const [metaLandingPageViews, setMetaLandingPageViews] = useState(0);
  const [metaInitiatedCheckouts, setMetaInitiatedCheckouts] = useState(0);
  const [abandonedCheckouts, setAbandonedCheckouts] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const { start, end } = useMemo(
    () => getDateRange(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try unified RPC first (includes all platforms)
      const { data, error } = await supabase.rpc("get_unified_dashboard_orders" as any, {
        _start: start.toISOString(),
        _end: end.toISOString(),
      });

      if (error) {
        console.error("Unified Dashboard RPC error:", error);
        // Fallback to MP-only
        const { data: mpData } = await supabase.rpc("get_mp_dashboard_orders", {
          _start: start.toISOString(),
          _end: end.toISOString(),
        });
        setOrders((mpData as DashboardOrder[]) || []);
      } else {
        setOrders((data as DashboardOrder[]) || []);
      }

      // Fetch ad spend + clicks from meta_ad_spend
      const pad = (n: number) => String(n).padStart(2, "0");
      const startDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
      const { data: spendData } = await supabase
        .from("meta_ad_spend")
        .select("spend, clicks, landing_page_views, initiated_checkouts")
        .gte("date", startDate)
        .lte("date", endDate);

      const totalSpend = (spendData || []).reduce(
        (sum, row) => sum + Number(row.spend || 0),
        0
      );
      const totalClicks = (spendData || []).reduce(
        (sum, row) => sum + Number(row.clicks || 0),
        0
      );
      setAdSpend(totalSpend);
      setMetaClicks(totalClicks);
      const totalLandingPageViews = (spendData || []).reduce(
        (sum, row) => sum + Number((row as any).landing_page_views || 0),
        0
      );
      const totalInitiatedCheckouts = (spendData || []).reduce(
        (sum, row) => sum + Number((row as any).initiated_checkouts || 0),
        0
      );
      setMetaLandingPageViews(totalLandingPageViews);
      setMetaInitiatedCheckouts(totalInitiatedCheckouts);

      // Fetch page views for funnel
      const { count: pvCount } = await supabase
        .from("page_views")
        .select("id", { count: "exact", head: true })
        .gte("viewed_at", start.toISOString())
        .lt("viewed_at", end.toISOString());

      setPageViews(pvCount || 0);

      // Fetch abandoned checkouts (ICs)
      const { count: icCount } = await supabase
        .from("abandoned_checkouts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString());

      setAbandonedCheckouts(icCount || 0);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [start, end]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const approved = useMemo(() => orders.filter((o) => o.status === "paid"), [orders]);
  const pending = useMemo(() => orders.filter((o) => o.status === "pending"), [orders]);
  const refunded = useMemo(() => orders.filter((o) => o.status === "refunded"), [orders]);

  const revenue = useMemo(
    () => approved.reduce((sum, o) => sum + (o.net_amount ?? o.amount), 0),
    [approved]
  );
  const refundedTotal = useMemo(
    () => refunded.reduce((sum, o) => sum + o.amount, 0),
    [refunded]
  );
  const pendingTotal = useMemo(
    () => pending.reduce((sum, o) => sum + o.amount, 0),
    [pending]
  );

  return {
    preset, setPreset,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    orders, approved, pending, refunded,
    revenue, refundedTotal, pendingTotal,
    pageViews, adSpend, metaClicks, metaLandingPageViews, metaInitiatedCheckouts, abandonedCheckouts, isLoading, refetch: fetchData,
  };
}

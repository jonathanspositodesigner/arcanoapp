import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmailMarketingStats {
  totalCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalComplained: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface TopEmailCampaign {
  id: string;
  title: string;
  subject: string;
  sent_count: number;
  clicked_count: number;
  opened_count: number;
  clickRate: number;
  openRate: number;
  sent_at: string | null;
  status: string;
}

export interface TopPushCampaign {
  id: string;
  title: string;
  body: string;
  sent_count: number;
  failed_count: number;
  clicked_count: number;
  sent_at: string;
}

export interface PushCampaignStats {
  totalCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalClicked: number;
  deliveryRate: number;
  clickRate: number;
}

// Hook for real-time email marketing stats
export function useEmailMarketingStats() {
  const [stats, setStats] = useState<EmailMarketingStats>(getEmptyStats());
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      // Fetch all campaigns (sent + sending) to include active campaign
      const { data: campaigns, error } = await supabase
        .from("email_campaigns")
        .select("sent_count, delivered_count, opened_count, clicked_count, bounced_count, complained_count, recipients_count, status")
        .in("status", ["sent", "sending"]);

      if (error) {
        console.error("[Email Analytics] Error fetching campaigns:", error);
        return;
      }

      // Aggregate stats
      let totalCampaigns = campaigns?.length || 0;
      let totalSent = 0;
      let totalDelivered = 0;
      let totalOpened = 0;
      let totalClicked = 0;
      let totalBounced = 0;
      let totalComplained = 0;

      campaigns?.forEach(campaign => {
        totalSent += campaign.sent_count || 0;
        totalDelivered += campaign.delivered_count || 0;
        totalOpened += campaign.opened_count || 0;
        totalClicked += campaign.clicked_count || 0;
        totalBounced += campaign.bounced_count || 0;
        totalComplained += campaign.complained_count || 0;
      });

      // Calculate rates
      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

      setStats({
        totalCampaigns,
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalComplained,
        deliveryRate,
        openRate,
        clickRate,
        bounceRate
      });
    } catch (error) {
      console.error("[Email Analytics] Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Subscribe to real-time updates on email_campaigns
    const channel = supabase
      .channel('email-marketing-analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_campaigns'
        },
        () => {
          console.log('[Email Analytics] Campaign updated, refreshing stats...');
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  return { stats, loading, refresh: fetchStats };
}

// Legacy function for backward compatibility
export async function fetchEmailMarketingStats(): Promise<EmailMarketingStats> {
  try {
    // Fetch all campaigns (sent + sending) to include active campaigns
    const { data: campaigns, error } = await supabase
      .from("email_campaigns")
      .select("sent_count, delivered_count, opened_count, clicked_count, bounced_count, complained_count, recipients_count, status")
      .in("status", ["sent", "sending"]);

    if (error) {
      console.error("[Email Analytics] Error fetching campaigns:", error);
      return getEmptyStats();
    }

    // Aggregate stats
    let totalCampaigns = campaigns?.length || 0;
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalBounced = 0;
    let totalComplained = 0;

    campaigns?.forEach(campaign => {
      totalSent += campaign.sent_count || 0;
      totalDelivered += campaign.delivered_count || 0;
      totalOpened += campaign.opened_count || 0;
      totalClicked += campaign.clicked_count || 0;
      totalBounced += campaign.bounced_count || 0;
      totalComplained += campaign.complained_count || 0;
    });

    // Calculate rates
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    return {
      totalCampaigns,
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      totalComplained,
      deliveryRate,
      openRate,
      clickRate,
      bounceRate
    };
  } catch (error) {
    console.error("[Email Analytics] Error:", error);
    return getEmptyStats();
  }
}

export async function fetchTopEmailCampaigns(limit: number = 5): Promise<TopEmailCampaign[]> {
  try {
    const { data: campaigns, error } = await supabase
      .from("email_campaigns")
      .select("id, title, subject, sent_count, clicked_count, opened_count, delivered_count, sent_at, status")
      .in("status", ["sent", "sending"])
      .gt("sent_count", 0)
      .order("sent_count", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[Email Analytics] Error fetching top campaigns:", error);
      return [];
    }

    return (campaigns || []).map(campaign => ({
      id: campaign.id,
      title: campaign.title,
      subject: campaign.subject,
      sent_count: campaign.sent_count || 0,
      clicked_count: campaign.clicked_count || 0,
      opened_count: campaign.opened_count || 0,
      clickRate: campaign.opened_count && campaign.opened_count > 0 
        ? ((campaign.clicked_count || 0) / campaign.opened_count) * 100 
        : 0,
      openRate: campaign.delivered_count && campaign.delivered_count > 0 
        ? ((campaign.opened_count || 0) / campaign.delivered_count) * 100 
        : 0,
      sent_at: campaign.sent_at,
      status: campaign.status
    }));
  } catch (error) {
    console.error("[Email Analytics] Error:", error);
    return [];
  }
}

export async function fetchTopPushCampaigns(limit: number = 5): Promise<TopPushCampaign[]> {
  try {
    const { data: campaigns, error } = await supabase
      .from("push_notification_logs")
      .select("id, title, body, sent_count, failed_count, clicked_count, sent_at")
      .gt("sent_count", 0)
      .order("sent_count", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[Push Analytics] Error fetching top campaigns:", error);
      return [];
    }

    return (campaigns || []).map(campaign => ({
      id: campaign.id,
      title: campaign.title,
      body: campaign.body,
      sent_count: campaign.sent_count || 0,
      failed_count: campaign.failed_count || 0,
      clicked_count: campaign.clicked_count || 0,
      sent_at: campaign.sent_at
    }));
  } catch (error) {
    console.error("[Push Analytics] Error:", error);
    return [];
  }
}

export async function fetchPushCampaignStats(): Promise<PushCampaignStats> {
  try {
    const { data: campaigns, error } = await supabase
      .from("push_notification_logs")
      .select("sent_count, failed_count, clicked_count");

    if (error) {
      console.error("[Push Analytics] Error fetching stats:", error);
      return getEmptyPushStats();
    }

    let totalCampaigns = campaigns?.length || 0;
    let totalSent = 0;
    let totalFailed = 0;
    let totalClicked = 0;

    campaigns?.forEach(campaign => {
      totalSent += campaign.sent_count || 0;
      totalFailed += campaign.failed_count || 0;
      totalClicked += campaign.clicked_count || 0;
    });

    const totalDelivered = totalSent - totalFailed;
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const clickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;

    return {
      totalCampaigns,
      totalSent,
      totalDelivered,
      totalFailed,
      totalClicked,
      deliveryRate,
      clickRate
    };
  } catch (error) {
    console.error("[Push Analytics] Error:", error);
    return getEmptyPushStats();
  }
}

function getEmptyPushStats(): PushCampaignStats {
  return {
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalClicked: 0,
    deliveryRate: 0,
    clickRate: 0
  };
}

function getEmptyStats(): EmailMarketingStats {
  return {
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalBounced: 0,
    totalComplained: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0
  };
}

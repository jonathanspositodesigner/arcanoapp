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

export async function fetchEmailMarketingStats(): Promise<EmailMarketingStats> {
  try {
    // Fetch all campaigns with status 'sent'
    const { data: campaigns, error } = await supabase
      .from("email_campaigns")
      .select("sent_count, delivered_count, opened_count, clicked_count, bounced_count, complained_count, recipients_count")
      .eq("status", "sent");

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

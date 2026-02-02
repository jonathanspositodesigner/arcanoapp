// Push notification analytics tracking removed - no longer needed

export type PushEventType = 
  | 'prompt_shown' 
  | 'activated_prompt' 
  | 'activated_manual' 
  | 'dismissed' 
  | 'permission_denied';

// Function kept for backwards compatibility - does nothing
export async function trackPushNotificationEvent(eventType: PushEventType): Promise<void> {
  return;
}

export interface PushNotificationStats {
  promptShown: number;
  activatedViaPrompt: number;
  activatedViaManual: number;
  dismissed: number;
  permissionDenied: number;
  totalActivated: number;
  totalSubscriptions: number;
  conversionRate: number;
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

// Returns empty stats - analytics disabled
export async function fetchPushNotificationStats(startDate?: string, endDate?: string): Promise<PushNotificationStats> {
  return {
    promptShown: 0,
    activatedViaPrompt: 0,
    activatedViaManual: 0,
    dismissed: 0,
    permissionDenied: 0,
    totalActivated: 0,
    totalSubscriptions: 0,
    conversionRate: 0
  };
}

// Returns empty campaign stats - analytics disabled
export async function fetchPushCampaignStats(): Promise<PushCampaignStats> {
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

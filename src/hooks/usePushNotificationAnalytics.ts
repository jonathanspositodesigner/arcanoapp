import { supabase } from "@/integrations/supabase/client";

type PushEventType = 'prompt_shown' | 'activated_prompt' | 'activated_manual' | 'dismissed' | 'permission_denied';

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/tablet|playbook|silk/i.test(ua)) return 'tablet';
  return 'desktop';
}

export async function trackPushNotificationEvent(eventType: PushEventType): Promise<void> {
  try {
    await supabase.from('push_notification_analytics').insert({
      event_type: eventType,
      device_type: getDeviceType(),
      user_agent: navigator.userAgent
    });
    console.log('[Push Analytics] Tracked:', eventType);
  } catch (error) {
    console.error('[Push Analytics] Error tracking event:', error);
  }
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

export async function fetchPushNotificationStats(startDate?: string, endDate?: string): Promise<PushNotificationStats> {
  try {
    // Fetch analytics events
    let analyticsQuery = supabase.from('push_notification_analytics').select('event_type');
    
    if (startDate) {
      analyticsQuery = analyticsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      analyticsQuery = analyticsQuery.lte('created_at', endDate);
    }
    
    const { data: analyticsData, error: analyticsError } = await analyticsQuery;
    
    if (analyticsError) {
      console.error('[Push Analytics] Error fetching analytics:', analyticsError);
      return getEmptyStats();
    }

    // Count events
    let promptShown = 0;
    let activatedViaPrompt = 0;
    let activatedViaManual = 0;
    let dismissed = 0;
    let permissionDenied = 0;

    analyticsData?.forEach(event => {
      switch (event.event_type) {
        case 'prompt_shown':
          promptShown++;
          break;
        case 'activated_prompt':
          activatedViaPrompt++;
          break;
        case 'activated_manual':
          activatedViaManual++;
          break;
        case 'dismissed':
          dismissed++;
          break;
        case 'permission_denied':
          permissionDenied++;
          break;
      }
    });

    // Fetch total subscriptions
    const { count: totalSubscriptions } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });

    const totalActivated = activatedViaPrompt + activatedViaManual;
    const conversionRate = promptShown > 0 ? (activatedViaPrompt / promptShown) * 100 : 0;

    return {
      promptShown,
      activatedViaPrompt,
      activatedViaManual,
      dismissed,
      permissionDenied,
      totalActivated,
      totalSubscriptions: totalSubscriptions || 0,
      conversionRate
    };
  } catch (error) {
    console.error('[Push Analytics] Error:', error);
    return getEmptyStats();
  }
}

function getEmptyStats(): PushNotificationStats {
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

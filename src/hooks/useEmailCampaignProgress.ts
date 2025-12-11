import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailCampaignProgress {
  id: string;
  title: string;
  status: string;
  is_paused: boolean;
  sent_count: number;
  failed_count: number;
  recipients_count: number;
  updated_at?: string;
}

export const useEmailCampaignProgress = () => {
  const [activeCampaign, setActiveCampaign] = useState<EmailCampaignProgress | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const watchdogIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRecoveringRef = useRef(false);

  // Auto-recovery function when campaign stalls
  const triggerRecovery = useCallback(async (campaignId: string) => {
    if (isRecoveringRef.current) return;
    
    isRecoveringRef.current = true;
    console.log('[Watchdog] Campaign stalled, triggering recovery...');
    
    try {
      await supabase.functions.invoke('send-email-campaign', {
        body: { campaign_id: campaignId, resume: true }
      });
    } catch (error) {
      console.error('[Watchdog] Recovery failed:', error);
    } finally {
      isRecoveringRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Check for active sending campaigns on mount
    const checkActiveCampaigns = async () => {
      const { data } = await supabase
        .from('email_campaigns')
        .select('id, title, status, is_paused, sent_count, failed_count, recipients_count, updated_at')
        .eq('status', 'sending')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setActiveCampaign(data);
        lastUpdateRef.current = Date.now();
      }
    };

    checkActiveCampaigns();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('email-campaign-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_campaigns'
        },
        (payload) => {
          const record = payload.new as EmailCampaignProgress;
          
          if (payload.eventType === 'DELETE') {
            setActiveCampaign(null);
            return;
          }

          if (record.status === 'sending') {
            setActiveCampaign(record);
            lastUpdateRef.current = Date.now();
          } else if (activeCampaign?.id === record.id) {
            // Campaign finished or was cancelled
            setActiveCampaign(null);
          }
        }
      )
      .subscribe();

    // Watchdog: check every 15 seconds if campaign is stalled
    watchdogIntervalRef.current = setInterval(() => {
      if (activeCampaign && activeCampaign.status === 'sending' && !activeCampaign.is_paused) {
        const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
        
        // If no update in 45 seconds, trigger recovery
        if (timeSinceLastUpdate > 45000) {
          console.log(`[Watchdog] No updates for ${Math.round(timeSinceLastUpdate/1000)}s, recovering...`);
          triggerRecovery(activeCampaign.id);
          lastUpdateRef.current = Date.now(); // Reset to prevent spam
        }
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      if (watchdogIntervalRef.current) {
        clearInterval(watchdogIntervalRef.current);
      }
    };
  }, [activeCampaign?.id, triggerRecovery]);

  const pauseCampaign = async (campaignId: string) => {
    await supabase
      .from('email_campaigns')
      .update({ is_paused: true })
      .eq('id', campaignId);
  };

  const resumeCampaign = async (campaignId: string) => {
    await supabase
      .from('email_campaigns')
      .update({ is_paused: false })
      .eq('id', campaignId);
    
    lastUpdateRef.current = Date.now();
    
    // Re-invoke edge function to continue sending
    await supabase.functions.invoke('send-email-campaign', {
      body: { campaign_id: campaignId, resume: true }
    });
  };

  const cancelCampaign = async (campaignId: string) => {
    await supabase
      .from('email_campaigns')
      .update({ 
        status: 'cancelled',
        is_paused: false
      })
      .eq('id', campaignId);
    
    setActiveCampaign(null);
  };

  const isSending = !!activeCampaign;
  const isPaused = activeCampaign?.is_paused ?? false;
  const progress = activeCampaign?.recipients_count 
    ? Math.round(((activeCampaign.sent_count + activeCampaign.failed_count) / activeCampaign.recipients_count) * 100)
    : 0;

  return {
    activeCampaign,
    isSending,
    isPaused,
    progress,
    sent: activeCampaign?.sent_count ?? 0,
    failed: activeCampaign?.failed_count ?? 0,
    total: activeCampaign?.recipients_count ?? 0,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign
  };
};

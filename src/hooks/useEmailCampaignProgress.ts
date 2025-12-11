import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailCampaignProgress {
  id: string;
  title: string;
  status: string;
  is_paused: boolean;
  sent_count: number;
  failed_count: number;
  recipients_count: number;
}

export const useEmailCampaignProgress = () => {
  const [activeCampaign, setActiveCampaign] = useState<EmailCampaignProgress | null>(null);

  useEffect(() => {
    // Check for active sending campaigns on mount
    const checkActiveCampaigns = async () => {
      const { data } = await supabase
        .from('email_campaigns')
        .select('id, title, status, is_paused, sent_count, failed_count, recipients_count')
        .eq('status', 'sending')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setActiveCampaign(data);
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
          } else if (activeCampaign?.id === record.id) {
            // Campaign finished or was cancelled
            setActiveCampaign(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    
    // Re-invoke edge function to continue sending
    await supabase.functions.invoke('send-email-campaign', {
      body: { campaignId, resume: true }
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

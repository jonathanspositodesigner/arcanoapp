import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for stalled email campaigns...');

    // Find campaigns that are "sending" but haven't been updated in 60+ seconds
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    
    const { data: stalledCampaigns, error } = await supabase
      .from('email_campaigns')
      .select('id, title, sent_count, recipients_count, updated_at')
      .eq('status', 'sending')
      .eq('is_paused', false)
      .lt('updated_at', sixtySecondsAgo);

    if (error) {
      console.error('Error fetching stalled campaigns:', error);
      throw error;
    }

    if (!stalledCampaigns || stalledCampaigns.length === 0) {
      console.log('No stalled campaigns found');
      return new Response(JSON.stringify({ message: 'No stalled campaigns' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${stalledCampaigns.length} stalled campaign(s)`);

    // Resume each stalled campaign
    for (const campaign of stalledCampaigns) {
      console.log(`Resuming campaign: ${campaign.id} (${campaign.title}) - ${campaign.sent_count}/${campaign.recipients_count} sent`);
      
      // Invoke send-email-campaign to continue
      const { error: invokeError } = await supabase.functions.invoke('send-email-campaign', {
        body: { campaign_id: campaign.id, resume: true }
      });

      if (invokeError) {
        console.error(`Failed to resume campaign ${campaign.id}:`, invokeError);
      } else {
        console.log(`Successfully triggered resume for campaign ${campaign.id}`);
      }
    }

    return new Response(JSON.stringify({ 
      message: `Resumed ${stalledCampaigns.length} campaign(s)`,
      campaigns: stalledCampaigns.map(c => c.id)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in process-sending-campaigns:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

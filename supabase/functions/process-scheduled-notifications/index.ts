import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log(`Processing scheduled notifications at ${now.toISOString()}`);

    // Buscar notificações que devem ser enviadas
    const { data: scheduledNotifications, error: fetchError } = await supabase
      .from('push_scheduled_notifications')
      .select('*')
      .eq('is_active', true)
      .lte('next_send_at', now.toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled notifications:', fetchError);
      throw fetchError;
    }

    if (!scheduledNotifications || scheduledNotifications.length === 0) {
      console.log('No scheduled notifications to process');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${scheduledNotifications.length} notifications to process`);

    let processed = 0;

    for (const notification of scheduledNotifications) {
      try {
        // Enviar a notificação via edge function existente
        const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            title: notification.title,
            body: notification.body,
            url: notification.url || undefined
          }
        });

        if (sendError) {
          console.error(`Error sending notification ${notification.id}:`, sendError);
          continue;
        }

        console.log(`Notification ${notification.id} sent: ${sendResult?.sent || 0} devices`);

        // Calcular próximo envio baseado no tipo
        let nextSendAt: Date | null = null;
        const scheduleType = notification.schedule_type;

        if (scheduleType === 'once') {
          // Para envio único, desativar
          await supabase
            .from('push_scheduled_notifications')
            .update({ 
              is_active: false, 
              last_sent_at: now.toISOString() 
            })
            .eq('id', notification.id);
        } else {
          // Calcular próximo envio para recorrentes
          const scheduledTime = notification.scheduled_time; // formato "HH:mm:ss"
          const [hours, minutes] = scheduledTime.split(':').map(Number);

          if (scheduleType === 'daily') {
            nextSendAt = new Date(now);
            nextSendAt.setDate(nextSendAt.getDate() + 1);
            nextSendAt.setHours(hours, minutes, 0, 0);
          } else if (scheduleType === 'weekly') {
            nextSendAt = new Date(now);
            nextSendAt.setDate(nextSendAt.getDate() + 7);
            nextSendAt.setHours(hours, minutes, 0, 0);
          } else if (scheduleType === 'monthly') {
            nextSendAt = new Date(now);
            nextSendAt.setMonth(nextSendAt.getMonth() + 1);
            // Ajustar se o dia não existe no próximo mês
            const dayOfMonth = notification.scheduled_day_of_month;
            const lastDayOfMonth = new Date(nextSendAt.getFullYear(), nextSendAt.getMonth() + 1, 0).getDate();
            nextSendAt.setDate(Math.min(dayOfMonth, lastDayOfMonth));
            nextSendAt.setHours(hours, minutes, 0, 0);
          }

          if (nextSendAt) {
            await supabase
              .from('push_scheduled_notifications')
              .update({ 
                last_sent_at: now.toISOString(),
                next_send_at: nextSendAt.toISOString()
              })
              .eq('id', notification.id);
          }
        }

        processed++;
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
      }
    }

    console.log(`Processed ${processed} notifications`);

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in process-scheduled-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

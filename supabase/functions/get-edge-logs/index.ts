import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const timeFilter = url.searchParams.get('timeFilter') || '1day';
    
    // Calculate time range
    const now = new Date();
    let startTime: Date;
    
    switch (timeFilter) {
      case '10min':
        startTime = new Date(now.getTime() - 10 * 60 * 1000);
        break;
      case '3days':
        startTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        break;
      case '1day':
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query the analytics API for edge function logs
    const { data: logs, error } = await supabase
      .from('function_edge_logs' as any)
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (error) {
      console.log('Error querying function_edge_logs, trying analytics approach:', error.message);
      
      // Fallback: use the analytics query approach
      const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
      
      // Since we can't query analytics directly from edge function,
      // let's query webhook_logs as a proxy for now and return mock data structure
      const { data: webhookLogs, error: webhookError } = await supabase
        .from('webhook_logs')
        .select('*')
        .gte('received_at', startTime.toISOString())
        .order('received_at', { ascending: false })
        .limit(500);

      if (webhookError) {
        throw webhookError;
      }

      // Group by platform/function
      const stats: Record<string, { total: number; success: number; errors: number }> = {};
      
      webhookLogs?.forEach((log: any) => {
        const key = log.platform || 'webhook';
        if (!stats[key]) {
          stats[key] = { total: 0, success: 0, errors: 0 };
        }
        stats[key].total++;
        if (log.status === 'success') {
          stats[key].success++;
        } else if (log.status === 'error') {
          stats[key].errors++;
        }
      });

      const functionStats = Object.entries(stats).map(([name, data]) => ({
        function_name: name,
        total_calls: data.total,
        success_count: data.success,
        error_count: data.errors,
      }));

      return new Response(JSON.stringify({
        success: true,
        data: {
          functions: functionStats,
          total_calls: webhookLogs?.length || 0,
          total_success: webhookLogs?.filter((l: any) => l.status === 'success').length || 0,
          total_errors: webhookLogs?.filter((l: any) => l.status === 'error').length || 0,
          recent_logs: webhookLogs?.slice(0, 20).map((log: any) => ({
            function_name: log.platform || 'webhook',
            status: log.status === 'success' ? 200 : 500,
            timestamp: log.received_at,
            email: log.email,
          })) || [],
          source: 'webhook_logs',
          note: 'Dados baseados em webhook_logs. Para ver logs completos de edge functions, acesse o dashboard do Supabase.',
        },
        timeFilter,
        startTime: startTime.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process the logs if we got them directly
    const functionStats: Record<string, { total: number; success: number; errors: number }> = {};
    
    logs?.forEach((log: any) => {
      const funcName = log.function_id || log.path || 'unknown';
      if (!functionStats[funcName]) {
        functionStats[funcName] = { total: 0, success: 0, errors: 0 };
      }
      functionStats[funcName].total++;
      if (log.status_code >= 200 && log.status_code < 400) {
        functionStats[funcName].success++;
      } else {
        functionStats[funcName].errors++;
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        functions: Object.entries(functionStats).map(([name, data]) => ({
          function_name: name,
          total_calls: data.total,
          success_count: data.success,
          error_count: data.errors,
        })),
        total_calls: logs?.length || 0,
        total_success: Object.values(functionStats).reduce((acc, f) => acc + f.success, 0),
        total_errors: Object.values(functionStats).reduce((acc, f) => acc + f.errors, 0),
        recent_logs: logs?.slice(0, 20) || [],
        source: 'function_edge_logs',
      },
      timeFilter,
      startTime: startTime.toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in get-edge-logs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    // Calculate time range in ISO format
    const now = new Date();
    let hoursBack: number;
    
    switch (timeFilter) {
      case '10min':
        hoursBack = 1; // Minimum 1 hour for API
        break;
      case '3days':
        hoursBack = 72;
        break;
      case '1day':
      default:
        hoursBack = 24;
        break;
    }

    const startTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

    // Get project ref from URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Query edge function logs via analytics API
    const analyticsQuery = `
      select 
        id,
        function_edge_logs.timestamp,
        event_message,
        m.function_id,
        m.execution_time_ms,
        m.deployment_id,
        response.status_code,
        request.method
      from function_edge_logs
        cross join unnest(metadata) as m
        cross join unnest(m.response) as response
        cross join unnest(m.request) as request
      where function_edge_logs.timestamp >= '${startTime.toISOString()}'
      order by timestamp desc
      limit 1000
    `;

    console.log('Querying analytics with timeFilter:', timeFilter);

    const analyticsResponse = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/logs.all/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          sql: analyticsQuery,
        }),
      }
    );

    if (!analyticsResponse.ok) {
      const errorText = await analyticsResponse.text();
      console.error('Analytics API error:', analyticsResponse.status, errorText);
      
      // Return empty data with explanation
      return new Response(JSON.stringify({
        success: true,
        data: {
          functions: [],
          total_calls: 0,
          total_success: 0,
          total_errors: 0,
          recent_logs: [],
          source: 'analytics_unavailable',
          note: `API de analytics não disponível (${analyticsResponse.status}). Verifique as permissões ou acesse o dashboard do Supabase para ver logs detalhados.`,
        },
        timeFilter,
        startTime: startTime.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analyticsData = await analyticsResponse.json();
    const logs = analyticsData.result || [];
    
    console.log(`Found ${logs.length} edge function logs`);

    // Process and aggregate the logs
    const functionStats: Record<string, { total: number; success: number; errors: number }> = {};
    
    logs.forEach((log: any) => {
      const funcId = log.function_id || 'unknown';
      if (!functionStats[funcId]) {
        functionStats[funcId] = { total: 0, success: 0, errors: 0 };
      }
      functionStats[funcId].total++;
      
      const statusCode = log.status_code || 0;
      if (statusCode >= 200 && statusCode < 400) {
        functionStats[funcId].success++;
      } else {
        functionStats[funcId].errors++;
      }
    });

    const totalCalls = logs.length;
    const totalSuccess = Object.values(functionStats).reduce((acc, f) => acc + f.success, 0);
    const totalErrors = Object.values(functionStats).reduce((acc, f) => acc + f.errors, 0);

    return new Response(JSON.stringify({
      success: true,
      data: {
        functions: Object.entries(functionStats).map(([name, data]) => ({
          function_name: name,
          total_calls: data.total,
          success_count: data.success,
          error_count: data.errors,
        })),
        total_calls: totalCalls,
        total_success: totalSuccess,
        total_errors: totalErrors,
        recent_logs: logs.slice(0, 50).map((log: any) => ({
          function_name: log.function_id || 'unknown',
          status: log.status_code || 0,
          method: log.method || 'GET',
          execution_time: log.execution_time_ms,
          timestamp: log.timestamp,
        })),
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
      data: {
        functions: [],
        total_calls: 0,
        total_success: 0,
        total_errors: 0,
        recent_logs: [],
        source: 'error',
        note: `Erro ao buscar logs: ${errorMessage}`,
      },
    }), {
      status: 200, // Return 200 so UI can show the error message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

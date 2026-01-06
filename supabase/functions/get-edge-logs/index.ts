import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

// Edge function names and their IDs (you can update this list as needed)
const EDGE_FUNCTIONS = [
  'create-pack-client',
  'create-partner',
  'create-partner-artes',
  'create-premium-user',
  'create-premium-user-artes',
  'create-premium-user-musicos',
  'delete-auth-user-artes',
  'delete-auth-user-by-email',
  'email-unsubscribe',
  'get-edge-logs',
  'import-pack-clients',
  'manage-admin',
  'migrate-cloudinary-to-storage',
  'process-import-job',
  'process-scheduled-emails',
  'process-scheduled-notifications',
  'process-sending-campaigns',
  'reset-admin-password',
  'send-announcement',
  'send-email-campaign',
  'send-push-notification',
  'send-single-email',
  'sendpulse-webhook',
  'update-user-password-artes',
  'upload-to-storage',
  'webhook-greenn',
  'webhook-greenn-artes',
  'webhook-greenn-musicos',
  'welcome-email-tracking',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support both query param and body for timeFilter
    const url = new URL(req.url);
    let timeFilter = url.searchParams.get('timeFilter') || '1day';
    
    // Also check body for POST requests
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body?.timeFilter) {
          timeFilter = body.timeFilter;
        }
      } catch {
        // Ignore body parse errors
      }
    }
    
    // Calculate time range
    const now = new Date();
    let hoursBack: number;
    
    switch (timeFilter) {
      case '10min':
        hoursBack = 1;
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
    
    // Use MGMT_API_ACCESS_TOKEN (SUPABASE_ prefix is reserved)
    const accessToken = (Deno.env.get('MGMT_API_ACCESS_TOKEN') ?? '').trim();

    console.log('get-edge-logs: checking token...', { 
      hasToken: !!accessToken, 
      tokenLength: accessToken.length,
      projectRef,
      timeFilter
    });

    if (!accessToken) {
      // Return a helpful response with function list even without logs
      return new Response(JSON.stringify({
        success: true,
        data: {
          functions: EDGE_FUNCTIONS.map(name => ({
            function_name: name,
            total_calls: 0,
            success_count: 0,
            error_count: 0,
          })),
          total_calls: 0,
          total_success: 0,
          total_errors: 0,
          recent_logs: [],
          source: 'function_list',
          note: 'Para ver estatísticas detalhadas, configure o MGMT_API_ACCESS_TOKEN com um Personal Access Token de uma conta Owner da organização.',
        },
        timeFilter,
        startTime: startTime.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to fetch from the logs.all endpoint
    const analyticsQuery = `
      select 
        id,
        function_edge_logs.timestamp,
        event_message,
        m.function_id,
        m.execution_time_ms,
        response.status_code,
        request.method
      from function_edge_logs
        cross join unnest(metadata) as m
        cross join unnest(m.response) as response
        cross join unnest(m.request) as request
      where function_edge_logs.timestamp >= '${startTime.toISOString()}'
      order by timestamp desc
      limit 500
    `;

    // Build URL with query params for GET request
    const params = new URLSearchParams({
      iso_timestamp_start: startTime.toISOString(),
      iso_timestamp_end: now.toISOString(),
      sql: analyticsQuery,
    });

    const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/analytics/endpoints/logs.all?${params.toString()}`;
    
    console.log('get-edge-logs: calling Management API...');

    const analyticsResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('get-edge-logs: API response status:', analyticsResponse.status);

    if (!analyticsResponse.ok) {
      const errorText = await analyticsResponse.text();
      console.error('Analytics API error:', analyticsResponse.status, errorText);
      
      // If 403, provide helpful guidance
      if (analyticsResponse.status === 403) {
        return new Response(JSON.stringify({
          success: true,
          data: {
            functions: EDGE_FUNCTIONS.map(name => ({
              function_name: name,
              total_calls: 0,
              success_count: 0,
              error_count: 0,
            })),
            total_calls: 0,
            total_success: 0,
            total_errors: 0,
            recent_logs: [],
            source: 'permission_denied',
            note: 'O token não tem permissão para acessar analytics. O PAT precisa ser de uma conta Owner da organização Supabase. Acesse os logs diretamente no Lovable Cloud.',
          },
          timeFilter,
          startTime: startTime.toISOString(),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Other errors
      return new Response(JSON.stringify({
        success: true,
        data: {
          functions: EDGE_FUNCTIONS.map(name => ({
            function_name: name,
            total_calls: 0,
            success_count: 0,
            error_count: 0,
          })),
          total_calls: 0,
          total_success: 0,
          total_errors: 0,
          recent_logs: [],
          source: 'api_error',
          note: `Erro na API (${analyticsResponse.status}). Tente novamente mais tarde.`,
        },
        timeFilter,
        startTime: startTime.toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const analyticsData = await analyticsResponse.json();
    const logs = analyticsData.result || analyticsData || [];
    
    console.log(`get-edge-logs: Found ${Array.isArray(logs) ? logs.length : 0} edge function logs`);

    // Process and aggregate the logs
    const functionStats: Record<string, { total: number; success: number; errors: number }> = {};
    const logsArray = Array.isArray(logs) ? logs : [];
    
    logsArray.forEach((log: any) => {
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

    const totalCalls = logsArray.length;
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
        recent_logs: logsArray.slice(0, 50).map((log: any) => ({
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
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

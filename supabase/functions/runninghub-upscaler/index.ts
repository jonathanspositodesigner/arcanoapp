import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// API Configuration
const RUNNINGHUB_API_KEY = (
  Deno.env.get('RUNNINGHUB_API_KEY') ||
  Deno.env.get('RUNNINGHUB_APIKEY') ||
  ''
).trim();

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// WebApp IDs for the upscaler workflows
const WEBAPP_ID_PRO = '2015865378030755841';
const WEBAPP_ID_STANDARD = '2017030861371219969';
const WEBAPP_ID_LONGE = '2017343414227963905'; // WebApp for full-body/wide-angle photos
const MAX_CONCURRENT_JOBS = 3;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (!RUNNINGHUB_API_KEY) {
  console.error('[RunningHub] CRITICAL: Missing RUNNINGHUB_API_KEY secret');
}

console.log('[RunningHub] Config loaded - PRO:', WEBAPP_ID_PRO, 'STANDARD:', WEBAPP_ID_STANDARD);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();
    
    console.log(`[RunningHub] Endpoint called: ${path}`);

    if (path === 'upload') {
      return await handleUpload(req);
    } else if (path === 'run') {
      return await handleRun(req);
    } else if (path === 'queue-status') {
      return await handleQueueStatus(req);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RunningHub] Unhandled error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Upload image to RunningHub
async function handleUpload(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    console.error('[RunningHub] Upload failed: API key not configured');
    return new Response(JSON.stringify({ 
      error: 'API key not configured. Please add RUNNINGHUB_API_KEY secret.',
      code: 'MISSING_API_KEY'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { imageBase64, fileName } = await req.json();
  
  if (!imageBase64) {
    return new Response(JSON.stringify({ error: 'imageBase64 is required', code: 'MISSING_IMAGE' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[RunningHub] Uploading image...');

  try {
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const ext = (fileName || 'image.png').split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                     ext === 'webp' ? 'image/webp' : 'image/png';

    const formData = new FormData();
    formData.append('apiKey', RUNNINGHUB_API_KEY);
    formData.append('fileType', 'image');
    formData.append('file', new Blob([bytes], { type: mimeType }), fileName || 'upload.png');

    const response = await fetch('https://www.runninghub.ai/task/openapi/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    console.log('[RunningHub] Upload response:', JSON.stringify(data));

    if (data.code !== 0) {
      return new Response(JSON.stringify({ 
        error: data.msg || 'Upload failed',
        code: data.code,
        details: data
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fileName: data.data.fileName 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
    console.error('[RunningHub] Upload error:', error);
    return new Response(JSON.stringify({ error: errorMessage, code: 'UPLOAD_EXCEPTION' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Run the workflow with webhook callback
async function handleRun(req: Request) {
  if (!RUNNINGHUB_API_KEY) {
    return new Response(JSON.stringify({ 
      error: 'API key not configured',
      code: 'MISSING_API_KEY',
      solution: 'Add RUNNINGHUB_API_KEY secret in backend settings'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { 
    jobId,
    fileName, 
    detailDenoise,
    resolution,
    prompt,
    version,
    framingMode, // 'longe' or 'perto'
    userId,      // NEW: user ID for credit consumption
    creditCost   // NEW: credit cost (60 standard, 80 pro)
  } = await req.json();
  
  if (!fileName || !jobId) {
    return new Response(JSON.stringify({ 
      error: 'fileName and jobId are required', 
      code: 'MISSING_PARAMS' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate credit parameters
  if (!userId || !creditCost) {
    return new Response(JSON.stringify({ 
      error: 'userId e creditCost são obrigatórios', 
      code: 'MISSING_AUTH'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // FIRST: Consume credits before processing
  console.log(`[RunningHub] Consuming ${creditCost} credits for user ${userId}`);
  const { data: creditResult, error: creditError } = await supabase.rpc(
    'consume_upscaler_credits', 
    {
      _user_id: userId,
      _amount: creditCost,
      _description: `Upscaler ${version} - ${resolution}`
    }
  );

  if (creditError) {
    console.error('[RunningHub] Credit consumption error:', creditError);
    return new Response(JSON.stringify({ 
      error: 'Erro ao processar créditos',
      code: 'CREDIT_ERROR',
      details: creditError.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!creditResult || creditResult.length === 0 || !creditResult[0].success) {
    const errorMsg = creditResult?.[0]?.error_message || 'Saldo insuficiente';
    console.log('[RunningHub] Insufficient credits:', errorMsg);
    return new Response(JSON.stringify({ 
      error: errorMsg,
      code: 'INSUFFICIENT_CREDITS',
      currentBalance: creditResult?.[0]?.new_balance
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log(`[RunningHub] Credits consumed successfully. New balance: ${creditResult[0].new_balance}`);

  // Select WebApp ID based on version and framing mode
  // "De Longe" mode uses a specialized WebApp that only needs image + resolution
  const isLongeMode = framingMode === 'longe';
  const webappId = isLongeMode ? WEBAPP_ID_LONGE : (version === 'pro' ? WEBAPP_ID_PRO : WEBAPP_ID_STANDARD);
  console.log(`[RunningHub] Processing job ${jobId} - version: ${version}, framingMode: ${framingMode}, webappId: ${webappId}, fileName: ${fileName}`);

  try {
    // Update job with input file name
    await supabase
      .from('upscaler_jobs')
      .update({ input_file_name: fileName })
      .eq('id', jobId);

    // Check how many jobs are currently running
    const { count: runningCount } = await supabase
      .from('upscaler_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running');

    console.log(`[RunningHub] Running jobs: ${runningCount}/${MAX_CONCURRENT_JOBS}`);

    // Get the job to check its created_at
    const { data: currentJob } = await supabase
      .from('upscaler_jobs')
      .select('created_at')
      .eq('id', jobId)
      .single();

    if ((runningCount || 0) >= MAX_CONCURRENT_JOBS) {
      // Calculate queue position
      const { count: aheadOfMe } = await supabase
        .from('upscaler_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued')
        .lt('created_at', currentJob?.created_at || new Date().toISOString());

      const position = (aheadOfMe || 0) + 1;

      // Update job to queued status with position
      await supabase
        .from('upscaler_jobs')
        .update({ 
          status: 'queued',
          position: position
        })
        .eq('id', jobId);

      console.log(`[RunningHub] Job ${jobId} queued at position ${position}`);

      return new Response(JSON.stringify({ 
        success: true, 
        queued: true, 
        position: position,
        message: 'Job queued, will start when slot available'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Slot available - start processing
    await supabase
      .from('upscaler_jobs')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        position: 0
      })
      .eq('id', jobId);

    // Build node info list for RunningHub API
    // "De Longe" mode uses different nodeIds and only needs image + resolution
    let nodeInfoList: any[];
    
    if (isLongeMode) {
      // WebApp "De Longe" - only image (nodeId: 1) and resolution (nodeId: 7)
      nodeInfoList = [
        { nodeId: "1", fieldName: "image", fieldValue: fileName },
        { nodeId: "7", fieldName: "value", fieldValue: String(resolution || 2048) },
      ];
      console.log(`[RunningHub] Using "De Longe" WebApp with simplified nodeInfoList`);
    } else {
      // Standard/PRO WebApps - Resolution nodeId differs: PRO uses "73", Light uses "75"
      const resolutionNodeId = version === 'pro' ? "73" : "75";
      
      nodeInfoList = [
        { nodeId: "26", fieldName: "image", fieldValue: fileName },
        { nodeId: "25", fieldName: "value", fieldValue: detailDenoise || 0.15 },
        { nodeId: resolutionNodeId, fieldName: "value", fieldValue: String(resolution || 2048) },
      ];

      // Add prompt if provided (nodeId 128 for prompt)
      if (prompt) {
        nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: prompt });
      }
    }

    const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;

    const requestBody = {
      nodeInfoList: nodeInfoList,
      instanceType: "default",
      usePersonalQueue: false,
      webhookUrl: webhookUrl,
    };

    console.log('[RunningHub] AI App request:', JSON.stringify({ 
      ...requestBody,
      webhookUrl: webhookUrl
    }));

    const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${webappId}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[RunningHub] AI App response:', JSON.stringify(data));

    // API v2 response: { taskId, status, ... } directly (no wrapper)
    if (data.taskId) {
      // Update job with taskId
      await supabase
        .from('upscaler_jobs')
        .update({ task_id: data.taskId })
        .eq('id', jobId);

      return new Response(JSON.stringify({ 
        success: true, 
        taskId: data.taskId,
        method: 'ai-app-v2'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Failed to start - mark as failed
    await supabase
      .from('upscaler_jobs')
      .update({ 
        status: 'failed', 
        error_message: data.msg || 'Failed to start workflow',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({
      error: data.msg || 'Failed to start workflow',
      code: data.code || 'RUN_FAILED',
      details: data
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RunningHub] Run error:', error);

    // Mark job as failed
    await supabase
      .from('upscaler_jobs')
      .update({ 
        status: 'failed', 
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return new Response(JSON.stringify({ 
      error: errorMessage, 
      code: 'RUN_EXCEPTION' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

// Get queue status
async function handleQueueStatus(req: Request) {
  const { jobId } = await req.json();

  if (!jobId) {
    return new Response(JSON.stringify({ error: 'jobId is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { data: job, error } = await supabase
      .from('upscaler_jobs')
      .select('status, position, output_url, error_message')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      status: job.status,
      position: job.position,
      outputUrl: job.output_url,
      errorMessage: job.error_message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[RunningHub] Queue status error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get queue status' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

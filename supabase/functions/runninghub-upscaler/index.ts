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

// WebApp ID for the upscaler workflow
const WEBAPP_ID = '2015865378030755841';
const MAX_CONCURRENT_JOBS = 3;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

if (!RUNNINGHUB_API_KEY) {
  console.error('[RunningHub] CRITICAL: Missing RUNNINGHUB_API_KEY secret');
}

console.log('[RunningHub] Config loaded - WEBAPP_ID:', WEBAPP_ID);

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
    prompt
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

  console.log(`[RunningHub] Processing job ${jobId} - fileName: ${fileName}, detail: ${detailDenoise}`);

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
    const nodeInfoList: any[] = [
      { nodeId: "1", fieldName: "image", fieldValue: fileName },
      { nodeId: "165", fieldName: "value", fieldValue: detailDenoise || 0.15 },
    ];

    // Add prompt if provided
    if (prompt) {
      nodeInfoList.push({ nodeId: "prompt", fieldName: "text", fieldValue: prompt });
    }

    const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;

    const requestBody = {
      apiKey: RUNNINGHUB_API_KEY,
      webappId: WEBAPP_ID,
      nodeInfoList: nodeInfoList,
      webhookUrl: webhookUrl,
    };

    console.log('[RunningHub] AI App request:', JSON.stringify({ 
      ...requestBody, 
      apiKey: '[REDACTED]',
      webhookUrl: webhookUrl
    }));

    const response = await fetch('https://www.runninghub.ai/task/openapi/ai-app/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[RunningHub] AI App response:', JSON.stringify(data));

    if (data.code === 0 && data.data?.taskId) {
      // Update job with taskId
      await supabase
        .from('upscaler_jobs')
        .update({ task_id: data.data.taskId })
        .eq('id', jobId);

      return new Response(JSON.stringify({ 
        success: true, 
        taskId: data.data.taskId,
        method: 'ai-app'
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

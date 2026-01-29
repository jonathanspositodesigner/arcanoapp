import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();
const WEBAPP_ID = '2015865378030755841';
const MAX_CONCURRENT_JOBS = 3;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('[Webhook] Received payload:', JSON.stringify(payload));

    // RunningHub API v2 webhook format (from official documentation)
    // Structure: { event, taskId, eventData: { status, results[], errorCode, errorMessage, usage } }
    const event = payload.event;
    const taskId = payload.taskId;
    const eventData = payload.eventData || {};
    const taskStatus = eventData.status;
    
    console.log(`[Webhook] Event: ${event}, TaskId: ${taskId}, Status: ${taskStatus}`);

    // Only process TASK_END events
    if (event !== 'TASK_END') {
      console.log('[Webhook] Ignoring non-TASK_END event');
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!taskId) {
      console.error('[Webhook] No taskId in payload');
      return new Response(JSON.stringify({ error: 'Missing taskId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get output URL from eventData.results (API v2 format)
    // results[]: { url, outputType, text }
    let outputUrl: string | null = null;
    let errorMessage: string | null = null;

    const results = eventData.results || [];
    
    if (Array.isArray(results) && results.length > 0) {
      // Find image result by outputType (png, jpg, jpeg, webp)
      const imageResult = results.find((r: any) => 
        r.outputType === 'png' || 
        r.outputType === 'jpg' || 
        r.outputType === 'jpeg' || 
        r.outputType === 'webp'
      );
      outputUrl = imageResult?.url || results[0]?.url || null;
    }

    // Check for error from eventData
    if (taskStatus === 'FAILED') {
      errorMessage = eventData.errorMessage || eventData.errorCode || 'Processing failed';
    }

    console.log(`[Webhook] OutputUrl: ${outputUrl}, Error: ${errorMessage}`);

    // Update the job in the database
    const newStatus = errorMessage ? 'failed' : (outputUrl ? 'completed' : 'failed');
    
    const { data: updateData, error: updateError } = await supabase
      .from('upscaler_jobs')
      .update({
        status: newStatus,
        output_url: outputUrl,
        error_message: errorMessage || (newStatus === 'failed' ? 'No output received' : null),
        completed_at: new Date().toISOString()
      })
      .eq('task_id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('[Webhook] Error updating job:', updateError);
      // Try to find by task_id anyway
      const { data: existingJob } = await supabase
        .from('upscaler_jobs')
        .select('id')
        .eq('task_id', taskId)
        .single();
      
      if (!existingJob) {
        console.log('[Webhook] Job not found, might be already processed or invalid taskId');
      }
    } else {
      console.log('[Webhook] Job updated successfully:', updateData?.id);
    }

    // Process next job in queue if there's a slot available
    await processNextInQueue();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Webhook] Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processNextInQueue() {
  try {
    // Check how many jobs are currently running
    const { count: runningCount } = await supabase
      .from('upscaler_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running');

    console.log(`[Webhook] Running jobs: ${runningCount}/${MAX_CONCURRENT_JOBS}`);

    if ((runningCount || 0) >= MAX_CONCURRENT_JOBS) {
      console.log('[Webhook] No slots available');
      return;
    }

    // Get the next job in queue (oldest first)
    const { data: nextJob, error: fetchError } = await supabase
      .from('upscaler_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError || !nextJob) {
      console.log('[Webhook] No jobs in queue');
      return;
    }

    console.log(`[Webhook] Processing next job: ${nextJob.id}`);

    // Mark as running
    await supabase
      .from('upscaler_jobs')
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        position: 0
      })
      .eq('id', nextJob.id);

    // Start processing via RunningHub API v2
    await startRunningHubJob(nextJob);

    // Update positions of remaining queued jobs
    await updateQueuePositions();

  } catch (error) {
    console.error('[Webhook] Error processing next job:', error);
  }
}

async function startRunningHubJob(job: any) {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;
  
  // Correct node IDs from RunningHub documentation
  const nodeInfoList: any[] = [
    { nodeId: "26", fieldName: "image", fieldValue: job.input_file_name },
    { nodeId: "25", fieldName: "value", fieldValue: job.detail_denoise || 0.15 },
  ];

  // Add prompt if provided (nodeId 128 for prompt)
  if (job.prompt) {
    nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: job.prompt });
  }

  // API v2 format - auth via Bearer header, not in body
  const requestBody = {
    nodeInfoList: nodeInfoList,
    instanceType: "default",
    usePersonalQueue: false,
    webhookUrl: webhookUrl,
  };

  console.log('[Webhook] Starting RunningHub job:', JSON.stringify(requestBody));

  try {
    const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[Webhook] RunningHub response:', JSON.stringify(data));

    // API v2 response: { taskId, status, ... } directly (no wrapper)
    if (data.taskId) {
      // Update job with taskId
      await supabase
        .from('upscaler_jobs')
        .update({ task_id: data.taskId })
        .eq('id', job.id);
      
      console.log(`[Webhook] Job ${job.id} started with taskId: ${data.taskId}`);
    } else {
      // Mark as failed
      await supabase
        .from('upscaler_jobs')
        .update({ 
          status: 'failed', 
          error_message: data.message || data.error || 'Failed to start job',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      console.error('[Webhook] Failed to start job:', data.message || data.error);
    }
  } catch (error) {
    console.error('[Webhook] Error calling RunningHub:', error);
    await supabase
      .from('upscaler_jobs')
      .update({ 
        status: 'failed', 
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);
  }
}

async function updateQueuePositions() {
  try {
    const { data: queuedJobs } = await supabase
      .from('upscaler_jobs')
      .select('id')
      .eq('status', 'queued')
      .order('created_at', { ascending: true });

    if (queuedJobs) {
      for (let i = 0; i < queuedJobs.length; i++) {
        await supabase
          .from('upscaler_jobs')
          .update({ position: i + 1 })
          .eq('id', queuedJobs[i].id);
      }
    }
  } catch (error) {
    console.error('[Webhook] Error updating queue positions:', error);
  }
}

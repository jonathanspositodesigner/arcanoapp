import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RUNNINGHUB_API_KEY = (Deno.env.get('RUNNINGHUB_API_KEY') || '').trim();

// WebApp IDs
const WEBAPP_ID_UPSCALER = '2015865378030755841';
const WEBAPP_ID_POSE = '2018451429635133442';
const MAX_CONCURRENT_JOBS = 3;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('[Webhook] Received payload:', JSON.stringify(payload));

    // RunningHub API v2 webhook format
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

    // Get output URL from eventData.results
    let outputUrl: string | null = null;
    let errorMessage: string | null = null;

    const results = eventData.results || [];
    
    if (Array.isArray(results) && results.length > 0) {
      const imageResult = results.find((r: any) => 
        r.outputType === 'png' || 
        r.outputType === 'jpg' || 
        r.outputType === 'jpeg' || 
        r.outputType === 'webp'
      );
      outputUrl = imageResult?.url || results[0]?.url || null;
    }

    if (taskStatus === 'FAILED') {
      errorMessage = eventData.errorMessage || eventData.errorCode || 'Processing failed';
    }

    console.log(`[Webhook] OutputUrl: ${outputUrl}, Error: ${errorMessage}`);

    // Determine which table the job belongs to
    // First check upscaler_jobs, then pose_changer_jobs
    let jobTable: 'upscaler_jobs' | 'pose_changer_jobs' = 'upscaler_jobs';
    let jobData: any = null;

    // Try upscaler_jobs first
    const { data: upscalerJob, error: upscalerError } = await supabase
      .from('upscaler_jobs')
      .select('id')
      .eq('task_id', taskId)
      .maybeSingle();

    if (upscalerJob) {
      jobTable = 'upscaler_jobs';
      jobData = upscalerJob;
      console.log(`[Webhook] Found job in upscaler_jobs: ${upscalerJob.id}`);
    } else {
      // Try pose_changer_jobs
      const { data: poseJob, error: poseError } = await supabase
        .from('pose_changer_jobs')
        .select('id')
        .eq('task_id', taskId)
        .maybeSingle();

      if (poseJob) {
        jobTable = 'pose_changer_jobs';
        jobData = poseJob;
        console.log(`[Webhook] Found job in pose_changer_jobs: ${poseJob.id}`);
      }
    }

    if (!jobData) {
      console.log('[Webhook] Job not found in any table, might be already processed');
      return new Response(JSON.stringify({ success: true, message: 'Job not found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the job in the correct table
    const newStatus = errorMessage ? 'failed' : (outputUrl ? 'completed' : 'failed');
    
    const { error: updateError } = await supabase
      .from(jobTable)
      .update({
        status: newStatus,
        output_url: outputUrl,
        error_message: errorMessage || (newStatus === 'failed' ? 'No output received' : null),
        completed_at: new Date().toISOString()
      })
      .eq('task_id', taskId);

    if (updateError) {
      console.error('[Webhook] Error updating job:', updateError);
    } else {
      console.log(`[Webhook] Job updated successfully in ${jobTable}`);
    }

    // Process next job in queue for both tables
    await processNextInQueue('upscaler_jobs');
    await processNextInQueue('pose_changer_jobs');

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

async function processNextInQueue(tableName: 'upscaler_jobs' | 'pose_changer_jobs') {
  try {
    // Check how many jobs are currently running across both tables
    const { count: upscalerRunning } = await supabase
      .from('upscaler_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running');

    const { count: poseRunning } = await supabase
      .from('pose_changer_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'running');

    const totalRunning = (upscalerRunning || 0) + (poseRunning || 0);
    console.log(`[Webhook] Total running jobs: ${totalRunning}/${MAX_CONCURRENT_JOBS}`);

    if (totalRunning >= MAX_CONCURRENT_JOBS) {
      console.log('[Webhook] No slots available');
      return;
    }

    // Get the next job in queue for this table
    const { data: nextJob, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError || !nextJob) {
      console.log(`[Webhook] No jobs in queue for ${tableName}`);
      return;
    }

    console.log(`[Webhook] Processing next job from ${tableName}: ${nextJob.id}`);

    // Mark as running
    await supabase
      .from(tableName)
      .update({ 
        status: 'running', 
        started_at: new Date().toISOString(),
        position: 0
      })
      .eq('id', nextJob.id);

    // Start processing via RunningHub API v2
    if (tableName === 'upscaler_jobs') {
      await startUpscalerJob(nextJob);
    } else {
      await startPoseChangerJob(nextJob);
    }

    // Update positions for remaining queued jobs
    await updateQueuePositions(tableName);

  } catch (error) {
    console.error(`[Webhook] Error processing next job from ${tableName}:`, error);
  }
}

async function startUpscalerJob(job: any) {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;
  
  const nodeInfoList: any[] = [
    { nodeId: "26", fieldName: "image", fieldValue: job.input_file_name },
    { nodeId: "25", fieldName: "value", fieldValue: job.detail_denoise || 0.15 },
  ];

  if (job.prompt) {
    nodeInfoList.push({ nodeId: "128", fieldName: "text", fieldValue: job.prompt });
  }

  const requestBody = {
    nodeInfoList: nodeInfoList,
    instanceType: "default",
    usePersonalQueue: false,
    webhookUrl: webhookUrl,
  };

  console.log('[Webhook] Starting Upscaler job:', JSON.stringify(requestBody));

  try {
    const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID_UPSCALER}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[Webhook] RunningHub response:', JSON.stringify(data));

    if (data.taskId) {
      await supabase
        .from('upscaler_jobs')
        .update({ task_id: data.taskId })
        .eq('id', job.id);
      
      console.log(`[Webhook] Upscaler job ${job.id} started with taskId: ${data.taskId}`);
    } else {
      await supabase
        .from('upscaler_jobs')
        .update({ 
          status: 'failed', 
          error_message: data.message || data.error || 'Failed to start job',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      console.error('[Webhook] Failed to start upscaler job:', data.message || data.error);
    }
  } catch (error) {
    console.error('[Webhook] Error calling RunningHub for upscaler:', error);
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

async function startPoseChangerJob(job: any) {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/runninghub-webhook`;
  
  // NodeId 27 = Person photo, NodeId 60 = Pose reference
  const nodeInfoList = [
    { nodeId: "27", fieldName: "image", fieldValue: job.person_file_name },
    { nodeId: "60", fieldName: "image", fieldValue: job.reference_file_name }
  ];

  const requestBody = {
    nodeInfoList: nodeInfoList,
    instanceType: "default",
    usePersonalQueue: false,
    webhookUrl: webhookUrl,
  };

  console.log('[Webhook] Starting Pose Changer job:', JSON.stringify(requestBody));

  try {
    const response = await fetch(`https://www.runninghub.ai/openapi/v2/run/ai-app/${WEBAPP_ID_POSE}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNNINGHUB_API_KEY}`
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('[Webhook] RunningHub response:', JSON.stringify(data));

    if (data.taskId) {
      await supabase
        .from('pose_changer_jobs')
        .update({ task_id: data.taskId })
        .eq('id', job.id);
      
      console.log(`[Webhook] Pose Changer job ${job.id} started with taskId: ${data.taskId}`);
    } else {
      await supabase
        .from('pose_changer_jobs')
        .update({ 
          status: 'failed', 
          error_message: data.message || data.error || 'Failed to start job',
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);
      
      console.error('[Webhook] Failed to start pose changer job:', data.message || data.error);
    }
  } catch (error) {
    console.error('[Webhook] Error calling RunningHub for pose changer:', error);
    await supabase
      .from('pose_changer_jobs')
      .update({ 
        status: 'failed', 
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.id);
  }
}

async function updateQueuePositions(tableName: 'upscaler_jobs' | 'pose_changer_jobs') {
  try {
    // Use dedicated RPC function for each table
    const rpcName = tableName === 'upscaler_jobs' 
      ? 'update_queue_positions' 
      : 'update_pose_changer_queue_positions';
    
    const { error } = await supabase.rpc(rpcName);
    
    if (error) {
      console.error(`[Webhook] Error updating queue positions for ${tableName}:`, error);
    } else {
      console.log(`[Webhook] Queue positions updated for ${tableName}`);
    }
  } catch (error) {
    console.error(`[Webhook] Error updating queue positions for ${tableName}:`, error);
  }
}
